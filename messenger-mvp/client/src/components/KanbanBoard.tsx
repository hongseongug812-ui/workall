import { useState } from "react";
import type { FormEvent } from "react";
import type { Task, TaskStatus, User } from "../types";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface Props {
  statuses: TaskStatus[];
  tasks: Task[];
  users: User[];
  onOpenTask: (taskId: string) => void;
  onMoveTask: (taskId: string, statusId: string) => void;
  onCreateTask: (statusId: string, title: string) => Promise<void>;
  onAddStatus: (name: string) => Promise<void>;
}

const PRIORITY_LABEL: Record<string, string> = { low: "낮음", medium: "보통", high: "높음" };

function userName(users: User[], id: string) {
  return users.find((u) => u.id === id)?.name || "?";
}

function userAvatar(users: User[], id: string) {
  return users.find((u) => u.id === id)?.avatarUrl || null;
}

function QuickAddTask({ statusId, onCreateTask }: { statusId: string; onCreateTask: Props["onCreateTask"] }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onCreateTask(statusId, title.trim());
      setTitle("");
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!adding) {
    return (
      <button className="kanban-add-task" onClick={() => setAdding(true)}>
        <Icon name="plus" size={14} /> 태스크 추가
      </button>
    );
  }

  return (
    <form className="kanban-add-task-form" onSubmit={handleSubmit}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && setAdding(false)}
        placeholder="태스크 제목"
        disabled={submitting}
      />
    </form>
  );
}

export default function KanbanBoard({ statuses, tasks, users, onOpenTask, onMoveTask, onCreateTask, onAddStatus }: Props) {
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [addingStatus, setAddingStatus] = useState(false);
  const [statusName, setStatusName] = useState("");

  async function handleAddStatus(e: FormEvent) {
    e.preventDefault();
    if (!statusName.trim()) return;
    await onAddStatus(statusName.trim());
    setStatusName("");
    setAddingStatus(false);
  }

  return (
    <div className="kanban-board">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((t) => t.statusId === status.id);
        return (
          <div
            key={status.id}
            className={`kanban-column ${dragOverStatusId === status.id ? "drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatusId(status.id);
            }}
            onDragLeave={() => setDragOverStatusId((prev) => (prev === status.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/task-id");
              if (taskId) onMoveTask(taskId, status.id);
              setDragOverStatusId(null);
            }}
          >
            <div className="kanban-column-header">
              <span>{status.name}</span>
              <span className="kanban-column-count">{columnTasks.length}</span>
            </div>
            <div className="kanban-column-body">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
                  onClick={() => onOpenTask(task.id)}
                >
                  <div className="kanban-card-title">{task.title}</div>
                  <div className="kanban-card-meta">
                    <span className={`priority-badge priority-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                    {task.dueDate && <span className="kanban-card-due">{task.dueDate}</span>}
                  </div>
                  {task.subtaskTotal > 0 && (
                    <div className="kanban-card-progress">
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${task.subtaskProgress}%` }} />
                      </div>
                      <span>{task.subtaskDone}/{task.subtaskTotal}</span>
                    </div>
                  )}
                  {task.assigneeIds.length > 0 && (
                    <div className="kanban-card-assignees">
                      {task.assigneeIds.slice(0, 3).map((id) => (
                        <span key={id} title={userName(users, id)}>
                          <Avatar name={userName(users, id)} avatarUrl={userAvatar(users, id)} size={20} className="avatar-tiny" />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <QuickAddTask statusId={status.id} onCreateTask={onCreateTask} />
            </div>
          </div>
        );
      })}

      <div className="kanban-column kanban-column-new">
        {addingStatus ? (
          <form onSubmit={handleAddStatus} className="kanban-add-task-form">
            <input
              autoFocus
              value={statusName}
              onChange={(e) => setStatusName(e.target.value)}
              onBlur={() => !statusName.trim() && setAddingStatus(false)}
              placeholder="상태 이름"
            />
          </form>
        ) : (
          <button className="kanban-add-task" onClick={() => setAddingStatus(true)}>
            <Icon name="plus" size={14} /> 상태 추가
          </button>
        )}
      </div>
    </div>
  );
}
