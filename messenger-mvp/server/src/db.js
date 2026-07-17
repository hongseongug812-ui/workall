// Simple JSON-file backed data store. Not for production scale — swap for
// Postgres before Phase 2 (see 기획서). Kept dependency-free and synchronous
// so the MVP has zero native-module install risk.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

function emptyDb() {
  return { users: [], channels: [], messages: [] };
}

let db = null;

function load() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    db = emptyDb();
    persist();
    return db;
  }
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    throw new Error(`데이터 파일(${DATA_FILE})을 읽을 수 없습니다: ${err.message}`);
  }
  return db;
}

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function id() {
  return crypto.randomUUID();
}

// ---- Users ----

function findUserByEmail(email) {
  return load().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(userId) {
  return load().users.find((u) => u.id === userId);
}

function createUser({ email, name, department, passwordHash }) {
  const user = {
    id: id(),
    email,
    name,
    department: department || "미지정",
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  load().users.push(user);
  persist();
  return user;
}

function listUsers() {
  return load().users;
}

// ---- Channels ----

function listChannelsForUser(userId) {
  return load().channels.filter((c) => c.members.some((m) => m.userId === userId));
}

function findChannelById(channelId) {
  return load().channels.find((c) => c.id === channelId);
}

function findDmChannel(userIdA, userIdB) {
  return load().channels.find(
    (c) =>
      c.type === "dm" &&
      c.members.length === 2 &&
      c.members.some((m) => m.userId === userIdA) &&
      c.members.some((m) => m.userId === userIdB)
  );
}

function createChannel({ type, name, memberIds, createdBy }) {
  const now = new Date().toISOString();
  const channel = {
    id: id(),
    type,
    name: name || null,
    members: memberIds.map((userId) => ({ userId, lastReadAt: now })),
    createdBy,
    createdAt: now,
  };
  load().channels.push(channel);
  persist();
  return channel;
}

function isMember(channel, userId) {
  return channel.members.some((m) => m.userId === userId);
}

function markRead(channelId, userId) {
  const channel = findChannelById(channelId);
  if (!channel) return null;
  const member = channel.members.find((m) => m.userId === userId);
  if (!member) return null;
  member.lastReadAt = new Date().toISOString();
  persist();
  return member;
}

// ---- Messages ----

function listMessages(channelId, { before, limit = 50 } = {}) {
  let messages = load().messages.filter((m) => m.channelId === channelId);
  if (before) {
    messages = messages.filter((m) => m.createdAt < before);
  }
  messages.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  if (messages.length > limit) {
    messages = messages.slice(messages.length - limit);
  }
  return messages;
}

function unreadCount(channel, userId) {
  const member = channel.members.find((m) => m.userId === userId);
  if (!member) return 0;
  return load().messages.filter(
    (m) => m.channelId === channel.id && m.senderId !== userId && m.createdAt > member.lastReadAt
  ).length;
}

function lastMessage(channelId) {
  const messages = load()
    .messages.filter((m) => m.channelId === channelId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return messages[messages.length - 1] || null;
}

function createMessage({ channelId, senderId, content }) {
  const message = {
    id: id(),
    channelId,
    senderId,
    content,
    createdAt: new Date().toISOString(),
  };
  load().messages.push(message);
  persist();
  return message;
}

module.exports = {
  load,
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  listChannelsForUser,
  findChannelById,
  findDmChannel,
  createChannel,
  isMember,
  markRead,
  listMessages,
  unreadCount,
  lastMessage,
  createMessage,
};
