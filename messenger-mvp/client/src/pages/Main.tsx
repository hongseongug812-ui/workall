import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getSocket } from "../socket";
import type { Attachment, Channel, Message, PresenceStatus, User, UserStatus } from "../types";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import NewGroupModal from "../components/NewGroupModal";
import SearchPanel from "../components/SearchPanel";
import AttendancePanel from "../components/AttendancePanel";
import ProfileModal from "../components/ProfileModal";

const MESSAGE_PAGE_SIZE = 50;
const DEFAULT_STATUS: UserStatus = { status: "online", statusMessage: null };

export default function Main() {
  const { user, logout, updateUser } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({});
  const [hasMoreByChannel, setHasMoreByChannel] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [threadRepliesByParent, setThreadRepliesByParent] = useState<Record<string, Message[]>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsersByChannel, setTypingUsersByChannel] = useState<Record<string, Set<string>>>({});
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [statusesByUser, setStatusesByUser] = useState<Record<string, UserStatus>>({});
  const [pinnedByChannel, setPinnedByChannel] = useState<Record<string, Message[]>>({});
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("messenger-mvp:theme") === "dark");
  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannelId;
  const channelsRef = useRef<Channel[]>([]);
  channelsRef.current = channels;

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("messenger-mvp:theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // 새 메시지 알림 권한은 최초 1회만 물어본다 (브라우저가 지원하고 아직 결정 안 됐을 때).
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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

  const notifyIfBackground = useCallback(
    (message: Message) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (message.senderId === user?.id) return;
      const isActiveAndFocused =
        message.channelId === activeChannelIdRef.current && document.visibilityState === "visible";
      if (isActiveAndFocused) return;

      const channel = channelsRef.current.find((c) => c.id === message.channelId);
      if (!channel || channel.muted) return;
      const sender = channel.members.find((m) => m.id === message.senderId);
      const title = channel.type === "group" ? `${channel.name} · ${sender?.name || "알 수 없음"}` : sender?.name || channel.name;
      const body = message.content || (message.attachment ? `[파일] ${message.attachment.name}` : "");
      try {
        new Notification(title, { body, tag: message.channelId });
      } catch {
        // 알림 생성 실패는 조용히 무시 (일부 브라우저/환경 제약)
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    socket.on("presence:snapshot", ({ onlineUserIds: ids, statuses }) => {
      setOnlineUserIds(new Set(ids));
      setStatusesByUser(Object.fromEntries(statuses.map((s) => [s.userId, s])));
    });
    socket.on("presence:update", ({ userId, online }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
    socket.on("presence:statusUpdate", ({ userId, status, statusMessage }) => {
      setStatusesByUser((prev) => ({ ...prev, [userId]: { status, statusMessage } }));
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
        notifyIfBackground(message);
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
      notifyIfBackground(message);
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

    socket.on("channel:updated", () => {
      refreshChannels();
    });

    socket.on("channel:left", ({ channelId }) => {
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      if (activeChannelIdRef.current === channelId) {
        setActiveChannelId(null);
        setActiveThreadId(null);
      }
    });

    socket.on("channel:pinnedChanged", ({ channelId }) => {
      api.getPinnedMessages(channelId).then(({ messages }) => {
        setPinnedByChannel((prev) => ({ ...prev, [channelId]: messages }));
      });
    });

    return () => {
      socket.off("presence:snapshot");
      socket.off("presence:update");
      socket.off("presence:statusUpdate");
      socket.off("message:new");
      socket.off("message:updated", patchMessage);
      socket.off("typing");
      socket.off("channel:new");
      socket.off("channel:updated");
      socket.off("channel:left");
      socket.off("channel:pinnedChanged");
    };
  }, [user, refreshChannels, patchMessage, notifyIfBackground]);

  const openChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId);
      setActiveThreadId(null);
      if (!messagesByChannel[channelId]) {
        const { messages } = await api.listMessages(channelId);
        setMessagesByChannel((prev) => ({ ...prev, [channelId]: messages }));
        setHasMoreByChannel((prev) => ({ ...prev, [channelId]: messages.length >= MESSAGE_PAGE_SIZE }));
      }
      if (!pinnedByChannel[channelId]) {
        api.getPinnedMessages(channelId).then(({ messages }) => {
          setPinnedByChannel((prev) => ({ ...prev, [channelId]: messages }));
        });
      }
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)));
      api.markRead(channelId).catch(() => {});
      getSocket().emit("channel:read", { channelId });
    },
    [messagesByChannel, pinnedByChannel]
  );

  const loadMoreMessages = useCallback(async () => {
    const channelId = activeChannelIdRef.current;
    if (!channelId || loadingMore) return;
    const current = messagesByChannel[channelId] || [];
    const oldest = current[0];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const { messages: older } = await api.listMessages(channelId, { before: oldest.createdAt });
      setMessagesByChannel((prev) => ({ ...prev, [channelId]: [...older, ...(prev[channelId] || [])] }));
      setHasMoreByChannel((prev) => ({ ...prev, [channelId]: older.length >= MESSAGE_PAGE_SIZE }));
    } finally {
      setLoadingMore(false);
    }
  }, [messagesByChannel, loadingMore]);

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

  const togglePin = useCallback((messageId: string) => {
    getSocket().emit("message:pin", { messageId }, () => {});
  }, []);

  const setChannelMuted = useCallback(async (channelId: string, muted: boolean) => {
    await api.setMuted(channelId, muted);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, muted } : c)));
  }, []);

  const changeStatus = useCallback((status: PresenceStatus, statusMessage: string | null) => {
    if (!user) return;
    setStatusesByUser((prev) => ({ ...prev, [user.id]: { status, statusMessage } }));
    getSocket().emit("presence:setStatus", { status, statusMessage }, () => {});
  }, [user]);

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

  const addMembersToChannel = useCallback(async (channelId: string, memberIds: string[]) => {
    const { channel } = await api.addMembers(channelId, memberIds);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? channel : c)));
  }, []);

  const leaveChannel = useCallback(async (channelId: string) => {
    await api.leaveChannel(channelId);
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    if (activeChannelIdRef.current === channelId) {
      setActiveChannelId(null);
      setActiveThreadId(null);
    }
  }, []);

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
        onOpenAttendance={() => setShowAttendance(true)}
        onOpenProfile={() => setShowProfile(true)}
        onLogout={logout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        myStatus={statusesByUser[user.id] || DEFAULT_STATUS}
        onChangeStatus={changeStatus}
      />
      <ChatWindow
        currentUser={user}
        channel={activeChannel}
        users={users}
        messages={activeChannel ? messagesByChannel[activeChannel.id] || [] : []}
        pinnedMessages={activeChannel ? pinnedByChannel[activeChannel.id] || [] : []}
        onlineUserIds={onlineUserIds}
        statusesByUser={statusesByUser}
        typingUserIds={activeChannel ? typingUsersByChannel[activeChannel.id] || new Set() : new Set()}
        hasMoreMessages={activeChannel ? !!hasMoreByChannel[activeChannel.id] : false}
        loadingMoreMessages={loadingMore}
        onLoadMoreMessages={loadMoreMessages}
        onSend={sendMessage}
        onEdit={editMessage}
        onDelete={deleteMessage}
        onReact={toggleReaction}
        onPin={togglePin}
        onOpenThread={openThread}
        activeThreadParent={activeThreadParent}
        threadReplies={activeThreadId ? threadRepliesByParent[activeThreadId] || [] : []}
        onCloseThread={() => setActiveThreadId(null)}
        onAddMembers={addMembersToChannel}
        onLeaveChannel={leaveChannel}
        onSetMuted={setChannelMuted}
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
      {showAttendance && <AttendancePanel currentUser={user} onClose={() => setShowAttendance(false)} />}
      {showProfile && (
        <ProfileModal currentUser={user} onClose={() => setShowProfile(false)} onUpdated={updateUser} />
      )}
    </div>
  );
}
