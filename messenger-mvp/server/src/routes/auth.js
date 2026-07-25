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
  const { name, department, avatarUrl } = req.body || {};
  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ error: "이름을 입력하세요." });
  }
  if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== "string") {
    return res.status(400).json({ error: "avatarUrl이 올바르지 않습니다." });
  }
  const user = db.updateUserProfile(req.userId, { name, department, avatarUrl });
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

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// 이메일 발송 인프라가 없는 MVP: 실제로는 이메일을 보내지 않고, 재설정 링크를 서버
// 콘솔에 출력한다. 존재하지 않는 이메일이어도 동일하게 응답해 계정 존재 여부가
// 새어나가지 않도록 한다.
router.post("/forgot-password", (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "올바른 이메일을 입력하세요." });
  }
  const user = db.findUserByEmail(email);
  if (user) {
    const token = db.createPasswordResetToken(user.id);
    const resetUrl = `${CLIENT_ORIGIN}/?resetToken=${token}`;
    console.log(`[비밀번호 재설정] ${user.email} 님을 위한 링크 (1시간 유효):\n  ${resetUrl}`);
  }
  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ error: "재설정 토큰이 필요합니다." });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "새 비밀번호는 8자 이상이어야 합니다." });
  }
  const valid = db.findValidResetToken(token);
  if (!valid) {
    return res.status(400).json({ error: "재설정 링크가 만료되었거나 이미 사용되었습니다." });
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.updateUserPassword(valid.userId, passwordHash);
  db.consumePasswordResetToken(valid.id);
  res.json({ ok: true });
});

module.exports = { router, publicUser };
