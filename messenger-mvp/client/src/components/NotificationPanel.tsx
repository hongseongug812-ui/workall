import { useState } from "react";
import { api, ApiError } from "../api";
import type { AppNotification } from "../types";
import Icon from "./Icon";

interface Props {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
}

function formatTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function NotificationPanel({ notifications, onClose, onMarkRead, onMarkAllRead }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function handleMarkAll() {
    try {
      await api.markAllNotificationsRead();
      onMarkAllRead();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림을 읽음 처리하지 못했습니다.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>알림</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="link-button" onClick={handleMarkAll}>
              모두 읽음
            </button>
            <button className="link-button" onClick={onClose}>
              <Icon name="close" size={14} /> 닫기
            </button>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <ul className="notification-list">
          {notifications.length === 0 && <p className="sidebar-empty">알림이 없습니다.</p>}
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`notification-row ${n.readAt ? "" : "unread"}`}
              onClick={() => !n.readAt && onMarkRead(n.id)}
            >
              <span className="notification-dot" />
              <div className="notification-body">
                <div className="notification-title">{n.title}</div>
                {n.body && <div className="notification-text">{n.body}</div>}
                <div className="notification-time">{formatTime(n.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
