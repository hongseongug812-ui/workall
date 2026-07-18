import type { Attachment, Attendance, Channel, ChannelNote, ChecklistItem, Message, TeamAttendanceEntry, User } from "./types";

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
  updateProfile: (data: { name?: string; department?: string }) =>
    request<{ user: User }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
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
  listMessages: (channelId: string, opts?: { before?: string }) => {
    const params = opts?.before ? `?before=${encodeURIComponent(opts.before)}` : "";
    return request<{ messages: Message[] }>(`/api/channels/${channelId}/messages${params}`);
  },
  markRead: (channelId: string) =>
    request<{ lastReadAt: string }>(`/api/channels/${channelId}/read`, { method: "POST" }),
  addMembers: (channelId: string, memberIds: string[]) =>
    request<{ channel: Channel }>(`/api/channels/${channelId}/members`, {
      method: "POST",
      body: JSON.stringify({ memberIds }),
    }),
  leaveChannel: (channelId: string) =>
    request<void>(`/api/channels/${channelId}/members/me`, { method: "DELETE" }),
  getThread: (channelId: string, messageId: string) =>
    request<{ parent: Message; replies: Message[] }>(
      `/api/channels/${channelId}/messages/${messageId}/thread`
    ),
  getPinnedMessages: (channelId: string) =>
    request<{ messages: Message[] }>(`/api/channels/${channelId}/pinned`),
  setMuted: (channelId: string, muted: boolean) =>
    request<{ muted: boolean }>(`/api/channels/${channelId}/mute`, {
      method: "POST",
      body: JSON.stringify({ muted }),
    }),
  setFavorite: (channelId: string, favorite: boolean) =>
    request<{ favorite: boolean }>(`/api/channels/${channelId}/favorite`, {
      method: "POST",
      body: JSON.stringify({ favorite }),
    }),
  search: (query: string, channelId?: string) => {
    const params = new URLSearchParams({ q: query });
    if (channelId) params.set("channelId", channelId);
    return request<{ messages: Message[] }>(`/api/search?${params.toString()}`);
  },
  async uploadFile(file: File): Promise<Attachment> {
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api/uploads`, { method: "POST", headers, body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body.error || `업로드 실패 (${res.status})`, res.status);
    return body as Attachment;
  },
  getTodayAttendance: () => request<{ attendance: Attendance | null }>("/api/attendance/today"),
  checkIn: () => request<{ attendance: Attendance }>("/api/attendance/check-in", { method: "POST" }),
  checkOut: () => request<{ attendance: Attendance }>("/api/attendance/check-out", { method: "POST" }),
  getAttendanceHistory: (limit = 30) =>
    request<{ history: Attendance[] }>(`/api/attendance/history?limit=${limit}`),
  getTeamAttendanceToday: () =>
    request<{ team: TeamAttendanceEntry[]; date: string }>("/api/attendance/team-today"),
  getChannelNote: (channelId: string) =>
    request<{ note: ChannelNote }>(`/api/channels/${channelId}/notes`),
  setChannelNote: (channelId: string, content: string) =>
    request<{ note: ChannelNote }>(`/api/channels/${channelId}/notes`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  listChecklist: (channelId: string) =>
    request<{ items: ChecklistItem[] }>(`/api/channels/${channelId}/checklist`),
  addChecklistItem: (channelId: string, text: string) =>
    request<{ item: ChecklistItem }>(`/api/channels/${channelId}/checklist`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  setChecklistItemDone: (channelId: string, itemId: string, done: boolean) =>
    request<{ item: ChecklistItem }>(`/api/channels/${channelId}/checklist/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ done }),
    }),
  deleteChecklistItem: (channelId: string, itemId: string) =>
    request<void>(`/api/channels/${channelId}/checklist/${itemId}`, { method: "DELETE" }),
};

export { ApiError, API_BASE };
