import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getSocket } from "../socket";
import type { Attachment, Channel, Message, User } from "../types";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import NewGroupModal from "../components/NewGroupModal";
import SearchPanel from "../components/SearchPanel";

export default function Main() {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({});
  const [threadRepliesByParent, setThreadRepliesByParent] = useState<Record<string, Message[]>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsersByChannel, setTypingUsersByChannel] = useState<Record<string, Set<string>>>({});
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("messenger-mvp:theme") === "dark");
  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannelId;

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("messenger-mvp:theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const refreshChannels = useCallback(async () => {
    const { channels: list } = await api.listChannels();
    setChannels(list);
    return list;
  }, []);

  useEffect(() => {
    refreshChannels();
    api.listUsers().then(({ users: list }) => setUsers(list));
  }, [refreshChannels]);

  // 메시지 하나를 상태 트리(메인 목록 또는 열린 스레드)에서 찾아 교체한다.
  // 수정/삭제/반응 토글 모두 같은 message:updated 이벤트로 오므로 공용 처리.
  const patchMessage = useCallback((updated: Message) => {
    if (!updated.parentMessageId) {
      setMessagesByChannel((prev) => {
        const list = prev[updated.channelId];
        if (!list) return prev;
        return { ...prev, [updated.channelId]: list.map((m) => (m.id === updated.id ? updated : m)) };
      });
    } else {
      setThreadRepliesByParent((prev) => {
        const list = prev[updated.parentMessageId!];
        if (!list) return prev;
        return { ...prev, [updated.parentMessageId!]: list.map((m) => (m.id === updated.id ? updated : m)) };
      });
    }
  }, []);

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
      if (message.parentMessageId) {
        // 스레드 답장: 열려 있는 스레드라면 목록에 추가하고, 부모의 답장 수를 올린다.
        setThreadRepliesByParent((prev) => {
          const list = prev[message.parentMessageId!];
          if (!list) return prev;
          return { ...prev, [message.parentMessageId!]: [...list, message] };
        });
        setMessagesByChannel((prev) => {
          const list = prev[message.channelId];
          if (!list) return prev;
          return {
            ...prev,
            [message.channelId]: list.map((m) =>
              m.id === message.parentMessageId ? { ...m, replyCount: m.replyCount + 1 } : m
            ),
          };
        });
        return;
      }

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
                  lastMessage: {
                    content: message.content || (message.attachment ? `[파일] ${message.attachment.name}` : ""),
                    senderId: message.senderId,
                    createdAt: message.createdAt,
                  },
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

    socket.on("message:updated", patchMessage);

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
      socket.off("message:updated", patchMessage);
      socket.off("typing");
      socket.off("channel:new");
    };
  }, [user, refreshChannels, patchMessage]);

  const openChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId);
      setActiveThreadId(null);
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

  const sendMessage = useCallback(
    (channelId: string, content: string, opts?: { parentMessageId?: string; attachment?: Attachment }) => {
      return new Promise<void>((resolve, reject) => {
        getSocket().emit(
          "message:send",
          { channelId, content, parentMessageId: opts?.parentMessageId, attachment: opts?.attachment },
          (res) => {
            if (res.error) reject(new Error(res.error));
            else resolve();
          }
        );
      });
    },
    []
  );

  const editMessage = useCallback((messageId: string, content: string) => {
    return new Promise<void>((resolve, reject) => {
      getSocket().emit("message:edit", { messageId, content }, (res) => {
        if (res.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    return new Promise<void>((resolve, reject) => {
      getSocket().emit("message:delete", { messageId }, (res) => {
        if (res.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    getSocket().emit("reaction:toggle", { messageId, emoji }, () => {});
  }, []);

  const openThread = useCallback(
    async (messageId: string) => {
      setActiveThreadId(messageId);
      if (!threadRepliesByParent[messageId]) {
        const { replies } = await api.getThread(activeChannelId!, messageId);
        setThreadRepliesByParent((prev) => ({ ...prev, [messageId]: replies }));
      }
    },
    [activeChannelId, threadRepliesByParent]
  );

  const jumpToSearchResult = useCallback(
    async (message: Message) => {
      setShowSearch(false);
      await openChannel(message.channelId);
      if (message.parentMessageId) {
        openThread(message.parentMessageId);
      }
    },
    [openChannel, openThread]
  );

  if (!user) return null;

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;
  const activeThreadParent = activeThreadId
    ? messagesByChannel[activeChannelId || ""]?.find((m) => m.id === activeThreadId) || null
    : null;

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
        onOpenSearch={() => setShowSearch(true)}
        onLogout={logout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
      />
      <ChatWindow
        currentUser={user}
        channel={activeChannel}
        messages={activeChannel ? messagesByChannel[activeChannel.id] || [] : []}
        onlineUserIds={onlineUserIds}
        typingUserIds={activeChannel ? typingUsersByChannel[activeChannel.id] || new Set() : new Set()}
        onSend={sendMessage}
        onEdit={editMessage}
        onDelete={deleteMessage}
        onReact={toggleReaction}
        onOpenThread={openThread}
        activeThreadParent={activeThreadParent}
        threadReplies={activeThreadId ? threadRepliesByParent[activeThreadId] || [] : []}
        onCloseThread={() => setActiveThreadId(null)}
      />
      {showNewGroup && (
        <NewGroupModal users={users} onCancel={() => setShowNewGroup(false)} onCreate={handleCreateGroup} />
      )}
      {showSearch && (
        <SearchPanel
          channels={channels}
          currentUser={user}
          onClose={() => setShowSearch(false)}
          onSelectResult={jumpToSearchResult}
        />
      )}
    </div>
  );
}
