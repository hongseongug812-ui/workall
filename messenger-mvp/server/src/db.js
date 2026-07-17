// SQLite 기반 저장소 (better-sqlite3, 동기 API). 파일: data/messenger.db
// 실제 운영 배포 시 PostgreSQL로 교체 예정(기획서 Phase 2) — 그 전까지는
// 별도 DB 서버 없이 바로 실행되는 이 구성으로 충분하다.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "messenger.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const conn = new Database(DB_FILE);
conn.pragma("journal_mode = WAL");
conn.pragma("foreign_keys = ON");

conn.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('dm','group')),
    name TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS channel_members (
    channel_id TEXT NOT NULL REFERENCES channels(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    last_read_at TEXT NOT NULL,
    PRIMARY KEY (channel_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    parent_message_id TEXT REFERENCES messages(id),
    content TEXT,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_mime TEXT,
    attachment_size INTEGER,
    created_at TEXT NOT NULL,
    edited_at TEXT,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS message_reactions (
    message_id TEXT NOT NULL REFERENCES messages(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id, emoji)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    check_in_at TEXT,
    check_out_at TEXT,
    UNIQUE (user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
  CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
`);

// CREATE TABLE IF NOT EXISTS는 이미 존재하는 테이블에 새 컬럼을 추가해주지 않으므로,
// 기존 DB 파일에 대해서는 없는 컬럼만 골라 ALTER TABLE로 보강한다.
function ensureColumn(table, column, definition) {
  const columns = conn.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("channel_members", "muted", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("messages", "pinned_at", "TEXT");

function id() {
  return crypto.randomUUID();
}
function now() {
  return new Date().toISOString();
}

// ---- Users ----

function serializeUserRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    department: row.department,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function findUserByEmail(email) {
  const row = conn.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email);
  return serializeUserRow(row);
}

function findUserById(userId) {
  const row = conn.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return serializeUserRow(row);
}

function createUser({ email, name, department, passwordHash }) {
  const user = {
    id: id(),
    email,
    name,
    department: department || "미지정",
    passwordHash,
    createdAt: now(),
  };
  conn
    .prepare(
      "INSERT INTO users (id, email, name, department, password_hash, created_at) VALUES (?,?,?,?,?,?)"
    )
    .run(user.id, user.email, user.name, user.department, user.passwordHash, user.createdAt);
  return user;
}

function listUsers() {
  return conn.prepare("SELECT * FROM users ORDER BY created_at").all().map(serializeUserRow);
}

function updateUserProfile(userId, { name, department }) {
  const user = findUserById(userId);
  if (!user) return null;
  const nextName = typeof name === "string" && name.trim() ? name.trim() : user.name;
  const nextDept = typeof department === "string" ? department.trim() : user.department;
  conn.prepare("UPDATE users SET name = ?, department = ? WHERE id = ?").run(nextName, nextDept, userId);
  return findUserById(userId);
}

function updateUserPassword(userId, passwordHash) {
  conn.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

// ---- Channels ----

function serializeChannelRow(row) {
  const members = conn
    .prepare("SELECT user_id, last_read_at, muted FROM channel_members WHERE channel_id = ?")
    .all(row.id)
    .map((m) => ({ userId: m.user_id, lastReadAt: m.last_read_at, muted: !!m.muted }));
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    members,
  };
}

function listChannelsForUser(userId) {
  const rows = conn
    .prepare(
      `SELECT c.* FROM channels c
       JOIN channel_members cm ON cm.channel_id = c.id
       WHERE cm.user_id = ?`
    )
    .all(userId);
  return rows.map(serializeChannelRow);
}

function findChannelById(channelId) {
  const row = conn.prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
  return row ? serializeChannelRow(row) : null;
}

function findDmChannel(userIdA, userIdB) {
  const row = conn
    .prepare(
      `SELECT c.* FROM channels c
       WHERE c.type = 'dm'
         AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
         AND EXISTS (SELECT 1 FROM channel_members WHERE channel_id = c.id AND user_id = ?)
         AND EXISTS (SELECT 1 FROM channel_members WHERE channel_id = c.id AND user_id = ?)`
    )
    .get(userIdA, userIdB);
  return row ? serializeChannelRow(row) : null;
}

const createChannelTx = conn.transaction((channel, memberIds) => {
  conn
    .prepare("INSERT INTO channels (id, type, name, created_by, created_at) VALUES (?,?,?,?,?)")
    .run(channel.id, channel.type, channel.name, channel.createdBy, channel.createdAt);
  const insertMember = conn.prepare(
    "INSERT INTO channel_members (channel_id, user_id, last_read_at) VALUES (?,?,?)"
  );
  for (const userId of memberIds) {
    insertMember.run(channel.id, userId, channel.createdAt);
  }
});

function createChannel({ type, name, memberIds, createdBy }) {
  const channel = { id: id(), type, name: name || null, createdBy, createdAt: now() };
  createChannelTx(channel, memberIds);
  return findChannelById(channel.id);
}

function isMember(channel, userId) {
  return channel.members.some((m) => m.userId === userId);
}

function addMembers(channelId, userIds) {
  const insert = conn.prepare(
    "INSERT OR IGNORE INTO channel_members (channel_id, user_id, last_read_at) VALUES (?,?,?)"
  );
  const ts = now();
  const tx = conn.transaction((ids) => {
    for (const userId of ids) insert.run(channelId, userId, ts);
  });
  tx(userIds);
  return findChannelById(channelId);
}

function removeMember(channelId, userId) {
  conn.prepare("DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?").run(channelId, userId);
  const remaining = conn
    .prepare("SELECT COUNT(*) AS n FROM channel_members WHERE channel_id = ?")
    .get(channelId).n;
  if (remaining === 0) {
    conn.prepare("DELETE FROM messages WHERE channel_id = ?").run(channelId);
    conn.prepare("DELETE FROM channels WHERE id = ?").run(channelId);
    return null;
  }
  return findChannelById(channelId);
}

function markRead(channelId, userId) {
  const result = conn
    .prepare("UPDATE channel_members SET last_read_at = ? WHERE channel_id = ? AND user_id = ?")
    .run(now(), channelId, userId);
  if (result.changes === 0) return null;
  return { lastReadAt: now() };
}

function setMuted(channelId, userId, muted) {
  const result = conn
    .prepare("UPDATE channel_members SET muted = ? WHERE channel_id = ? AND user_id = ?")
    .run(muted ? 1 : 0, channelId, userId);
  return result.changes > 0;
}

// ---- Messages ----

function serializeMessageRow(row, viewerId) {
  const reactions = conn
    .prepare("SELECT user_id, emoji FROM message_reactions WHERE message_id = ?")
    .all(row.id);
  const reactionMap = new Map();
  for (const r of reactions) {
    if (!reactionMap.has(r.emoji)) reactionMap.set(r.emoji, { emoji: r.emoji, count: 0, reactedByMe: false });
    const entry = reactionMap.get(r.emoji);
    entry.count += 1;
    if (viewerId && r.user_id === viewerId) entry.reactedByMe = true;
  }

  const replyCount = row.parent_message_id
    ? 0
    : conn
        .prepare("SELECT COUNT(*) AS n FROM messages WHERE parent_message_id = ? AND deleted_at IS NULL")
        .get(row.id).n;

  const deleted = !!row.deleted_at;

  return {
    id: row.id,
    channelId: row.channel_id,
    senderId: row.sender_id,
    parentMessageId: row.parent_message_id,
    content: deleted ? null : row.content,
    attachment:
      !deleted && row.attachment_url
        ? {
            url: row.attachment_url,
            name: row.attachment_name,
            mime: row.attachment_mime,
            size: row.attachment_size,
          }
        : null,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    pinnedAt: row.pinned_at,
    replyCount,
    reactions: [...reactionMap.values()],
  };
}

function listMessages(channelId, { before, limit = 50, viewerId } = {}) {
  let sql = "SELECT * FROM messages WHERE channel_id = ? AND parent_message_id IS NULL";
  const params = [channelId];
  if (before) {
    sql += " AND created_at < ?";
    params.push(before);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(Math.min(limit, 200));
  const rows = conn.prepare(sql).all(...params);
  rows.reverse();
  return rows.map((r) => serializeMessageRow(r, viewerId));
}

function listThreadReplies(parentMessageId, viewerId) {
  const rows = conn
    .prepare("SELECT * FROM messages WHERE parent_message_id = ? ORDER BY created_at ASC")
    .all(parentMessageId);
  return rows.map((r) => serializeMessageRow(r, viewerId));
}

function getMessageById(messageId, viewerId) {
  const row = conn.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  return row ? serializeMessageRow(row, viewerId) : null;
}

function unreadCount(channel, userId) {
  const member = channel.members.find((m) => m.userId === userId);
  if (!member) return 0;
  return conn
    .prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE channel_id = ? AND sender_id != ? AND created_at > ? AND deleted_at IS NULL AND parent_message_id IS NULL`
    )
    .get(channel.id, userId, member.lastReadAt).n;
}

function lastMessage(channelId) {
  const row = conn
    .prepare(
      "SELECT * FROM messages WHERE channel_id = ? AND parent_message_id IS NULL ORDER BY created_at DESC LIMIT 1"
    )
    .get(channelId);
  if (!row) return null;
  return {
    content: row.deleted_at ? "삭제된 메시지입니다" : row.attachment_url ? row.content || `[파일] ${row.attachment_name}` : row.content,
    senderId: row.sender_id,
    createdAt: row.created_at,
  };
}

function createMessage({ channelId, senderId, content, parentMessageId = null, attachment = null }) {
  const message = {
    id: id(),
    channelId,
    senderId,
    parentMessageId,
    content: content || null,
    attachmentUrl: attachment?.url || null,
    attachmentName: attachment?.name || null,
    attachmentMime: attachment?.mime || null,
    attachmentSize: attachment?.size || null,
    createdAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO messages
        (id, channel_id, sender_id, parent_message_id, content, attachment_url, attachment_name, attachment_mime, attachment_size, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      message.id,
      message.channelId,
      message.senderId,
      message.parentMessageId,
      message.content,
      message.attachmentUrl,
      message.attachmentName,
      message.attachmentMime,
      message.attachmentSize,
      message.createdAt
    );
  return getMessageById(message.id, senderId);
}

function editMessage(messageId, userId, content) {
  const row = conn.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  if (!row || row.deleted_at) return { error: "not_found" };
  if (row.sender_id !== userId) return { error: "forbidden" };
  conn
    .prepare("UPDATE messages SET content = ?, edited_at = ? WHERE id = ?")
    .run(content, now(), messageId);
  return { message: getMessageById(messageId, userId) };
}

function deleteMessage(messageId, userId) {
  const row = conn.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  if (!row || row.deleted_at) return { error: "not_found" };
  if (row.sender_id !== userId) return { error: "forbidden" };
  conn.prepare("UPDATE messages SET deleted_at = ? WHERE id = ?").run(now(), messageId);
  return { message: getMessageById(messageId, userId) };
}

function toggleReaction(messageId, userId, emoji) {
  const existing = conn
    .prepare("SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?")
    .get(messageId, userId, emoji);
  if (existing) {
    conn
      .prepare("DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?")
      .run(messageId, userId, emoji);
  } else {
    conn
      .prepare("INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?,?,?,?)")
      .run(messageId, userId, emoji, now());
  }
  return getMessageById(messageId, userId);
}

function togglePin(messageId, userId) {
  const row = conn.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  if (!row || row.deleted_at) return { error: "not_found" };
  const nextPinnedAt = row.pinned_at ? null : now();
  conn.prepare("UPDATE messages SET pinned_at = ? WHERE id = ?").run(nextPinnedAt, messageId);
  return { message: getMessageById(messageId, userId) };
}

function listPinnedMessages(channelId, viewerId) {
  const rows = conn
    .prepare(
      "SELECT * FROM messages WHERE channel_id = ? AND pinned_at IS NOT NULL AND deleted_at IS NULL ORDER BY pinned_at DESC"
    )
    .all(channelId);
  return rows.map((r) => serializeMessageRow(r, viewerId));
}

function searchMessages(userId, query, { channelId } = {}) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const like = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  let sql = `
    SELECT m.* FROM messages m
    JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ?
    WHERE m.deleted_at IS NULL AND m.content LIKE ? ESCAPE '\\'
  `;
  const params = [userId, like];
  if (channelId) {
    sql += " AND m.channel_id = ?";
    params.push(channelId);
  }
  sql += " ORDER BY m.created_at DESC LIMIT 50";
  const rows = conn.prepare(sql).all(...params);
  return rows.map((r) => serializeMessageRow(r, userId));
}

// ---- Attendance (출퇴근) ----

function serializeAttendanceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
  };
}

function getAttendance(userId, date) {
  const row = conn.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(userId, date);
  return serializeAttendanceRow(row);
}

function checkIn(userId, date) {
  conn
    .prepare(
      "INSERT OR IGNORE INTO attendance (id, user_id, date, check_in_at) VALUES (?,?,?,?)"
    )
    .run(id(), userId, date, now());
  return getAttendance(userId, date);
}

function checkOut(userId, date) {
  const existing = getAttendance(userId, date);
  if (!existing || !existing.checkInAt) return { error: "not_checked_in" };
  if (existing.checkOutAt) return { error: "already_checked_out" };
  conn
    .prepare("UPDATE attendance SET check_out_at = ? WHERE user_id = ? AND date = ?")
    .run(now(), userId, date);
  return { attendance: getAttendance(userId, date) };
}

function listAttendanceHistory(userId, limit = 30) {
  const rows = conn
    .prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT ?")
    .all(userId, Math.min(limit, 100));
  return rows.map(serializeAttendanceRow);
}

function listTeamAttendanceForDate(date) {
  const rows = conn
    .prepare(
      `SELECT u.id AS user_id, u.name, u.department, a.check_in_at, a.check_out_at
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
       ORDER BY u.department, u.name`
    )
    .all(date);
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    department: r.department,
    checkInAt: r.check_in_at,
    checkOutAt: r.check_out_at,
  }));
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  updateUserProfile,
  updateUserPassword,
  listChannelsForUser,
  findChannelById,
  findDmChannel,
  createChannel,
  isMember,
  addMembers,
  removeMember,
  markRead,
  setMuted,
  listMessages,
  listThreadReplies,
  getMessageById,
  unreadCount,
  lastMessage,
  createMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePin,
  listPinnedMessages,
  searchMessages,
  getAttendance,
  checkIn,
  checkOut,
  listAttendanceHistory,
  listTeamAttendanceForDate,
};
