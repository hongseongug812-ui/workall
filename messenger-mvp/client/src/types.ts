export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  createdAt: string;
}

export interface Attachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ForwardedFrom {
  messageId: string;
  senderId: string;
  channelId: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  parentMessageId: string | null;
  content: string | null;
  attachment: Attachment | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  pinnedAt: string | null;
  forwardedFrom: ForwardedFrom | null;
  replyCount: number;
  reactions: Reaction[];
}

export interface ReadReceipt {
  userId: string;
  lastReadAt: string;
}

export interface Channel {
  id: string;
  type: "dm" | "group";
  name: string;
  members: User[];
  createdAt: string;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  muted: boolean;
  favorite: boolean;
  readReceipts: ReadReceipt[];
}

export type PresenceStatus = "online" | "away" | "dnd";

export interface UserStatus {
  status: PresenceStatus;
  statusMessage: string | null;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface TeamAttendanceEntry {
  userId: string;
  name: string;
  department: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface ChannelNote {
  channelId: string;
  content: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ChecklistItem {
  id: string;
  channelId: string;
  text: string;
  done: boolean;
  createdAt: string;
}
