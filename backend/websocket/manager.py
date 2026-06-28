"""
WebSocket connection manager.

Each connected client registers with their user_id.
The manager broadcasts typed JSON events to individual users or
to all members of a conversation.
"""
import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # user_id -> set of active WebSocket connections (multiple tabs)
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    # ── lifecycle ─────────────────────────────────────────────────────────

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        self._connections[user_id].add(websocket)
        logger.info("WS connected: %s (total sockets: %d)", user_id, self.total_connections)

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        self._connections[user_id].discard(websocket)
        if not self._connections[user_id]:
            del self._connections[user_id]
        logger.info("WS disconnected: %s", user_id)

    @property
    def online_user_ids(self) -> set[str]:
        return set(self._connections.keys())

    @property
    def total_connections(self) -> int:
        return sum(len(s) for s in self._connections.values())

    def is_online(self, user_id: str) -> bool:
        return user_id in self._connections

    # ── sending ───────────────────────────────────────────────────────────

    async def send_to_user(self, user_id: str, event_type: str, payload: Any) -> None:
        """Send an event to all connections belonging to a user."""
        sockets = list(self._connections.get(user_id, []))
        if not sockets:
            return
        message = json.dumps({"type": event_type, "payload": payload})
        results = await asyncio.gather(
            *[ws.send_text(message) for ws in sockets],
            return_exceptions=True,
        )
        # Clean up dead sockets
        for ws, result in zip(sockets, results):
            if isinstance(result, Exception):
                self._connections[user_id].discard(ws)

    async def broadcast_to_users(self, user_ids: list[str], event_type: str, payload: Any) -> None:
        """Broadcast an event to a list of users (e.g. all members of a conversation)."""
        await asyncio.gather(
            *[self.send_to_user(uid, event_type, payload) for uid in user_ids],
            return_exceptions=True,
        )

    # ── typed event helpers ───────────────────────────────────────────────

    async def emit_new_message(self, member_ids: list[str], message_data: dict) -> None:
        await self.broadcast_to_users(member_ids, "new_message", message_data)

    async def emit_typing(self, member_ids: list[str], conversation_id: str, user_id: str, is_typing: bool) -> None:
        await self.broadcast_to_users(member_ids, "typing", {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing,
        })

    async def emit_receipt(self, member_ids: list[str], message_id: str, user_id: str, status: str) -> None:
        await self.broadcast_to_users(member_ids, "receipt", {
            "message_id": message_id,
            "user_id": user_id,
            "status": status,
        })

    async def emit_presence(self, observer_ids: list[str], user_id: str, is_online: bool) -> None:
        await self.broadcast_to_users(observer_ids, "presence", {
            "user_id": user_id,
            "is_online": is_online,
        })

    async def emit_reaction(
        self, member_ids: list[str], message_id: str,
        conversation_id: str, emoji: str, user_id: str, action: str
    ) -> None:
        await self.broadcast_to_users(member_ids, "reaction", {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "emoji": emoji,
            "user_id": user_id,
            "action": action,  # "add" | "remove"
        })

    async def emit_conversation_update(self, member_ids: list[str], conversation_data: dict) -> None:
        await self.broadcast_to_users(member_ids, "conversation_update", conversation_data)


# Singleton – imported by routes and main
manager = ConnectionManager()
