"""
Seed script: populates the database with demo users, conversations, and messages
so the app is immediately usable after startup.
"""
import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import AsyncSessionLocal, init_db
from models.models import (
    Conversation, ConversationMember, Message, MessageReceipt,
    User, Contact,
)

# ── helpers ──────────────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def _uid() -> str:
    return str(uuid.uuid4())

def _now(offset_minutes: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=offset_minutes)


# ── demo users ────────────────────────────────────────────────────────────────

DEMO_USERS = [
    {
        "id": "user-qusai-001",
        "phone": "+91-98765-00001",
        "username": "qusai",
        "display_name": "Qusai Shergardwala",
        "password_hash": _hash("password123"),
        "bio": "Building things that matter 🔒",
        "avatar_color": "#5B5EA6",
        "is_online": True,
        "last_seen": _now(),
    },
    {
        "id": "user-rahul-002",
        "phone": "+91-98765-00002",
        "username": "rahul",
        "display_name": "Rahul Sharma",
        "password_hash": _hash("password123"),
        "bio": "Senior SDE @ Nexora | chai over coffee ☕",
        "avatar_color": "#2E9E6F",
        "is_online": False,
        "last_seen": _now(-30),
    },
    {
        "id": "user-priya-003",
        "phone": "+91-98765-00003",
        "username": "priya",
        "display_name": "Priya Patel",
        "password_hash": _hash("password123"),
        "bio": "Product @ Nexora | design nerd 🎨",
        "avatar_color": "#C06C84",
        "is_online": True,
        "last_seen": _now(),
    },
    {
        "id": "user-arjun-004",
        "phone": "+91-98765-00004",
        "username": "arjun",
        "display_name": "Arjun Mehta",
        "password_hash": _hash("password123"),
        "bio": "Backend infra, k8s, and cricket 🏏",
        "avatar_color": "#F67280",
        "is_online": False,
        "last_seen": _now(-90),
    },
    {
        "id": "user-neha-005",
        "phone": "+91-98765-00005",
        "username": "neha",
        "display_name": "Neha Gupta",
        "password_hash": _hash("password123"),
        "bio": "Security researcher | privacy first 🔐",
        "avatar_color": "#355C7D",
        "is_online": True,
        "last_seen": _now(),
    },
    {
        "id": "user-vikram-006",
        "phone": "+91-98765-00006",
        "username": "vikram",
        "display_name": "Vikram Singh",
        "password_hash": _hash("password123"),
        "bio": "DevOps & cloud | Bangalore 🌆",
        "avatar_color": "#6C63FF",
        "is_online": False,
        "last_seen": _now(-200),
    },
]

# ── direct message conversations ──────────────────────────────────────────────

