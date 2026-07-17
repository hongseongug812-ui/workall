const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { notifyAttendanceChanged } = require("../socket");

const router = express.Router();

// 서버의 로컬 타임존 기준 오늘 날짜(YYYY-MM-DD). 출퇴근은 달력상의 하루 단위이므로
// UTC가 아니라 로컬 날짜를 기준으로 삼는다.
function today() {
  return new Date().toLocaleDateString("en-CA");
}

router.get("/today", requireAuth, (req, res) => {
  const attendance = db.getAttendance(req.userId, today());
  res.json({ attendance });
});

router.post("/check-in", requireAuth, (req, res) => {
  const attendance = db.checkIn(req.userId, today());
  notifyAttendanceChanged();
  res.json({ attendance });
});

router.post("/check-out", requireAuth, (req, res) => {
  const result = db.checkOut(req.userId, today());
  if (result.error === "not_checked_in") {
    return res.status(400).json({ error: "먼저 출근 체크를 해주세요." });
  }
  if (result.error === "already_checked_out") {
    return res.status(400).json({ error: "이미 퇴근 처리되었습니다." });
  }
  notifyAttendanceChanged();
  res.json({ attendance: result.attendance });
});

router.get("/history", requireAuth, (req, res) => {
  const { limit } = req.query;
  const history = db.listAttendanceHistory(req.userId, limit ? Number(limit) || 30 : 30);
  res.json({ history });
});

router.get("/team-today", requireAuth, (req, res) => {
  const team = db.listTeamAttendanceForDate(today());
  res.json({ team, date: today() });
});

module.exports = router;
