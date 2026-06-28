import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format a timestamp into a Signal-style relative label:
 * - today → "HH:MM"
 * - yesterday → "Yesterday"
 * - this week → "Mon", "Tue" …
 * - older → "MM/DD/YYYY"
 */
export function formatConversationTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

  if (date >= todayStart) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (date >= yesterdayStart) return "Yesterday";
  if (date >= weekStart) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
}

/**
 * Format a message timestamp: "HH:MM AM/PM"
 */
export function formatMessageTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format "last seen" for the chat header subtitle.
 */
export function formatLastSeen(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Return initials from a display name (up to 2 chars).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Get the display name / title for a conversation (for direct chats
 * we show the other person's name; for groups we show the group name).
 */
export function getConversationTitle(
  conv: { type: string; name: string | null; members: { user: { id: string; display_name: string } }[] },
  currentUserId: string
): string {
  if (conv.type === "group") return conv.name ?? "Group";
  const other = conv.members.find((m) => m.user.id !== currentUserId);
  return other?.user.display_name ?? "Unknown";
}

/**
 * For direct chats, return the other participant.
 */
export function getOtherMember(
  conv: { members: { user: { id: string; display_name: string; avatar_url: string | null; avatar_color: string; is_online: boolean; last_seen: string } }[] },
  currentUserId: string
) {
  return conv.members.find((m) => m.user.id !== currentUserId) ?? conv.members[0];
}
