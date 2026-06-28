"use client";

import type { ConversationMember } from "@/types";

interface TypingIndicatorProps {
  userIds: string[];
  members: ConversationMember[];
}

export function TypingIndicator({ userIds, members }: TypingIndicatorProps) {
  const names = userIds
    .map((id) => members.find((m) => m.user.id === id)?.user.display_name ?? "Someone")
    .slice(0, 2);

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : `${names.join(" and ")} are typing`;

  return (
    <div className="flex items-center gap-2 px-1 pb-2">
      <div className="bg-[#1b1c1f] border border-[#2a2b2f] rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce [animation-delay:300ms]" />
        </span>
        <span className="text-xs text-[#8696a0]">{label}</span>
      </div>
    </div>
  );
}
