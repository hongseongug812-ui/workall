const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");
const { pushNotification } = require("../socket");

const router = express.Router();

function requireSpaceParam(req, res, next) {
  const { spaceId } = req.query;
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  req.spaceId = spaceId;
  next();
}

router.get("/events", requireAuth, requirePermission("calendar", "read"), requireSpaceParam, (req, res) => {
  const { month } = req.query;
  res.json({ events: db.listCalendarEvents(req.spaceId, { month: typeof month === "string" ? month : undefined }) });
});

router.post("/events", requireAuth, requirePermission("calendar", "write"), (req, res) => {
  const { spaceId, title, description, startAt, endAt, allDay, location, attendeeIds, withMeeting } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "일정 제목을 입력하세요." });
  }
  if (typeof startAt !== "string" || typeof endAt !== "string") {
    return res.status(400).json({ error: "시작/종료 시각을 입력하세요." });
  }
  const attendees = Array.isArray(attendeeIds) ? attendeeIds.filter((id) => typeof id === "string") : [];
  for (const uid of attendees) {
    if (!db.findUserById(uid)) return res.status(400).json({ error: `사용자를 찾을 수 없습니다: ${uid}` });
  }
  const event = db.createCalendarEvent({
    spaceId,
    title: title.trim(),
    description,
    startAt,
    endAt,
    allDay: !!allDay,
    location,
    attendeeIds: attendees,
    withMeeting: !!withMeeting,
    createdBy: req.userId,
  });
  const organizer = db.findUserById(req.userId);
  for (const uid of attendees) {
    if (uid === req.userId) continue;
    pushNotification(uid, {
      type: "calendar_invite",
      title: `${organizer?.name || "누군가"}님이 일정에 초대했습니다: ${event.title}`,
      link: `/calendar?eventId=${event.id}`,
    });
  }
  res.status(201).json({ event });
});

function requireEventAccess(req, res, next) {
  const event = db.findCalendarEventById(req.params.id);
  if (!event) return res.status(404).json({ error: "일정을 찾을 수 없습니다." });
  if (!db.isSpaceMember(event.spaceId, req.userId)) {
    return res.status(403).json({ error: "이 일정에 접근할 권한이 없습니다." });
  }
  req.event = event;
  next();
}

router.get("/events/:id", requireAuth, requirePermission("calendar", "read"), requireEventAccess, (req, res) => {
  res.json({ event: req.event });
});

router.patch("/events/:id", requireAuth, requirePermission("calendar", "update"), requireEventAccess, (req, res) => {
  const { title, description, startAt, endAt, allDay, location, attendeeIds } = req.body || {};
  const attendees = Array.isArray(attendeeIds) ? attendeeIds.filter((id) => typeof id === "string") : undefined;
  const event = db.updateCalendarEvent(req.event.id, { title, description, startAt, endAt, allDay, location, attendeeIds: attendees });
  res.json({ event });
});

router.delete("/events/:id", requireAuth, requirePermission("calendar", "write"), requireEventAccess, (req, res) => {
  if (req.event.createdBy !== req.userId && req.userRole !== "super_admin" && req.userRole !== "dept_admin") {
    return res.status(403).json({ error: "일정을 만든 사람만 삭제할 수 있습니다." });
  }
  db.deleteCalendarEvent(req.event.id);
  res.status(204).end();
});

module.exports = router;
