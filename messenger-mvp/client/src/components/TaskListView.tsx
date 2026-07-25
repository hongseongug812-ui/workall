import { useState } from "react";
import type { Task, TaskPriority, TaskStatus, User } from "../types";

interface Props {
  statuses: TaskStatus[];
  tasks: Task[];
  users: User[];
  onOpenTask: (taskId: string) => void;
  onBulkMove: (taskIds: string[], statusId: string) => void;
  onBulkPriority: (taskIds: string[], priority: TaskPriority) => void;
}

const PRIORITY_LABEL: Record<TaskPriority, string> = { low: "낮음", medium: "보통", high: "높음" };

function statusName(statuses: TaskStatus[], id: string) {
  return statuses.find((s) => s.id === id)?.name || "-";
}

function userNames(users: User[], ids: string[]) {
  if (ids.length === 0) return "-";
  return ids.map((id) => users.find((u) => u.id === id)?.name || "?").join(", ");
}

export default function TaskListView({ statuses, tasks, users, onOpenTask, onBulkMove, onBulkPriority }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [bulkPriority, setBulkPriority] = useState<TaskPriority | "">("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id))));
  }

  return (
    <div className="task-list-view">
      {selected.size > 0 && (
        <div className="task-list-bulk-bar">
          <span>{selected.size}개 선택됨</span>
          <select value={bulkStatusId} onChange={(e) => setBulkStatusId(e.target.value)}>
            <option value="">상태 변경...</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            disabled={!bulkStatusId}
            onClick={() => {
              onBulkMove([...selected], bulkStatusId);
              setBulkStatusId("");
              setSelected(new Set());
            }}
          >
            적용
          </button>
          <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value as TaskPriority | "")}>
            <option value="">우선순위 변경...</option>
            <option value="low">낮음</option>
            <option value="medium">보통</option>
            <option value="high">높음</option>
          </select>
          <button
            disabled={!bulkPriority}
            onClick={() => {
              if (bulkPriority) onBulkPriority([...selected], bulkPriority);
              setBulkPriority("");
              setSelected(new Set());
            }}
          >
            적용
          </button>
          <button className="link-button" onClick={() => setSelected(new Set())}>선택 해제</button>
        </div>
      )}

      <div className="task-table-card">
      <table className="task-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>
              <input type="checkbox" checked={selected.size > 0 && selected.size === tasks.length} onChange={toggleAll} />
            </th>
            <th>제목</th>
            <th>상태</th>
            <th>우선순위</th>
            <th>담당자</th>
            <th>마감일</th>
            <th>진행률</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={selected.has(task.id) ? "selected" : ""}>
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggle(task.id)} />
              </td>
              <td className="task-table-title" onClick={() => onOpenTask(task.id)}>{task.title}</td>
              <td>{statusName(statuses, task.statusId)}</td>
              <td>
                <span className={`priority-badge priority-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
              </td>
              <td>{userNames(users, task.assigneeIds)}</td>
              <td>{task.dueDate || "-"}</td>
              <td>{task.subtaskTotal > 0 ? `${task.subtaskProgress}%` : "-"}</td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="sidebar-empty">태스크가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
