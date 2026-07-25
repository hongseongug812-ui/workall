import type { PresenceStatus, User } from "../types";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  myStatus: PresenceStatus;
  darkMode: boolean;
  unreadNotificationCount: number;
  activeView: "home" | "messenger" | "mail" | "calendar" | "projects" | "wiki" | "crm" | "finance" | "drive" | "approval" | "admin";
  onSelectView: (view: "home" | "messenger" | "mail" | "calendar" | "projects" | "wiki" | "crm" | "finance" | "drive" | "approval" | "admin") => void;
  unreadMailCount: number;
  onToggleDarkMode: () => void;
  onOpenSearch: () => void;
  onOpenAttendance: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export default function IconRail({
  currentUser,
  myStatus,
  darkMode,
  unreadNotificationCount,
  activeView,
  onSelectView,
  unreadMailCount,
  onToggleDarkMode,
  onOpenSearch,
  onOpenAttendance,
  onOpenNotifications,
  onOpenProfile,
  onLogout,
}: Props) {
  return (
    <nav className="icon-rail">
      <div className="icon-rail-brand">
        <Icon name="message" size={18} />
      </div>

      <div className="icon-rail-group">
        <button
          className={`icon-rail-button ${activeView === "home" ? "active" : ""}`}
          title="홈"
          onClick={() => onSelectView("home")}
        >
          <Icon name="home" size={20} />
        </button>
        <button
          className={`icon-rail-button ${activeView === "messenger" ? "active" : ""}`}
          title="메신저"
          onClick={() => onSelectView("messenger")}
        >
          <Icon name="message" size={20} />
        </button>
        <button
          className={`icon-rail-button ${activeView === "projects" ? "active" : ""}`}
          title="프로젝트"
          onClick={() => onSelectView("projects")}
        >
          <Icon name="board" size={20} />
        </button>
        <button
          className={`icon-rail-button ${activeView === "wiki" ? "active" : ""}`}
          title="위키"
          onClick={() => onSelectView("wiki")}
        >
          <Icon name="book" size={20} />
        </button>
        <button
          className={`icon-rail-button ${activeView === "crm" ? "active" : ""}`}
          title="CRM"
          onClick={() => onSelectView("crm")}
        >
          <Icon name="users" size={20} />
        </button>
        <button
          className={`icon-rail-button ${activeView === "finance" ? "active" : ""}`}
          title="재무"
          onClick={() => onSelectView("finance")}
        >
          <Icon name="wallet" size={20} />
        </button>
        <button
          className={`icon-rail-button ${activeView === "mail" ? "active" : ""}`}
          title="메일"
          onClick={() => onSelectView("mail")}
        >
          <Icon name="mail" size={20} />
          {unreadMailCount > 0 && (
            <span className="icon-rail-badge">{unreadMailCount > 9 ? "9+" : unreadMailCount}</span>
          )}
        </button>
        <button
          className={`icon-rail-button ${activeView === "calendar" ? "active" : ""}`}
          title="캘린더"
          onClick={() => onSelectView("calendar")}
        >
          <Icon name="calendar" size={20} />
        </button>
        <button className="icon-rail-button" title="메시지 검색" onClick={onOpenSearch}>
          <Icon name="search" size={20} />
        </button>
        <button className="icon-rail-button" title="출퇴근" onClick={onOpenAttendance}>
          <Icon name="clock" size={20} />
        </button>
        <button className="icon-rail-button icon-rail-bell" title="알림" onClick={onOpenNotifications}>
          <Icon name="bell" size={20} />
          {unreadNotificationCount > 0 && (
            <span className="icon-rail-badge">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>
          )}
        </button>
      </div>

      <div className="icon-rail-spacer" />

      <div className="icon-rail-group">
        {(currentUser.role === "super_admin" || currentUser.role === "dept_admin") && (
          <button
            className={`icon-rail-button ${activeView === "admin" ? "active" : ""}`}
            title="관리자"
            onClick={() => onSelectView("admin")}
          >
            <Icon name="lock" size={19} />
          </button>
        )}
        <button
          className="icon-rail-button"
          title={darkMode ? "라이트 모드" : "다크 모드"}
          onClick={onToggleDarkMode}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={19} />
        </button>
        <button className="icon-rail-button icon-rail-avatar" title={currentUser.name} onClick={onOpenProfile}>
          <Avatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} size={30} className="rail-avatar" />
          <span className={`rail-presence-dot ${myStatus}`} />
        </button>
        <button className="icon-rail-button" title="로그아웃" onClick={onLogout}>
          <Icon name="logout" size={19} />
        </button>
      </div>
    </nav>
  );
}
