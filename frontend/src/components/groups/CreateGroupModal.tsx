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
import { Search, X, Users } from "lucide-react";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { upsertConversation, setActiveConversation } = useAppStore();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 1) { setResults([]); return; }
    try {
      const res = await usersService.searchUsers(q);
      setResults(res.data.filter((u) => !selected.find((s) => s.id === u.id)));
    } catch {}
  };

  const toggleSelect = (user: User) => {
    if (selected.find((u) => u.id === user.id)) {
      setSelected((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelected((prev) => [...prev, user]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { toast("Enter a group name", "warning"); return; }
    if (selected.length < 1) { toast("Add at least 1 member", "warning"); return; }
    setLoading(true);
    try {
      const res = await conversationsService.create({
        type: "group",
        name: groupName.trim(),
        member_ids: selected.map((u) => u.id),
      });
      upsertConversation(res.data);
      setActiveConversation(res.data.id);
      onClose();
      setGroupName(""); setSelected([]); setQuery(""); setResults([]);
    } catch {
      toast("Could not create group", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Group" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Group name"
          placeholder="e.g. Engineering Team"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* Selected members */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <div key={u.id} className="flex items-center gap-1.5 bg-[#2a2b2f] rounded-full px-2.5 py-1">
                <Avatar name={u.display_name} avatarColor={u.avatar_color} size="xs" />
                <span className="text-xs text-[#e9edef]">{u.display_name}</span>
                <button onClick={() => toggleSelect(u)} className="text-[#8696a0] hover:text-red-400">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <Input
          placeholder="Search members…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          leftIcon={<Search size={14} />}
        />

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => { toggleSelect(user); setQuery(""); setResults([]); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[#2a2b2f] transition-colors"
            >
              <Avatar name={user.display_name} avatarColor={user.avatar_color} size="sm" isOnline={user.is_online} />
              <div className="text-left">
                <p className="text-sm font-medium text-[#e9edef]">{user.display_name}</p>
                <p className="text-xs text-[#8696a0]">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>

        <Button onClick={handleCreate} loading={loading} className="w-full">
          <Users size={16} />
          Create group
        </Button>
      </div>
    </Modal>
  );
}
