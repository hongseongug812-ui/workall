const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");

const router = express.Router();

router.get("/", requireAuth, requirePermission("project", "read"), (req, res) => {
  res.json({ spaces: db.listSpacesForUser(req.userId) });
});

router.post("/", requireAuth, requirePermission("project", "write"), (req, res) => {
  const { name, memberIds } = req.body || {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "스페이스 이름을 입력하세요." });
  }
  const ids = Array.isArray(memberIds) ? memberIds.filter((id) => typeof id === "string") : [];
  const space = db.createSpace({ name: name.trim(), memberIds: ids, createdBy: req.userId });
  res.status(201).json({ space });
});

function requireSpaceMembership(req, res, next) {
  const space = db.findSpaceById(req.params.id);
  if (!space) return res.status(404).json({ error: "스페이스를 찾을 수 없습니다." });
  if (!db.isSpaceMember(space.id, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  req.space = space;
  next();
}

router.post("/:id/members", requireAuth, requirePermission("project", "update"), requireSpaceMembership, (req, res) => {
  const { memberIds } = req.body || {};
  const ids = Array.isArray(memberIds) ? memberIds.filter((id) => typeof id === "string") : [];
  if (ids.length === 0) return res.status(400).json({ error: "추가할 사용자를 선택하세요." });
  const space = db.addSpaceMembers(req.space.id, ids);
  res.json({ space });
});

module.exports = { router, requireSpaceMembership };
