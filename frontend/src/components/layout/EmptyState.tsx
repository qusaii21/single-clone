"use client";

import { MessageCircle, Lock } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#111213] text-center px-6">
      <div className="w-24 h-24 rounded-full bg-[#1b1c1f] border border-[#2a2b2f] flex items-center justify-center mb-6">
        <MessageCircle size={40} className="text-[#3a76f0]" />
      </div>
      <h2 className="text-2xl font-semibold text-[#e9edef] mb-2">
        Signal Web
      </h2>
      <p className="text-[#8696a0] text-sm max-w-xs leading-relaxed mb-6">
        Select a conversation from the left to start chatting. All messages are
        end-to-end encrypted (simulated).
      </p>
      <div className="flex items-center gap-2 text-xs text-[#8696a0] bg-[#1b1c1f] border border-[#2a2b2f] rounded-full px-4 py-2">
        <Lock size={12} />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}
