"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { messagesService, conversationsService } from "@/services";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import type { Conversation, Message } from "@/types";
import { Lock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const {
    messages: allMessages,
    setMessages,
    prependMessages,
    conversations,
    currentUser,
    typing,
    appendMessage,
    upsertConversation,
  } = useAppStore();

  const messages = allMessages[conversationId] ?? [];
  const conversation = conversations.find((c) => c.id === conversationId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const typingUsers = typing[conversationId];
  const otherTypingIds = typingUsers
    ? [...typingUsers].filter((id) => id !== currentUser?.id)
    : [];

  // Initial message load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await messagesService.list(conversationId);
        if (!cancelled) {
          setMessages(conversationId, res.data);
          setHasMore(res.data.length === 50);
        }
      } catch {
        // handle silently
      }
    }
    load();

    // Mark all as read on open
    return () => { cancelled = true; };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark messages read when conversation opens
  useEffect(() => {
    if (!messages.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (m) =>
          m.sender_id !== currentUser.id &&
          m.receipts.some((r) => r.user_id === currentUser.id && r.status !== "read")
      )
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      messagesService.markRead(conversationId, unreadIds).catch(() => {});
      // Reset unread count in store
      if (conversation) {
        upsertConversation({ ...conversation, unread_count: 0 });
      }
    }
  }, [conversationId, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll-to-bottom button: show when user scrolls up
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Infinite scroll upward
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0].created_at;
      const res = await messagesService.list(conversationId, oldest);
      if (res.data.length < 50) setHasMore(false);
      if (res.data.length > 0) prependMessages(conversationId, res.data);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, messages, conversationId, prependMessages]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!conversation) return null;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <ChatHeader conversation={conversation} />

      {/* Message list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#111213] relative"
      >
        {/* Encryption notice — shown once at top of conversation */}
        <div className="flex items-center justify-center my-3">
          <div className="flex items-center gap-1.5 text-xs text-[#8696a0] bg-[#1b1c1f] border border-[#2a2b2f] rounded-full px-3 py-1">
            <Lock size={10} />
            <span>Messages are end-to-end encrypted (simulated)</span>
          </div>
        </div>
        <div ref={topSentinelRef} className="h-1" />
        {loadingMore && (
          <div className="text-center text-xs text-[#8696a0] py-2">Loading…</div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[#8696a0]">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const showDateSeparator =
              !prev ||
              new Date(msg.created_at).toDateString() !==
                new Date(prev.created_at).toDateString();

            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs bg-[#1b1c1f] text-[#8696a0] px-3 py-1 rounded-full border border-[#2a2b2f]">
                      {new Date(msg.created_at).toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isMine={msg.sender_id === currentUser?.id}
                  showSender={
                    conversation.type === "group" &&
                    msg.sender_id !== currentUser?.id &&
                    prev?.sender_id !== msg.sender_id
                  }
                  onReply={() => setReplyTo(msg)}
                />
              </div>
            );
          })
        )}

        {otherTypingIds.length > 0 && (
          <TypingIndicator
            userIds={otherTypingIds}
            members={conversation.members}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="relative">
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 z-10 w-10 h-10 bg-[#005c4b] hover:bg-[#008f72] text-white rounded-full shadow-lg flex items-center justify-center transition-all"
            title="Scroll to latest"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      )}

      <MessageComposer
        conversationId={conversationId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
