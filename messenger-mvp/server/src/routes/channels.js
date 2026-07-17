const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { publicUser } = require("./auth");
const { notifyChannelCreated } = require("../socket");

const router = express.Router();

function serializeChannel(channel, viewerId) {
  const members = channel.members
    .map((m) => db.findUserById(m.userId))
    .filter(Boolean)
    .map(publicUser);

  let displayName = channel.name;
  if (channel.type === "dm") {
    const other = members.find((m) => m.id !== viewerId);
    displayName = other ? other.name : "알 수 없음";
  }

  const last = db.lastMessage(channel.id);

  return {
    id: channel.id,
    type: channel.type,
    name: displayName,
    members,
    createdAt: channel.createdAt,
    lastMessage: last
      ? { content: last.content, senderId: last.senderId, createdAt: last.createdAt }
      : null,
    unreadCount: db.unreadCount(channel, viewerId),
  };
}

router.get("/", requireAuth, (req, res) => {
  const channels = db
    .listChannelsForUser(req.userId)
    .map((c) => serializeChannel(c, req.userId))
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt || a.createdAt;
      const bt = b.lastMessage?.createdAt || b.createdAt;
      return at < bt ? 1 : -1;
    });
  res.json({ channels });
});

router.post("/", requireAuth, (req, res) => {
  const { type, memberIds, name } = req.body || {};

  if (type === "dm") {
    const otherId = Array.isArray(memberIds) ? memberIds[0] : null;
    if (!otherId || typeof otherId !== "string") {
      return res.status(400).json({ error: "대화 상대를 지정하세요." });
    }
    if (otherId === req.userId) {
      return res.status(400).json({ error: "자기 자신과는 1:1 대화를 만들 수 없습니다." });
    }
    const other = db.findUserById(otherId);
    if (!other) return res.status(404).json({ error: "상대 사용자를 찾을 수 없습니다." });

    const existing = db.findDmChannel(req.userId, otherId);
    const channel = existing || db.createChannel({
      type: "dm",
      memberIds: [req.userId, otherId],
      createdBy: req.userId,
    });
    if (!existing) notifyChannelCreated(channel);
    return res.status(existing ? 200 : 201).json({ channel: serializeChannel(channel, req.userId) });
  }

  if (type === "group") {
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "채널 이름을 입력하세요." });
    }
    const ids = Array.isArray(memberIds) ? memberIds.filter((id) => typeof id === "string") : [];
    for (const memberId of ids) {
      if (!db.findUserById(memberId)) {
        return res.status(404).json({ error: `사용자를 찾을 수 없습니다: ${memberId}` });
      }
    }
    const memberSet = new Set([req.userId, ...ids]);
    const channel = db.createChannel({
      type: "group",
      name: name.trim(),
      memberIds: [...memberSet],
      createdBy: req.userId,
    });
    notifyChannelCreated(channel);
    return res.status(201).json({ channel: serializeChannel(channel, req.userId) });
  }

  return res.status(400).json({ error: "type은 'dm' 또는 'group' 이어야 합니다." });
});

function requireMembership(req, res, next) {
  const channel = db.findChannelById(req.params.id);
  if (!channel) return res.status(404).json({ error: "채널을 찾을 수 없습니다." });
  if (!db.isMember(channel, req.userId)) {
    return res.status(403).json({ error: "이 채널의 멤버가 아닙니다." });
  }
  req.channel = channel;
  next();
}

router.get("/:id/messages", requireAuth, requireMembership, (req, res) => {
  const { before, limit } = req.query;
  const messages = db.listMessages(req.channel.id, {
    before: typeof before === "string" ? before : undefined,
    limit: limit ? Math.min(Number(limit) || 50, 200) : 50,
    viewerId: req.userId,
  });
  res.json({ messages });
});

router.get("/:id/messages/:messageId/thread", requireAuth, requireMembership, (req, res) => {
  const parent = db.getMessageById(req.params.messageId, req.userId);
  if (!parent || parent.channelId !== req.channel.id) {
    return res.status(404).json({ error: "메시지를 찾을 수 없습니다." });
  }
  const replies = db.listThreadReplies(req.params.messageId, req.userId);
  res.json({ parent, replies });
});

router.post("/:id/read", requireAuth, requireMembership, (req, res) => {
  const member = db.markRead(req.channel.id, req.userId);
  res.json({ lastReadAt: member?.lastReadAt });
});

module.exports = router;
