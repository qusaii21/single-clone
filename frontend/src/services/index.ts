import api from "@/lib/api";
import type {
  Contact,
  Conversation,
  Message,
  TokenResponse,
  User,
} from "@/types";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authService = {
  register: (data: {
    phone: string;
    username: string;
    display_name: string;
    password: string;
  }) => api.post("/auth/register", data),

  verifyOtp: (phone: string, otp: string) =>
    api.post("/auth/verify-otp", { phone, otp }),

  login: (username: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { username, password }),

  logout: () => api.post("/auth/logout"),

  me: () => api.get<User>("/auth/me"),

  updateProfile: (data: Partial<Pick<User, "display_name" | "bio" | "avatar_url" | "avatar_color">>) =>
    api.patch<User>("/auth/me", data),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersService = {
  searchUsers: (q: string) => api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`),

  listContacts: () => api.get<Contact[]>("/users/contacts"),

  addContact: (username: string, nickname?: string) =>
    api.post<Contact>("/users/contacts", { username, nickname }),

  removeContact: (contactId: string) => api.delete(`/users/contacts/${contactId}`),

  onlineUsers: () => api.get<string[]>("/users/online"),
};

// ── Conversations ─────────────────────────────────────────────────────────────

export const conversationsService = {
  list: () => api.get<Conversation[]>("/conversations"),

  create: (data: { type: "direct" | "group"; member_ids: string[]; name?: string }) =>
    api.post<Conversation>("/conversations", data),

  get: (id: string) => api.get<Conversation>(`/conversations/${id}`),

  update: (id: string, data: { name?: string; avatar_url?: string; avatar_color?: string }) =>
    api.patch<Conversation>(`/conversations/${id}`, data),

  addMembers: (id: string, user_ids: string[]) =>
    api.post<Conversation>(`/conversations/${id}/members`, { user_ids }),

  removeMember: (convId: string, userId: string) =>
    api.delete(`/conversations/${convId}/members/${userId}`),
};

// ── Messages ──────────────────────────────────────────────────────────────────

export const messagesService = {
  list: (convId: string, before?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return api.get<Message[]>(`/messages/${convId}?${params}`);
  },

  send: (convId: string, data: { content: string; message_type?: string; reply_to_id?: string }) =>
    api.post<Message>(`/messages/${convId}`, data),

  markRead: (convId: string, message_ids: string[]) =>
    api.post(`/messages/${convId}/read`, { message_ids }),

  react: (convId: string, msgId: string, emoji: string) =>
    api.post(`/messages/${convId}/${msgId}/react`, { emoji }),

  delete: (convId: string, msgId: string) =>
    api.delete(`/messages/${convId}/${msgId}`),
};
