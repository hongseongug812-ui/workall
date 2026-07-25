import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import Icon from "./Icon";

interface Props {
  onClose: () => void;
}

export default function ForgotPasswordModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "요청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="search-input-row">
          <h3>비밀번호 재설정</h3>
          <button type="button" className="link-button" onClick={onClose}>
            <Icon name="close" size={14} /> 닫기
          </button>
        </div>

        {sent ? (
          <p className="profile-success">
            요청이 접수되었습니다. (데모 환경: 실제 이메일 발송 대신 서버를 실행 중인 터미널 콘솔에 재설정 링크가 출력됩니다)
          </p>
        ) : (
          <>
            <label>
              가입한 이메일
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={submitting}>취소</button>
              <button type="submit" disabled={submitting}>{submitting ? "요청 중..." : "재설정 링크 받기"}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
