import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { CalendarEvent, Space, User } from "../types";
import Icon from "./Icon";
import NewEventModal from "./NewEventModal";
import EventDetailModal from "./EventDetailModal";

interface Props {
  currentUser: User;
  users: User[];
}

function toDateKey(d: Date) {
  return d.toLocaleDateString("en-CA");
}

export default function CalendarView({ currentUser, users }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  useEffect(() => {
    api.listSpaces().then(({ spaces: list }) => {
      setSpaces(list);
      if (list.length > 0) setActiveSpaceId((prev) => prev || list[0].id);
    });
  }, []);

  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const refresh = useCallback(() => {
    if (!activeSpaceId) return;
    api.listCalendarEvents(activeSpaceId, monthKey).then(({ events: list }) => setEvents(list));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId, monthKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.startAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const monthStart = new Date(cursor.year, cursor.month, 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.year, cursor.month, d));
  const todayKey = toDateKey(new Date());

  async function handleCreate(data: {
    title: string; description?: string; startAt: string; endAt: string;
    allDay: boolean; location?: string; attendeeIds: string[]; withMeeting: boolean;
  }) {
    if (!activeSpaceId) return;
    await api.createCalendarEvent({ spaceId: activeSpaceId, ...data });
    setShowNewEvent(false);
    refresh();
  }

  async function handleDelete(eventId: string) {
    if (!confirm("이 일정을 삭제할까요?")) return;
    try {
      await api.deleteCalendarEvent(eventId);
      setActiveEventId(null);
      refresh();
    } catch {
      alert("일정을 만든 사람만 삭제할 수 있습니다.");
    }
  }

  const activeEvent = events.find((e) => e.id === activeEventId) || null;

  return (
    <div className="projects-view">
      <div className="projects-sidebar">
        <div className="projects-sidebar-header">
          <select className="space-select" value={activeSpaceId || ""} onChange={(e) => setActiveSpaceId(e.target.value || null)}>
            {spaces.length === 0 && <option value="">스페이스 없음</option>}
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => { setNewEventDate(undefined); setShowNewEvent(true); }}
          disabled={!activeSpaceId}
        >
          <Icon name="plus" size={14} /> 새 일정
        </button>
      </div>

      <div className="projects-main">
        {!activeSpaceId ? (
          <div className="projects-empty-state">
            <div className="projects-empty-state-icon"><Icon name="calendar" size={32} /></div>
            <p>스페이스를 먼저 선택하세요.</p>
          </div>
        ) : (
          <>
            <div className="calendar-header">
              <button className="link-button" onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}>
                이전
              </button>
              <strong>{cursor.year}년 {cursor.month + 1}월</strong>
              <button className="link-button" onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}>
                다음
              </button>
            </div>

            <div className="calendar-grid">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="calendar-weekday">{d}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={i} className="calendar-cell empty" />;
                const key = toDateKey(date);
                const dayEvents = eventsByDate.get(key) || [];
                return (
                  <div
                    key={i}
                    className={`calendar-cell calendar-cell-clickable ${key === todayKey ? "today" : ""}`}
                    onClick={() => { setNewEventDate(key); setShowNewEvent(true); }}
                  >
                    <div className="calendar-cell-date">{date.getDate()}</div>
                    <div className="calendar-cell-tasks">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          className="calendar-task-chip"
                          onClick={(e) => { e.stopPropagation(); setActiveEventId(ev.id); }}
                        >
                          {ev.meetingUrl && <Icon name="video" size={10} />} {ev.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && <span className="calendar-more">+{dayEvents.length - 3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showNewEvent && activeSpaceId && (
        <NewEventModal
          users={users.filter((u) => u.id !== currentUser.id).concat(currentUser)}
          defaultDate={newEventDate}
          onCancel={() => setShowNewEvent(false)}
          onCreate={handleCreate}
        />
      )}
      {activeEvent && (
        <EventDetailModal
          event={activeEvent}
          users={users}
          currentUser={currentUser}
          onClose={() => setActiveEventId(null)}
          onDelete={() => handleDelete(activeEvent.id)}
        />
      )}
    </div>
  );
}
