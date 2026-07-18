const { Server } = require("socket.io");
const { verifyToken } = require("./auth");
const db = require("./db");
const { publicUser } = require("./routes/auth");

let io = null;
// userId -> Set<socketId>, lets one user have multiple open tabs/devices
// while presence is still reported per-user, not per-connection.
const onlineSockets = new Map();
// userId -> { status: 'online'|'away'|'dnd', statusMessage: string|null }
const userStatuses = new Map();
const VALID_STATUSES = new Set(["online", "away", "dnd"]);

function userRoom(userId) {
  return `user:${userId}`;
}
function channelRoom(channelId) {
  return `channel:${channelId}`;
}

function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("인증 토큰이 필요합니다."));
    try {
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error("토큰이 유효하지 않거나 만료되었습니다."));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;

    socket.join(userRoom(userId));
    for (const channel of db.listChannelsForUser(userId)) {
      socket.join(channelRoom(channel.id));
    }

    const wasOffline = !onlineSockets.has(userId) || onlineSockets.get(userId).size === 0;
    if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
    onlineSockets.get(userId).add(socket.id);
    if (wasOffline) {
      io.emit("presence:update", { userId, online: true });
    }

    if (!userStatuses.has(userId)) userStatuses.set(userId, { status: "online", statusMessage: null });

    socket.emit("presence:snapshot", {
      onlineUserIds: [...onlineSockets.keys()],
      statuses: [...userStatuses.entries()].map(([uid, s]) => ({ userId: uid, ...s })),
    });

    socket.on("presence:setStatus", ({ status, statusMessage }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      if (!VALID_STATUSES.has(status)) return reply({ error: "잘못된 상태입니다." });
      const message = typeof statusMessage === "string" ? statusMessage.trim().slice(0, 60) : null;
      const entry = { status, statusMessage: message || null };
      userStatuses.set(userId, entry);
      io.emit("presence:statusUpdate", { userId, ...entry });
      reply({ ok: true });
    });

    socket.on("message:send", ({ channelId, content, parentMessageId, attachment }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const text = typeof content === "string" ? content.trim() : "";
      const hasAttachment =
        attachment &&
        typeof attachment.url === "string" &&
        typeof attachment.name === "string" &&
        typeof attachment.mime === "string" &&
        typeof attachment.size === "number";

      if (typeof channelId !== "string" || (!text && !hasAttachment)) {
        return reply({ error: "잘못된 메시지입니다." });
      }
      const channel = db.findChannelById(channelId);
      if (!channel || !db.isMember(channel, userId)) {
        return reply({ error: "이 채널에 메시지를 보낼 수 없습니다." });
      }
      let parentId = null;
      if (typeof parentMessageId === "string") {
        const parent = db.getMessageById(parentMessageId, userId);
        if (!parent || parent.channelId !== channelId || parent.parentMessageId) {
          return reply({ error: "답장할 수 없는 메시지입니다." });
        }
        parentId = parentMessageId;
      }
      const message = db.createMessage({
        channelId,
        senderId: userId,
        content: text || null,
        parentMessageId: parentId,
        attachment: hasAttachment ? attachment : null,
      });
      io.to(channelRoom(channelId)).emit("message:new", message);
      reply({ message });
    });

    socket.on("message:edit", ({ messageId, content }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const text = typeof content === "string" ? content.trim() : "";
      if (typeof messageId !== "string" || !text) return reply({ error: "잘못된 요청입니다." });
      const result = db.editMessage(messageId, userId, text);
      if (result.error) return reply({ error: result.error === "forbidden" ? "본인 메시지만 수정할 수 있습니다." : "메시지를 찾을 수 없습니다." });
      io.to(channelRoom(result.message.channelId)).emit("message:updated", result.message);
      reply({ message: result.message });
    });

    socket.on("message:delete", ({ messageId }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      if (typeof messageId !== "string") return reply({ error: "잘못된 요청입니다." });
      const result = db.deleteMessage(messageId, userId);
      if (result.error) return reply({ error: result.error === "forbidden" ? "본인 메시지만 삭제할 수 있습니다." : "메시지를 찾을 수 없습니다." });
      io.to(channelRoom(result.message.channelId)).emit("message:updated", result.message);
      reply({ message: result.message });
    });

    socket.on("reaction:toggle", ({ messageId, emoji }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      if (typeof messageId !== "string" || typeof emoji !== "string" || !emoji.trim() || emoji.length > 8) {
        return reply({ error: "잘못된 요청입니다." });
      }
      const message = db.getMessageById(messageId, userId);
      if (!message) return reply({ error: "메시지를 찾을 수 없습니다." });
      const channel = db.findChannelById(message.channelId);
      if (!channel || !db.isMember(channel, userId)) return reply({ error: "권한이 없습니다." });
      const updated = db.toggleReaction(messageId, userId, emoji.trim());
      io.to(channelRoom(updated.channelId)).emit("message:updated", updated);
      reply({ message: updated });
    });

    socket.on("typing", ({ channelId, isTyping }) => {
      if (typeof channelId !== "string") return;
      const channel = db.findChannelById(channelId);
      if (!channel || !db.isMember(channel, userId)) return;
      socket.to(channelRoom(channelId)).emit("typing", { channelId, userId, isTyping: !!isTyping });
    });

    socket.on("channel:read", ({ channelId }) => {
      if (typeof channelId !== "string") return;
      db.markRead(channelId, userId);
    });

    socket.on("message:pin", ({ messageId }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      if (typeof messageId !== "string") return reply({ error: "잘못된 요청입니다." });
      const message = db.getMessageById(messageId, userId);
      if (!message) return reply({ error: "메시지를 찾을 수 없습니다." });
      const channel = db.findChannelById(message.channelId);
      if (!channel || !db.isMember(channel, userId)) return reply({ error: "권한이 없습니다." });
      const result = db.togglePin(messageId, userId);
      if (result.error) return reply({ error: "메시지를 찾을 수 없습니다." });
      io.to(channelRoom(result.message.channelId)).emit("message:updated", result.message);
      io.to(channelRoom(result.message.channelId)).emit("channel:pinnedChanged", { channelId: result.message.channelId });
      reply({ message: result.message });
    });

    socket.on("message:forward", ({ messageId, targetChannelIds }, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      if (typeof messageId !== "string" || !Array.isArray(targetChannelIds) || targetChannelIds.length === 0) {
        return reply({ error: "잘못된 요청입니다." });
      }
      const source = db.getMessageById(messageId, userId);
      if (!source) return reply({ error: "원본 메시지를 찾을 수 없습니다." });
      const sourceChannel = db.findChannelById(source.channelId);
      if (!sourceChannel || !db.isMember(sourceChannel, userId)) {
        return reply({ error: "이 메시지를 전달할 권한이 없습니다." });
      }
      if (!source.content && !source.attachment) {
        return reply({ error: "삭제된 메시지는 전달할 수 없습니다." });
      }

      const forwarded = [];
      for (const targetId of new Set(targetChannelIds.filter((id) => typeof id === "string"))) {
        const targetChannel = db.findChannelById(targetId);
        if (!targetChannel || !db.isMember(targetChannel, userId)) continue;
        const message = db.createMessage({
          channelId: targetId,
          senderId: userId,
          content: source.content,
          attachment: source.attachment,
          forwardedFromMessageId: source.id,
        });
        io.to(channelRoom(targetId)).emit("message:new", message);
        forwarded.push(message);
      }

      if (forwarded.length === 0) return reply({ error: "전달할 수 있는 채널이 없습니다." });
      reply({ messages: forwarded });
    });

    socket.on("disconnect", () => {
      const sockets = onlineSockets.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineSockets.delete(userId);
        userStatuses.delete(userId);
        io.emit("presence:update", { userId, online: false });
      }
    });
  });

  return io;
}

