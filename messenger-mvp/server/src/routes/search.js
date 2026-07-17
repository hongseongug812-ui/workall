const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const { q, channelId } = req.query;
  if (typeof q !== "string" || q.trim().length < 2) {
    return res.status(400).json({ error: "검색어는 2자 이상 입력하세요." });
  }
  const messages = db.searchMessages(req.userId, q, {
    channelId: typeof channelId === "string" ? channelId : undefined,
  });
  res.json({ messages });
});

module.exports = router;
