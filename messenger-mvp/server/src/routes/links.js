const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

// 데이터 릴레이션(모듈 간 링크) 범용 API. 예: 위키 문서 <-> 태스크, CRM 고객 <-> 인보이스.
// module/id 쌍으로만 대상을 식별하므로 앞으로 추가되는 모듈도 별도 라우트 없이 그대로 쓴다.
router.get("/", requireAuth, (req, res) => {
  const { module, id } = req.query;
  if (typeof module !== "string" || typeof id !== "string") {
    return res.status(400).json({ error: "module과 id 쿼리 파라미터가 필요합니다." });
  }
  res.json({ links: db.listLinksForEntity(module, id) });
});

router.post("/", requireAuth, (req, res) => {
  const { fromModule, fromId, toModule, toId } = req.body || {};
  if ([fromModule, fromId, toModule, toId].some((v) => typeof v !== "string" || !v)) {
    return res.status(400).json({ error: "fromModule, fromId, toModule, toId를 모두 입력하세요." });
  }
  const link = db.createEntityLink({ fromModule, fromId, toModule, toId, createdBy: req.userId });
  res.status(201).json({ link });
});

router.delete("/:id", requireAuth, (req, res) => {
  const ok = db.deleteEntityLink(req.params.id);
  if (!ok) return res.status(404).json({ error: "링크를 찾을 수 없습니다." });
  res.status(204).end();
});

module.exports = router;
