const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");
const { pushNotification } = require("../socket");

const router = express.Router();

router.get("/", requireAuth, requirePermission("project", "read"), (req, res) => {
  const { spaceId } = req.query;
  if (typeof spaceId === "string") {
    if (!db.isSpaceMember(spaceId, req.userId)) {
      return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
    }
    return res.json({ projects: db.listProjectsForSpace(spaceId) });
  }
  res.json({ projects: db.listProjectsForUser(req.userId) });
});

router.post("/", requireAuth, requirePermission("project", "write"), (req, res) => {
  const { spaceId, name, color, icon, startDate, endDate, memberIds } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "프로젝트 이름을 입력하세요." });
  }
  const ids = Array.isArray(memberIds) ? memberIds.filter((id) => typeof id === "string") : [];
  const project = db.createProject({
    spaceId,
    name: name.trim(),
    color: typeof color === "string" ? color : undefined,
    icon: typeof icon === "string" ? icon : undefined,
    startDate: typeof startDate === "string" ? startDate : null,
    endDate: typeof endDate === "string" ? endDate : null,
    createdBy: req.userId,
    memberIds: ids,
  });
  res.status(201).json({ project });
});

function requireProjectMembership(req, res, next) {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
  if (!db.isProjectMember(project.id, req.userId)) {
    return res.status(403).json({ error: "이 프로젝트의 멤버가 아닙니다." });
  }
  req.project = project;
  next();
}

router.get("/:id", requireAuth, requirePermission("project", "read"), requireProjectMembership, (req, res) => {
  res.json({
    project: req.project,
    statuses: db.listTaskStatuses(req.project.id),
    tasks: db.listTasksForProject(req.project.id),
  });
});

router.post("/:id/members", requireAuth, requirePermission("project", "update"), requireProjectMembership, (req, res) => {
  const { memberIds } = req.body || {};
  const ids = Array.isArray(memberIds) ? memberIds.filter((id) => typeof id === "string") : [];
  if (ids.length === 0) return res.status(400).json({ error: "추가할 사용자를 선택하세요." });
  const newIds = ids.filter((uid) => !req.project.members.includes(uid));
  const project = db.addProjectMembers(req.project.id, ids);
  for (const userId of newIds) {
    pushNotification(userId, {
      type: "project_invite",
      title: `'${project.name}' 프로젝트에 초대되었습니다`,
      link: `/projects/${project.id}`,
    });
  }
  res.json({ project });
});

// ---- 태스크 상태(칸반 컬럼) ----

router.post("/:id/statuses", requireAuth, requirePermission("project", "write"), requireProjectMembership, (req, res) => {
  const { name } = req.body || {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "상태 이름을 입력하세요." });
  }
  const status = db.createTaskStatus(req.project.id, name.trim());
  res.status(201).json({ status });
});

router.patch(
  "/:id/statuses/:statusId",
  requireAuth,
  requirePermission("project", "update"),
  requireProjectMembership,
  (req, res) => {
    const { name } = req.body || {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "상태 이름을 입력하세요." });
    }
    const status = db.renameTaskStatus(req.params.statusId, name.trim());
    if (!status) return res.status(404).json({ error: "상태를 찾을 수 없습니다." });
    res.json({ status });
  }
);

router.delete(
  "/:id/statuses/:statusId",
  requireAuth,
  requirePermission("project", "delete"),
  requireProjectMembership,
  (req, res) => {
    const result = db.deleteTaskStatus(req.params.statusId);
    if (result.error === "status_has_tasks") {
      return res.status(400).json({ error: "이 상태에 태스크가 있어 삭제할 수 없습니다." });
    }
    res.status(204).end();
  }
);

module.exports = { router, requireProjectMembership };
