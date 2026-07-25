import { useState } from "react";
import type { FormEvent } from "react";
import type { Mail, User } from "../types";

interface Props {
  users: User[];
  currentUser: User;
  draftToEdit?: Mail;
  onCancel: () => void;
  onSend: (data: { subject: string; body: string; toIds: string[]; ccIds: string[] }) => Promise<void>;
  onSaveDraft: (data: { subject: string; body: string; toIds: string[]; ccIds: string[] }) => Promise<void>;
}

export default function NewMailModal({ users, currentUser, draftToEdit, onCancel, onSend, onSaveDraft }: Props) {
  const [subject, setSubject] = useState(draftToEdit?.subject || "");
  const [body, setBody] = useState(draftToEdit?.body || "");
  const [toIds, setToIds] = useState<Set<string>>(
    new Set(draftToEdit?.recipients.filter((r) => r.kind === "to").map((r) => r.userId) || [])
  );
  const [ccIds, setCcIds] = useState<Set<string>>(
    new Set(draftToEdit?.recipients.filter((r) => r.kind === "cc").map((r) => r.userId) || [])
  );
  const [showCc, setShowCc] = useState(ccIds.size > 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const others = users.filter((u) => u.id !== currentUser.id);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (toIds.size === 0) {
      setError("받는 사람을 1명 이상 선택하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSend({ subject: subject.trim(), body, toIds: [...toIds], ccIds: [...ccIds] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "메일 전송에 실패했습니다.");
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    setError(null);
    try {
      await onSaveDraft({ subject: subject.trim(), body, toIds: [...toIds], ccIds: [...ccIds] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "임시저장에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal task-detail-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSend}>
        <h3>{draftToEdit ? "임시 메일 편집" : "새 메일"}</h3>

        <div className="task-detail-section">
          <div className="sidebar-section-header">
            <span>받는 사람</span>
            {!showCc && (
              <button type="button" className="link-button" onClick={() => setShowCc(true)}>참조 추가</button>
            )}
          </div>
          <div className="modal-member-list">
            {others.map((u) => (
              <label key={u.id} className="modal-member-item">
                <input type="checkbox" checked={toIds.has(u.id)} onChange={() => toggle(toIds, setToIds, u.id)} />
                {u.name} <span className="member-dept">({u.department})</span>
              </label>
            ))}
          </div>
        </div>

        {showCc && (
          <div className="task-detail-section">
            <div className="sidebar-section-header"><span>참조</span></div>
            <div className="modal-member-list">
              {others.map((u) => (
                <label key={u.id} className="modal-member-item">
                  <input type="checkbox" checked={ccIds.has(u.id)} onChange={() => toggle(ccIds, setCcIds, u.id)} />
                  {u.name} <span className="member-dept">({u.department})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label>
          제목
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="제목을 입력하세요" />
        </label>
        <label>
          내용
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="내용을 입력하세요" />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="button" onClick={handleSaveDraft} disabled={submitting}>임시저장</button>
          <button type="submit" disabled={submitting}>{submitting ? "보내는 중..." : "보내기"}</button>
        </div>
      </form>
    </div>
  );
}
