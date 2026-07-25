const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");
const { pushNotification } = require("../socket");

const router = express.Router();

function requireTaskAccess(req, res, next) {
  const task = db.findTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: "태스크를 찾을 수 없습니다." });
  const project = db.findProjectById(task.projectId);
  if (!project || !db.isProjectMember(project.id, req.userId)) {
    return res.status(403).json({ error: "이 태스크에 접근할 권한이 없습니다." });
  }
  req.task = task;
  req.project = project;
  next();
}

function notifyMentionsInText(text, project, actorId) {
  if (!text) return;
  const actor = db.findUserById(actorId);
  for (const memberId of project.members) {
    if (memberId === actorId) continue;
    const user = db.findUserById(memberId);
    if (!user || !text.includes(`@${user.name}`)) continue;
    pushNotification(memberId, {
      type: "mention",
      title: `${actor?.name || "누군가"}님이 회원님을 언급했습니다`,
      body: text.slice(0, 80),
      link: `/tasks/${project.id}`,
    });
  }
}

router.post("/", requireAuth, requirePermission("project", "write"), (req, res) => {
  const { projectId, statusId, title, body, priority, startDate, dueDate, assigneeIds } = req.body || {};
  const project = db.findProjectById(projectId);
  if (!project || !db.isProjectMember(project.id, req.userId)) {
    return res.status(403).json({ error: "이 프로젝트의 멤버가 아닙니다." });
  }
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "태스크 제목을 입력하세요." });
  }
  const statuses = db.listTaskStatuses(project.id);
  const resolvedStatusId = typeof statusId === "string" && statuses.some((s) => s.id === statusId) ? statusId : statuses[0]?.id;
  if (!resolvedStatusId) return res.status(400).json({ error: "이 프로젝트에 상태 컬럼이 없습니다." });
  if (priority !== undefined && !["low", "medium", "high"].includes(priority)) {
    return res.status(400).json({ error: "priority는 low/medium/high 중 하나여야 합니다." });
  }
  const ids = Array.isArray(assigneeIds) ? assigneeIds.filter((id) => typeof id === "string" && project.members.includes(id)) : [];
  const task = db.createTask({
    projectId: project.id,
    statusId: resolvedStatusId,
    title: title.trim(),
    body: typeof body === "string" ? body : null,
    priority,
    startDate: typeof startDate === "string" ? startDate : null,
    dueDate: typeof dueDate === "string" ? dueDate : null,
    createdBy: req.userId,
    assigneeIds: ids,
  });
  const actor = db.findUserById(req.userId);
  for (const assigneeId of ids) {
    if (assigneeId === req.userId) continue;
    pushNotification(assigneeId, {
      type: "task_assigned",
      title: `${actor?.name || "누군가"}님이 태스크를 배정했습니다: ${task.title}`,
      link: `/tasks/${project.id}?taskId=${task.id}`,
    });
  }
  notifyMentionsInText(task.body, project, req.userId);
  res.status(201).json({ task });
});

router.get("/:id", requireAuth, requirePermission("project", "read"), requireTaskAccess, (req, res) => {
  res.json({
    task: req.task,
    subtasks: db.listSubtasks(req.task.id),
    comments: db.listTaskComments(req.task.id),
  });
});

router.patch("/:id", requireAuth, requirePermission("project", "update"), requireTaskAccess, (req, res) => {
  const { title, body, priority, startDate, dueDate } = req.body || {};
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ error: "제목을 입력하세요." });
  }
  if (priority !== undefined && !["low", "medium", "high"].includes(priority)) {
    return res.status(400).json({ error: "priority는 low/medium/high 중 하나여야 합니다." });
  }
  const task = db.updateTask(req.task.id, { title: title?.trim(), body, priority, startDate, dueDate });
  notifyMentionsInText(body, req.project, req.userId);
  res.json({ task });
});

