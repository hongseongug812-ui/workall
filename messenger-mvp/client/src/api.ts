import type { Channel, Message, User } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error || `요청 실패 (${res.status})`, res.status);
  }
  return body as T;
}

export const api = {
  register: (data: { email: string; password: string; name: string; department: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<{ user: User }>("/api/auth/me"),
  listUsers: () => request<{ users: User[] }>("/api/users"),
  listChannels: () => request<{ channels: Channel[] }>("/api/channels"),
  openDm: (otherUserId: string) =>
    request<{ channel: Channel }>("/api/channels", {
      method: "POST",
      body: JSON.stringify({ type: "dm", memberIds: [otherUserId] }),
    }),
  createGroup: (name: string, memberIds: string[]) =>
    request<{ channel: Channel }>("/api/channels", {
      method: "POST",
      body: JSON.stringify({ type: "group", name, memberIds }),
    }),
  listMessages: (channelId: string) =>
    request<{ messages: Message[] }>(`/api/channels/${channelId}/messages`),
  markRead: (channelId: string) =>
    request<{ lastReadAt: string }>(`/api/channels/${channelId}/read`, { method: "POST" }),
};

export { ApiError, API_BASE };
