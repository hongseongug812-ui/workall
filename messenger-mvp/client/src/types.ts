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
  replyCount: number;
  reactions: Reaction[];
}

export interface Channel {
  id: string;
  type: "dm" | "group";
  name: string;
  members: User[];
  createdAt: string;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
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
