/**
 * Main chat page — authenticated.
 * Loads conversations, starts WebSocket, renders Sidebar + ChatWindow.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { conversationsService, usersService } from "@/services";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { EmptyState } from "@/components/layout/EmptyState";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { token, currentUser, setConversations, setOnlineUsers, activeConversationId } = useAppStore();
  const [loading, setLoading] = useState(true);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!token || !currentUser) {
      router.replace("/login");
    }
  }, [token, currentUser, router]);

  // Load conversations on mount
  useEffect(() => {
    if (!token) return;
    async function bootstrap() {
      try {
        const [convRes, onlineRes] = await Promise.all([
          conversationsService.list(),
          usersService.onlineUsers(),
        ]);
        setConversations(convRes.data);
        setOnlineUsers(onlineRes.data);
      } catch {
        // handle silently — user will see empty state
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to WebSocket events
  useSocketEvents();
  useKeyboardShortcuts();

  if (!token || !currentUser) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar — hidden on mobile when a chat is active */}
      <div className={cn(
        "flex-shrink-0",
        activeConversationId ? "hidden md:flex" : "flex w-full md:w-auto"
      )}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex",
        !activeConversationId ? "hidden md:flex" : "flex"
      )}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-[#111213]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#3a76f0] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#8696a0]">Loading messages…</p>
            </div>
          </div>
        ) : activeConversationId ? (
          <ChatWindow key={activeConversationId} conversationId={activeConversationId} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
