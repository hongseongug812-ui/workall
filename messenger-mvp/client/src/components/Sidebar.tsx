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
  myStatus: UserStatus;
  onChangeStatus: (status: PresenceStatus, statusMessage: string | null) => void;
  onToggleFavorite: (channelId: string, favorite: boolean) => void;
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
  myStatus,
  onChangeStatus,
  onToggleFavorite,
}: Props) {
  const grouped = users.reduce<Record<string, User[]>>((acc, u) => {
    (acc[u.department] ||= []).push(u);
    return acc;
  }, {});

  const favorites = channels.filter((c) => c.favorite);
  const rest = channels.filter((c) => !c.favorite);

  function renderChannel(c: Channel) {
    return (
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
          <span
            className={`channel-favorite-toggle ${c.favorite ? "active" : ""}`}
            role="button"
            tabIndex={0}
            title={c.favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(c.id, !c.favorite);
            }}
          >
            <Icon name="star" size={13} />
          </span>
        </button>
      </li>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">M</span>
        <span className="sidebar-brand-name">Messenger</span>
      </div>
      <div className="sidebar-me">
        <span className="avatar">{initials(currentUser.name)}</span>
        <div className="sidebar-me-info">
          <strong>{currentUser.name}</strong>
          <StatusPicker status={myStatus} onChange={onChangeStatus} />
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>
              <Icon name="star" size={12} /> 즐겨찾기
            </span>
          </div>
          <ul className="channel-list">{favorites.map(renderChannel)}</ul>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>채널</span>
          <button className="link-button" onClick={onNewGroup}>
            <Icon name="plus" size={14} />
            새 그룹
          </button>
        </div>
        {channels.length === 0 && <p className="sidebar-empty">아직 대화가 없습니다.</p>}
        <ul className="channel-list">{rest.map(renderChannel)}</ul>
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
