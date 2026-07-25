import type { CalendarEvent, User } from "../types";
import Icon from "./Icon";

interface Props {
  event: CalendarEvent;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onDelete: () => void;
}

function formatRange(startAt: string, endAt: string, allDay: boolean) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (allDay) return start.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const dateStr = start.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  const startTime = start.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return `${dateStr} · ${startTime} - ${endTime}`;
}

export default function EventDetailModal({ event, users, currentUser, onClose, onDelete }: Props) {
  function attendeeName(id: string) {
    if (id === currentUser.id) return "나";
    return users.find((u) => u.id === id)?.name || "알 수 없음";
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>일정</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="link-button" onClick={onDelete}>
              <Icon name="trash" size={14} /> 삭제
            </button>
            <button className="link-button" onClick={onClose}>
              <Icon name="close" size={14} /> 닫기
            </button>
          </div>
        </div>

        <div className="mail-detail-header">
          <div className="mail-detail-subject">{event.title}</div>
          <div className="notification-time">{formatRange(event.startAt, event.endAt, event.allDay)}</div>
          {event.location && (
            <div className="notification-time" style={{ marginTop: 6 }}>
              <Icon name="board" size={12} /> {event.location}
            </div>
          )}
        </div>

        {event.meetingUrl && (
          <a className="btn-primary" href={event.meetingUrl} target="_blank" rel="noreferrer" style={{ marginBottom: 18, width: "fit-content" }}>
            <Icon name="video" size={14} /> 화상회의 참여
          </a>
        )}

        {event.description && <p style={{ marginBottom: 18, whiteSpace: "pre-wrap" }}>{event.description}</p>}

        <div className="task-detail-section">
          <div className="sidebar-section-header"><span>참석자</span></div>
          <div className="task-assignee-chips">
            {event.attendeeIds.map((id) => (
              <span key={id} className="task-assignee-chip">{attendeeName(id)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
