/**
 * Global auth + conversation + message store using Zustand.
 * Single source of truth for the entire app.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Conversation, Message, User, PresencePayload, ReceiptPayload, TypingPayload, ReactionPayload } from "@/types";

interface TypingState {
  [conversationId: string]: Set<string>; // set of user IDs typing
}

interface AppState {
  // ── auth ─────────────────────────────────────────────────────────────────
  currentUser: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;

  // ── conversations ─────────────────────────────────────────────────────────
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  upsertConversation: (conv: Conversation) => void;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  // ── messages ──────────────────────────────────────────────────────────────
  messages: Record<string, Message[]>; // keyed by conversation_id
  setMessages: (convId: string, msgs: Message[]) => void;
  prependMessages: (convId: string, msgs: Message[]) => void;
  appendMessage: (convId: string, msg: Message) => void;
  updateMessage: (convId: string, msgId: string, updates: Partial<Message>) => void;

  // ── presence ──────────────────────────────────────────────────────────────
  onlineUsers: Set<string>;
  setOnlineUsers: (ids: string[]) => void;
  applyPresence: (payload: PresencePayload) => void;

  // ── typing ────────────────────────────────────────────────────────────────
  typing: TypingState;
  applyTyping: (payload: TypingPayload) => void;

  // ── receipts ──────────────────────────────────────────────────────────────
  applyReceipt: (payload: ReceiptPayload) => void;

  // ── reactions ─────────────────────────────────────────────────────────────
  applyReaction: (payload: ReactionPayload) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── auth ───────────────────────────────────────────────────────────────
      currentUser: null,
      token: null,
      setAuth: (user, token) => set({ currentUser: user, token }),
      clearAuth: () => set({ currentUser: null, token: null, conversations: [], messages: {}, activeConversationId: null }),

      // ── conversations ───────────────────────────────────────────────────────
      conversations: [],
      setConversations: (convs) => set({ conversations: convs }),
      upsertConversation: (conv) =>
        set((state) => {
          const idx = state.conversations.findIndex((c) => c.id === conv.id);
          const list = [...state.conversations];
          if (idx >= 0) {
            list[idx] = conv;
          } else {
            list.unshift(conv);
          }
          // Re-sort by updated_at desc
          list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          return { conversations: list };
        }),
      activeConversationId: null,
      setActiveConversation: (id) => set({ activeConversationId: id }),

      // ── messages ─────────────────────────────────────────────────────────────
      messages: {},
      setMessages: (convId, msgs) =>
        set((state) => ({ messages: { ...state.messages, [convId]: msgs } })),
      prependMessages: (convId, msgs) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [convId]: [...msgs, ...(state.messages[convId] ?? [])],
          },
        })),
      appendMessage: (convId, msg) =>
        set((state) => {
          const existing = state.messages[convId] ?? [];
          // If a real (non-pending) message with this ID already exists, skip
          if (!msg.pending && existing.some((m) => m.id === msg.id && !m.pending)) {
            return state;
          }
          // Replace matching optimistic pending message (same sender + content)
          const pendingIdx = existing.findIndex(
            (m) => m.pending && m.sender_id === msg.sender_id && m.content === msg.content
          );
          const updated =
            pendingIdx >= 0
              ? [...existing.slice(0, pendingIdx), msg, ...existing.slice(pendingIdx + 1)]
              : [...existing, msg];
          return { messages: { ...state.messages, [convId]: updated } };
        }),
      updateMessage: (convId, msgId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [convId]: (state.messages[convId] ?? []).map((m) =>
              m.id === msgId ? { ...m, ...updates } : m
            ),
          },
        })),

      // ── presence ──────────────────────────────────────────────────────────────
      onlineUsers: new Set(),
      setOnlineUsers: (ids) => set({ onlineUsers: new Set(ids) }),
      applyPresence: ({ user_id, is_online }) =>
        set((state) => {
          const next = new Set(state.onlineUsers);
          if (is_online) next.add(user_id);
          else next.delete(user_id);
          // Also update user in conversations
          const convs = state.conversations.map((c) => ({
            ...c,
            members: c.members.map((m) =>
              m.user.id === user_id ? { ...m, user: { ...m.user, is_online } } : m
            ),
          }));
          return { onlineUsers: next, conversations: convs };
        }),

      // ── typing ────────────────────────────────────────────────────────────────
      typing: {},
      applyTyping: ({ conversation_id, user_id, is_typing }) =>
        set((state) => {
          const current = new Set(state.typing[conversation_id] ?? []);
          if (is_typing) current.add(user_id);
          else current.delete(user_id);
          return { typing: { ...state.typing, [conversation_id]: current } };
        }),

      // ── receipts ──────────────────────────────────────────────────────────────
      applyReceipt: ({ message_id, user_id, status }) =>
        set((state) => {
          const messages = { ...state.messages };
          for (const convId of Object.keys(messages)) {
            const msgs = messages[convId];
            const msgIdx = msgs.findIndex((m) => m.id === message_id);
            if (msgIdx >= 0) {
              const msg = msgs[msgIdx];
              const updatedReceipts = msg.receipts.map((r) =>
                r.user_id === user_id ? { ...r, status } : r
              );
              messages[convId] = [
                ...msgs.slice(0, msgIdx),
                { ...msg, receipts: updatedReceipts },
                ...msgs.slice(msgIdx + 1),
              ];
              break;
            }
          }
          return { messages };
        }),

      // ── reactions ─────────────────────────────────────────────────────────────
      applyReaction: ({ message_id, conversation_id, emoji, user_id, action }) =>
        set((state) => {
          const msgs = state.messages[conversation_id];
          if (!msgs) return state;
          const msgIdx = msgs.findIndex((m) => m.id === message_id);
          if (msgIdx < 0) return state;
          const msg = msgs[msgIdx];
          const current = { ...msg.reactions };
          const users = [...(current[emoji] ?? [])];
          if (action === "add" && !users.includes(user_id)) {
            current[emoji] = [...users, user_id];
          } else if (action === "remove") {
            const filtered = users.filter((u) => u !== user_id);
            if (filtered.length === 0) delete current[emoji];
            else current[emoji] = filtered;
          }
          const updated = [...msgs];
          updated[msgIdx] = { ...msg, reactions: current };
          return { messages: { ...state.messages, [conversation_id]: updated } };
        }),
    }),
    {
      name: "signal-store",
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
      }),
    }
  )
);
