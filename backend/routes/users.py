"""
User and contact routes.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.connection import get_db
from models.models import Contact, User
from routes.deps import get_current_user
from schemas.schemas import AddContactRequest, ContactOut, UserOut
from utils.helpers import new_id
from websocket.manager import manager

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[UserOut])
async def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by username or display_name (excludes self)."""
    pattern = f"%{q}%"
    result = await db.execute(
        select(User).where(
            User.id != current_user.id,
            or_(User.username.ilike(pattern), User.display_name.ilike(pattern)),
        ).limit(20)
    )
    return [UserOut.model_validate(u) for u in result.scalars().all()]


@router.get("/contacts", response_model=list[ContactOut])
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.contact))
        .where(Contact.user_id == current_user.id)
        .order_by(Contact.created_at)
    )
    contacts = result.scalars().all()
    return [
        ContactOut(
            id=c.id,
            user=UserOut.model_validate(c.contact),
            nickname=c.nickname,
            created_at=c.created_at,
        )
        for c in contacts
    ]


@router.post("/contacts", response_model=ContactOut, status_code=201)
async def add_contact(
    body: AddContactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Resolve user
    result = await db.execute(select(User).where(User.username == body.username))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    # Check duplicate
    existing = await db.execute(
        select(Contact).where(
            Contact.user_id == current_user.id,
            Contact.contact_user_id == target.id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Contact already added")

    contact = Contact(id=new_id(), user_id=current_user.id, contact_user_id=target.id, nickname=body.nickname)
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    return ContactOut(
        id=contact.id,
        user=UserOut.model_validate(target),
        nickname=contact.nickname,
        created_at=contact.created_at,
    )


@router.delete("/contacts/{contact_id}", status_code=204)
async def remove_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)
    )
    contact = result.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)
    await db.commit()


@router.get("/online", response_model=list[str])
async def online_users(_: User = Depends(get_current_user)):
    """Return list of currently online user IDs (via WebSocket)."""
    return list(manager.online_user_ids)
