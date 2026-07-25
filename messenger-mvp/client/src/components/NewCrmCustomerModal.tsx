import { useState } from "react";
import type { FormEvent } from "react";

interface Props {
  onCancel: () => void;
  onCreate: (data: { name: string; email?: string; phone?: string }) => Promise<void>;
}

export default function NewCrmCustomerModal({ onCancel, onCreate }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("고객명을 입력하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "고객 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 고객</h3>
        <label>
          고객명 / 회사명
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: (주)에이씨엠이" autoFocus />
        </label>
        <label>
          이메일
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
        </label>
        <label>
          전화번호
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="submit" disabled={submitting}>{submitting ? "생성 중..." : "생성"}</button>
        </div>
      </form>
    </div>
  );
}
