import type { Channel, PresenceStatus, User, UserStatus } from "../types";
import Icon from "./Icon";
import StatusPicker from "./StatusPicker";

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
  onOpenAttendance: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  myStatus: UserStatus;
  onChangeStatus: (status: PresenceStatus, statusMessage: string | null) => void;
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
  onOpenAttendance,
  onOpenProfile,
  onLogout,
  darkMode,
  onToggleDarkMode,
  myStatus,
  onChangeStatus,
}: Props) {
  const grouped = users.reduce<Record<string, User[]>>((acc, u) => {
    (acc[u.department] ||= []).push(u);
    return acc;
  }, {});

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">M</span>
        <span className="sidebar-brand-name">Messenger</span>
      </div>
      <div className="sidebar-me">
        <button className="avatar avatar-button" onClick={onOpenProfile} title="내 정보">
          {initials(currentUser.name)}
        </button>
        <div className="sidebar-me-info">
          <strong>{currentUser.name}</strong>
          <StatusPicker status={myStatus} onChange={onChangeStatus} />
        </div>
        <button
          aria-label={darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          className="icon-button"
          onClick={onToggleDarkMode}
          title={darkMode ? "라이트 모드" : "다크 모드"}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={17} />
        </button>
        <button className="link-button" onClick={onLogout} title="로그아웃">
          로그아웃
        </button>
      </div>

      <div className="sidebar-search">
        <button className="sidebar-search-button" onClick={onOpenSearch}>
          <Icon name="search" size={17} />
          <span>메시지 검색</span>
        </button>
        <button className="sidebar-search-button" onClick={onOpenAttendance}>
          <Icon name="clock" size={17} />
          <span>출퇴근</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>채널</span>
          <button className="link-button" onClick={onNewGroup}>
            <Icon name="plus" size={14} />
            새 그룹
          </button>
        </div>
        {channels.length === 0 && <p className="sidebar-empty">아직 대화가 없습니다.</p>}
        <ul className="channel-list">
          {channels.map((c) => (
            <li key={c.id}>
              <button
                className={`channel-item ${c.id === activeChannelId ? "active" : ""}`}
                onClick={() => onSelectChannel(c.id)}
                title={c.name}
              >
                <span className="channel-name">
                  {c.type === "group" ? "# " : ""}
                  {c.name}
                </span>
                {c.lastMessage && <span className="channel-preview">{c.lastMessage.content}</span>}
                {c.muted && <Icon name="bellOff" size={13} className="channel-muted-icon" />}
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
                  <button className="user-item" onClick={() => onSelectUser(u.id)} title={u.name}>
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