DM_CONVERSATIONS = [
    {
        "id": "conv-qusai-rahul",
        "members": ["user-qusai-001", "user-rahul-002"],
        "messages": [
            ("user-rahul-002",  _now(-4320), "Qusai bhai, did you push the new auth changes?"),
            ("user-qusai-001", _now(-4310), "Haan yaar, just pushed. Check PR #47"),
            ("user-rahul-002",  _now(-4300), "Nice, reviewing now 👀"),
            ("user-rahul-002",  _now(-4290), "Left 2 comments — minor stuff. Looks clean overall!"),
            ("user-qusai-001", _now(-4280), "Thanks bhai, will fix tonight"),
            ("user-qusai-001", _now(-60),   "Hey, can we sync on the DB schema tomorrow?"),
            ("user-rahul-002",  _now(-50),   "Absolutely. 11am works?"),
            ("user-qusai-001", _now(-45),   "Perfect 👍 I'll share the ER diagram before"),
            ("user-rahul-002",  _now(-10),   "Sounds good. Also, lunch at the usual place after?"),
            ("user-qusai-001", _now(-5),    "100% 😄"),
        ],
    },
    {
        "id": "conv-qusai-priya",
        "members": ["user-qusai-001", "user-priya-003"],
        "messages": [
            ("user-priya-003", _now(-2880), "Qusai, the new UI designs are ready for your review"),
            ("user-qusai-001", _now(-2870), "Sending me the Figma link?"),
            ("user-priya-003", _now(-2860), "Done! Check Slack, just shared it"),
            ("user-qusai-001", _now(-2850), "This looks really Signal-like, I love it ❤️"),
            ("user-priya-003", _now(-2840), "That was the goal! Minimal and clean"),
            ("user-priya-003", _now(-20),   "Hey, are you joining the standup?"),
            ("user-qusai-001", _now(-15),   "Yes! On my way, 2 mins"),
            ("user-priya-003", _now(-12),   "Cool, everyone's on the call already"),
            ("user-qusai-001", _now(-8),    "Joining now!"),
        ],
    },
    {
        "id": "conv-qusai-arjun",
        "members": ["user-qusai-001", "user-arjun-004"],
        "messages": [
            ("user-arjun-004",  _now(-1440), "Qusai, can you review the infra setup for prod?"),
            ("user-qusai-001", _now(-1430), "Sure, share the doc"),
            ("user-arjun-004",  _now(-1420), "Shared in Confluence. The SQLite → Postgres migration plan is in there too"),
            ("user-qusai-001", _now(-1410), "Got it. I'll look at it today. The async engine setup looks good"),
            ("user-arjun-004",  _now(-1400), "Yeah, greenlet was the tricky dependency 😅"),
            ("user-qusai-001", _now(-30),   "Arjun, the WebSocket reconnect logic is solid now"),
            ("user-arjun-004",  _now(-20),   "Great! Did you handle the auth token in the WS URL path?"),
            ("user-qusai-001", _now(-15),   "Yes — token in URL since browser WS doesn't support headers"),
            ("user-arjun-004",  _now(-5),    "Smart. Much cleaner than cookie-based for a demo 👏"),
        ],
    },
    {
        "id": "conv-qusai-neha",
        "members": ["user-qusai-001", "user-neha-005"],
        "messages": [
            ("user-neha-005",   _now(-720), "Hey Qusai! Loved the mock encryption approach"),
            ("user-qusai-001", _now(-710), "Haha thanks Neha! It's SHA-256 + mock OTP — keeps things simple for the demo"),
            ("user-neha-005",   _now(-700), "Totally makes sense. Signal Protocol is overkill for an assignment 😄"),
            ("user-qusai-001", _now(-690), "Exactly. The architecture shows the right patterns at least"),
            ("user-neha-005",   _now(-10),  "The delivery receipts + typing indicators are chef's kiss 🤌"),
        ],
    },
]

# ── group conversations ────────────────────────────────────────────────────────

GROUP_CONVERSATIONS = [
    {
        "id": "conv-group-devteam",
        "name": "Nexora Dev Team 🚀",
        "avatar_color": "#5B5EA6",
        "created_by": "user-qusai-001",
        "members": [
            ("user-qusai-001", "admin"),
            ("user-rahul-002", "member"),
            ("user-priya-003", "member"),
            ("user-arjun-004", "member"),
            ("user-neha-005",  "member"),
            ("user-vikram-006","member"),
        ],
        "messages": [
            ("user-qusai-001", _now(-5760), "Welcome to the Nexora Dev Team group! 🎉"),
            ("user-rahul-002", _now(-5750), "Finally a proper group chat 🙌"),
            ("user-priya-003", _now(-5740), "Love the Signal-inspired design btw!"),
            ("user-arjun-004", _now(-5730), "Real-time WebSockets are working great"),
            ("user-neha-005",  _now(-5720), "End-to-end encrypted (simulated) 😄🔒"),
            ("user-vikram-006",_now(-5710), "Deployed on Render + Vercel — smooth!"),
            ("user-qusai-001", _now(-120),  "Team, sprint review tomorrow at 3pm IST"),
            ("user-rahul-002", _now(-110),  "I'll be there 👍"),
            ("user-priya-003", _now(-100),  "Same, will share the design updates"),
            ("user-arjun-004", _now(-90),   "Can we also discuss the Postgres migration?"),
            ("user-qusai-001", _now(-85),   "Yes, added it to the agenda"),
            ("user-neha-005",  _now(-80),   "Also want to walk through the security model briefly"),
            ("user-vikram-006",_now(-75),   "CI/CD pipeline updates from my side too"),
            ("user-rahul-002", _now(-30),   "Qusai, the PR reviews are done! All green ✅"),
            ("user-qusai-001", _now(-20),   "Merging now 🚀"),
            ("user-priya-003", _now(-15),   "Yesss! Ship it!"),
            ("user-arjun-004", _now(-10),   "🎉🎉🎉"),
            ("user-neha-005",  _now(-5),    "Love the velocity this week team 💪"),
        ],
    },
]


