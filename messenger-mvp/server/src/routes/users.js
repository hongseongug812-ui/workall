const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { publicUser } = require("./auth");

const router = express.Router();

// 조직도 디렉터리 — 실제 SSO/AD 연동 전까지는 회원가입/시드 데이터로 구성된다.
router.get("/", requireAuth, (req, res) => {
  const users = db
    .listUsers()
    .filter((u) => u.id !== req.userId)
    .map(publicUser)
    .sort((a, b) => a.department.localeCompare(b.department, "ko") || a.name.localeCompare(b.name, "ko"));
  res.json({ users });
});

module.exports = router;
