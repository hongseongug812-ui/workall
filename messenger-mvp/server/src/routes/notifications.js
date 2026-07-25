const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const notifications = db.listNotifications(req.userId, { limit: Number(req.query.limit) || 30 });
  res.json({ notifications, unreadCount: db.unreadNotificationCount(req.userId) });
});

router.post("/:id/read", requireAuth, (req, res) => {
  const ok = db.markNotificationRead(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: "알림을 찾을 수 없습니다." });
  res.json({ ok: true });
});

router.post("/read-all", requireAuth, (req, res) => {
  db.markAllNotificationsRead(req.userId);
  res.json({ ok: true });
});

module.exports = router;
