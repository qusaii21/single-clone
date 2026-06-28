"""
Message routes: send, fetch, mark read, delete.
WebSocket endpoint for real-time messaging.
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from typing import List, Optional
from database.connection import get_db, AsyncSessionLocal
from models.models import (
    Conversation, ConversationMember, Message, MessageReaction, MessageReceipt, User,
)
from routes.deps import get_current_user
from schemas.schemas import MarkReadRequest, MessageOut, MessageReceiptOut, ReactRequest, SendMessageRequest, UserOut
from utils.helpers import decode_token, new_id, utcnow
from websocket.manager import manager

router = APIRouter(prefix="/messages", tags=["messages"])


async def _load_message(msg_id: str, db: AsyncSession) -> Optional[Message]:
    result = await db.execute(
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.receipts),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(Message.id == msg_id)
    )
    return result.scalars().first()


def _build_msg_out(msg: Message) -> MessageOut:
    reply_out = None
    if msg.reply_to:
        reply_out = MessageOut(
            id=msg.reply_to.id,
            conversation_id=msg.reply_to.conversation_id,
            sender_id=msg.reply_to.sender_id,
            sender=UserOut.model_validate(msg.reply_to.sender) if msg.reply_to.sender else None,
            content=msg.reply_to.content,
            message_type=msg.reply_to.message_type,
            reply_to_id=msg.reply_to.reply_to_id,
            is_deleted=msg.reply_to.is_deleted,
            created_at=msg.reply_to.created_at,
            receipts=[],
        )

    # Build reactions dict: emoji -> [user_ids]
    reactions: dict = {}
    for r in msg.reactions:
        reactions.setdefault(r.emoji, []).append(r.user_id)

    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=UserOut.model_validate(msg.sender) if msg.sender else None,
        content="🗑 This message was deleted" if msg.is_deleted else msg.content,
        message_type=msg.message_type,
        reply_to_id=msg.reply_to_id,
        reply_to=reply_out,
        is_deleted=msg.is_deleted,
        created_at=msg.created_at,
        receipts=[
            MessageReceiptOut(user_id=r.user_id, status=r.status, updated_at=r.updated_at)
            for r in msg.receipts
        ],
        reactions=reactions,
    )


@router.get("/{conv_id}", response_model=list[MessageOut])
async def get_messages(
    conv_id: str,
    before: Optional[datetime] = Query(default=None),
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Paginated message fetch for a conversation."""
    # Verify membership
    member_check = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == current_user.id,
        )
    )
    if not member_check.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    query = (
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.receipts),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    if before:
        query = query.where(Message.created_at < before)

    result = await db.execute(query)
    msgs = result.scalars().all()
    # Return chronologically
    return [_build_msg_out(m) for m in reversed(msgs)]


@router.post("/{conv_id}", response_model=MessageOut, status_code=201)
async def send_message(
    conv_id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify membership
    member_check = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == current_user.id,
        )
    )
    if not member_check.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member")

    msg = Message(
        id=new_id(),
        conversation_id=conv_id,
        sender_id=current_user.id,
        content=body.content,
        message_type=body.message_type,
        reply_to_id=body.reply_to_id,
    )
    db.add(msg)
    await db.flush()

    # Create receipts for all other members
    all_members_result = await db.execute(
        select(ConversationMember.user_id).where(ConversationMember.conversation_id == conv_id)
    )
    all_member_ids = [row[0] for row in all_members_result.all()]

    for uid in all_member_ids:
        if uid != current_user.id:
            db.add(MessageReceipt(id=new_id(), message_id=msg.id, user_id=uid, status="delivered"))

    # Update conversation updated_at
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conv_id)
        .values(updated_at=utcnow())
    )

    await db.commit()
    loaded = await _load_message(msg.id, db)
    msg_out = _build_msg_out(loaded)

    # Broadcast via WebSocket to all members
    other_ids = [uid for uid in all_member_ids if uid != current_user.id]
    await manager.emit_new_message(all_member_ids, msg_out.model_dump(mode="json"))

    return msg_out


