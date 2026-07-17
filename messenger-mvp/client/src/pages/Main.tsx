import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getSocket } from "../socket";
import type { Channel, Message, User } from "../types";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import NewGroupModal from "../components/NewGroupModal";

export default function Main() {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsersByChannel, setTypingUsersByChannel] = useState<Record<string, Set<string>>>({});
  const [showNewGroup, setShowNewGroup] = useState(false);
  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannelId;

  const refreshChannels = useCallback(async () => {
    const { channels: list } = await api.listChannels();
    setChannels(list);
    return list;
  }, []);

  useEffect(() => {
    refreshChannels();
    api.listUsers().then(({ users: list }) => setUsers(list));
  }, [refreshChannels]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    socket.on("presence:snapshot", ({ onlineUserIds: ids }) => setOnlineUserIds(new Set(ids)));
    socket.on("presence:update", ({ userId, online }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on("message:new", (message) => {
      setMessagesByChannel((prev) => ({
        ...prev,
        [message.channelId]: [...(prev[message.channelId] || []), message],
      }));
      setChannels((prev) =>
        prev
          .map((c) =>
            c.id === message.channelId
              ? {
                  ...c,
                  lastMessage: { content: message.content, senderId: message.senderId, createdAt: message.createdAt },
                  unreadCount:
                    activeChannelIdRef.current === c.id || message.senderId === user.id
                      ? c.unreadCount
                      : c.unreadCount + 1,
                }
              : c
          )
          .sort((a, b) => {
            const at = a.lastMessage?.createdAt || a.createdAt;
            const bt = b.lastMessage?.createdAt || b.createdAt;
            return at < bt ? 1 : -1;
          })
      );
    });

    socket.on("typing", ({ channelId, userId, isTyping }) => {
      setTypingUsersByChannel((prev) => {
        const next = new Set(prev[channelId] || []);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return { ...prev, [channelId]: next };
      });
    });

    socket.on("channel:new", () => {
      refreshChannels();
    });

    return () => {
      socket.off("presence:snapshot");
      socket.off("presence:update");
      socket.off("message:new");
      socket.off("typing");
      socket.off("channel:new");
    };
  }, [user, refreshChannels]);

  const openChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId);
      if (!messagesByChannel[channelId]) {
        const { messages } = await api.listMessages(channelId);
        setMessagesByChannel((prev) => ({ ...prev, [channelId]: messages }));
      }
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)));
      api.markRead(channelId).catch(() => {});
      getSocket().emit("channel:read", { channelId });
    },
    [messagesByChannel]
  );

  const openDmWith = useCallback(
    async (otherUserId: string) => {
      const { channel } = await api.openDm(otherUserId);
      setChannels((prev) => (prev.some((c) => c.id === channel.id) ? prev : [channel, ...prev]));
      openChannel(channel.id);
    },
    [openChannel]
  );

  const handleCreateGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const { channel } = await api.createGroup(name, memberIds);
      setChannels((prev) => [channel, ...prev]);
      setShowNewGroup(false);
      openChannel(channel.id);
    },
    [openChannel]
  );

  const sendMessage = useCallback((channelId: string, content: string) => {
    return new Promise<void>((resolve, reject) => {
      getSocket().emit("message:send", { channelId, content }, (res) => {
        if (res.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  if (!user) return null;

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;

  return (
    <div className="app-shell">
      <Sidebar
        currentUser={user}
        channels={channels}
        users={users}
        onlineUserIds={onlineUserIds}
        activeChannelId={activeChannelId}
        onSelectChannel={openChannel}
        onSelectUser={openDmWith}
        onNewGroup={() => setShowNewGroup(true)}
        onLogout={logout}
      />
      <ChatWindow
        currentUser={user}
        channel={activeChannel}
        messages={activeChannel ? messagesByChannel[activeChannel.id] || [] : []}
        onlineUserIds={onlineUserIds}
        typingUserIds={activeChannel ? typingUsersByChannel[activeChannel.id] || new Set() : new Set()}
        onSend={sendMessage}
      />
      {showNewGroup && (
        <NewGroupModal users={users} onCancel={() => setShowNewGroup(false)} onCreate={handleCreateGroup} />
      )}
    </div>
  );
}
