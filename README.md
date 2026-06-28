# Signal Clone — Full-Stack Secure Messaging Web App

A production-leaning Signal Messenger clone built as a full-stack web application.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Backend | Python FastAPI |
| Database | SQLite (via SQLAlchemy async) |
| Real-time | WebSockets (FastAPI + native browser WebSocket) |
| State | Zustand (with persist middleware) |
| Auth | JWT tokens (SHA-256 password hash + mock OTP flow) |

---

## Features

- 🔒 **End-to-end encryption banner** — simulated E2E notice per conversation
- 💬 **Real-time messaging** — WebSocket-powered with instant delivery
- 👥 **Group chats** — create groups, add/remove members, admin roles
- 😄 **Emoji reactions** — react to any message with 👍❤️😂😮😢🙏; togglable, live-synced via WebSocket
- ↩️ **Message replies** — quote any message in your reply
- 🗑️ **Message delete** — soft-delete your own messages
- ✅ **Read receipts** — single/double tick, blue ticks when read
- ⌨️ **Typing indicators** — live "X is typing…" per conversation
- 🎨 **Avatar color picker** — 15 colors to personalise your profile
- ⌨️ **Keyboard shortcuts** — `Cmd/Ctrl+K` to focus search, `Esc` to close chat
- 📜 **Scroll-to-bottom button** — floating button appears when scrolled up
- 😊 **Emoji picker in composer** — insert emojis into messages
- 🔍 **User search** — find and add contacts by username
- 🟢 **Online presence** — live online/offline indicators

---

## Quick Start

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend **auto-seeds** the database on first run with demo users, conversations, and messages.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `qusai`  | `password123` | Main user — Qusai Shergardwala |
| `rahul`  | `password123` | Rahul Sharma |
| `priya`  | `password123` | Priya Patel |
| `arjun`  | `password123` | Arjun Mehta |
| `neha`   | `password123` | Neha Gupta |
| `vikram` | `password123` | Vikram Singh |

> **Mock OTP for registration: `123456`** — when registering a new account, enter this code at the verification step.

---

## Architecture

```
signal/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, lifespan (init DB + seed)
│   ├── database/
│   │   ├── connection.py        # Async SQLAlchemy engine + get_db dependency
│   │   └── seed.py              # Demo data seeder (Indian names, qusai as main user)
│   ├── models/
│   │   └── models.py            # ORM models (User, Session, Contact, Conversation, MessageReaction…)
│   ├── schemas/
│   │   └── schemas.py           # Pydantic request/response schemas
│   ├── routes/
│   │   ├── deps.py              # Auth dependency (get_current_user)
│   │   ├── auth.py              # register, verify-otp, login, logout, me, update profile
│   │   ├── users.py             # search users, contacts CRUD, online status
│   │   ├── conversations.py     # list, create, get, update, add/remove members
│   │   └── messages.py          # send, fetch (paginated), mark read, delete, react + WS
│   ├── websocket/
│   │   └── manager.py           # ConnectionManager (broadcast, presence, reactions)
│   └── utils/
│       └── helpers.py           # JWT, password hash, UUID helpers
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx          # Main chat page (auth-gated)
        │   ├── login/page.tsx    # Login + register + OTP verify
        │   └── settings/page.tsx # Profile edit + avatar color picker
        ├── components/
        │   ├── ui/               # Avatar, Button, Input, Modal, Toast
        │   ├── auth/             # LoginForm (login → register → OTP flow)
        │   ├── layout/           # Sidebar (conversation list), EmptyState
        │   ├── chat/             # ChatWindow, ChatHeader, MessageBubble,
        │   │                     # MessageComposer (with emoji picker), TypingIndicator
        │   ├── contacts/         # NewChatModal
        │   └── groups/           # CreateGroupModal, GroupInfoModal
        ├── hooks/
        │   ├── useSocketEvents.ts    # Wire WS events → Zustand store
        │   ├── useTypingIndicator.ts # Debounced typing indicator
        │   └── useKeyboardShortcuts.ts # Cmd+K, Esc shortcuts
        ├── lib/
        │   ├── api.ts            # Axios instance with auth interceptors
        │   ├── socket.ts         # WebSocket singleton with reconnect
        │   └── utils.ts          # cn(), date formatters, initials, helpers
        ├── services/index.ts     # All API calls grouped by domain
        ├── store/useAppStore.ts  # Zustand global store (applyReaction, appendMessage…)
        └── types/index.ts        # All TypeScript domain types
```

