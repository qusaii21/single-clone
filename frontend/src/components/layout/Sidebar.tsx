"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { conversationsService } from "@/services";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { formatConversationTime, getConversationTitle, getOtherMember, cn } from "@/lib/utils";
import {
  MessageCircle, Search, Settings, Users,
  Plus, LogOut, Edit3, MoreVertical,
} from "lucide-react";
import { NewChatModal } from "@/components/contacts/NewChatModal";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { authService } from "@/services";
import { useRouter } from "next/navigation";
import { socketManager } from "@/lib/socket";

export function Sidebar() {
  const router = useRouter();
  const { conversations, currentUser, activeConversationId, setActiveConversation, clearAuth } =
    useAppStore();

  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const filtered = conversations.filter((c) => {
    const title = getConversationTitle(c, currentUser!.id).toLowerCase();
    return title.includes(search.toLowerCase());
  });

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    socketManager.disconnect();
    clearAuth();
    localStorage.removeItem("signal_token");
    localStorage.removeItem("signal_user");
    router.replace("/login");
  };

  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col bg-[#1b1c1f] border-r border-[#2a2b2f] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2b2f]">
        <div className="flex items-center gap-3">
          {currentUser && (
            <Avatar
              name={currentUser.display_name}
              avatarUrl={currentUser.avatar_url}
              avatarColor={currentUser.avatar_color}
              size="sm"
              isOnline
            />
          )}
          <span className="font-semibold text-[#e9edef] text-sm">Signal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f] transition-colors"
            title="New direct message"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={() => setShowNewGroup(true)}
            className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f] transition-colors"
            title="New group"
          >
            <Users size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a2b2f] transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 bg-[#222325] border border-[#3a3b40] rounded-xl shadow-xl z-50 min-w-[160px] py-1">
                <button
                  onClick={() => { setShowMenu(false); router.push("/settings"); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#e9edef] hover:bg-[#2a2b2f] w-full"
                >
                  <Settings size={15} />
                  Settings
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleLogout(); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#2a2b2f] w-full"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <Input
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={14} />}
          className="bg-[#2a2b2f] border-transparent"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#8696a0] text-sm gap-2">
            <MessageCircle size={32} className="opacity-30" />
            <span>{search ? "No results" : "No conversations yet"}</span>
          </div>
        ) : (
          filtered.map((conv) => {
            const title = getConversationTitle(conv, currentUser!.id);
            const other = conv.type === "direct" ? getOtherMember(conv, currentUser!.id) : null;
            const avatarColor = conv.type === "group" ? (conv.avatar_color ?? "#6C63FF") : other?.user.avatar_color;
            const isOnline = conv.type === "direct" ? other?.user.is_online : undefined;
            const isActive = conv.id === activeConversationId;

            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 text-left transition-colors",
                  isActive ? "bg-[#2a2b2f]" : "hover:bg-[#222325]"
                )}
              >
                <Avatar
                  name={title}
                  avatarUrl={conv.avatar_url ?? (conv.type === "direct" ? other?.user.avatar_url : null)}
                  avatarColor={avatarColor}
                  size="md"
                  isOnline={isOnline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#e9edef] text-sm truncate">{title}</span>
                    {conv.last_message && (
                      <span className="text-xs text-[#8696a0] flex-shrink-0 ml-2">
                        {formatConversationTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-[#8696a0] truncate">
                      {conv.last_message
                        ? conv.last_message.is_deleted
                          ? "🗑 Message deleted"
                          : conv.last_message.content
                        : "No messages yet"}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-[#00a884] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} />
      <CreateGroupModal open={showNewGroup} onClose={() => setShowNewGroup(false)} />
    </aside>
  );
}
