import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Project, Space, Task, TaskPriority, TaskStatus, User } from "../types";
import Icon from "./Icon";
import KanbanBoard from "./KanbanBoard";
import TaskListView from "./TaskListView";
import TaskTimelineView from "./TaskTimelineView";
import NewSpaceModal from "./NewSpaceModal";
import NewProjectModal from "./NewProjectModal";
import TaskDetailModal from "./TaskDetailModal";

interface Props {
  currentUser: User;
  users: User[];
}

type ViewMode = "kanban" | "list" | "timeline";

export default function ProjectsView({ currentUser, users }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showNewSpace, setShowNewSpace] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listSpaces().then(({ spaces: list }) => {
      setSpaces(list);
      if (list.length > 0) setActiveSpaceId((prev) => prev || list[0].id);
    });
  }, []);

  const refreshProjects = useCallback((spaceId: string) => {
    api.listProjects(spaceId).then(({ projects: list }) => setProjects(list));
  }, []);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshProjects(activeSpaceId);
    setActiveProjectId(null);
  }, [activeSpaceId, refreshProjects]);

  const refreshProject = useCallback((projectId: string) => {
    api
      .getProject(projectId)
      .then((res) => {
        setProject(res.project);
        setStatuses(res.statuses);
        setTasks(res.tasks);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "프로젝트를 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    if (!activeProjectId) {
      setProject(null);
      setStatuses([]);
      setTasks([]);
      return;
    }
    refreshProject(activeProjectId);
  }, [activeProjectId, refreshProject]);

  async function handleCreateSpace(name: string, memberIds: string[]) {
    const { space } = await api.createSpace(name, memberIds);
    setSpaces((prev) => [...prev, space]);
    setActiveSpaceId(space.id);
    setShowNewSpace(false);
  }

  async function handleCreateProject(data: { name: string; startDate: string | null; endDate: string | null; memberIds: string[] }) {
    if (!activeSpaceId) return;
    const { project: created } = await api.createProject({ spaceId: activeSpaceId, ...data });
    setProjects((prev) => [...prev, created]);
    setActiveProjectId(created.id);
    setShowNewProject(false);
  }

  async function handleCreateTask(statusId: string, title: string) {
    if (!activeProjectId) return;
    const { task } = await api.createTask({ projectId: activeProjectId, statusId, title });
    setTasks((prev) => [...prev, task]);
  }

  async function handleMoveTask(taskId: string, statusId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statusId } : t)));
    const { task } = await api.moveTask(taskId, statusId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
  }

  async function handleBulkMove(taskIds: string[], statusId: string) {
    setTasks((prev) => prev.map((t) => (taskIds.includes(t.id) ? { ...t, statusId } : t)));
    await Promise.all(taskIds.map((id) => api.moveTask(id, statusId)));
    if (activeProjectId) refreshProject(activeProjectId);
  }

  async function handleBulkPriority(taskIds: string[], priority: TaskPriority) {
    setTasks((prev) => prev.map((t) => (taskIds.includes(t.id) ? { ...t, priority } : t)));
    await Promise.all(taskIds.map((id) => api.updateTask(id, { priority })));
    if (activeProjectId) refreshProject(activeProjectId);
  }

  async function handleAddStatus(name: string) {
    if (!activeProjectId) return;
    const { status } = await api.createTaskStatus(activeProjectId, name);
    setStatuses((prev) => [...prev, status]);
  }

  return (
    <div className="projects-view">
      <div className="projects-sidebar">
        <div className="projects-sidebar-header">
          <select
            className="space-select"
            value={activeSpaceId || ""}
            onChange={(e) => setActiveSpaceId(e.target.value || null)}
          >
            {spaces.length === 0 && <option value="">스페이스 없음</option>}
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button className="icon-button" title="새 스페이스" onClick={() => setShowNewSpace(true)}>
            <Icon name="plus" size={14} />
          </button>
        </div>

        <div className="sidebar-section-header">
          <span>프로젝트</span>
          <button className="link-button" onClick={() => setShowNewProject(true)} disabled={!activeSpaceId}>
            <Icon name="plus" size={12} /> 새 프로젝트
          </button>
        </div>
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                className={`project-list-item ${activeProjectId === p.id ? "active" : ""}`}
                onClick={() => setActiveProjectId(p.id)}
              >
                <span className="project-color-dot" style={{ background: p.color }} />
                {p.icon} {p.name}
              </button>
            </li>
          ))}
          {projects.length === 0 && <p className="sidebar-empty">프로젝트가 없습니다.</p>}
        </ul>
      </div>

      <div className="projects-main">
        {error && <p className="auth-error">{error}</p>}
        {!project && (
          <div className="projects-empty-state">
            <div className="projects-empty-state-icon"><Icon name="board" size={32} /></div>
            <p>왼쪽에서 프로젝트를 선택하거나 새로 만들어보세요.</p>
          </div>
        )}
        {project && (
          <>
            <div className="projects-main-header">
              <h2>{project.icon} {project.name}</h2>
              <div className="view-tabs">
                <button className={viewMode === "kanban" ? "active" : ""} onClick={() => setViewMode("kanban")}>
                  <Icon name="board" size={15} /> 칸반
                </button>
                <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>
                  <Icon name="list" size={15} /> 리스트
                </button>
                <button className={viewMode === "timeline" ? "active" : ""} onClick={() => setViewMode("timeline")}>
                  <Icon name="calendar" size={15} /> 캘린더
                </button>
              </div>
            </div>

            {viewMode === "kanban" && (
              <KanbanBoard
                statuses={statuses}
                tasks={tasks}
                users={users}
                onOpenTask={setActiveTaskId}
                onMoveTask={handleMoveTask}
                onCreateTask={handleCreateTask}
                onAddStatus={handleAddStatus}
              />
            )}
            {viewMode === "list" && (
              <TaskListView
                statuses={statuses}
                tasks={tasks}
                users={users}
                onOpenTask={setActiveTaskId}
                onBulkMove={handleBulkMove}
                onBulkPriority={handleBulkPriority}
              />
            )}
            {viewMode === "timeline" && <TaskTimelineView tasks={tasks} onOpenTask={setActiveTaskId} />}
          </>
        )}
      </div>

      {showNewSpace && (
        <NewSpaceModal users={users} onCancel={() => setShowNewSpace(false)} onCreate={handleCreateSpace} />
      )}
      {showNewProject && (
        <NewProjectModal users={users} onCancel={() => setShowNewProject(false)} onCreate={handleCreateProject} />
      )}
      {activeTaskId && project && (
        <TaskDetailModal
          taskId={activeTaskId}
          project={project}
          statuses={statuses}
          users={users}
          currentUser={currentUser}
          onClose={() => setActiveTaskId(null)}
          onChanged={(updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
          onDeleted={(taskId) => setTasks((prev) => prev.filter((t) => t.id !== taskId))}
        />
      )}
    </div>
  );
}
