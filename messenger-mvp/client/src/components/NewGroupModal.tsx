import { useState } from "react";
import type { FormEvent } from "react";
import type { User } from "../types";

interface Props {
  users: User[];
  onCancel: () => void;
  onCreate: (name: string, memberIds: string[]) => Promise<void>;
}

export default function NewGroupModal({ users, onCancel, onCreate }: Props) {
  const [name, setName] = useState("");
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
      setError("채널 이름을 입력하세요.");
      return;
    }
    if (selected.size === 0) {
      setError("최소 한 명 이상 초대하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(name.trim(), [...selected]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "채널 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 그룹 채널</h3>
        <label>
          채널 이름
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 프로젝트A" autoFocus />
        </label>

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
