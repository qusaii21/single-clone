/**
 * Hook: send typing indicators with debounced stop.
 */
"use client";

import { useCallback, useRef } from "react";
import { socketManager } from "@/lib/socket";

export function useTypingIndicator(conversationId: string) {
  const typingRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTyping = useCallback(() => {
    if (!typingRef.current) {
      typingRef.current = true;
      socketManager.send({ type: "typing", conversation_id: conversationId, is_typing: true });
    }
    // Reset the stop timer on each keystroke
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      socketManager.send({ type: "typing", conversation_id: conversationId, is_typing: false });
    }, 2000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (typingRef.current) {
      typingRef.current = false;
      socketManager.send({ type: "typing", conversation_id: conversationId, is_typing: false });
    }
  }, [conversationId]);

  return { sendTyping, stopTyping };
}
