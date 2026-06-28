"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usersService, conversationsService } from "@/services";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/components/ui/Toast";
import type { Conversation, User } from "@/types";
import { Crown, UserMinus, UserPlus, Search } from "lucide-react";

interface GroupInfoModalProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
}

export function GroupInfoModal({ conversation, open, onClose }: GroupInfoModalProps) {
  const { currentUser, upsertConversation } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = conversation.members.find(
    (m) => m.user.id === currentUser?.id
  )?.role === "admin";

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 1) { setResults([]); return; }
    try {
      const res = await usersService.searchUsers(q);
      const memberIds = new Set(conversation.members.map((m) => m.user.id));
      setResults(res.data.filter((u) => !memberIds.has(u.id)));
    } catch {}
  };

  const addMember = async (user: User) => {
    setLoading(true);
    try {
      const res = await conversationsService.addMembers(conversation.id, [user.id]);
      upsertConversation(res.data);
      setQuery(""); setResults([]);
      toast(`Added ${user.display_name}`, "success");
    } catch {
      toast("Could not add member", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: string, name: string) => {
    setLoading(true);
    try {
      await conversationsService.removeMember(conversation.id, userId);
      const updated = {
        ...conversation,
        members: conversation.members.filter((m) => m.user.id !== userId),
      };
      upsertConversation(updated);
      toast(`Removed ${name}`, "info");
    } catch {
      toast("Could not remove member", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Group Info" className="max-w-md">
      {/* Group avatar + name */}
      <div className="flex flex-col items-center mb-5">
        <Avatar
          name={conversation.name ?? "Group"}
          avatarColor={conversation.avatar_color ?? "#6C63FF"}
          avatarUrl={conversation.avatar_url}
          size="xl"
          className="mb-3"
        />
        <h3 className="text-lg font-semibold text-[#e9edef]">{conversation.name}</h3>
        <p className="text-sm text-[#8696a0]">{conversation.members.length} members</p>
      </div>

      {/* Member list */}
      <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
        {conversation.members.map((member) => (
          <div key={member.user.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#2a2b2f]">
            <Avatar
              name={member.user.display_name}
              avatarColor={member.user.avatar_color}
              avatarUrl={member.user.avatar_url}
              size="sm"
              isOnline={member.user.is_online}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e9edef] flex items-center gap-1.5 truncate">
                {member.user.display_name}
                {member.role === "admin" && (
                  <Crown size={12} className="text-yellow-400 flex-shrink-0" />
                )}
              </p>
              <p className="text-xs text-[#8696a0]">@{member.user.username}</p>
            </div>
            {isAdmin && member.user.id !== currentUser?.id && (
              <button
                onClick={() => removeMember(member.user.id, member.user.display_name)}
                className="p-1.5 text-[#8696a0] hover:text-red-400 hover:bg-[#2a2b2f] rounded-full"
                title="Remove from group"
              >
                <UserMinus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add member (admin only) */}
      {isAdmin && (
        <>
          <Input
            placeholder="Add member by name…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            leftIcon={<Search size={14} />}
            className="mb-2"
          />
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => addMember(user)}
                disabled={loading}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-[#2a2b2f] transition-colors"
              >
                <Avatar name={user.display_name} avatarColor={user.avatar_color} size="xs" />
                <span className="text-sm text-[#e9edef]">{user.display_name}</span>
                <UserPlus size={14} className="ml-auto text-[#3a76f0]" />
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
