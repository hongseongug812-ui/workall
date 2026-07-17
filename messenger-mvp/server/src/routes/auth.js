const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken, requireAuth } = require("../auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post("/register", async (req, res) => {
  const { email, password, name, department } = req.body || {};

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "올바른 이메일을 입력하세요." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "비밀번호는 8자 이상이어야 합니다." });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "이름을 입력하세요." });
  }
  if (db.findUserByEmail(email)) {
    return res.status(409).json({ error: "이미 가입된 이메일입니다." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = db.createUser({
    email,
    name: name.trim(),
    department: typeof department === "string" ? department.trim() : "",
    passwordHash,
  });

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "이메일과 비밀번호를 입력하세요." });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  res.json({ user: publicUser(user) });
});

router.patch("/me", requireAuth, (req, res) => {
  const { name, department } = req.body || {};
  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ error: "이름을 입력하세요." });
  }
  const user = db.updateUserProfile(req.userId, { name, department });
  if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  res.json({ user: publicUser(user) });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "현재 비밀번호와 새 비밀번호를 입력하세요." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "새 비밀번호는 8자 이상이어야 합니다." });
  }
  const user = db.findUserById(req.userId);
  if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다." });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.updateUserPassword(req.userId, passwordHash);
  res.json({ ok: true });
});

module.exports = { router, publicUser };
