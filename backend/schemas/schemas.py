"""
Pydantic schemas for request/response validation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    username: str = Field(..., min_length=3, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)

class OtpVerifyRequest(BaseModel):
    phone: str
    otp: str  # Always "123456" in mock

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    phone: str
    username: str
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    avatar_color: str
    is_online: bool
    last_seen: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_color: Optional[str] = None


# ── Contact ───────────────────────────────────────────────────────────────────

class ContactOut(BaseModel):
    id: str
    user: UserOut
    nickname: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}

class AddContactRequest(BaseModel):
    username: str
    nickname: Optional[str] = None


# ── Conversation ──────────────────────────────────────────────────────────────

class ConversationMemberOut(BaseModel):
    user: UserOut
    role: str
    joined_at: datetime
    last_read_at: Optional[datetime]

    model_config = {"from_attributes": True}

class ConversationOut(BaseModel):
    id: str
    type: Literal["direct", "group"]
    name: Optional[str]
    avatar_url: Optional[str]
    avatar_color: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    members: list[ConversationMemberOut]
    last_message: Optional["MessageOut"] = None
    unread_count: int = 0

    model_config = {"from_attributes": True}

class CreateConversationRequest(BaseModel):
    type: Literal["direct", "group"] = "direct"
    member_ids: list[str]  # user IDs to add (excluding self)
    name: Optional[str] = None  # required for group

class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_color: Optional[str] = None

class AddMembersRequest(BaseModel):
    user_ids: list[str]


# ── Message ───────────────────────────────────────────────────────────────────

class MessageReceiptOut(BaseModel):
    user_id: str
    status: Literal["sent", "delivered", "read"]
    updated_at: datetime

    model_config = {"from_attributes": True}

class ReactRequest(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=10)

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: Optional[UserOut] = None
    content: str
    message_type: str
    reply_to_id: Optional[str]
    reply_to: Optional["MessageOut"] = None
    is_deleted: bool
    created_at: datetime
    receipts: list[MessageReceiptOut] = []
    reactions: dict[str, list[str]] = {}  # emoji -> list of user_ids

    model_config = {"from_attributes": True}

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: str = "text"
    reply_to_id: Optional[str] = None

class MarkReadRequest(BaseModel):
    message_ids: list[str]


# ── WebSocket events ──────────────────────────────────────────────────────────

class WsEvent(BaseModel):
    type: str
    payload: dict


# Rebuild forward references
ConversationOut.model_rebuild()
MessageOut.model_rebuild()
