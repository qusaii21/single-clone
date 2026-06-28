/**
 * Hook: subscribe to WebSocket events and hydrate the Zustand store.
 * Call this once in the root layout after the user is authenticated.
 */
"use client";

import { useEffect } from "react";
import { socketManager } from "@/lib/socket";
import { useAppStore } from "@/store/useAppStore";
import type { Conversation, Message, PresencePayload, ReceiptPayload, TypingPayload, ReactionPayload } from "@/types";

export function useSocketEvents() {
  const token = useAppStore((s) => s.token);
  const currentUser = useAppStore((s) => s.currentUser);
  const appendMessage = useAppStore((s) => s.appendMessage);
  const upsertConversation = useAppStore((s) => s.upsertConversation);
  const applyPresence = useAppStore((s) => s.applyPresence);
  const applyTyping = useAppStore((s) => s.applyTyping);
  const applyReceipt = useAppStore((s) => s.applyReceipt);
  const applyReaction = useAppStore((s) => s.applyReaction);

  useEffect(() => {
    if (!token || !currentUser) return;

    socketManager.connect(token);

    const onNewMessage = (msg: Message) => {
      appendMessage(msg.conversation_id, msg);
      // Read conversations fresh from store to avoid stale closure
      const conv = useAppStore.getState().conversations.find((c) => c.id === msg.conversation_id);
      if (conv) {
        upsertConversation({
          ...conv,
          last_message: msg,
          updated_at: msg.created_at,
          unread_count:
            msg.sender_id !== currentUser.id
              ? conv.unread_count + 1
              : conv.unread_count,
        });
      }
    };

    const onNewConversation = (conv: Conversation) => upsertConversation(conv);
    const onConversationUpdate = (conv: Conversation) => upsertConversation(conv);
    const onPresence = (p: PresencePayload) => applyPresence(p);
    const onTyping = (p: TypingPayload) => applyTyping(p);
    const onReceipt = (p: ReceiptPayload) => applyReceipt(p);
    const onReaction = (p: ReactionPayload) => applyReaction(p);

    socketManager.on("new_message", onNewMessage);
    socketManager.on("new_conversation", onNewConversation);
    socketManager.on("conversation_update", onConversationUpdate);
    socketManager.on("presence", onPresence);
    socketManager.on("typing", onTyping);
    socketManager.on("receipt", onReceipt);
    socketManager.on("reaction", onReaction);

    return () => {
      socketManager.off("new_message", onNewMessage);
      socketManager.off("new_conversation", onNewConversation);
      socketManager.off("conversation_update", onConversationUpdate);
      socketManager.off("presence", onPresence);
      socketManager.off("typing", onTyping);
      socketManager.off("receipt", onReceipt);
      socketManager.off("reaction", onReaction);
    };
  }, [token, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
