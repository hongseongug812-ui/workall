import { useState } from "react";
import type { FormEvent } from "react";
import type { User } from "../types";

interface Props {
  users: User[];
  onCancel: () => void;
  onCreate: (data: { name: string; startDate: string | null; endDate: string | null; memberIds: string[] }) => Promise<void>;
}

export default function NewProjectModal({ users, onCancel, onCreate }: Props) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("프로젝트 이름을 입력하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        memberIds: [...selected],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 프로젝트</h3>
        <label>
          프로젝트 이름
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 메신저 v2" autoFocus />
        </label>

        <div className="form-row">
          <label>
            시작일
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            종료일
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>

        <div className="modal-member-list">
          {users.map((u) => (
            <label key={u.id} className="modal-member-item">
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
              {u.name} <span className="member-dept">({u.department})</span>
            </label>
          ))}
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>
            취소
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? "생성 중..." : "생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
