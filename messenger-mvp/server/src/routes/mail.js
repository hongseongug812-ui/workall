const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");

const router = express.Router();
const BOXES = ["inbox", "sent", "draft", "trash"];

router.get("/", requireAuth, requirePermission("mail", "read"), (req, res) => {
  const { box } = req.query;
  if (!BOXES.includes(box)) {
    return res.status(400).json({ error: `box는 다음 중 하나여야 합니다: ${BOXES.join(", ")}` });
  }
  res.json({ mails: db.listMailbox(req.userId, box), unreadCount: db.unreadMailCount(req.userId) });
});

router.post("/", requireAuth, requirePermission("mail", "write"), (req, res) => {
  const { subject, body, toIds, ccIds, draft } = req.body || {};
  const to = Array.isArray(toIds) ? toIds.filter((id) => typeof id === "string") : [];
  const cc = Array.isArray(ccIds) ? ccIds.filter((id) => typeof id === "string") : [];
  if (!draft && to.length === 0) {
    return res.status(400).json({ error: "받는 사람을 1명 이상 지정하세요." });
  }
  for (const uid of [...to, ...cc]) {
    if (!db.findUserById(uid)) return res.status(400).json({ error: `사용자를 찾을 수 없습니다: ${uid}` });
  }
  const mail = db.createMail({ fromUserId: req.userId, subject, body, toIds: to, ccIds: cc, draft: !!draft });
  res.status(201).json({ mail });
});

function requireMailAccess(req, res, next) {
  const mail = db.findMailById(req.params.id, req.userId);
  if (!mail || !mail.box) return res.status(404).json({ error: "메일을 찾을 수 없습니다." });
  req.mail = mail;
  next();
}

router.get("/:id", requireAuth, requirePermission("mail", "read"), requireMailAccess, (req, res) => {
  if (req.mail.box === "inbox") db.markMailRead(req.mail.id, req.userId);
  res.json({ mail: db.findMailById(req.mail.id, req.userId) });
});

router.patch("/:id", requireAuth, requirePermission("mail", "update"), requireMailAccess, (req, res) => {
  const { subject, body, toIds, ccIds } = req.body || {};
  const to = Array.isArray(toIds) ? toIds.filter((id) => typeof id === "string") : undefined;
  const cc = Array.isArray(ccIds) ? ccIds.filter((id) => typeof id === "string") : undefined;
  const result = db.updateDraft(req.mail.id, req.userId, { subject, body, toIds: to, ccIds: cc });
  if (result.error) return res.status(400).json({ error: "임시보관함의 메일만 수정할 수 있습니다." });
  res.json({ mail: result.mail });
});

router.post("/:id/send", requireAuth, requirePermission("mail", "write"), requireMailAccess, (req, res) => {
  const result = db.sendDraft(req.mail.id, req.userId);
  if (result.error === "no_recipients") return res.status(400).json({ error: "받는 사람을 1명 이상 지정하세요." });
  if (result.error) return res.status(400).json({ error: "임시보관함의 메일만 보낼 수 있습니다." });
  res.json({ mail: result.mail });
});

router.post("/:id/star", requireAuth, requirePermission("mail", "update"), requireMailAccess, (req, res) => {
  const mail = db.toggleMailStar(req.mail.id, req.userId);
  res.json({ mail });
});

// 자신의 메일함에서 지우는 것(휴지통 이동/영구삭제)은 다른 수신자의 사본에는 영향이 없는
// 개인적인 행위이므로, 공유 데이터를 지우는 delete 권한이 아니라 write 권한만 요구한다.
router.delete("/:id", requireAuth, requirePermission("mail", "write"), requireMailAccess, (req, res) => {
  db.deleteMail(req.mail.id, req.userId);
  res.status(204).end();
});

module.exports = router;
