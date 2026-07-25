import { useMemo, useState } from "react";
import type { Task } from "../types";
import Icon from "./Icon";

interface Props {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}

function toDateKey(d: Date) {
  return d.toLocaleDateString("en-CA");
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export default function TaskTimelineView({ tasks, onOpenTask }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  const monthStart = startOfMonth(cursor.year, cursor.month);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.year, cursor.month, d));

  const todayKey = toDateKey(new Date());

  const timelineTasks = useMemo(() => {
    const withDates = tasks.filter((t) => t.startDate || t.dueDate);
    if (withDates.length === 0) return [];
    const times = withDates.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean) as string[]).map((s) => new Date(s).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = Math.max(max - min, 24 * 3600 * 1000);
    return withDates.map((t) => {
      const start = new Date(t.startDate || t.dueDate!).getTime();
      const end = new Date(t.dueDate || t.startDate!).getTime();
      return {
        task: t,
        leftPct: ((start - min) / span) * 100,
        widthPct: Math.max(((Math.max(end, start) - start) / span) * 100, 1.5),
      };
    });
  }, [tasks]);

  return (
    <div className="timeline-view">
      <div className="calendar-header">
        <button className="link-button" onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}>
          <Icon name="chevronDown" size={14} className="rotate-90" /> 이전
        </button>
        <strong>{cursor.year}년 {cursor.month + 1}월</strong>
        <button className="link-button" onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}>
          다음 <Icon name="chevronDown" size={14} className="rotate-270" />
        </button>
      </div>

      <div className="calendar-grid">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="calendar-cell empty" />;
          const key = toDateKey(date);
          const dayTasks = tasksByDueDate.get(key) || [];
          return (
            <div key={i} className={`calendar-cell ${key === todayKey ? "today" : ""}`}>
              <div className="calendar-cell-date">{date.getDate()}</div>
              <div className="calendar-cell-tasks">
                {dayTasks.slice(0, 3).map((t) => (
                  <button key={t.id} className={`calendar-task-chip priority-${t.priority}`} onClick={() => onOpenTask(t.id)}>
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && <span className="calendar-more">+{dayTasks.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {timelineTasks.length > 0 && (
        <div className="gantt-section">
          <div className="sidebar-section-header"><span>타임라인</span></div>
          <div className="gantt-list">
            {timelineTasks.map(({ task, leftPct, widthPct }) => (
              <div key={task.id} className="gantt-row">
                <div className="gantt-row-label" title={task.title}>{task.title}</div>
                <div className="gantt-row-track">
                  <div
                    className={`gantt-row-bar priority-${task.priority}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    onClick={() => onOpenTask(task.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
