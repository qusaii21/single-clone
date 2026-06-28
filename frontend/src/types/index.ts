// ── Core domain types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  avatar_color: string;
  is_online: boolean;
  last_seen: string; // ISO string
  created_at: string;
}

export interface Contact {
  id: string;
  user: User;
  nickname: string | null;
  created_at: string;
}

export interface MessageReceipt {
  user_id: string;
  status: "sent" | "delivered" | "read";
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User | null;
  content: string;
  message_type: "text" | "image" | "file";
  reply_to_id: string | null;
  reply_to: Message | null;
  is_deleted: boolean;
  created_at: string;
  receipts: MessageReceipt[];
  reactions: Record<string, string[]>; // emoji -> user_ids
  // optimistic UI
  pending?: boolean;
}

export interface ConversationMember {
  user: User;
  role: "admin" | "member";
  joined_at: string;
  last_read_at: string | null;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message: Message | null;
  unread_count: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ── WebSocket events ──────────────────────────────────────────────────────────

export type WsEventType =
  | "new_message"
  | "receipt"
  | "typing"
  | "presence"
  | "new_conversation"
  | "conversation_update"
  | "reaction"
  | "pong";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
}

export interface TypingPayload {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface PresencePayload {
  user_id: string;
  is_online: boolean;
}

export interface ReceiptPayload {
  message_id: string;
  user_id: string;
  status: "sent" | "delivered" | "read";
}

export interface ReactionPayload {
  message_id: string;
  conversation_id: string;
  emoji: string;
  user_id: string;
  action: "add" | "remove";
}

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
}

export interface TypingPayload {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface PresencePayload {
  user_id: string;
  is_online: boolean;
}

export interface ReceiptPayload {
  message_id: string;
  user_id: string;
  status: "sent" | "delivered" | "read";
}
