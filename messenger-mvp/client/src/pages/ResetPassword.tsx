import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import Icon from "../components/Icon";

interface Props {
  token: string;
  onDone: () => void;
}

export default function ResetPassword({ token, onDone }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "재설정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand" aria-hidden="true">
          <span className="auth-brand-mark">
            <Icon name="message" size={16} />
          </span>
          <span>Messenger</span>
        </div>
        <h1>비밀번호 재설정</h1>

        {done ? (
          <>
            <p className="profile-success">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</p>
            <button type="button" onClick={onDone}>로그인하러 가기</button>
          </>
        ) : (
          <>
            <p className="auth-subtitle">새로 사용할 비밀번호를 입력하세요.</p>
            <label>
              새 비밀번호 (8자 이상)
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            </label>
            <label>
              새 비밀번호 확인
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? "변경 중..." : "비밀번호 변경"}</button>
            <button type="button" className="auth-switch" onClick={onDone}>로그인으로 돌아가기</button>
          </>
        )}
      </form>
    </div>
  );
}
