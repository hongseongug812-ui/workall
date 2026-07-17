import type { Channel, User } from "../types";

interface Props {
  currentUser: User;
  channels: Channel[];
  users: User[];
  onlineUserIds: Set<string>;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onSelectUser: (userId: string) => void;
  onNewGroup: () => void;
  onOpenSearch: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export default function Sidebar({
  currentUser,
  channels,
  users,
  onlineUserIds,
  activeChannelId,
  onSelectChannel,
  onSelectUser,
  onNewGroup,
  onOpenSearch,
  onLogout,
  darkMode,
  onToggleDarkMode,
}: Props) {
  const grouped = users.reduce<Record<string, User[]>>((acc, u) => {
    (acc[u.department] ||= []).push(u);
    return acc;
  }, {});

  return (
    <aside className="sidebar">
      <div className="sidebar-me">
        <div className="avatar">{initials(currentUser.name)}</div>
        <div className="sidebar-me-info">
          <strong>{currentUser.name}</strong>
          <span>{currentUser.department}</span>
        </div>
        <button className="icon-button" onClick={onToggleDarkMode} title={darkMode ? "라이트 모드" : "다크 모드"}>
          {darkMode ? "☀️" : "🌙"}
        </button>
        <button className="link-button" onClick={onLogout} title="로그아웃">
          로그아웃
        </button>
      </div>

      <div className="sidebar-search">
        <button className="sidebar-search-button" onClick={onOpenSearch}>
          🔍 메시지 검색
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>채널</span>
          <button className="link-button" onClick={onNewGroup}>
            + 새 그룹
          </button>
        </div>
        {channels.length === 0 && <p className="sidebar-empty">아직 대화가 없습니다.</p>}
        <ul className="channel-list">
          {channels.map((c) => (
            <li key={c.id}>
              <button
                className={`channel-item ${c.id === activeChannelId ? "active" : ""}`}
                onClick={() => onSelectChannel(c.id)}
              >
                <span className="channel-name">
                  {c.type === "group" ? "# " : ""}
                  {c.name}
                </span>
                {c.lastMessage && <span className="channel-preview">{c.lastMessage.content}</span>}
                {c.unreadCount > 0 && <span className="badge">{c.unreadCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>조직도</span>
        </div>
        {Object.entries(grouped).map(([department, members]) => (
          <div key={department} className="org-group">
            <div className="org-group-title">{department}</div>
            <ul className="user-list">
              {members.map((u) => (
                <li key={u.id}>
                  <button className="user-item" onClick={() => onSelectUser(u.id)}>
                    <span className={`presence-dot ${onlineUserIds.has(u.id) ? "online" : ""}`} />
                    {u.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
