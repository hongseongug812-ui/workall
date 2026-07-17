export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
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
