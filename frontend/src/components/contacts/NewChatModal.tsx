"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { usersService, conversationsService } from "@/services";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/components/ui/Toast";
import type { User } from "@/types";
import { Search, UserPlus } from "lucide-react";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewChatModal({ open, onClose }: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { upsertConversation, setActiveConversation } = useAppStore();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 1) { setResults([]); return; }
    try {
      const res = await usersService.searchUsers(q);
      setResults(res.data);
    } catch {
      // silent
    }
  };

  const startChat = async (user: User) => {
    setLoading(true);
    try {
      const res = await conversationsService.create({ type: "direct", member_ids: [user.id] });
      upsertConversation(res.data);
      setActiveConversation(res.data.id);
      onClose();
      setQuery(""); setResults([]);
    } catch {
      toast("Could not start conversation", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Message">
      <Input
        placeholder="Search by username or name…"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        leftIcon={<Search size={14} />}
        className="mb-3"
        autoFocus
      />
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {results.length === 0 && query.length > 0 && (
          <p className="text-sm text-[#8696a0] text-center py-4">No users found</p>
        )}
        {results.map((user) => (
          <button
            key={user.id}
            onClick={() => startChat(user)}
            disabled={loading}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[#2a2b2f] transition-colors"
          >
            <Avatar
              name={user.display_name}
              avatarUrl={user.avatar_url}
              avatarColor={user.avatar_color}
              size="sm"
              isOnline={user.is_online}
            />
            <div className="text-left">
              <p className="text-sm font-medium text-[#e9edef]">{user.display_name}</p>
              <p className="text-xs text-[#8696a0]">@{user.username}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
