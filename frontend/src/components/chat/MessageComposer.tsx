"use client";

import { useState, useRef, useEffect } from "react";
import { messagesService } from "@/services";
import { useAppStore } from "@/store/useAppStore";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { Send, X, Reply, Smile } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface MessageComposerProps {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
}

const EMOJI_PICKER = ["😀","😂","😍","🥰","😎","🤔","😢","😮","🔥","❤️","👍","👎","🙏","🎉","✅","💯","👀","😅","🤣","😭","😤","🙌","💪","🤝","🚀"];

export function MessageComposer({ conversationId, replyTo, onCancelReply }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { appendMessage, currentUser } = useAppStore();
  const { sendTyping, stopTyping } = useTypingIndicator(conversationId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [content]);

  // Focus textarea when reply changes
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    stopTyping();

    // Optimistic message
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUser!.id,
      sender: currentUser,
      content: trimmed,
      message_type: "text",
      reply_to_id: replyTo?.id ?? null,
      reply_to: replyTo,
      is_deleted: false,
      created_at: new Date().toISOString(),
      receipts: [],
      reactions: {},
      pending: true,
    };
    appendMessage(conversationId, optimistic);
    setContent("");
    onCancelReply();

    try {
      await messagesService.send(conversationId, {
        content: trimmed,
        reply_to_id: replyTo?.id,
      });
      // The real message arrives via WebSocket and replaces the optimistic one
    } catch {
      toast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#1b1c1f] border-t border-[#2a2b2f] px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-start justify-between bg-[#2a2b2f] rounded-lg px-3 py-2 mb-2 border-l-2 border-[#3a76f0]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#3a76f0]">
              <Reply size={10} className="inline mr-1" />
              {replyTo.sender?.display_name ?? "Unknown"}
            </p>
            <p className="text-xs text-[#8696a0] truncate">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="text-[#8696a0] hover:text-[#e9edef] ml-2 p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={cn(
              "p-2 rounded-full transition-colors",
              showEmojiPicker ? "text-[#e9edef] bg-[#2a2b2f]" : "text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a2b2f]"
            )}
            title="Emoji"
          >
            <Smile size={20} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-50 bg-[#222325] border border-[#3a3b40] rounded-2xl p-2 shadow-xl w-64 flex flex-wrap gap-1">
              {EMOJI_PICKER.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setContent((c) => c + e);
                    textareaRef.current?.focus();
                  }}
                  className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-[#2a2b2f]"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 bg-[#2a2b2f] border border-[#3a3b40] rounded-2xl px-4 py-2 focus-within:border-[#3a76f0] transition-colors">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value) sendTyping();
            }}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            placeholder="Message"
            rows={1}
            className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] resize-none outline-none leading-relaxed"
            style={{ maxHeight: "120px" }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            content.trim()
              ? "bg-[#00a884] text-white hover:bg-[#008f72] shadow-md"
              : "bg-[#2a2b2f] text-[#8696a0] cursor-not-allowed"
          )}
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-[10px] text-[#8696a0] text-center mt-1.5">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
