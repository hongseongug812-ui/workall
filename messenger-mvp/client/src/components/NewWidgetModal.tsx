import { useState } from "react";
import type { FormEvent } from "react";
import type { Space, WidgetSize, WidgetType } from "../types";

interface Props {
  spaces: Space[];
  onCancel: () => void;
  onCreate: (data: { type: WidgetType; size: WidgetSize; spaceId: string; monthlyGoal?: number }) => Promise<void>;
}

const WIDGET_OPTIONS: { type: WidgetType; label: string; desc: string }[] = [
  { type: "my_tasks", label: "내 작업", desc: "마감이 오늘이거나 지연된 내 담당 태스크" },
  { type: "recent_wiki", label: "최근 업데이트된 문서", desc: "최근에 바뀐 위키 문서" },
  { type: "finance_progress", label: "이번 달 재무 현황", desc: "목표 매출액 대비 달성률" },
  { type: "new_leads", label: "신규 고객 리드", desc: "이번 주에 등록된 리드 수" },
];

export default function NewWidgetModal({ spaces, onCancel, onCreate }: Props) {
  const [type, setType] = useState<WidgetType>("my_tasks");
  const [size, setSize] = useState<WidgetSize>("medium");
  const [spaceId, setSpaceId] = useState(spaces[0]?.id || "");
  const [monthlyGoal, setMonthlyGoal] = useState("5000000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!spaceId) return setError("스페이스를 선택하세요.");
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ type, size, spaceId, monthlyGoal: type === "finance_progress" ? Number(monthlyGoal) : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "위젯 추가에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>위젯 추가</h3>

        <div className="widget-type-picker">
          {WIDGET_OPTIONS.map((opt) => (
            <label key={opt.type} className={`widget-type-option ${type === opt.type ? "selected" : ""}`}>
              <input type="radio" name="widgetType" checked={type === opt.type} onChange={() => setType(opt.type)} />
              <div>
                <div>{opt.label}</div>
                <div className="notification-time">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <label>
          스페이스
          <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
            {spaces.length === 0 && <option value="">스페이스 없음</option>}
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        {type === "finance_progress" && (
          <label>
            이번 달 목표 매출액 (원)
            <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(e.target.value)} min={0} />
          </label>
        )}

        <label>
          크기
          <select value={size} onChange={(e) => setSize(e.target.value as WidgetSize)}>
            <option value="small">작게</option>
            <option value="medium">보통</option>
            <option value="large">크게</option>
          </select>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="submit" disabled={submitting || !spaceId}>{submitting ? "추가 중..." : "추가"}</button>
        </div>
      </form>
    </div>
  );
}
