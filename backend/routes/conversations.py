"""
Conversation routes: list, create, get details, update group, add/remove members.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.connection import get_db
from models.models import Conversation, ConversationMember, Message, User
from routes.deps import get_current_user
from schemas.schemas import (
    AddMembersRequest, ConversationOut, ConversationMemberOut,
    CreateConversationRequest, MessageOut, UpdateGroupRequest, UserOut,
)
from utils.helpers import new_id, utcnow
from websocket.manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


async def _load_conversation(conv_id: str, db: AsyncSession) -> Optional[Conversation]:
    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user),
            selectinload(Conversation.messages).selectinload(Message.sender),
            selectinload(Conversation.messages).selectinload(Message.receipts),
        )
        .where(Conversation.id == conv_id)
    )
    return result.scalars().first()


def _build_conv_out(conv: Conversation, current_user_id: str) -> ConversationOut:
    members_out = [
        ConversationMemberOut(
            user=UserOut.model_validate(m.user),
            role=m.role,
            joined_at=m.joined_at,
            last_read_at=m.last_read_at,
        )
        for m in conv.members
    ]

    # Last message
    sorted_msgs = sorted(conv.messages, key=lambda m: m.created_at)
    last_msg = None
    if sorted_msgs:
        lm = sorted_msgs[-1]
        last_msg = MessageOut(
            id=lm.id,
            conversation_id=lm.conversation_id,
            sender_id=lm.sender_id,
            sender=UserOut.model_validate(lm.sender) if lm.sender else None,
            content="🗑 This message was deleted" if lm.is_deleted else lm.content,
            message_type=lm.message_type,
            reply_to_id=lm.reply_to_id,
            is_deleted=lm.is_deleted,
            created_at=lm.created_at,
            receipts=[],
        )

    # Unread count: messages after last_read_at of current member
    current_member = next((m for m in conv.members if m.user_id == current_user_id), None)
    unread = 0
    if current_member:
        last_read = current_member.last_read_at
        unread = sum(
            1 for msg in conv.messages
            if msg.sender_id != current_user_id
            and (last_read is None or msg.created_at > last_read)
        )

    return ConversationOut(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        avatar_url=conv.avatar_url,
        avatar_color=conv.avatar_color,
        created_by=conv.created_by,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=members_out,
        last_message=last_msg,
        unread_count=unread,
    )


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all conversations the current user is a member of, sorted by last activity."""
    # Get conv IDs for this user
    member_result = await db.execute(
        select(ConversationMember.conversation_id).where(
            ConversationMember.user_id == current_user.id
        )
    )
    conv_ids = [row[0] for row in member_result.all()]

    if not conv_ids:
        return []

    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user),
            selectinload(Conversation.messages).selectinload(Message.sender),
            selectinload(Conversation.messages).selectinload(Message.receipts),
        )
        .where(Conversation.id.in_(conv_ids))
        .order_by(Conversation.updated_at.desc())
    )
    convs = result.scalars().all()
    return [_build_conv_out(c, current_user.id) for c in convs]


@router.post("", response_model=ConversationOut, status_code=201)
async def create_conversation(
    body: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    all_member_ids = list(set([current_user.id] + body.member_ids))

    if body.type == "direct":
        if len(all_member_ids) != 2:
            raise HTTPException(status_code=400, detail="Direct conversations require exactly 2 members")

        # Check if DM already exists
        other_id = next(m for m in all_member_ids if m != current_user.id)
        existing = await db.execute(
            select(Conversation)
            .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
            .where(
                Conversation.type == "direct",
                ConversationMember.user_id == current_user.id,
            )
        )
        for conv in existing.scalars().all():
            # Check if the other member is there too
            other_check = await db.execute(
                select(ConversationMember).where(
                    ConversationMember.conversation_id == conv.id,
                    ConversationMember.user_id == other_id,
                )
            )
            if other_check.scalars().first():
                loaded = await _load_conversation(conv.id, db)
                return _build_conv_out(loaded, current_user.id)

    if body.type == "group" and not body.name:
        raise HTTPException(status_code=400, detail="Group conversations require a name")

    conv = Conversation(
        id=new_id(),
        type=body.type,
        name=body.name,
        created_by=current_user.id,
        updated_at=utcnow(),
    )
    db.add(conv)
    await db.flush()

    for uid in all_member_ids:
        role = "admin" if uid == current_user.id and body.type == "group" else "member"
        db.add(ConversationMember(
            id=new_id(),
            conversation_id=conv.id,
            user_id=uid,
            role=role,
        ))

    await db.commit()
    loaded = await _load_conversation(conv.id, db)

    # Notify other members
    other_ids = [uid for uid in all_member_ids if uid != current_user.id]
    conv_data = _build_conv_out(loaded, current_user.id).model_dump(mode="json")
    await manager.broadcast_to_users(other_ids, "new_conversation", conv_data)

    return _build_conv_out(loaded, current_user.id)


@router.get("/{conv_id}", response_model=ConversationOut)
async def get_conversation(
    conv_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _load_conversation(conv_id, db)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    member_ids = [m.user_id for m in conv.members]
    if current_user.id not in member_ids:
        raise HTTPException(status_code=403, detail="Not a member")

    return _build_conv_out(conv, current_user.id)


@router.patch("/{conv_id}", response_model=ConversationOut)
async def update_group(
    conv_id: str,
    body: UpdateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _load_conversation(conv_id, db)
    if not conv or conv.type != "group":
        raise HTTPException(status_code=404, detail="Group not found")

    # Only admin can update
    member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update the group")

    if body.name is not None:
        conv.name = body.name
    if body.avatar_url is not None:
        conv.avatar_url = body.avatar_url
    if body.avatar_color is not None:
        conv.avatar_color = body.avatar_color

    await db.commit()
    loaded = await _load_conversation(conv_id, db)
    return _build_conv_out(loaded, current_user.id)


@router.post("/{conv_id}/members", response_model=ConversationOut)
async def add_members(
    conv_id: str,
    body: AddMembersRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _load_conversation(conv_id, db)
    if not conv or conv.type != "group":
        raise HTTPException(status_code=404, detail="Group not found")

    member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members")

    existing_ids = {m.user_id for m in conv.members}
    for uid in body.user_ids:
        if uid not in existing_ids:
            db.add(ConversationMember(id=new_id(), conversation_id=conv_id, user_id=uid, role="member"))

    await db.commit()
    loaded = await _load_conversation(conv_id, db)
    return _build_conv_out(loaded, current_user.id)


@router.delete("/{conv_id}/members/{user_id}", status_code=204)
async def remove_member(
    conv_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _load_conversation(conv_id, db)
    if not conv or conv.type != "group":
        raise HTTPException(status_code=404, detail="Group not found")

    member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not member or member.role != "admin":
        if user_id != current_user.id:  # allow self-leave
            raise HTTPException(status_code=403, detail="Only admins can remove members")

    target_member = next((m for m in conv.members if m.user_id == user_id), None)
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(target_member)
    await db.commit()
