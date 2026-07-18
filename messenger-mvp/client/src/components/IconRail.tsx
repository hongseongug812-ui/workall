import type { PresenceStatus, User } from "../types";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  myStatus: PresenceStatus;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSearch: () => void;
  onOpenAttendance: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export default function IconRail({
  currentUser,
  myStatus,
  darkMode,
  onToggleDarkMode,
  onOpenSearch,
  onOpenAttendance,
  onOpenProfile,
  onLogout,
}: Props) {
  return (
    <nav className="icon-rail">
      <div className="icon-rail-brand">
        <Icon name="message" size={18} />
      </div>

      <div className="icon-rail-group">
        <button className="icon-rail-button active" title="홈">
          <Icon name="home" size={20} />
        </button>
        <button className="icon-rail-button" title="메시지 검색" onClick={onOpenSearch}>
          <Icon name="search" size={20} />
        </button>
        <button className="icon-rail-button" title="출퇴근" onClick={onOpenAttendance}>
          <Icon name="clock" size={20} />
        </button>
      </div>

      <div className="icon-rail-spacer" />

      <div className="icon-rail-group">
        <button
          className="icon-rail-button"
          title={darkMode ? "라이트 모드" : "다크 모드"}
          onClick={onToggleDarkMode}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={19} />
        </button>
        <button className="icon-rail-button icon-rail-avatar" title={currentUser.name} onClick={onOpenProfile}>
          <span className="avatar rail-avatar">{initials(currentUser.name)}</span>
          <span className={`rail-presence-dot ${myStatus}`} />
        </button>
        <button className="icon-rail-button" title="로그아웃" onClick={onLogout}>
          <Icon name="logout" size={19} />
        </button>
      </div>
    </nav>
  );
}
