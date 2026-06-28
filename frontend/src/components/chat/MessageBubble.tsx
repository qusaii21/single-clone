"use client";

import { useState } from "react";
import type { Message } from "@/types";
import { formatMessageTime, cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Reply, Trash2, Check, CheckCheck, SmilePlus } from "lucide-react";
import { messagesService } from "@/services";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/components/ui/Toast";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSender: boolean;
  onReply: () => void;
}

function DeliveryIcon({ message, isMine }: { message: Message; isMine: boolean }) {
  if (!isMine) return null;
  const allRead = message.receipts.length > 0 && message.receipts.every((r) => r.status === "read");
  const anyDelivered = message.receipts.some((r) => r.status === "delivered" || r.status === "read");
  if (message.pending) return <Check size={12} className="text-[#8696a0]" />;
  if (allRead) return <CheckCheck size={12} className="text-[#53bdeb]" />;
  if (anyDelivered) return <CheckCheck size={12} className="text-[#8696a0]" />;
  return <Check size={12} className="text-[#8696a0]" />;
}

export function MessageBubble({ message, isMine, showSender, onReply }: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { updateMessage, currentUser, applyReaction } = useAppStore();

  const handleDelete = async () => {
    try {
      await messagesService.delete(message.conversation_id, message.id);
      updateMessage(message.conversation_id, message.id, {
        is_deleted: true,
        content: "🗑 This message was deleted",
      });
    } catch {
      toast("Could not delete message", "error");
    }
  };

  const handleReact = async (emoji: string) => {
    setShowPicker(false);
    try {
      // Optimistic update
      const currentUserIds = message.reactions[emoji] ?? [];
      const alreadyReacted = currentUserIds.includes(currentUser!.id);
      applyReaction({
        message_id: message.id,
        conversation_id: message.conversation_id,
        emoji,
        user_id: currentUser!.id,
        action: alreadyReacted ? "remove" : "add",
      });
      await messagesService.react(message.conversation_id, message.id, emoji);
    } catch {
      toast("Could not react", "error");
    }
  };

  const reactionEntries = Object.entries(message.reactions ?? {});
  const sender = message.sender;

  return (
    <div
      className={cn(
        "flex items-end gap-2 group px-1 relative",
        isMine ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {!isMine && sender && (
        <Avatar
          name={sender.display_name}
          avatarColor={sender.avatar_color}
          avatarUrl={sender.avatar_url}
          size="xs"
          className="mb-1 flex-shrink-0"
        />
      )}

      <div className={cn("flex flex-col max-w-[65%]", isMine ? "items-end" : "items-start")}>
        {/* Sender name */}
        {showSender && sender && (
          <span className="text-xs font-medium mb-1 px-1" style={{ color: sender.avatar_color }}>
            {sender.display_name}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 mb-1 text-xs border-l-2 max-w-full",
            isMine
              ? "bg-[#1a3a4a] border-[#53bdeb] text-[#aebac1]"
              : "bg-[#2a2b2f] border-[#8696a0] text-[#aebac1]"
          )}>
            <div className="min-w-0">
              <p className="font-medium text-[#53bdeb] truncate">
                {message.reply_to.sender?.display_name ?? "Unknown"}
              </p>
              <p className="truncate">{message.reply_to.content}</p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2 shadow-sm",
            isMine
              ? "bg-[#005c4b] text-[#e9edef] rounded-br-md"
              : "bg-[#1b1c1f] text-[#e9edef] rounded-bl-md border border-[#2a2b2f]",
            message.pending && "opacity-70",
            message.is_deleted && "italic opacity-60"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <div className="flex items-center gap-1 mt-0.5 justify-end">
            <span className="text-[10px] text-[#8696a0]">
              {formatMessageTime(message.created_at)}
            </span>
            <DeliveryIcon message={message} isMine={isMine} />
          </div>
        </div>

        {/* Reaction chips */}
        {reactionEntries.length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-1 mt-1",
            isMine ? "justify-end" : "justify-start"
          )}>
            {reactionEntries.map(([emoji, userIds]) => {
              const iReacted = userIds.includes(currentUser!.id);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                    iReacted
                      ? "bg-[#005c4b] border-[#00a884] text-white"
                      : "bg-[#2a2b2f] border-[#3a3b40] text-[#e9edef] hover:border-[#8696a0]"
                  )}
                  title={`${userIds.length} reaction${userIds.length > 1 ? "s" : ""}`}
                >
                  <span>{emoji}</span>
                  {userIds.length > 1 && <span className="font-medium">{userIds.length}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover action bar — CSS group-hover, always in DOM with full pointer events */}
      <div className={cn(
        "flex items-center gap-0.5 flex-shrink-0 transition-opacity",
        showPicker ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {/* Emoji reaction picker trigger */}
        {!message.is_deleted && (
          <div className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="p-1.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a2b2f]"
              title="React"
            >
              <SmilePlus size={14} />
            </button>
            {showPicker && (
              <div
                className={cn(
                  "absolute bottom-8 z-50 flex gap-1 bg-[#222325] border border-[#3a3b40] rounded-2xl px-2 py-1.5 shadow-xl",
                  isMine ? "right-0" : "left-0"
                )}
                onMouseLeave={() => setShowPicker(false)}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="text-lg hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!message.is_deleted && (
          <button
            onClick={onReply}
            className="p-1.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a2b2f]"
            title="Reply"
          >
            <Reply size={14} />
          </button>
        )}
        {isMine && !message.is_deleted && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-full text-[#8696a0] hover:text-red-400 hover:bg-[#2a2b2f]"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