async def seed(db: AsyncSession) -> None:
    result = await db.execute(select(User).limit(1))
    if result.scalars().first():
        print("Database already seeded — skipping.")
        return

    print("Seeding database with demo data…")

    # ── users ──────────────────────────────────────────────────────────────
    user_map: dict[str, User] = {}
    for u in DEMO_USERS:
        user = User(**u)
        db.add(user)
        user_map[u["id"]] = user

    await db.flush()

    # ── contacts (qusai knows everyone) ───────────────────────────────────
    qusai_id = "user-qusai-001"
    for u in DEMO_USERS:
        if u["id"] == qusai_id:
            continue
        db.add(Contact(id=_uid(), user_id=qusai_id, contact_user_id=u["id"]))
        db.add(Contact(id=_uid(), user_id=u["id"], contact_user_id=qusai_id))

    await db.flush()

    # ── direct conversations ───────────────────────────────────────────────
    for conv_data in DM_CONVERSATIONS:
        conv = Conversation(
            id=conv_data["id"],
            type="direct",
            created_by=conv_data["members"][0],
        )
        db.add(conv)
        await db.flush()

        for member_id in conv_data["members"]:
            db.add(ConversationMember(
                id=_uid(), conversation_id=conv.id, user_id=member_id,
                role="member", last_read_at=_now(),
            ))

        for sender_id, created_at, content in conv_data["messages"]:
            msg = Message(
                id=_uid(), conversation_id=conv.id, sender_id=sender_id,
                content=content, created_at=created_at,
            )
            db.add(msg)
            await db.flush()

            for member_id in conv_data["members"]:
                if member_id != sender_id:
                    db.add(MessageReceipt(
                        id=_uid(), message_id=msg.id, user_id=member_id, status="read",
                    ))

        conv.updated_at = conv_data["messages"][-1][1]

    # ── group conversations ────────────────────────────────────────────────
    for gdata in GROUP_CONVERSATIONS:
        conv = Conversation(
            id=gdata["id"], type="group", name=gdata["name"],
            avatar_color=gdata["avatar_color"], created_by=gdata["created_by"],
        )
        db.add(conv)
        await db.flush()

        for member_id, role in gdata["members"]:
            db.add(ConversationMember(
                id=_uid(), conversation_id=conv.id, user_id=member_id,
                role=role, last_read_at=_now(),
            ))

        for sender_id, created_at, content in gdata["messages"]:
            msg = Message(
                id=_uid(), conversation_id=conv.id, sender_id=sender_id,
                content=content, created_at=created_at,
            )
            db.add(msg)
            await db.flush()

            for member_id, _ in gdata["members"]:
                if member_id != sender_id:
                    db.add(MessageReceipt(
                        id=_uid(), message_id=msg.id, user_id=member_id, status="read",
                    ))

        conv.updated_at = gdata["messages"][-1][1]

    await db.commit()
    print("✅ Seed complete — 6 users, 4 DMs, 1 group.")


async def run_seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed(db)

if __name__ == "__main__":
    asyncio.run(run_seed())
