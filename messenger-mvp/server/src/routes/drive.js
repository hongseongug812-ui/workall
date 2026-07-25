const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");

const router = express.Router();

function requireSpaceParam(req, res, next) {
  const { spaceId } = req.query;
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  req.spaceId = spaceId;
  next();
}

router.get("/folders", requireAuth, requirePermission("drive", "read"), requireSpaceParam, (req, res) => {
  res.json({ folders: db.listDriveFolders(req.spaceId) });
});

router.post("/folders", requireAuth, requirePermission("drive", "write"), (req, res) => {
  const { spaceId, parentId, name } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "폴더 이름을 입력하세요." });
  }
  if (parentId) {
    const parent = db.findDriveFolderById(parentId);
    if (!parent || parent.spaceId !== spaceId) return res.status(400).json({ error: "올바르지 않은 상위 폴더입니다." });
  }
  const folder = db.createDriveFolder({ spaceId, parentId: typeof parentId === "string" ? parentId : null, name: name.trim(), createdBy: req.userId });
  res.status(201).json({ folder });
});

router.delete("/folders/:id", requireAuth, requirePermission("drive", "delete"), (req, res) => {
  const folder = db.findDriveFolderById(req.params.id);
  if (!folder) return res.status(404).json({ error: "폴더를 찾을 수 없습니다." });
  if (!db.isSpaceMember(folder.spaceId, req.userId)) return res.status(403).json({ error: "권한이 없습니다." });
  const result = db.deleteDriveFolder(req.params.id);
  if (result.error === "not_empty") return res.status(400).json({ error: "폴더가 비어있지 않아 삭제할 수 없습니다." });
  res.status(204).end();
});

router.get("/files", requireAuth, requirePermission("drive", "read"), requireSpaceParam, (req, res) => {
  const { folderId } = req.query;
  res.json({ files: db.listDriveFiles(req.spaceId, typeof folderId === "string" ? folderId : null) });
});

router.post("/files", requireAuth, requirePermission("drive", "write"), (req, res) => {
  const { spaceId, folderId, name, url, mime, size } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof name !== "string" || !name.trim() || typeof url !== "string") {
    return res.status(400).json({ error: "파일 정보가 올바르지 않습니다." });
  }
  if (folderId) {
    const folder = db.findDriveFolderById(folderId);
    if (!folder || folder.spaceId !== spaceId) return res.status(400).json({ error: "올바르지 않은 폴더입니다." });
  }
  const file = db.createDriveFile({
    spaceId,
    folderId: typeof folderId === "string" ? folderId : null,
    name: name.trim(),
    url,
    mime: typeof mime === "string" ? mime : null,
    size: typeof size === "number" ? size : null,
    uploadedBy: req.userId,
  });
  res.status(201).json({ file });
});

router.delete("/files/:id", requireAuth, requirePermission("drive", "delete"), (req, res) => {
  const file = db.findDriveFileById(req.params.id);
  if (!file) return res.status(404).json({ error: "파일을 찾을 수 없습니다." });
  if (!db.isSpaceMember(file.spaceId, req.userId)) return res.status(403).json({ error: "권한이 없습니다." });
  db.deleteDriveFile(req.params.id);
  res.status(204).end();
});

module.exports = router;
