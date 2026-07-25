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

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
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

  CREATE TABLE IF NOT EXISTS channel_notes (
    channel_id TEXT PRIMARY KEY REFERENCES channels(id),
    content TEXT NOT NULL DEFAULT '',
    updated_by TEXT REFERENCES users(id),
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS channel_checklist_items (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    can_read INTEGER NOT NULL DEFAULT 0,
    can_write INTEGER NOT NULL DEFAULT 0,
    can_update INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (role, module)
  );

  CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS space_members (
    space_id TEXT NOT NULL REFERENCES spaces(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (space_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6c5ce7',
    icon TEXT NOT NULL DEFAULT '📁',
    start_date TEXT,
    end_date TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL REFERENCES projects(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS task_statuses (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    status_id TEXT NOT NULL REFERENCES task_statuses(id),
    title TEXT NOT NULL,
    body TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    start_date TEXT,
    due_date TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_assignees (
    task_id TEXT NOT NULL REFERENCES tasks(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (task_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    content TEXT,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_mime TEXT,
    attachment_size INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wiki_pages (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    parent_id TEXT REFERENCES wiki_pages(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wiki_page_versions (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES wiki_pages(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    edited_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wiki_links (
    from_page_id TEXT NOT NULL REFERENCES wiki_pages(id),
    to_page_id TEXT NOT NULL REFERENCES wiki_pages(id),
    PRIMARY KEY (from_page_id, to_page_id)
  );

  CREATE TABLE IF NOT EXISTS crm_custom_fields (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    label TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','number','date','select')),
    options TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_customers (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_custom_values (
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    field_id TEXT NOT NULL REFERENCES crm_custom_fields(id),
    value TEXT,
    PRIMARY KEY (customer_id, field_id)
  );

  CREATE TABLE IF NOT EXISTS crm_leads (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'prospecting' CHECK(stage IN ('prospecting','meeting','proposal','won')),
    position INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_activities (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('meeting','call','email','note')),
    content TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS finance_transactions (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    date TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    customer_id TEXT REFERENCES crm_customers(id),
    memo TEXT,
    receipt_url TEXT,
    receipt_name TEXT,
    receipt_mime TEXT,
    receipt_size INTEGER,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS finance_subscriptions (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL,
    customer_id TEXT REFERENCES crm_customers(id),
    active INTEGER NOT NULL DEFAULT 1,
    last_run_ym TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS finance_invoices (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    invoice_number TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid')),
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('my_tasks','recent_wiki','finance_progress','new_leads')),
    size TEXT NOT NULL DEFAULT 'medium' CHECK(size IN ('small','medium','large')),
    config TEXT NOT NULL DEFAULT '{}',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mails (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    is_draft INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mail_recipients (
    mail_id TEXT NOT NULL REFERENCES mails(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL CHECK(kind IN ('to','cc')),
    PRIMARY KEY (mail_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS mail_boxes (
    id TEXT PRIMARY KEY,
    mail_id TEXT NOT NULL REFERENCES mails(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    box TEXT NOT NULL CHECK(box IN ('inbox','sent','draft','trash')),
    read_at TEXT,
    starred INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entity_links (
    id TEXT PRIMARY KEY,
    from_module TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_module TEXT NOT NULL,
    to_id TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
  CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  CREATE INDEX IF NOT EXISTS idx_checklist_channel ON channel_checklist_items(channel_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_entity_links_from ON entity_links(from_module, from_id);
  CREATE INDEX IF NOT EXISTS idx_entity_links_to ON entity_links(to_module, to_id);
  CREATE INDEX IF NOT EXISTS idx_projects_space ON projects(space_id);
  CREATE INDEX IF NOT EXISTS idx_statuses_project ON task_statuses(project_id, position);
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, status_id, position);
  CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id, position);
  CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_wiki_pages_space ON wiki_pages(space_id, parent_id, position);
  CREATE INDEX IF NOT EXISTS idx_wiki_versions_page ON wiki_page_versions(page_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_wiki_links_to ON wiki_links(to_page_id);
  CREATE INDEX IF NOT EXISTS idx_crm_customers_space ON crm_customers(space_id);
  CREATE INDEX IF NOT EXISTS idx_crm_fields_space ON crm_custom_fields(space_id, position);
  CREATE INDEX IF NOT EXISTS idx_crm_leads_space ON crm_leads(space_id, stage, position);
  CREATE INDEX IF NOT EXISTS idx_crm_activities_customer ON crm_activities(customer_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_finance_tx_space ON finance_transactions(space_id, date);
  CREATE INDEX IF NOT EXISTS idx_finance_subs_space ON finance_subscriptions(space_id);
  CREATE INDEX IF NOT EXISTS idx_finance_invoices_space ON finance_invoices(space_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id, position);
  CREATE INDEX IF NOT EXISTS idx_mail_boxes_user ON mail_boxes(user_id, box, created_at);
  CREATE INDEX IF NOT EXISTS idx_mail_recipients_mail ON mail_recipients(mail_id);
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
ensureColumn("channel_members", "favorite", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("messages", "forwarded_from_message_id", "TEXT");
ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'member'");
ensureColumn("users", "avatar_url", "TEXT");

// ---- RBAC (권한 그룹 / 메뉴별 접근 제어) ----
// 롤은 4단계 고정: 최고 관리자 > 부서 관리자 > 일반 사용자 > 게스트(외부인).
// 모듈은 향후 추가되는 각 기능 영역에 대응한다.
const ROLES = ["super_admin", "dept_admin", "member", "guest"];
const MODULES = ["messenger", "project", "wiki", "crm", "finance", "dashboard", "mail", "calendar", "drive", "approval", "admin"];

const DEFAULT_PERMISSIONS = {
  super_admin: { messenger: "crud", project: "crud", wiki: "crud", crm: "crud", finance: "crud", dashboard: "crud", mail: "crud", calendar: "crud", drive: "crud", approval: "crud", admin: "crud" },
  dept_admin: { messenger: "crud", project: "crud", wiki: "crud", crm: "crud", finance: "cru", dashboard: "cru", mail: "cru", calendar: "cru", drive: "cru", approval: "cru", admin: "r" },
  member: { messenger: "cru", project: "cru", wiki: "cru", crm: "r", finance: "r", dashboard: "cru", mail: "cru", calendar: "cru", drive: "cru", approval: "cru", admin: "" },
  guest: { messenger: "r", project: "r", wiki: "r", crm: "", finance: "", dashboard: "r", mail: "r", calendar: "r", drive: "r", approval: "", admin: "" },
};

function permFlags(spec) {
  return {
    can_read: spec.includes("r") ? 1 : 0,
    can_write: spec.includes("c") ? 1 : 0,
    can_update: spec.includes("u") ? 1 : 0,
    can_delete: spec.includes("d") ? 1 : 0,
  };
}

(function seedDefaultPermissions() {
  const insert = conn.prepare(
    `INSERT OR IGNORE INTO role_permissions (role, module, can_read, can_write, can_update, can_delete)
     VALUES (@role, @module, @can_read, @can_write, @can_update, @can_delete)`
  );
  const tx = conn.transaction(() => {
    for (const role of ROLES) {
      for (const module of MODULES) {
        const spec = DEFAULT_PERMISSIONS[role][module] || "";
        insert.run({ role, module, ...permFlags(spec) });
      }
    }
  });
  tx();
})();

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
    role: row.role,
    avatarUrl: row.avatar_url,
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

function createUser({ email, name, department, passwordHash, role = "member" }) {
  const user = {
    id: id(),
    email,
    name,
    department: department || "미지정",
    passwordHash,
    role: ROLES.includes(role) ? role : "member",
    createdAt: now(),
  };
  conn
    .prepare(
      "INSERT INTO users (id, email, name, department, password_hash, role, created_at) VALUES (?,?,?,?,?,?,?)"
    )
    .run(user.id, user.email, user.name, user.department, user.passwordHash, user.role, user.createdAt);
  return user;
}

function searchUsers(query, { excludeUserId } = {}) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const like = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  let sql = "SELECT * FROM users WHERE (name LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\')";
  const params = [like, like];
  if (excludeUserId) {
    sql += " AND id != ?";
    params.push(excludeUserId);
  }
  sql += " ORDER BY name LIMIT 20";
  return conn.prepare(sql).all(...params).map(serializeUserRow);
}

function listUsers() {
  return conn.prepare("SELECT * FROM users ORDER BY created_at").all().map(serializeUserRow);
}

function updateUserProfile(userId, { name, department, avatarUrl }) {
  const user = findUserById(userId);
  if (!user) return null;
  const nextName = typeof name === "string" && name.trim() ? name.trim() : user.name;
  const nextDept = typeof department === "string" ? department.trim() : user.department;
  const nextAvatar = avatarUrl !== undefined ? avatarUrl : user.avatarUrl;
  conn
    .prepare("UPDATE users SET name = ?, department = ?, avatar_url = ? WHERE id = ?")
    .run(nextName, nextDept, nextAvatar, userId);
  return findUserById(userId);
}

function updateUserPassword(userId, passwordHash) {
  conn.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

// ---- 비밀번호 재설정 (이메일 발송 인프라가 없는 MVP이므로, 실제 메일 대신
// 재설정 링크를 서버 콘솔에 출력한다 — 운영 배포 시 이 부분만 메일 발송으로 교체하면 됨) ----

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createPasswordResetToken(userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1시간
  conn
    .prepare(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?,?,?,?,?)"
    )
    .run(id(), userId, hashResetToken(rawToken), expiresAt, now());
  return rawToken;
}

function findValidResetToken(rawToken) {
  const row = conn
    .prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ?")
    .get(hashResetToken(rawToken));
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { id: row.id, userId: row.user_id };
}

function consumePasswordResetToken(tokenId) {
  conn.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(now(), tokenId);
}

function updateUserRole(userId, role) {
  if (!ROLES.includes(role)) return { error: "invalid_role" };
  conn.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  return { user: findUserById(userId) };
}

// ---- RBAC ----

function listRolePermissions() {
  return conn
    .prepare("SELECT * FROM role_permissions ORDER BY role, module")
    .all()
    .map((r) => ({
      role: r.role,
      module: r.module,
      canRead: !!r.can_read,
      canWrite: !!r.can_write,
      canUpdate: !!r.can_update,
      canDelete: !!r.can_delete,
    }));
}

function getRolePermission(role, module) {
  const row = conn.prepare("SELECT * FROM role_permissions WHERE role = ? AND module = ?").get(role, module);
  if (!row) return { canRead: false, canWrite: false, canUpdate: false, canDelete: false };
  return {
    canRead: !!row.can_read,
    canWrite: !!row.can_write,
    canUpdate: !!row.can_update,
    canDelete: !!row.can_delete,
  };
}

function setRolePermission(role, module, flags) {
  if (!ROLES.includes(role) || !MODULES.includes(module)) return { error: "invalid_role_or_module" };
  conn
    .prepare(
      `INSERT INTO role_permissions (role, module, can_read, can_write, can_update, can_delete)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(role, module) DO UPDATE SET
         can_read = excluded.can_read, can_write = excluded.can_write,
         can_update = excluded.can_update, can_delete = excluded.can_delete`
    )
    .run(
      role,
      module,
      flags.canRead ? 1 : 0,
      flags.canWrite ? 1 : 0,
      flags.canUpdate ? 1 : 0,
      flags.canDelete ? 1 : 0
    );
  return { permission: getRolePermission(role, module) };
}

// ---- Notifications (알림 센터) ----

function serializeNotificationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function createNotification({ userId, type, title, body = null, link = null }) {
  const notif = { id: id(), userId, type, title, body, link, createdAt: now() };
  conn
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link, created_at) VALUES (?,?,?,?,?,?,?)`
    )
    .run(notif.id, notif.userId, notif.type, notif.title, notif.body, notif.link, notif.createdAt);
  return { ...notif, readAt: null };
}

function listNotifications(userId, { limit = 30 } = {}) {
  const rows = conn
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, Math.min(limit, 100));
  return rows.map(serializeNotificationRow);
}

function unreadNotificationCount(userId) {
  return conn
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId).n;
}

function markNotificationRead(notificationId, userId) {
  const result = conn
    .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .run(now(), notificationId, userId);
  return result.changes > 0;
}

function markAllNotificationsRead(userId) {
  conn.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(now(), userId);
}

// ---- 데이터 릴레이션 (모듈 간 링크) ----
// 위키 문서 <-> 태스크, CRM 고객 <-> 재무 인보이스처럼 서로 다른 모듈의 레코드를
// 양방향으로 연결하는 범용 테이블. 각 모듈은 (module, id) 쌍으로만 식별되므로
// 새 모듈이 생겨도 이 테이블/API는 그대로 재사용된다.
function createEntityLink({ fromModule, fromId, toModule, toId, createdBy }) {
  const link = { id: id(), fromModule, fromId, toModule, toId, createdBy, createdAt: now() };
  conn
    .prepare(
      `INSERT INTO entity_links (id, from_module, from_id, to_module, to_id, created_by, created_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(link.id, link.fromModule, link.fromId, link.toModule, link.toId, link.createdBy, link.createdAt);
  return link;
}

function listLinksForEntity(module, entityId) {
  const rows = conn
    .prepare(
      `SELECT * FROM entity_links WHERE (from_module = ? AND from_id = ?) OR (to_module = ? AND to_id = ?)
       ORDER BY created_at DESC`
    )
    .all(module, entityId, module, entityId);
  return rows.map((row) => {
    const isFrom = row.from_module === module && row.from_id === entityId;
    return {
      id: row.id,
      linkedModule: isFrom ? row.to_module : row.from_module,
      linkedId: isFrom ? row.to_id : row.from_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  });
}

function deleteEntityLink(linkId) {
  const result = conn.prepare("DELETE FROM entity_links WHERE id = ?").run(linkId);
  return result.changes > 0;
}

// ---- 프로젝트 및 작업 관리 (스페이스 / 프로젝트 / 태스크) ----

const DEFAULT_STATUS_NAMES = ["To-Do", "In Progress", "Review", "Done"];

function serializeSpaceRow(row) {
  const members = conn.prepare("SELECT user_id FROM space_members WHERE space_id = ?").all(row.id).map((m) => m.user_id);
  return { id: row.id, name: row.name, createdBy: row.created_by, createdAt: row.created_at, members };
}

const createSpaceTx = conn.transaction((space, memberIds) => {
  conn.prepare("INSERT INTO spaces (id, name, created_by, created_at) VALUES (?,?,?,?)").run(
    space.id, space.name, space.createdBy, space.createdAt
  );
  const insert = conn.prepare("INSERT INTO space_members (space_id, user_id) VALUES (?,?)");
  for (const userId of memberIds) insert.run(space.id, userId);
});

function createSpace({ name, memberIds, createdBy }) {
  const space = { id: id(), name, createdBy, createdAt: now() };
  createSpaceTx(space, [...new Set([createdBy, ...memberIds])]);
  return findSpaceById(space.id);
}

function findSpaceById(spaceId) {
  const row = conn.prepare("SELECT * FROM spaces WHERE id = ?").get(spaceId);
  return row ? serializeSpaceRow(row) : null;
}

function listSpacesForUser(userId) {
  const rows = conn
    .prepare(
      `SELECT s.* FROM spaces s JOIN space_members sm ON sm.space_id = s.id WHERE sm.user_id = ? ORDER BY s.created_at`
    )
    .all(userId);
  return rows.map(serializeSpaceRow);
}

function isSpaceMember(spaceId, userId) {
  return !!conn.prepare("SELECT 1 FROM space_members WHERE space_id = ? AND user_id = ?").get(spaceId, userId);
}

function addSpaceMembers(spaceId, userIds) {
  const insert = conn.prepare("INSERT OR IGNORE INTO space_members (space_id, user_id) VALUES (?,?)");
  const tx = conn.transaction((ids) => {
    for (const userId of ids) insert.run(spaceId, userId);
  });
  tx(userIds);
  return findSpaceById(spaceId);
}

function serializeProjectRow(row) {
  const members = conn.prepare("SELECT user_id FROM project_members WHERE project_id = ?").all(row.id).map((m) => m.user_id);
  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    members,
  };
}

const createProjectTx = conn.transaction((project, memberIds) => {
  conn
    .prepare(
      `INSERT INTO projects (id, space_id, name, color, icon, start_date, end_date, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      project.id, project.spaceId, project.name, project.color, project.icon,
      project.startDate, project.endDate, project.createdBy, project.createdAt
    );
  const insertMember = conn.prepare("INSERT INTO project_members (project_id, user_id) VALUES (?,?)");
  for (const userId of memberIds) insertMember.run(project.id, userId);
  const insertStatus = conn.prepare(
    "INSERT INTO task_statuses (id, project_id, name, position, created_at) VALUES (?,?,?,?,?)"
  );
  DEFAULT_STATUS_NAMES.forEach((statusName, i) => {
    insertStatus.run(id(), project.id, statusName, i, project.createdAt);
  });
});

function createProject({ spaceId, name, color, icon, startDate, endDate, createdBy, memberIds = [] }) {
  const project = {
    id: id(),
    spaceId,
    name,
    color: color || "#6c5ce7",
    icon: icon || "📁",
    startDate: startDate || null,
    endDate: endDate || null,
    createdBy,
    createdAt: now(),
  };
  createProjectTx(project, [...new Set([createdBy, ...memberIds])]);
  return findProjectById(project.id);
}

function findProjectById(projectId) {
  const row = conn.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  return row ? serializeProjectRow(row) : null;
}

function listProjectsForSpace(spaceId) {
  return conn.prepare("SELECT * FROM projects WHERE space_id = ? ORDER BY created_at").all(spaceId).map(serializeProjectRow);
}

function listProjectsForUser(userId) {
  const rows = conn
    .prepare(
      `SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id = p.id WHERE pm.user_id = ? ORDER BY p.created_at`
    )
    .all(userId);
  return rows.map(serializeProjectRow);
}

function isProjectMember(projectId, userId) {
  return !!conn.prepare("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, userId);
}

function addProjectMembers(projectId, userIds) {
  const insert = conn.prepare("INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?,?)");
  const tx = conn.transaction((ids) => {
    for (const userId of ids) insert.run(projectId, userId);
  });
  tx(userIds);
  return findProjectById(projectId);
}

// ---- 태스크 상태(커스텀 칸반 컬럼) ----

function serializeStatusRow(row) {
  return { id: row.id, projectId: row.project_id, name: row.name, position: row.position, createdAt: row.created_at };
}

function listTaskStatuses(projectId) {
  return conn
    .prepare("SELECT * FROM task_statuses WHERE project_id = ? ORDER BY position")
    .all(projectId)
    .map(serializeStatusRow);
}

function createTaskStatus(projectId, name) {
  const maxPos = conn.prepare("SELECT MAX(position) AS p FROM task_statuses WHERE project_id = ?").get(projectId).p;
  const status = { id: id(), projectId, name, position: (maxPos ?? -1) + 1, createdAt: now() };
  conn
    .prepare("INSERT INTO task_statuses (id, project_id, name, position, created_at) VALUES (?,?,?,?,?)")
    .run(status.id, status.projectId, status.name, status.position, status.createdAt);
  return status;
}

function renameTaskStatus(statusId, name) {
  const result = conn.prepare("UPDATE task_statuses SET name = ? WHERE id = ?").run(name, statusId);
  if (result.changes === 0) return null;
  return serializeStatusRow(conn.prepare("SELECT * FROM task_statuses WHERE id = ?").get(statusId));
}

function deleteTaskStatus(statusId) {
  const taskCount = conn.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status_id = ?").get(statusId).n;
  if (taskCount > 0) return { error: "status_has_tasks" };
  conn.prepare("DELETE FROM task_statuses WHERE id = ?").run(statusId);
  return { ok: true };
}

// ---- 태스크 ----

function serializeTaskRow(row) {
  const assignees = conn.prepare("SELECT user_id FROM task_assignees WHERE task_id = ?").all(row.id).map((a) => a.user_id);
  const subtaskRows = conn.prepare("SELECT done FROM subtasks WHERE task_id = ?").all(row.id);
  const subtaskTotal = subtaskRows.length;
  const subtaskDone = subtaskRows.filter((s) => s.done).length;
  const commentCount = conn.prepare("SELECT COUNT(*) AS n FROM task_comments WHERE task_id = ?").get(row.id).n;
  return {
    id: row.id,
    projectId: row.project_id,
    statusId: row.status_id,
    title: row.title,
    body: row.body,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date,
    position: row.position,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeIds: assignees,
    subtaskProgress: subtaskTotal === 0 ? null : Math.round((subtaskDone / subtaskTotal) * 100),
    subtaskTotal,
    subtaskDone,
    commentCount,
  };
}

const createTaskTx = conn.transaction((task, assigneeIds) => {
  conn
    .prepare(
      `INSERT INTO tasks (id, project_id, status_id, title, body, priority, start_date, due_date, position, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      task.id, task.projectId, task.statusId, task.title, task.body, task.priority,
      task.startDate, task.dueDate, task.position, task.createdBy, task.createdAt, task.updatedAt
    );
  const insert = conn.prepare("INSERT INTO task_assignees (task_id, user_id) VALUES (?,?)");
  for (const userId of assigneeIds) insert.run(task.id, userId);
});

function createTask({ projectId, statusId, title, body, priority, startDate, dueDate, createdBy, assigneeIds = [] }) {
  const maxPos = conn.prepare("SELECT MAX(position) AS p FROM tasks WHERE status_id = ?").get(statusId).p;
  const task = {
    id: id(),
    projectId,
    statusId,
    title,
    body: body || null,
    priority: priority || "medium",
    startDate: startDate || null,
    dueDate: dueDate || null,
    position: (maxPos ?? -1) + 1,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
  createTaskTx(task, assigneeIds);
  return findTaskById(task.id);
}

function findTaskById(taskId) {
  const row = conn.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  return row ? serializeTaskRow(row) : null;
}

function listTasksForProject(projectId) {
  return conn
    .prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY status_id, position")
    .all(projectId)
    .map(serializeTaskRow);
}

function updateTask(taskId, { title, body, priority, startDate, dueDate }) {
  const existing = conn.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!existing) return null;
  conn
    .prepare(
      `UPDATE tasks SET title = ?, body = ?, priority = ?, start_date = ?, due_date = ?, updated_at = ? WHERE id = ?`
    )
    .run(
      title ?? existing.title,
      body !== undefined ? body : existing.body,
      priority ?? existing.priority,
      startDate !== undefined ? startDate : existing.start_date,
      dueDate !== undefined ? dueDate : existing.due_date,
      now(),
      taskId
    );
  return findTaskById(taskId);
}

// 칸반 드래그 앤 드롭: 다른 상태 컬럼으로 옮기면 해당 컬럼 맨 아래에 배치된다.
function moveTask(taskId, statusId) {
  const maxPos = conn.prepare("SELECT MAX(position) AS p FROM tasks WHERE status_id = ?").get(statusId).p;
  conn
    .prepare("UPDATE tasks SET status_id = ?, position = ?, updated_at = ? WHERE id = ?")
    .run(statusId, (maxPos ?? -1) + 1, now(), taskId);
  return findTaskById(taskId);
}

function deleteTask(taskId) {
  conn.prepare("DELETE FROM task_comments WHERE task_id = ?").run(taskId);
  conn.prepare("DELETE FROM subtasks WHERE task_id = ?").run(taskId);
  conn.prepare("DELETE FROM task_assignees WHERE task_id = ?").run(taskId);
  const result = conn.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  return result.changes > 0;
}

function setTaskAssignees(taskId, userIds) {
  const tx = conn.transaction((ids) => {
    conn.prepare("DELETE FROM task_assignees WHERE task_id = ?").run(taskId);
    const insert = conn.prepare("INSERT INTO task_assignees (task_id, user_id) VALUES (?,?)");
    for (const userId of ids) insert.run(taskId, userId);
  });
  tx([...new Set(userIds)]);
  conn.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?").run(now(), taskId);
  return findTaskById(taskId);
}

// ---- 서브태스크 (체크리스트) ----

function serializeSubtaskRow(row) {
  return { id: row.id, taskId: row.task_id, text: row.text, done: !!row.done, position: row.position, createdAt: row.created_at };
}

function listSubtasks(taskId) {
  return conn.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY position").all(taskId).map(serializeSubtaskRow);
}

function addSubtask(taskId, text) {
  const maxPos = conn.prepare("SELECT MAX(position) AS p FROM subtasks WHERE task_id = ?").get(taskId).p;
  const subtask = { id: id(), taskId, text, position: (maxPos ?? -1) + 1, createdAt: now() };
  conn
    .prepare("INSERT INTO subtasks (id, task_id, text, position, created_at) VALUES (?,?,?,?,?)")
    .run(subtask.id, subtask.taskId, subtask.text, subtask.position, subtask.createdAt);
  return { ...subtask, done: false };
}

function setSubtaskDone(subtaskId, done) {
  const result = conn.prepare("UPDATE subtasks SET done = ? WHERE id = ?").run(done ? 1 : 0, subtaskId);
  if (result.changes === 0) return null;
  return serializeSubtaskRow(conn.prepare("SELECT * FROM subtasks WHERE id = ?").get(subtaskId));
}

function deleteSubtask(subtaskId) {
  const result = conn.prepare("DELETE FROM subtasks WHERE id = ?").run(subtaskId);
  return result.changes > 0;
}

function findSubtaskById(subtaskId) {
  const row = conn.prepare("SELECT * FROM subtasks WHERE id = ?").get(subtaskId);
  return row ? serializeSubtaskRow(row) : null;
}

// ---- 태스크 댓글 (커뮤니케이션 쓰레드) ----

function serializeTaskCommentRow(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    content: row.content,
    attachment: row.attachment_url
      ? { url: row.attachment_url, name: row.attachment_name, mime: row.attachment_mime, size: row.attachment_size }
      : null,
    createdAt: row.created_at,
  };
}

function listTaskComments(taskId) {
  return conn
    .prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at")
    .all(taskId)
    .map(serializeTaskCommentRow);
}

function searchTasks(userId, query) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const like = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const rows = conn
    .prepare(
      `SELECT t.* FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
       WHERE t.title LIKE ? ESCAPE '\\'
       ORDER BY t.updated_at DESC LIMIT 20`
    )
    .all(userId, like);
  return rows.map(serializeTaskRow);
}

function addTaskComment({ taskId, userId, content, attachment }) {
  const comment = {
    id: id(),
    taskId,
    userId,
    content: content || null,
    attachmentUrl: attachment?.url || null,
    attachmentName: attachment?.name || null,
    attachmentMime: attachment?.mime || null,
    attachmentSize: attachment?.size || null,
    createdAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO task_comments (id, task_id, user_id, content, attachment_url, attachment_name, attachment_mime, attachment_size, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      comment.id, comment.taskId, comment.userId, comment.content,
      comment.attachmentUrl, comment.attachmentName, comment.attachmentMime, comment.attachmentSize, comment.createdAt
    );
  return serializeTaskCommentRow(conn.prepare("SELECT * FROM task_comments WHERE id = ?").get(comment.id));
}

// ---- Channels ----

function serializeChannelRow(row) {
  const members = conn
    .prepare("SELECT user_id, last_read_at, muted, favorite FROM channel_members WHERE channel_id = ?")
    .all(row.id)
    .map((m) => ({
      userId: m.user_id,
      lastReadAt: m.last_read_at,
      muted: !!m.muted,
      favorite: !!m.favorite,
    }));
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

function setFavorite(channelId, userId, favorite) {
  const result = conn
    .prepare("UPDATE channel_members SET favorite = ? WHERE channel_id = ? AND user_id = ?")
    .run(favorite ? 1 : 0, channelId, userId);
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

  let forwardedFrom = null;
  if (row.forwarded_from_message_id) {
    const origin = conn
      .prepare("SELECT sender_id, channel_id FROM messages WHERE id = ?")
      .get(row.forwarded_from_message_id);
    if (origin) forwardedFrom = { messageId: row.forwarded_from_message_id, senderId: origin.sender_id, channelId: origin.channel_id };
  }

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
    forwardedFrom,
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

function createMessage({
  channelId,
  senderId,
  content,
  parentMessageId = null,
  attachment = null,
  forwardedFromMessageId = null,
}) {
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
    forwardedFromMessageId,
    createdAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO messages
        (id, channel_id, sender_id, parent_message_id, content, attachment_url, attachment_name, attachment_mime, attachment_size, forwarded_from_message_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
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
      message.forwardedFromMessageId,
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

// ---- Channel notes & checklist (채널 노트 / 체크리스트) ----

function getChannelNote(channelId) {
  const row = conn.prepare("SELECT * FROM channel_notes WHERE channel_id = ?").get(channelId);
  if (!row) return { channelId, content: "", updatedBy: null, updatedAt: null };
  return { channelId: row.channel_id, content: row.content, updatedBy: row.updated_by, updatedAt: row.updated_at };
}

function setChannelNote(channelId, userId, content) {
  conn
    .prepare(
      `INSERT INTO channel_notes (channel_id, content, updated_by, updated_at) VALUES (?,?,?,?)
       ON CONFLICT(channel_id) DO UPDATE SET content = excluded.content, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
    )
    .run(channelId, content, userId, now());
  return getChannelNote(channelId);
}

function serializeChecklistItem(row) {
  return { id: row.id, channelId: row.channel_id, text: row.text, done: !!row.done, createdAt: row.created_at };
}

function listChecklistItems(channelId) {
  return conn
    .prepare("SELECT * FROM channel_checklist_items WHERE channel_id = ? ORDER BY created_at ASC")
    .all(channelId)
    .map(serializeChecklistItem);
}

function addChecklistItem(channelId, text) {
  const item = { id: id(), channelId, text, createdAt: now() };
  conn
    .prepare("INSERT INTO channel_checklist_items (id, channel_id, text, created_at) VALUES (?,?,?,?)")
    .run(item.id, item.channelId, item.text, item.createdAt);
  return { id: item.id, channelId: item.channelId, text: item.text, done: false, createdAt: item.createdAt };
}

function setChecklistItemDone(itemId, done) {
  const result = conn
    .prepare("UPDATE channel_checklist_items SET done = ? WHERE id = ?")
    .run(done ? 1 : 0, itemId);
  if (result.changes === 0) return null;
  const row = conn.prepare("SELECT * FROM channel_checklist_items WHERE id = ?").get(itemId);
  return serializeChecklistItem(row);
}

function deleteChecklistItem(itemId) {
  const result = conn.prepare("DELETE FROM channel_checklist_items WHERE id = ?").run(itemId);
  return result.changes > 0;
}

function findChecklistItem(itemId) {
  const row = conn.prepare("SELECT * FROM channel_checklist_items WHERE id = ?").get(itemId);
  return row ? serializeChecklistItem(row) : null;
}

// ---- 사내 지식 기반 모듈 (위키) ----

const WIKI_TEMPLATES = {
  meeting_notes: {
    label: "주간 회의록",
    blocks: [
      { id: id(), type: "heading", text: "주간 회의록" },
      { id: id(), type: "paragraph", text: "일시: " },
      { id: id(), type: "paragraph", text: "참석자: " },
      { id: id(), type: "heading", text: "안건" },
      { id: id(), type: "paragraph", text: "" },
      { id: id(), type: "heading", text: "결정 사항" },
      { id: id(), type: "paragraph", text: "" },
    ],
  },
  proposal: {
    label: "기획서",
    blocks: [
      { id: id(), type: "heading", text: "기획서" },
      { id: id(), type: "heading", text: "개요" },
      { id: id(), type: "paragraph", text: "" },
      { id: id(), type: "heading", text: "목표" },
      { id: id(), type: "paragraph", text: "" },
      { id: id(), type: "heading", text: "일정" },
      { id: id(), type: "paragraph", text: "" },
    ],
  },
  manual: {
    label: "업무 매뉴얼",
    blocks: [
      { id: id(), type: "heading", text: "업무 매뉴얼" },
      { id: id(), type: "heading", text: "목적" },
      { id: id(), type: "paragraph", text: "" },
      { id: id(), type: "heading", text: "절차" },
      { id: id(), type: "paragraph", text: "" },
      { id: id(), type: "heading", text: "주의 사항" },
      { id: id(), type: "paragraph", text: "" },
    ],
  },
};

function listWikiTemplates() {
  return Object.entries(WIKI_TEMPLATES).map(([key, t]) => ({ key, label: t.label }));
}

function getWikiTemplateBlocks(key) {
  const template = WIKI_TEMPLATES[key];
  return template ? template.blocks.map((b) => ({ ...b, id: id() })) : [];
}

// 블록 JSON에서 순수 텍스트만 뽑아낸다 (백링크 파싱 / 검색 스니펫용).
function extractWikiPlainText(contentJson) {
  let blocks;
  try {
    blocks = JSON.parse(contentJson);
  } catch {
    return "";
  }
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b) => {
      if (b.type === "table" && Array.isArray(b.rows)) return b.rows.flat().join(" ");
      return b.text || "";
    })
    .join("\n");
}

function serializeWikiPageRow(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    parentId: row.parent_id,
    title: row.title,
    content: row.content,
    position: row.position,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createWikiPage({ spaceId, parentId, title, content, createdBy }) {
  const maxPos = conn
    .prepare("SELECT MAX(position) AS p FROM wiki_pages WHERE space_id = ? AND parent_id IS ?")
    .get(spaceId, parentId || null).p;
  const page = {
    id: id(),
    spaceId,
    parentId: parentId || null,
    title,
    content: content || "[]",
    position: (maxPos ?? -1) + 1,
    createdBy,
    updatedBy: createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO wiki_pages (id, space_id, parent_id, title, content, position, created_by, updated_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      page.id, page.spaceId, page.parentId, page.title, page.content, page.position,
      page.createdBy, page.updatedBy, page.createdAt, page.updatedAt
    );
  recomputeWikiBacklinks(page.id, spaceId, page.content);
  return findWikiPageById(page.id);
}

function findWikiPageById(pageId) {
  const row = conn.prepare("SELECT * FROM wiki_pages WHERE id = ?").get(pageId);
  return row ? serializeWikiPageRow(row) : null;
}

function listWikiPagesForSpace(spaceId) {
  return conn
    .prepare("SELECT * FROM wiki_pages WHERE space_id = ? ORDER BY parent_id, position")
    .all(spaceId)
    .map(serializeWikiPageRow);
}

// [[문서명]] 패턴을 파싱해 같은 스페이스 안에서 제목이 일치하는 문서로 백링크를 다시 계산한다.
function recomputeWikiBacklinks(pageId, spaceId, content) {
  conn.prepare("DELETE FROM wiki_links WHERE from_page_id = ?").run(pageId);
  const text = extractWikiPlainText(content);
  const titles = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim());
  if (titles.length === 0) return;
  const insert = conn.prepare("INSERT OR IGNORE INTO wiki_links (from_page_id, to_page_id) VALUES (?,?)");
  for (const title of [...new Set(titles)]) {
    const target = conn
      .prepare("SELECT id FROM wiki_pages WHERE space_id = ? AND lower(title) = lower(?) AND id != ?")
      .get(spaceId, title, pageId);
    if (target) insert.run(pageId, target.id);
  }
}

function listWikiBacklinks(pageId) {
  const rows = conn
    .prepare(
      `SELECT p.id, p.title FROM wiki_links l JOIN wiki_pages p ON p.id = l.from_page_id WHERE l.to_page_id = ?`
    )
    .all(pageId);
  return rows;
}

function updateWikiPage(pageId, { title, content }, editedBy) {
  const existing = conn.prepare("SELECT * FROM wiki_pages WHERE id = ?").get(pageId);
  if (!existing) return null;
  // 덮어쓰기 전에 현재 상태를 버전으로 스냅샷한다.
  conn
    .prepare(
      "INSERT INTO wiki_page_versions (id, page_id, title, content, edited_by, created_at) VALUES (?,?,?,?,?,?)"
    )
    .run(id(), pageId, existing.title, existing.content, existing.updated_by, existing.updated_at);

  const nextTitle = title ?? existing.title;
  const nextContent = content ?? existing.content;
  conn
    .prepare("UPDATE wiki_pages SET title = ?, content = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .run(nextTitle, nextContent, editedBy, now(), pageId);
  recomputeWikiBacklinks(pageId, existing.space_id, nextContent);
  return findWikiPageById(pageId);
}

function listWikiPageVersions(pageId) {
  return conn
    .prepare("SELECT id, page_id, title, edited_by, created_at FROM wiki_page_versions WHERE page_id = ? ORDER BY created_at DESC")
    .all(pageId)
    .map((r) => ({ id: r.id, pageId: r.page_id, title: r.title, editedBy: r.edited_by, createdAt: r.created_at }));
}

function getWikiPageVersion(versionId) {
  const row = conn.prepare("SELECT * FROM wiki_page_versions WHERE id = ?").get(versionId);
  if (!row) return null;
  return { id: row.id, pageId: row.page_id, title: row.title, content: row.content, editedBy: row.edited_by, createdAt: row.created_at };
}

// 롤백도 하나의 저장이므로, 되돌리기 전 현재 상태 역시 새 버전으로 남는다 (히스토리 비파괴적).
function restoreWikiPageVersion(pageId, versionId, editedBy) {
  const version = getWikiPageVersion(versionId);
  if (!version || version.pageId !== pageId) return { error: "version_not_found" };
  const page = updateWikiPage(pageId, { title: version.title, content: version.content }, editedBy);
  return { page };
}

function hasWikiChildren(pageId) {
  return conn.prepare("SELECT COUNT(*) AS n FROM wiki_pages WHERE parent_id = ?").get(pageId).n > 0;
}

function deleteWikiPage(pageId) {
  if (hasWikiChildren(pageId)) return { error: "has_children" };
  conn.prepare("DELETE FROM wiki_links WHERE from_page_id = ? OR to_page_id = ?").run(pageId, pageId);
  conn.prepare("DELETE FROM wiki_page_versions WHERE page_id = ?").run(pageId);
  conn.prepare("DELETE FROM wiki_pages WHERE id = ?").run(pageId);
  return { ok: true };
}

function searchWikiPages(userId, query) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = conn
    .prepare(
      `SELECT p.* FROM wiki_pages p
       JOIN space_members sm ON sm.space_id = p.space_id AND sm.user_id = ?
       ORDER BY p.updated_at DESC`
    )
    .all(userId);
  const needle = trimmed.toLowerCase();
  return rows
    .filter((r) => r.title.toLowerCase().includes(needle) || extractWikiPlainText(r.content).toLowerCase().includes(needle))
    .slice(0, 20)
    .map(serializeWikiPageRow);
}

// ---- 고객 관계 관리 모듈 (CRM) ----

const CRM_STAGES = ["prospecting", "meeting", "proposal", "won"];

function serializeCrmFieldRow(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    label: row.label,
    type: row.type,
    options: row.options ? JSON.parse(row.options) : null,
    position: row.position,
    createdAt: row.created_at,
  };
}

function listCrmCustomFields(spaceId) {
  return conn
    .prepare("SELECT * FROM crm_custom_fields WHERE space_id = ? ORDER BY position")
    .all(spaceId)
    .map(serializeCrmFieldRow);
}

function createCrmCustomField(spaceId, { label, type, options }) {
  const maxPos = conn.prepare("SELECT MAX(position) AS p FROM crm_custom_fields WHERE space_id = ?").get(spaceId).p;
  const field = {
    id: id(),
    spaceId,
    label,
    type: type || "text",
    options: options ? JSON.stringify(options) : null,
    position: (maxPos ?? -1) + 1,
    createdAt: now(),
  };
  conn
    .prepare(
      "INSERT INTO crm_custom_fields (id, space_id, label, type, options, position, created_at) VALUES (?,?,?,?,?,?,?)"
    )
    .run(field.id, field.spaceId, field.label, field.type, field.options, field.position, field.createdAt);
  return serializeCrmFieldRow(conn.prepare("SELECT * FROM crm_custom_fields WHERE id = ?").get(field.id));
}

function deleteCrmCustomField(fieldId) {
  conn.prepare("DELETE FROM crm_custom_values WHERE field_id = ?").run(fieldId);
  const result = conn.prepare("DELETE FROM crm_custom_fields WHERE id = ?").run(fieldId);
  return result.changes > 0;
}

function serializeCrmCustomerRow(row) {
  const values = conn
    .prepare("SELECT field_id, value FROM crm_custom_values WHERE customer_id = ?")
    .all(row.id);
  const customFields = {};
  for (const v of values) customFields[v.field_id] = v.value;
  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    customFields,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createCrmCustomer({ spaceId, name, email, phone, createdBy }) {
  const customer = {
    id: id(),
    spaceId,
    name,
    email: email || null,
    phone: phone || null,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO crm_customers (id, space_id, name, email, phone, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(customer.id, customer.spaceId, customer.name, customer.email, customer.phone, customer.createdBy, customer.createdAt, customer.updatedAt);
  return findCrmCustomerById(customer.id);
}

function findCrmCustomerById(customerId) {
  const row = conn.prepare("SELECT * FROM crm_customers WHERE id = ?").get(customerId);
  return row ? serializeCrmCustomerRow(row) : null;
}

const SORTABLE_CUSTOMER_FIELDS = { name: "name", createdAt: "created_at", updatedAt: "updated_at" };

function listCrmCustomers(spaceId, { q, sortBy, order } = {}) {
  let rows = conn.prepare("SELECT * FROM crm_customers WHERE space_id = ?").all(spaceId);
  let customers = rows.map(serializeCrmCustomerRow);

  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.email || "").toLowerCase().includes(needle) ||
        (c.phone || "").toLowerCase().includes(needle) ||
        Object.values(c.customFields).some((v) => (v || "").toLowerCase().includes(needle))
    );
  }

  const sortKey = SORTABLE_CUSTOMER_FIELDS[sortBy] ? sortBy : "createdAt";
  const dir = order === "asc" ? 1 : -1;
  customers.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
  });
  return customers;
}

function updateCrmCustomer(customerId, { name, email, phone }) {
  const existing = conn.prepare("SELECT * FROM crm_customers WHERE id = ?").get(customerId);
  if (!existing) return null;
  conn
    .prepare("UPDATE crm_customers SET name = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?")
    .run(name ?? existing.name, email !== undefined ? email : existing.email, phone !== undefined ? phone : existing.phone, now(), customerId);
  return findCrmCustomerById(customerId);
}

function deleteCrmCustomer(customerId) {
  conn.prepare("DELETE FROM crm_custom_values WHERE customer_id = ?").run(customerId);
  conn.prepare("DELETE FROM crm_activities WHERE customer_id = ?").run(customerId);
  conn.prepare("DELETE FROM crm_leads WHERE customer_id = ?").run(customerId);
  const result = conn.prepare("DELETE FROM crm_customers WHERE id = ?").run(customerId);
  return result.changes > 0;
}

function setCrmCustomValue(customerId, fieldId, value) {
  conn
    .prepare(
      `INSERT INTO crm_custom_values (customer_id, field_id, value) VALUES (?,?,?)
       ON CONFLICT(customer_id, field_id) DO UPDATE SET value = excluded.value`
    )
    .run(customerId, fieldId, value);
  return findCrmCustomerById(customerId);
}

// ---- 리드 파이프라인 ----

function serializeCrmLeadRow(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    customerId: row.customer_id,
    title: row.title,
    stage: row.stage,
    position: row.position,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createCrmLead({ spaceId, customerId, title, stage, createdBy }) {
  const initialStage = CRM_STAGES.includes(stage) ? stage : "prospecting";
  const maxPos = conn
    .prepare("SELECT MAX(position) AS p FROM crm_leads WHERE space_id = ? AND stage = ?")
    .get(spaceId, initialStage).p;
  const lead = {
    id: id(),
    spaceId,
    customerId,
    title,
    stage: initialStage,
    position: (maxPos ?? -1) + 1,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO crm_leads (id, space_id, customer_id, title, stage, position, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(lead.id, lead.spaceId, lead.customerId, lead.title, lead.stage, lead.position, lead.createdBy, lead.createdAt, lead.updatedAt);
  return serializeCrmLeadRow(conn.prepare("SELECT * FROM crm_leads WHERE id = ?").get(lead.id));
}

function listCrmLeads(spaceId) {
  return conn
    .prepare("SELECT * FROM crm_leads WHERE space_id = ? ORDER BY stage, position")
    .all(spaceId)
    .map(serializeCrmLeadRow);
}

function findCrmLeadById(leadId) {
  const row = conn.prepare("SELECT * FROM crm_leads WHERE id = ?").get(leadId);
  return row ? serializeCrmLeadRow(row) : null;
}

function moveCrmLead(leadId, stage) {
  if (!CRM_STAGES.includes(stage)) return { error: "invalid_stage" };
  const lead = findCrmLeadById(leadId);
  if (!lead) return { error: "not_found" };
  const maxPos = conn
    .prepare("SELECT MAX(position) AS p FROM crm_leads WHERE space_id = ? AND stage = ?")
    .get(lead.spaceId, stage).p;
  conn
    .prepare("UPDATE crm_leads SET stage = ?, position = ?, updated_at = ? WHERE id = ?")
    .run(stage, (maxPos ?? -1) + 1, now(), leadId);
  return { lead: findCrmLeadById(leadId) };
}

function deleteCrmLead(leadId) {
  const result = conn.prepare("DELETE FROM crm_leads WHERE id = ?").run(leadId);
  return result.changes > 0;
}

// ---- 활동 타임라인 ----

function serializeCrmActivityRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function addCrmActivity({ customerId, type, content, createdBy }) {
  const activity = { id: id(), customerId, type: type || "note", content, createdBy, createdAt: now() };
  conn
    .prepare(
      "INSERT INTO crm_activities (id, customer_id, type, content, created_by, created_at) VALUES (?,?,?,?,?,?)"
    )
    .run(activity.id, activity.customerId, activity.type, activity.content, activity.createdBy, activity.createdAt);
  return serializeCrmActivityRow(conn.prepare("SELECT * FROM crm_activities WHERE id = ?").get(activity.id));
}

function listCrmActivities(customerId) {
  return conn
    .prepare("SELECT * FROM crm_activities WHERE customer_id = ? ORDER BY created_at DESC")
    .all(customerId)
    .map(serializeCrmActivityRow);
}

function searchCrmCustomers(userId, query) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = conn
    .prepare(
      `SELECT c.* FROM crm_customers c
       JOIN space_members sm ON sm.space_id = c.space_id AND sm.user_id = ?
       ORDER BY c.updated_at DESC`
    )
    .all(userId);
  const needle = trimmed.toLowerCase();
  return rows
    .map(serializeCrmCustomerRow)
    .filter((c) => c.name.toLowerCase().includes(needle) || (c.email || "").toLowerCase().includes(needle))
    .slice(0, 20);
}

// ---- 재무 및 리소스 추적 모듈 (Finance) ----

function serializeTransactionRow(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    date: row.date,
    kind: row.kind,
    category: row.category,
    amount: row.amount,
    customerId: row.customer_id,
    memo: row.memo,
    receipt: row.receipt_url
      ? { url: row.receipt_url, name: row.receipt_name, mime: row.receipt_mime, size: row.receipt_size }
      : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function createFinanceTransaction({ spaceId, date, kind, category, amount, customerId, memo, receipt, createdBy }) {
  const tx = {
    id: id(),
    spaceId,
    date,
    kind,
    category,
    amount,
    customerId: customerId || null,
    memo: memo || null,
    receiptUrl: receipt?.url || null,
    receiptName: receipt?.name || null,
    receiptMime: receipt?.mime || null,
    receiptSize: receipt?.size || null,
    createdBy,
    createdAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO finance_transactions
        (id, space_id, date, kind, category, amount, customer_id, memo, receipt_url, receipt_name, receipt_mime, receipt_size, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      tx.id, tx.spaceId, tx.date, tx.kind, tx.category, tx.amount, tx.customerId, tx.memo,
      tx.receiptUrl, tx.receiptName, tx.receiptMime, tx.receiptSize, tx.createdBy, tx.createdAt
    );
  return serializeTransactionRow(conn.prepare("SELECT * FROM finance_transactions WHERE id = ?").get(tx.id));
}

// 구독(반복 결제)의 이번 달 몫이 아직 기록되지 않았으면 트랜잭션을 자동 생성한다.
// 실제 백그라운드 스케줄러 없이도 "정해진 날짜가 지나면 자동 반영"을 만족시키는 lazy-cron 방식 —
// 이 스페이스의 재무 데이터를 조회할 때마다 한 번씩 확인한다.
function runDueSubscriptions(spaceId) {
  const todayDate = new Date();
  const currentYm = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}`;
  const todayDay = todayDate.getDate();
  const subs = conn
    .prepare("SELECT * FROM finance_subscriptions WHERE space_id = ? AND active = 1")
    .all(spaceId);
  for (const sub of subs) {
    if (sub.day_of_month > todayDay) continue;
    if (sub.last_run_ym === currentYm) continue;
    const dateStr = `${currentYm}-${String(sub.day_of_month).padStart(2, "0")}`;
    createFinanceTransaction({
      spaceId,
      date: dateStr,
      kind: sub.kind,
      category: sub.category,
      amount: sub.amount,
      customerId: sub.customer_id,
      memo: `구독: ${sub.name}`,
      createdBy: sub.created_by,
    });
    conn.prepare("UPDATE finance_subscriptions SET last_run_ym = ? WHERE id = ?").run(currentYm, sub.id);
  }
}

function listFinanceTransactions(spaceId, { month } = {}) {
  runDueSubscriptions(spaceId);
  let sql = "SELECT * FROM finance_transactions WHERE space_id = ?";
  const params = [spaceId];
  if (month) {
    sql += " AND date LIKE ?";
    params.push(`${month}%`);
  }
  sql += " ORDER BY date DESC, created_at DESC";
  return conn.prepare(sql).all(...params).map(serializeTransactionRow);
}

function deleteFinanceTransaction(txId) {
  const result = conn.prepare("DELETE FROM finance_transactions WHERE id = ?").run(txId);
  return result.changes > 0;
}

function findFinanceTransactionById(txId) {
  const row = conn.prepare("SELECT * FROM finance_transactions WHERE id = ?").get(txId);
  return row ? serializeTransactionRow(row) : null;
}

// 최근 N개월 현금흐름(수입/지출 합계)과, 지정한 달의 지출 카테고리별 비율을 함께 계산한다.
function financeSummary(spaceId, { months = 6 } = {}) {
  runDueSubscriptions(spaceId);
  const rows = conn.prepare("SELECT * FROM finance_transactions WHERE space_id = ?").all(spaceId);

  const now2 = new Date();
  const cashflow = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthRows = rows.filter((r) => r.date.startsWith(ym));
    const income = monthRows.filter((r) => r.kind === "income").reduce((sum, r) => sum + r.amount, 0);
    const expense = monthRows.filter((r) => r.kind === "expense").reduce((sum, r) => sum + r.amount, 0);
    cashflow.push({ month: ym, income, expense, net: income - expense });
  }

  const currentYm = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthExpenses = rows.filter((r) => r.kind === "expense" && r.date.startsWith(currentYm));
  const byCategory = new Map();
  for (const r of currentMonthExpenses) {
    byCategory.set(r.category, (byCategory.get(r.category) || 0) + r.amount);
  }
  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { cashflow, categoryBreakdown, currentMonth: currentYm };
}

// ---- 구독(반복 결제) ----

function serializeSubscriptionRow(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    name: row.name,
    kind: row.kind,
    category: row.category,
    amount: row.amount,
    dayOfMonth: row.day_of_month,
    customerId: row.customer_id,
    active: !!row.active,
    lastRunYm: row.last_run_ym,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function createFinanceSubscription({ spaceId, name, kind, category, amount, dayOfMonth, customerId, createdBy }) {
  const sub = {
    id: id(),
    spaceId,
    name,
    kind,
    category,
    amount,
    dayOfMonth: Math.min(Math.max(dayOfMonth, 1), 28),
    customerId: customerId || null,
    createdBy,
    createdAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO finance_subscriptions (id, space_id, name, kind, category, amount, day_of_month, customer_id, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(sub.id, sub.spaceId, sub.name, sub.kind, sub.category, sub.amount, sub.dayOfMonth, sub.customerId, sub.createdBy, sub.createdAt);
  return serializeSubscriptionRow(conn.prepare("SELECT * FROM finance_subscriptions WHERE id = ?").get(sub.id));
}

function listFinanceSubscriptions(spaceId) {
  runDueSubscriptions(spaceId);
  return conn
    .prepare("SELECT * FROM finance_subscriptions WHERE space_id = ? ORDER BY day_of_month")
    .all(spaceId)
    .map(serializeSubscriptionRow);
}

function setFinanceSubscriptionActive(subId, active) {
  const result = conn.prepare("UPDATE finance_subscriptions SET active = ? WHERE id = ?").run(active ? 1 : 0, subId);
  if (result.changes === 0) return null;
  return serializeSubscriptionRow(conn.prepare("SELECT * FROM finance_subscriptions WHERE id = ?").get(subId));
}

function deleteFinanceSubscription(subId) {
  const result = conn.prepare("DELETE FROM finance_subscriptions WHERE id = ?").run(subId);
  return result.changes > 0;
}

// ---- 인보이스 ----

function serializeInvoiceRow(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    customerId: row.customer_id,
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    items: JSON.parse(row.items),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function nextInvoiceNumber(spaceId) {
  const ym = now().slice(0, 7).replace("-", "");
  const count = conn
    .prepare("SELECT COUNT(*) AS n FROM finance_invoices WHERE space_id = ? AND invoice_number LIKE ?")
    .get(spaceId, `INV-${ym}-%`).n;
  return `INV-${ym}-${String(count + 1).padStart(3, "0")}`;
}

function createFinanceInvoice({ spaceId, customerId, items, issueDate, dueDate, createdBy }) {
  const invoice = {
    id: id(),
    spaceId,
    customerId,
    invoiceNumber: nextInvoiceNumber(spaceId),
    issueDate: issueDate || now().slice(0, 10),
    dueDate: dueDate || null,
    items: JSON.stringify(items || []),
    createdBy,
    createdAt: now(),
  };
  conn
    .prepare(
      `INSERT INTO finance_invoices (id, space_id, customer_id, invoice_number, issue_date, due_date, items, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(invoice.id, invoice.spaceId, invoice.customerId, invoice.invoiceNumber, invoice.issueDate, invoice.dueDate, invoice.items, invoice.createdBy, invoice.createdAt);
  return findFinanceInvoiceById(invoice.id);
}

function listFinanceInvoices(spaceId) {
  return conn
    .prepare("SELECT * FROM finance_invoices WHERE space_id = ? ORDER BY created_at DESC")
    .all(spaceId)
    .map(serializeInvoiceRow);
}

function findFinanceInvoiceById(invoiceId) {
  const row = conn.prepare("SELECT * FROM finance_invoices WHERE id = ?").get(invoiceId);
  return row ? serializeInvoiceRow(row) : null;
}

function setFinanceInvoiceStatus(invoiceId, status) {
  const result = conn.prepare("UPDATE finance_invoices SET status = ? WHERE id = ?").run(status, invoiceId);
  if (result.changes === 0) return null;
  return findFinanceInvoiceById(invoiceId);
}

function deleteFinanceInvoice(invoiceId) {
  const result = conn.prepare("DELETE FROM finance_invoices WHERE id = ?").run(invoiceId);
  return result.changes > 0;
}

// ---- 통합 대시보드 모듈 (홈 위젯) ----

function serializeWidgetRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    size: row.size,
    config: JSON.parse(row.config),
    position: row.position,
    createdAt: row.created_at,
  };
}

function listDashboardWidgets(userId) {
  return conn
    .prepare("SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY position")
    .all(userId)
    .map(serializeWidgetRow);
}

function createDashboardWidget(userId, { type, size, config }) {
  const maxPos = conn.prepare("SELECT MAX(position) AS p FROM dashboard_widgets WHERE user_id = ?").get(userId).p;
  const widget = {
    id: id(),
    userId,
    type,
    size: size || "medium",
    config: JSON.stringify(config || {}),
    position: (maxPos ?? -1) + 1,
    createdAt: now(),
  };
  conn
    .prepare(
      "INSERT INTO dashboard_widgets (id, user_id, type, size, config, position, created_at) VALUES (?,?,?,?,?,?,?)"
    )
    .run(widget.id, widget.userId, widget.type, widget.size, widget.config, widget.position, widget.createdAt);
  return serializeWidgetRow(conn.prepare("SELECT * FROM dashboard_widgets WHERE id = ?").get(widget.id));
}

function updateDashboardWidget(widgetId, userId, { size, config }) {
  const existing = conn.prepare("SELECT * FROM dashboard_widgets WHERE id = ? AND user_id = ?").get(widgetId, userId);
  if (!existing) return null;
  conn
    .prepare("UPDATE dashboard_widgets SET size = ?, config = ? WHERE id = ?")
    .run(size || existing.size, config ? JSON.stringify(config) : existing.config, widgetId);
  return serializeWidgetRow(conn.prepare("SELECT * FROM dashboard_widgets WHERE id = ?").get(widgetId));
}

function reorderDashboardWidgets(userId, orderedIds) {
  const tx = conn.transaction((ids) => {
    ids.forEach((widgetId, index) => {
      conn.prepare("UPDATE dashboard_widgets SET position = ? WHERE id = ? AND user_id = ?").run(index, widgetId, userId);
    });
  });
  tx(orderedIds);
  return listDashboardWidgets(userId);
}

function deleteDashboardWidget(widgetId, userId) {
  const result = conn.prepare("DELETE FROM dashboard_widgets WHERE id = ? AND user_id = ?").run(widgetId, userId);
  return result.changes > 0;
}

// 위젯 데이터 조회 헬퍼 — 각 모듈에서 대시보드가 필요로 하는 요약치만 뽑아온다.

function listMyDueTasks(spaceId, userId, limit = 8) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const rows = conn
    .prepare(
      `SELECT t.* FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = ?
       WHERE p.space_id = ? AND t.due_date IS NOT NULL AND t.due_date <= ?
       ORDER BY t.due_date ASC LIMIT ?`
    )
    .all(userId, spaceId, todayStr, limit);
  return rows.map(serializeTaskRow);
}

function listRecentWikiPages(spaceId, limit = 5) {
  return conn
    .prepare("SELECT * FROM wiki_pages WHERE space_id = ? ORDER BY updated_at DESC LIMIT ?")
    .all(spaceId, limit)
    .map(serializeWikiPageRow);
}

function countNewLeadsThisWeek(spaceId) {
  const now2 = new Date();
  const day = now2.getDay();
  const monday = new Date(now2);
  monday.setDate(now2.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekStartIso = monday.toISOString();
  const row = conn
    .prepare("SELECT COUNT(*) AS n FROM crm_leads WHERE space_id = ? AND created_at >= ?")
    .get(spaceId, weekStartIso);
  return row.n;
}

// ---- 사내 메일 ----

function serializeMailRow(row, box) {
  const recipients = conn
    .prepare("SELECT user_id, kind FROM mail_recipients WHERE mail_id = ?")
    .all(row.id)
    .map((r) => ({ userId: r.user_id, kind: r.kind }));
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    subject: row.subject,
    body: row.body,
    isDraft: !!row.is_draft,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recipients,
    box: box?.box,
    readAt: box?.read_at ?? null,
    starred: !!box?.starred,
  };
}

function createMail({ fromUserId, subject, body, toIds = [], ccIds = [], draft }) {
  const mail = {
    id: id(),
    fromUserId,
    subject: subject || "",
    body: body || "",
    isDraft: draft ? 1 : 0,
    createdAt: now(),
    updatedAt: now(),
  };
  conn
    .prepare(
      "INSERT INTO mails (id, from_user_id, subject, body, is_draft, created_at, updated_at) VALUES (?,?,?,?,?,?,?)"
    )
    .run(mail.id, mail.fromUserId, mail.subject, mail.body, mail.isDraft, mail.createdAt, mail.updatedAt);

  const insertRecipient = conn.prepare("INSERT INTO mail_recipients (mail_id, user_id, kind) VALUES (?,?,?)");
  for (const uid of toIds) insertRecipient.run(mail.id, uid, "to");
  for (const uid of ccIds) insertRecipient.run(mail.id, uid, "cc");

  const insertBox = conn.prepare(
    "INSERT INTO mail_boxes (id, mail_id, user_id, box, created_at) VALUES (?,?,?,?,?)"
  );
  if (draft) {
    insertBox.run(id(), mail.id, fromUserId, "draft", now());
  } else {
    insertBox.run(id(), mail.id, fromUserId, "sent", now());
    for (const uid of [...new Set([...toIds, ...ccIds])]) {
      insertBox.run(id(), mail.id, uid, "inbox", now());
    }
  }
  return findMailById(mail.id, fromUserId);
}

function findMailById(mailId, viewerId) {
  const row = conn.prepare("SELECT * FROM mails WHERE id = ?").get(mailId);
  if (!row) return null;
  const box = viewerId
    ? conn.prepare("SELECT * FROM mail_boxes WHERE mail_id = ? AND user_id = ?").get(mailId, viewerId)
    : null;
  return serializeMailRow(row, box);
}

function listMailbox(userId, box) {
  const rows = conn
    .prepare(
      `SELECT m.*, mb.box AS mb_box, mb.read_at AS mb_read_at, mb.starred AS mb_starred, mb.created_at AS mb_created_at
       FROM mail_boxes mb JOIN mails m ON m.id = mb.mail_id
       WHERE mb.user_id = ? AND mb.box = ?
       ORDER BY mb.created_at DESC`
    )
    .all(userId, box);
  return rows.map((row) =>
    serializeMailRow(row, { box: row.mb_box, read_at: row.mb_read_at, starred: row.mb_starred })
  );
}

function updateDraft(mailId, userId, { subject, body, toIds, ccIds }) {
  const mail = conn.prepare("SELECT * FROM mails WHERE id = ?").get(mailId);
  if (!mail || !mail.is_draft || mail.from_user_id !== userId) return { error: "not_found" };
  conn
    .prepare("UPDATE mails SET subject = ?, body = ?, updated_at = ? WHERE id = ?")
    .run(subject ?? mail.subject, body ?? mail.body, now(), mailId);
  if (toIds || ccIds) {
    conn.prepare("DELETE FROM mail_recipients WHERE mail_id = ?").run(mailId);
    const insertRecipient = conn.prepare("INSERT INTO mail_recipients (mail_id, user_id, kind) VALUES (?,?,?)");
    for (const uid of toIds || []) insertRecipient.run(mailId, uid, "to");
    for (const uid of ccIds || []) insertRecipient.run(mailId, uid, "cc");
  }
  return { mail: findMailById(mailId, userId) };
}

function sendDraft(mailId, userId) {
  const mail = conn.prepare("SELECT * FROM mails WHERE id = ?").get(mailId);
  if (!mail || !mail.is_draft || mail.from_user_id !== userId) return { error: "not_found" };
  const recipients = conn.prepare("SELECT user_id FROM mail_recipients WHERE mail_id = ?").all(mailId);
  if (recipients.length === 0) return { error: "no_recipients" };
  conn.prepare("UPDATE mails SET is_draft = 0, updated_at = ? WHERE id = ?").run(now(), mailId);
  conn.prepare("UPDATE mail_boxes SET box = 'sent' WHERE mail_id = ? AND user_id = ?").run(mailId, userId);
  const insertBox = conn.prepare(
    "INSERT INTO mail_boxes (id, mail_id, user_id, box, created_at) VALUES (?,?,?,?,?)"
  );
  for (const r of recipients) insertBox.run(id(), mailId, r.user_id, "inbox", now());
  return { mail: findMailById(mailId, userId) };
}

function markMailRead(mailId, userId) {
  conn
    .prepare("UPDATE mail_boxes SET read_at = ? WHERE mail_id = ? AND user_id = ? AND read_at IS NULL")
    .run(now(), mailId, userId);
}

function toggleMailStar(mailId, userId) {
  const box = conn.prepare("SELECT * FROM mail_boxes WHERE mail_id = ? AND user_id = ?").get(mailId, userId);
  if (!box) return null;
  conn
    .prepare("UPDATE mail_boxes SET starred = ? WHERE mail_id = ? AND user_id = ?")
    .run(box.starred ? 0 : 1, mailId, userId);
  return findMailById(mailId, userId);
}

// 받은편지함 항목은 휴지통으로, 이미 휴지통이면 완전 삭제한다.
function deleteMail(mailId, userId) {
  const box = conn.prepare("SELECT * FROM mail_boxes WHERE mail_id = ? AND user_id = ?").get(mailId, userId);
  if (!box) return { error: "not_found" };
  if (box.box === "trash") {
    conn.prepare("DELETE FROM mail_boxes WHERE mail_id = ? AND user_id = ?").run(mailId, userId);
    const remaining = conn.prepare("SELECT COUNT(*) AS n FROM mail_boxes WHERE mail_id = ?").get(mailId).n;
    if (remaining === 0) {
      conn.prepare("DELETE FROM mail_recipients WHERE mail_id = ?").run(mailId);
      conn.prepare("DELETE FROM mails WHERE id = ?").run(mailId);
    }
    return { ok: true };
  }
  conn.prepare("UPDATE mail_boxes SET box = 'trash' WHERE mail_id = ? AND user_id = ?").run(mailId, userId);
  return { ok: true };
}

function unreadMailCount(userId) {
  return conn
    .prepare("SELECT COUNT(*) AS n FROM mail_boxes WHERE user_id = ? AND box = 'inbox' AND read_at IS NULL")
    .get(userId).n;
}

module.exports = {
  ROLES,
  MODULES,
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  searchUsers,
  updateUserProfile,
  updateUserPassword,
  createPasswordResetToken,
  findValidResetToken,
  consumePasswordResetToken,
  updateUserRole,
  listRolePermissions,
  getRolePermission,
  setRolePermission,
  createNotification,
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createEntityLink,
  listLinksForEntity,
  deleteEntityLink,
  createSpace,
  findSpaceById,
  listSpacesForUser,
  isSpaceMember,
  addSpaceMembers,
  createProject,
  findProjectById,
  listProjectsForSpace,
  listProjectsForUser,
  isProjectMember,
  addProjectMembers,
  listTaskStatuses,
  createTaskStatus,
  renameTaskStatus,
  deleteTaskStatus,
  createTask,
  findTaskById,
  listTasksForProject,
  updateTask,
  moveTask,
  deleteTask,
  setTaskAssignees,
  listSubtasks,
  addSubtask,
  setSubtaskDone,
  deleteSubtask,
  findSubtaskById,
  listTaskComments,
  addTaskComment,
  searchTasks,
  listWikiTemplates,
  getWikiTemplateBlocks,
  createWikiPage,
  findWikiPageById,
  listWikiPagesForSpace,
  updateWikiPage,
  listWikiPageVersions,
  getWikiPageVersion,
  restoreWikiPageVersion,
  deleteWikiPage,
  listWikiBacklinks,
  searchWikiPages,
  CRM_STAGES,
  listCrmCustomFields,
  createCrmCustomField,
  deleteCrmCustomField,
  createCrmCustomer,
  findCrmCustomerById,
  listCrmCustomers,
  updateCrmCustomer,
  deleteCrmCustomer,
  setCrmCustomValue,
  createCrmLead,
  listCrmLeads,
  findCrmLeadById,
  moveCrmLead,
  deleteCrmLead,
  addCrmActivity,
  listCrmActivities,
  searchCrmCustomers,
  createFinanceTransaction,
  listFinanceTransactions,
  deleteFinanceTransaction,
  findFinanceTransactionById,
  financeSummary,
  createFinanceSubscription,
  listFinanceSubscriptions,
  setFinanceSubscriptionActive,
  deleteFinanceSubscription,
  createFinanceInvoice,
  listFinanceInvoices,
  findFinanceInvoiceById,
  setFinanceInvoiceStatus,
  deleteFinanceInvoice,
  listDashboardWidgets,
  createDashboardWidget,
  updateDashboardWidget,
  reorderDashboardWidgets,
  deleteDashboardWidget,
  listMyDueTasks,
  listRecentWikiPages,
  countNewLeadsThisWeek,
  createMail,
  findMailById,
  listMailbox,
  updateDraft,
  sendDraft,
  markMailRead,
  toggleMailStar,
  deleteMail,
  unreadMailCount,
  listChannelsForUser,
  findChannelById,
  findDmChannel,
  createChannel,
  isMember,
  addMembers,
  removeMember,
  markRead,
  setMuted,
  setFavorite,
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
  getChannelNote,
  setChannelNote,
  listChecklistItems,
  addChecklistItem,
  setChecklistItemDone,
  deleteChecklistItem,
  findChecklistItem,
};
