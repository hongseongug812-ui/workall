const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");

const router = express.Router();

router.get("/templates", requireAuth, requirePermission("wiki", "read"), (req, res) => {
  res.json({ templates: db.listWikiTemplates() });
});

router.get("/pages", requireAuth, requirePermission("wiki", "read"), (req, res) => {
  const { spaceId } = req.query;
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  res.json({ pages: db.listWikiPagesForSpace(spaceId) });
});

router.post("/pages", requireAuth, requirePermission("wiki", "write"), (req, res) => {
  const { spaceId, parentId, title, template } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "문서 제목을 입력하세요." });
  }
  if (parentId) {
    const parent = db.findWikiPageById(parentId);
    if (!parent || parent.spaceId !== spaceId) {
      return res.status(400).json({ error: "올바르지 않은 상위 문서입니다." });
    }
  }
  const blocks = typeof template === "string" ? db.getWikiTemplateBlocks(template) : [];
  const page = db.createWikiPage({
    spaceId,
    parentId: typeof parentId === "string" ? parentId : null,
    title: title.trim(),
    content: JSON.stringify(blocks),
    createdBy: req.userId,
  });
  res.status(201).json({ page });
});

function requireWikiPageAccess(req, res, next) {
  const page = db.findWikiPageById(req.params.id);
  if (!page) return res.status(404).json({ error: "문서를 찾을 수 없습니다." });
  if (!db.isSpaceMember(page.spaceId, req.userId)) {
    return res.status(403).json({ error: "이 문서에 접근할 권한이 없습니다." });
  }
  req.wikiPage = page;
  next();
}

router.get("/pages/:id", requireAuth, requirePermission("wiki", "read"), requireWikiPageAccess, (req, res) => {
  res.json({ page: req.wikiPage, backlinks: db.listWikiBacklinks(req.wikiPage.id) });
});

router.patch("/pages/:id", requireAuth, requirePermission("wiki", "update"), requireWikiPageAccess, (req, res) => {
  const { title, content } = req.body || {};
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ error: "제목을 입력하세요." });
  }
  const page = db.updateWikiPage(
    req.wikiPage.id,
    { title: title?.trim(), content: content !== undefined ? JSON.stringify(content) : undefined },
    req.userId
  );
  res.json({ page });
});

router.delete("/pages/:id", requireAuth, requirePermission("wiki", "delete"), requireWikiPageAccess, (req, res) => {
  const result = db.deleteWikiPage(req.wikiPage.id);
  if (result.error === "has_children") {
    return res.status(400).json({ error: "하위 문서가 있어 삭제할 수 없습니다. 먼저 하위 문서를 삭제하세요." });
  }
  res.status(204).end();
});

router.get("/pages/:id/versions", requireAuth, requirePermission("wiki", "read"), requireWikiPageAccess, (req, res) => {
  res.json({ versions: db.listWikiPageVersions(req.wikiPage.id) });
});

router.get("/pages/:id/versions/:versionId", requireAuth, requirePermission("wiki", "read"), requireWikiPageAccess, (req, res) => {
  const version = db.getWikiPageVersion(req.params.versionId);
  if (!version || version.pageId !== req.wikiPage.id) {
    return res.status(404).json({ error: "버전을 찾을 수 없습니다." });
  }
  res.json({ version });
});

router.post(
  "/pages/:id/versions/:versionId/restore",
  requireAuth,
  requirePermission("wiki", "update"),
  requireWikiPageAccess,
  (req, res) => {
    const result = db.restoreWikiPageVersion(req.wikiPage.id, req.params.versionId, req.userId);
    if (result.error) return res.status(404).json({ error: "버전을 찾을 수 없습니다." });
    res.json({ page: result.page });
  }
);

module.exports = router;
