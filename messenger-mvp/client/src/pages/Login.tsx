import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api";
import Icon from "../components/Icon";

interface Props {
  initialMode?: "login" | "register";
  onBack?: () => void;
}

export default function Login({ initialMode = "login", onBack }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ email, password, name, department });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "요청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      {onBack && (
        <button className="auth-back-button" onClick={onBack}>
          <Icon name="close" size={13} /> 처음으로
        </button>
      )}
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand" aria-hidden="true">
          <span className="auth-brand-mark">
            <Icon name="message" size={16} />
          </span>
          <span>Messenger</span>
        </div>
        <h1>사내 메신저</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "계정으로 로그인하세요." : "새 계정을 만드세요."}
        </p>

        {mode === "register" && (
          <>
            <label>
              이름
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              부서
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 개발팀"
              />
            </label>
          </>
        )}

        <label>
          이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>

        {mode === "login" && (
          <p className="auth-hint">
            데모 계정: admin@example.com / password123 (서버에서 <code>npm run seed</code> 실행 필요)
          </p>
        )}
      </form>
    </div>
  );
}
