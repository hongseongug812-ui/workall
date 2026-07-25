import { useState } from "react";
import type { FormEvent } from "react";
import type { User } from "../types";

interface Props {
  users: User[];
  defaultDate?: string;
  onCancel: () => void;
  onCreate: (data: {
    title: string; description?: string; startAt: string; endAt: string;
    allDay: boolean; location?: string; attendeeIds: string[]; withMeeting: boolean;
  }) => Promise<void>;
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewEventModal({ users, defaultDate, onCancel, onCreate }: Props) {
  const base = defaultDate ? new Date(`${defaultDate}T09:00`) : new Date();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(toLocalInput(base));
  const [end, setEnd] = useState(toLocalInput(new Date(base.getTime() + 60 * 60 * 1000)));
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [withMeeting, setWithMeeting] = useState(false);
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("일정 제목을 입력하세요.");
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        allDay,
        location: location.trim() || undefined,
        attendeeIds: [...attendeeIds],
        withMeeting,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "일정 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal task-detail-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 일정</h3>

        <label>
          제목
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 주간 스탠드업" autoFocus />
        </label>

        <div className="form-row">
          <label>
            시작
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            종료
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        <label className="modal-member-item">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          종일 일정
        </label>

        <label>
          장소
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 3층 회의실" />
        </label>

        <label>
          설명
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>

        <label className="modal-member-item">
          <input type="checkbox" checked={withMeeting} onChange={(e) => setWithMeeting(e.target.checked)} />
          화상회의 링크 생성
        </label>

        <div className="task-detail-section">
          <div className="sidebar-section-header"><span>참석자</span></div>
          <div className="modal-member-list">
            {users.map((u) => (
              <label key={u.id} className="modal-member-item">
                <input type="checkbox" checked={attendeeIds.has(u.id)} onChange={() => toggleAttendee(u.id)} />
                {u.name} <span className="member-dept">({u.department})</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="submit" disabled={submitting}>{submitting ? "생성 중..." : "생성"}</button>
        </div>
      </form>
    </div>
  );
}