function notifyChannelCreated(channel) {
  if (!io) return;
  for (const member of channel.members) {
    io.sockets.sockets.forEach((socket) => {
      if (socket.userId === member.userId) socket.join(channelRoom(channel.id));
    });
    io.to(userRoom(member.userId)).emit("channel:new", { channelId: channel.id });
  }
}

// 그룹 채널 멤버 추가/탈퇴 후 소켓 룸 멤버십과 클라이언트 상태를 동기화한다.
function notifyMembersChanged(channelId, { joinedUserIds = [], leftUserId } = {}) {
  if (!io) return;
  for (const userId of joinedUserIds) {
    io.sockets.sockets.forEach((socket) => {
      if (socket.userId === userId) socket.join(channelRoom(channelId));
    });
    io.to(userRoom(userId)).emit("channel:new", { channelId });
  }
  if (leftUserId) {
    io.sockets.sockets.forEach((socket) => {
      if (socket.userId === leftUserId) socket.leave(channelRoom(channelId));
    });
    io.to(userRoom(leftUserId)).emit("channel:left", { channelId });
  }
  io.to(channelRoom(channelId)).emit("channel:updated", { channelId });
}

// 누군가 출근/퇴근 체크를 하면 전 사용자의 팀 현황판을 실시간으로 갱신한다.
function notifyAttendanceChanged() {
  if (!io) return;
  io.emit("attendance:updated");
}

module.exports = { initSocket, notifyChannelCreated, notifyMembersChanged, notifyAttendanceChanged };
