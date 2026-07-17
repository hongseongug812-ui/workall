import { io, Socket } from "socket.io-client";
import { API_BASE } from "./api";
import type { Attachment, Message } from "./types";

interface AckResponse {
  message?: Message;
  error?: string;
}

interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;
  "typing": (payload: { channelId: string; userId: string; isTyping: boolean }) => void;
  "presence:update": (payload: { userId: string; online: boolean }) => void;
  "presence:snapshot": (payload: { onlineUserIds: string[] }) => void;
  "channel:new": (payload: { channelId: string }) => void;
}

interface ClientToServerEvents {
  "message:send": (
    payload: { channelId: string; content: string; parentMessageId?: string; attachment?: Attachment },
    ack: (res: AckResponse) => void
  ) => void;
  "message:edit": (payload: { messageId: string; content: string }, ack: (res: AckResponse) => void) => void;
  "message:delete": (payload: { messageId: string }, ack: (res: AckResponse) => void) => void;
  "reaction:toggle": (payload: { messageId: string; emoji: string }, ack: (res: AckResponse) => void) => void;
  "typing": (payload: { channelId: string; isTyping: boolean }) => void;
  "channel:read": (payload: { channelId: string }) => void;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function connectSocket(token: string) {
  socket?.disconnect();
  socket = io(API_BASE, { auth: { token }, autoConnect: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  if (!socket) throw new Error("소켓이 아직 연결되지 않았습니다.");
  return socket;
}
