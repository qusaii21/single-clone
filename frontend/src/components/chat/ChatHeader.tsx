"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { getConversationTitle, getOtherMember, formatLastSeen, cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Conversation } from "@/types";
import { ArrowLeft, Phone, Video, MoreVertical, Users, Info } from "lucide-react";
import { GroupInfoModal } from "@/components/groups/GroupInfoModal";

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const { currentUser, setActiveConversation } = useAppStore();
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const title = getConversationTitle(conversation, currentUser!.id);
  const other = conversation.type === "direct"
    ? getOtherMember(conversation, currentUser!.id)
    : null;

  const avatarColor =
    conversation.type === "group"
      ? conversation.avatar_color ?? "#6C63FF"
      : other?.user.avatar_color;
  const isOnline = conversation.type === "direct" ? other?.user.is_online : undefined;

  const subtitle =
    conversation.type === "group"
      ? `${conversation.members.length} members`
      : isOnline
      ? "online"
      : other?.user.last_seen
      ? `last seen ${formatLastSeen(other.user.last_seen)}`
      : "";

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1b1c1f] border-b border-[#2a2b2f]">
        {/* Back button (mobile) */}
        <button
          onClick={() => setActiveConversation(null)}
          className="md:hidden p-1.5 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f]"
        >
          <ArrowLeft size={20} />
        </button>

        <button
          onClick={() => conversation.type === "group" && setShowGroupInfo(true)}
          className={cn(
            "flex items-center gap-3 flex-1 min-w-0",
            conversation.type === "group" && "cursor-pointer"
          )}
        >
          <Avatar
            name={title}
            avatarUrl={conversation.avatar_url ?? (conversation.type === "direct" ? other?.user.avatar_url : null)}
            avatarColor={avatarColor}
            size="sm"
            isOnline={isOnline}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#e9edef] truncate">{title}</p>
            <p className={cn(
              "text-xs truncate",
              isOnline ? "text-[#00a884]" : "text-[#8696a0]"
            )}>
              {subtitle}
            </p>
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f] transition-colors"
            title="Voice call (coming soon)"
            onClick={() => {}}
          >
            <Phone size={18} />
          </button>
          <button
            className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f] transition-colors"
            title="Video call (coming soon)"
            onClick={() => {}}
          >
            <Video size={18} />
          </button>
          {conversation.type === "group" && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f] transition-colors"
            >
              <Info size={18} />
            </button>
          )}
        </div>
      </div>

      {conversation.type === "group" && (
        <GroupInfoModal
          conversation={conversation}
          open={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </>
  );
}