@router.post("/{conv_id}/read", status_code=204)
async def mark_read(
    conv_id: str,
    body: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark messages as read and update last_read_at."""
    # Update receipts
    await db.execute(
        update(MessageReceipt)
        .where(
            MessageReceipt.message_id.in_(body.message_ids),
            MessageReceipt.user_id == current_user.id,
        )
        .values(status="read", updated_at=utcnow())
    )

    # Update last_read_at for the member
    await db.execute(
        update(ConversationMember)
        .where(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == current_user.id,
        )
        .values(last_read_at=utcnow())
    )
    await db.commit()

    # Notify senders of read receipts
    for msg_id in body.message_ids:
        msg_result = await db.execute(select(Message.sender_id).where(Message.id == msg_id))
        sender_id = msg_result.scalar()
        if sender_id and sender_id != current_user.id:
            await manager.emit_receipt([sender_id], msg_id, current_user.id, "read")


@router.delete("/{conv_id}/{msg_id}", status_code=204)
async def delete_message(
    conv_id: str,
    msg_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message).where(Message.id == msg_id, Message.conversation_id == conv_id)
    )
    msg = result.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")

    msg.is_deleted = True
    await db.commit()


@router.post("/{conv_id}/{msg_id}/react", status_code=200)
async def react_to_message(
    conv_id: str,
    msg_id: str,
    body: ReactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a reaction on a message. Adds if not present, removes if already reacted."""
    # Verify membership
    member_check = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == current_user.id,
        )
    )
    if not member_check.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member")

    # Check for existing reaction
    existing = await db.execute(
        select(MessageReaction).where(
            MessageReaction.message_id == msg_id,
            MessageReaction.user_id == current_user.id,
            MessageReaction.emoji == body.emoji,
        )
    )
    existing_reaction = existing.scalars().first()

    if existing_reaction:
        await db.delete(existing_reaction)
        action = "remove"
    else:
        db.add(MessageReaction(
            id=new_id(),
            message_id=msg_id,
            user_id=current_user.id,
            emoji=body.emoji,
        ))
        action = "add"

    await db.commit()

    # Broadcast to all conversation members
    all_members_result = await db.execute(
        select(ConversationMember.user_id).where(ConversationMember.conversation_id == conv_id)
    )
    member_ids = [row[0] for row in all_members_result.all()]
    await manager.emit_reaction(member_ids, msg_id, conv_id, body.emoji, current_user.id, action)

    return {"action": action, "emoji": body.emoji}


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Main WebSocket connection. Authenticated via token in URL path.
    Handles:
      - typing indicators  { type: "typing", conversation_id, is_typing }
      - ping/pong          { type: "ping" }
    Broadcasts:
      - new_message, receipt, typing, presence, conversation_update
    """
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)

    async with AsyncSessionLocal() as db:
        # Mark user online
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.is_online = True
            user.last_seen = utcnow()
            await db.commit()

        # Get this user's conversation partners for presence broadcast
        member_result = await db.execute(
            select(ConversationMember.conversation_id).where(
                ConversationMember.user_id == user_id
            )
        )
        conv_ids = [r[0] for r in member_result.all()]

        peer_result = await db.execute(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id.in_(conv_ids),
                ConversationMember.user_id != user_id,
            )
        )
        peer_ids = list({r[0] for r in peer_result.all()})

    await manager.emit_presence(peer_ids, user_id, True)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type")

            if event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            elif event_type == "typing":
                conv_id = event.get("conversation_id")
                is_typing = event.get("is_typing", False)
                async with AsyncSessionLocal() as db:
                    member_result = await db.execute(
                        select(ConversationMember.user_id).where(
                            ConversationMember.conversation_id == conv_id,
                            ConversationMember.user_id != user_id,
                        )
                    )
                    recipients = [r[0] for r in member_result.all()]
                await manager.emit_typing(recipients, conv_id, user_id, is_typing)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, user_id)

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            if user:
                user.is_online = False
                user.last_seen = utcnow()
                await db.commit()

        await manager.emit_presence(peer_ids, user_id, False)
