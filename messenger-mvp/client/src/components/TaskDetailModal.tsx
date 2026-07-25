import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import type { Project, Subtask, Task, TaskComment, TaskPriority, TaskStatus, User } from "../types";
import Icon from "./Icon";

interface Props {
  taskId: string;
  project: Project;
  statuses: TaskStatus[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onChanged: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

const PRIORITY_LABEL: Record<TaskPriority, string> = { low: "낮음", medium: "보통", high: "높음" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TaskDetailModal({ taskId, project, statuses, users, currentUser, onClose, onChanged, onDeleted }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectUsers = users.filter((u) => project.members.includes(u.id));

  async function load() {
    setLoading(true);
    try {
      const res = await api.getTask(taskId);
      setTask(res.task);
      setTitle(res.task.title);
      setBody(res.task.body || "");
      setSubtasks(res.subtasks);
      setComments(res.comments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "태스크를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function saveField(patch: Partial<{ title: string; body: string; priority: TaskPriority; startDate: string | null; dueDate: string | null }>) {
    const { task: updated } = await api.updateTask(taskId, patch);
    setTask(updated);
    onChanged(updated);
  }

  async function handleMove(statusId: string) {
    const { task: updated } = await api.moveTask(taskId, statusId);
    setTask(updated);
    onChanged(updated);
  }

  async function handleDelete() {
    if (!confirm("이 태스크를 삭제할까요?")) return;
    await api.deleteTask(taskId);
    onDeleted(taskId);
    onClose();
  }

  async function toggleAssignee(userId: string) {
    if (!task) return;
    const next = task.assigneeIds.includes(userId)
      ? task.assigneeIds.filter((id) => id !== userId)
      : [...task.assigneeIds, userId];
    const { task: updated } = await api.setTaskAssignees(taskId, next);
    setTask(updated);
    onChanged(updated);
  }

  async function handleAddSubtask(e: FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const { subtask } = await api.addSubtask(taskId, newSubtask.trim());
    setSubtasks((prev) => [...prev, subtask]);
    setNewSubtask("");
    load();
  }

  async function toggleSubtask(subtaskId: string, done: boolean) {
    const { subtask } = await api.setSubtaskDone(taskId, subtaskId, done);
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? subtask : s)));
    load();
  }

  async function removeSubtask(subtaskId: string) {
    await api.deleteSubtask(taskId, subtaskId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    load();
  }

  async function handleSendComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    const { comment } = await api.addTaskComment(taskId, { content: commentText.trim() });
    setComments((prev) => [...prev, comment]);
    setCommentText("");
  }

  async function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await api.uploadFile(file);
      const { comment } = await api.addTaskComment(taskId, { attachment });
      setComments((prev) => [...prev, comment]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>태스크</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="link-button" onClick={handleDelete}>
              <Icon name="trash" size={14} /> 삭제
            </button>
            <button className="link-button" onClick={onClose}>
              <Icon name="close" size={14} /> 닫기
            </button>
          </div>
        </div>

        {loading && <p className="sidebar-empty">불러오는 중...</p>}
        {error && <p className="auth-error">{error}</p>}

        {task && (
          <>
            <input
              className="task-detail-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && saveField({ title: title.trim() })}
            />

            <div className="task-detail-meta-row">
              <label>
                상태
                <select value={task.statusId} onChange={(e) => handleMove(e.target.value)}>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                우선순위
                <select value={task.priority} onChange={(e) => saveField({ priority: e.target.value as TaskPriority })}>
                  {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </label>
              <label>
                시작일
                <input type="date" value={task.startDate || ""} onChange={(e) => saveField({ startDate: e.target.value || null })} />
              </label>
              <label>
                마감일
                <input type="date" value={task.dueDate || ""} onChange={(e) => saveField({ dueDate: e.target.value || null })} />
              </label>
            </div>

            <div className="task-detail-section">
              <div className="sidebar-section-header">
                <span>담당자</span>
                <button className="link-button" onClick={() => setShowAssigneePicker((v) => !v)}>편집</button>
              </div>
              <div className="task-assignee-chips">
                {task.assigneeIds.length === 0 && <span className="sidebar-empty">담당자가 없습니다.</span>}
                {task.assigneeIds.map((id) => (
                  <span key={id} className="task-assignee-chip">{users.find((u) => u.id === id)?.name || "?"}</span>
                ))}
              </div>
              {showAssigneePicker && (
                <div className="modal-member-list">
                  {projectUsers.map((u) => (
                    <label key={u.id} className="modal-member-item">
                      <input type="checkbox" checked={task.assigneeIds.includes(u.id)} onChange={() => toggleAssignee(u.id)} />
                      {u.name} <span className="member-dept">({u.department})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="task-detail-section">
              <label>
                설명
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={() => body !== (task.body || "") && saveField({ body })}
                  rows={3}
                  placeholder="설명을 입력하세요 (@이름 으로 멘션할 수 있어요)"
                />
              </label>
            </div>

            <div className="task-detail-section">
              <div className="sidebar-section-header">
                <span>체크리스트 {task.subtaskTotal > 0 && `(${task.subtaskDone}/${task.subtaskTotal})`}</span>
              </div>
              {subtasks.length > 0 && (
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${task.subtaskProgress || 0}%` }} />
                </div>
              )}
              <ul className="subtask-list">
                {subtasks.map((s) => (
                  <li key={s.id} className="subtask-row">
                    <input type="checkbox" checked={s.done} onChange={(e) => toggleSubtask(s.id, e.target.checked)} />
                    <span className={s.done ? "done" : ""}>{s.text}</span>
                    <button className="link-button" onClick={() => removeSubtask(s.id)}>
                      <Icon name="close" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddSubtask} className="subtask-add-form">
                <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="체크리스트 항목 추가" />
                <button type="submit">추가</button>
              </form>
            </div>

            <div className="task-detail-section">
              <div className="sidebar-section-header">
                <span>댓글 ({comments.length})</span>
              </div>
              <ul className="task-comment-list">
                {comments.map((c) => {
                  const authorName = c.userId === currentUser.id ? "나" : users.find((u) => u.id === c.userId)?.name || "알 수 없음";
                  return (
                  <li key={c.id} className="task-comment-row">
                    <span className="avatar avatar-tiny">{authorName.slice(0, 1)}</span>
                    <div>
                      <div className="task-comment-meta">
                        <strong>{authorName}</strong>
                        <span className="notification-time">{formatDateTime(c.createdAt)}</span>
                      </div>
                      {c.content && <div>{c.content}</div>}
                      {c.attachment && (
                        <a href={c.attachment.url} target="_blank" rel="noreferrer" className="task-comment-attachment">
                          <Icon name="file" size={14} /> {c.attachment.name}
                        </a>
                      )}
                    </div>
                  </li>
                  );
                })}
                {comments.length === 0 && <p className="sidebar-empty">댓글이 없습니다.</p>}
              </ul>
              <form onSubmit={handleSendComment} className="task-comment-form">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="댓글 입력..." />
                <input ref={fileInputRef} type="file" onChange={handleAttachFile} style={{ display: "none" }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Icon name="attach" size={16} />
                </button>
                <button type="submit">
                  <Icon name="send" size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