router.post("/:id/move", requireAuth, requirePermission("project", "update"), requireTaskAccess, (req, res) => {
  const { statusId } = req.body || {};
  const statuses = db.listTaskStatuses(req.project.id);
  if (typeof statusId !== "string" || !statuses.some((s) => s.id === statusId)) {
    return res.status(400).json({ error: "올바른 상태를 지정하세요." });
  }
  const task = db.moveTask(req.task.id, statusId);
  res.json({ task });
});

router.delete("/:id", requireAuth, requirePermission("project", "delete"), requireTaskAccess, (req, res) => {
  db.deleteTask(req.task.id);
  res.status(204).end();
});

router.put("/:id/assignees", requireAuth, requirePermission("project", "update"), requireTaskAccess, (req, res) => {
  const { userIds } = req.body || {};
  const ids = Array.isArray(userIds) ? userIds.filter((id) => typeof id === "string" && req.project.members.includes(id)) : [];
  const previousIds = new Set(req.task.assigneeIds);
  const task = db.setTaskAssignees(req.task.id, ids);
  const actor = db.findUserById(req.userId);
  for (const assigneeId of ids) {
    if (assigneeId === req.userId || previousIds.has(assigneeId)) continue;
    pushNotification(assigneeId, {
      type: "task_assigned",
      title: `${actor?.name || "누군가"}님이 태스크를 배정했습니다: ${task.title}`,
      link: `/tasks/${req.project.id}?taskId=${task.id}`,
    });
  }
  res.json({ task });
});

// ---- 서브태스크 ----

router.get("/:id/subtasks", requireAuth, requirePermission("project", "read"), requireTaskAccess, (req, res) => {
  res.json({ subtasks: db.listSubtasks(req.task.id) });
});

router.post("/:id/subtasks", requireAuth, requirePermission("project", "write"), requireTaskAccess, (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "체크리스트 항목을 입력하세요." });
  }
  const subtask = db.addSubtask(req.task.id, text.trim());
  res.status(201).json({ subtask });
});

router.patch("/:id/subtasks/:subtaskId", requireAuth, requirePermission("project", "update"), requireTaskAccess, (req, res) => {
  const existing = db.findSubtaskById(req.params.subtaskId);
  if (!existing || existing.taskId !== req.task.id) {
    return res.status(404).json({ error: "체크리스트 항목을 찾을 수 없습니다." });
  }
  const { done } = req.body || {};
  const subtask = db.setSubtaskDone(req.params.subtaskId, !!done);
  res.json({ subtask });
});

router.delete("/:id/subtasks/:subtaskId", requireAuth, requirePermission("project", "delete"), requireTaskAccess, (req, res) => {
  const existing = db.findSubtaskById(req.params.subtaskId);
  if (!existing || existing.taskId !== req.task.id) {
    return res.status(404).json({ error: "체크리스트 항목을 찾을 수 없습니다." });
  }
  db.deleteSubtask(req.params.subtaskId);
  res.status(204).end();
});

// ---- 댓글 (커뮤니케이션 쓰레드) ----

router.get("/:id/comments", requireAuth, requirePermission("project", "read"), requireTaskAccess, (req, res) => {
  res.json({ comments: db.listTaskComments(req.task.id) });
});

router.post("/:id/comments", requireAuth, requirePermission("project", "write"), requireTaskAccess, (req, res) => {
  const { content, attachment } = req.body || {};
  const hasAttachment =
    attachment &&
    typeof attachment.url === "string" &&
    typeof attachment.name === "string" &&
    typeof attachment.mime === "string" &&
    typeof attachment.size === "number";
  const text = typeof content === "string" ? content.trim() : "";
  if (!text && !hasAttachment) {
    return res.status(400).json({ error: "댓글 내용을 입력하세요." });
  }
  const comment = db.addTaskComment({
    taskId: req.task.id,
    userId: req.userId,
    content: text || null,
    attachment: hasAttachment ? attachment : null,
  });
  notifyMentionsInText(text, req.project, req.userId);
  res.status(201).json({ comment });
});

module.exports = { router, requireTaskAccess };