---

## Database Schema

```sql
users (
  id TEXT PK, phone TEXT UNIQUE, username TEXT UNIQUE,
  display_name TEXT, password_hash TEXT, bio TEXT,
  avatar_url TEXT, avatar_color TEXT,
  is_online BOOLEAN, last_seen DATETIME, created_at DATETIME
)

sessions (
  id TEXT PK, user_id → users, token TEXT UNIQUE,
  expires_at DATETIME, created_at DATETIME
)

contacts (
  id TEXT PK, user_id → users, contact_user_id → users,
  nickname TEXT, created_at DATETIME
)

conversations (
  id TEXT PK, type TEXT ("direct"|"group"),
  name TEXT, avatar_url TEXT, avatar_color TEXT,
  created_by → users, created_at DATETIME, updated_at DATETIME
)

conversation_members (
  id TEXT PK, conversation_id → conversations, user_id → users,
  role TEXT ("admin"|"member"), joined_at DATETIME, last_read_at DATETIME
)

messages (
  id TEXT PK, conversation_id → conversations, sender_id → users,
  content TEXT, message_type TEXT, reply_to_id → messages,
  is_deleted BOOLEAN, created_at DATETIME
)

message_receipts (
  id TEXT PK, message_id → messages, user_id → users,
  status TEXT ("sent"|"delivered"|"read"), updated_at DATETIME
)

message_reactions (
  id TEXT PK, message_id → messages (CASCADE),
  user_id → users (CASCADE), emoji VARCHAR(10), created_at DATETIME
)
```

---

## API Overview

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/verify-otp` | Mock OTP verify (always **123456**) |
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/logout` | Mark offline |
| GET  | `/api/auth/me` | Current user |
| PATCH| `/api/auth/me` | Update profile / avatar color |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/users/search?q=` | Search users by username |
| GET    | `/api/users/contacts` | List my contacts |
| POST   | `/api/users/contacts` | Add contact by username |
| DELETE | `/api/users/contacts/{id}` | Remove contact |
| GET    | `/api/users/online` | List online user IDs |

### Conversations
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/conversations` | List my conversations |
| POST   | `/api/conversations` | Create DM or group |
| GET    | `/api/conversations/{id}` | Get conversation detail |
| PATCH  | `/api/conversations/{id}` | Update group name/avatar (admin) |
| POST   | `/api/conversations/{id}/members` | Add members (admin) |
| DELETE | `/api/conversations/{id}/members/{user_id}` | Remove member |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/messages/{conv_id}` | Fetch messages (paginated) |
| POST   | `/api/messages/{conv_id}` | Send message |
| POST   | `/api/messages/{conv_id}/read` | Mark messages read |
| DELETE | `/api/messages/{conv_id}/{msg_id}` | Soft-delete message |
| POST   | `/api/messages/{conv_id}/{msg_id}/react` | Toggle emoji reaction |

### WebSocket
```
ws://localhost:8000/api/messages/ws/{jwt_token}
```

Event types received: `new_message`, `message_read`, `typing`, `presence`, `reaction`

---

## OTP Registration Flow

1. `POST /api/auth/register` → creates user, returns `user_id`
2. `POST /api/auth/verify-otp` with `{ user_id, otp: "123456" }` → returns JWT token
3. All subsequent requests use `Authorization: Bearer <token>`

> In production this would send a real SMS. For this demo the OTP is always **123456**.

---

## WebSocket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | full message object | Delivered to all conversation members |
| `message_read` | `{conversation_id, user_id, message_ids}` | Receipt update |
| `typing` | `{conversation_id, user_id, display_name}` | Typing indicator |
| `presence` | `{user_id, is_online}` | Online/offline change |
| `reaction` | `{message_id, conversation_id, emoji, user_id, action}` | Reaction add/remove |

