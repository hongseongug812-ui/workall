import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { DashboardWidget, FinanceProgressWidgetData, MyTasksWidgetData, NewLeadsWidgetData, RecentWikiWidgetData, WidgetSize } from "../types";
import Icon from "./Icon";

interface Props {
  widget: DashboardWidget;
  spaceName: string;
  onDragStart: () => void;
  onDrop: () => void;
  onDragOver: () => void;
  dragOver: boolean;
  onResize: (size: WidgetSize) => void;
  onDelete: () => void;
  onOpenTask?: (taskId: string) => void;
  onOpenWikiPage?: (pageId: string) => void;
}

const TITLES: Record<string, string> = {
  my_tasks: "내 작업",
  recent_wiki: "최근 업데이트된 문서",
  finance_progress: "이번 달 재무 현황",
  new_leads: "신규 고객 리드",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function WidgetCard({ widget, spaceName, onDragStart, onDrop, onDragOver, dragOver, onResize, onDelete, onOpenTask, onOpenWikiPage }: Props) {
  const [data, setData] = useState<(MyTasksWidgetData & RecentWikiWidgetData & FinanceProgressWidgetData & NewLeadsWidgetData) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWidgetData(widget.id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "위젯 데이터를 불러오지 못했습니다."));
  }, [widget.id]);

  return (
    <div
      className={`widget-card widget-size-${widget.size} ${dragOver ? "drag-over" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <div className="widget-card-header">
        <span className="widget-card-title">{TITLES[widget.type]}</span>
        <div className="widget-card-controls">
          <select value={widget.size} onChange={(e) => onResize(e.target.value as WidgetSize)} title="크기 조절">
            <option value="small">S</option>
            <option value="medium">M</option>
            <option value="large">L</option>
          </select>
          <button className="link-button" onClick={onDelete} title="위젯 삭제">
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>
      <div className="widget-card-subtitle">{spaceName}</div>

      <div className="widget-card-body">
        {error && <p className="auth-error">{error}</p>}
        {!data && !error && <p className="sidebar-empty">불러오는 중...</p>}

        {data && widget.type === "my_tasks" && (
          <ul className="widget-task-list">
            {(data.tasks || []).length === 0 && <p className="sidebar-empty">마감 임박한 태스크가 없어요.</p>}
            {(data.tasks || []).map((t) => (
              <li key={t.id} className="widget-task-row" onClick={() => onOpenTask?.(t.id)}>
                <span className={`priority-badge priority-${t.priority}`}>{t.dueDate}</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        )}

        {data && widget.type === "recent_wiki" && (
          <ul className="widget-wiki-list">
            {(data.pages || []).length === 0 && <p className="sidebar-empty">문서가 없어요.</p>}
            {(data.pages || []).map((p) => (
              <li key={p.id} onClick={() => onOpenWikiPage?.(p.id)}>
                <Icon name="file" size={12} /> {p.title}
                <span className="notification-time"> · {formatDate(p.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}

        {data && widget.type === "finance_progress" && (
          <div className="widget-finance-progress">
            <div className="widget-finance-numbers">
              <strong>{(data.currentIncome || 0).toLocaleString()}원</strong>
              <span className="notification-time"> / 목표 {(data.goal || 0).toLocaleString()}원</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${data.goal ? Math.min(100, Math.round(((data.currentIncome || 0) / data.goal) * 100)) : 0}%` }}
              />
            </div>
            <div className="notification-time">
              {data.goal ? Math.round(((data.currentIncome || 0) / data.goal) * 100) : 0}% 달성 · {data.month}
            </div>
          </div>
        )}

        {data && widget.type === "new_leads" && (
          <div className="widget-big-number">{data.count ?? 0}<span className="notification-time"> 건</span></div>
        )}
      </div>
    </div>
  );
}
