"""
Auth routes: register, OTP verify, login, logout, me.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db
from models.models import Session as DbSession, User
from routes.deps import get_current_user
from schemas.schemas import (
    LoginRequest, OtpVerifyRequest, RegisterRequest,
    TokenResponse, UserOut, UserUpdateRequest,
)
from utils.helpers import (
    MOCK_OTP, create_access_token, hash_password,
    new_id, utcnow, verify_password,
)
from websocket.manager import manager

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user. OTP verification is mocked."""
    # Check duplicates
    dup = await db.execute(
        select(User).where((User.phone == body.phone) | (User.username == body.username))
    )
    if dup.scalars().first():
        raise HTTPException(status_code=400, detail="Phone or username already registered")

    user = User(
        id=new_id(),
        phone=body.phone,
        username=body.username,
        display_name=body.display_name,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()
    await db.commit()
    return {"detail": "Registered. Verify OTP to continue.", "user_id": user.id}


@router.post("/verify-otp")
async def verify_otp(body: OtpVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Mock OTP: always accept '123456'."""
    if body.otp != MOCK_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP. Use 123456 for demo.")

    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"detail": "OTP verified."}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalars().first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.id)

    # Persist token
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    db.add(DbSession(id=new_id(), user_id=user.id, token=token, expires_at=expires))

    # Mark online
    user.is_online = True
    user.last_seen = utcnow()
    await db.commit()

    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.is_online = False
    current_user.last_seen = utcnow()
    await db.commit()
    # Presence broadcast handled by WebSocket disconnect
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.bio is not None:
        current_user.bio = body.bio
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    if body.avatar_color is not None:
        current_user.avatar_color = body.avatar_color
    await db.commit()
    return UserOut.model_validate(current_user)
