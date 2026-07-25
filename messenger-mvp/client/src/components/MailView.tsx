import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Mail, MailBox, User } from "../types";
import Icon from "./Icon";
import NewMailModal from "./NewMailModal";
import MailDetailModal from "./MailDetailModal";

interface Props {
  currentUser: User;
  users: User[];
}

const BOXES: { key: MailBox; label: string; icon: "file" }[] = [
  { key: "inbox", label: "받은편지함", icon: "file" },
  { key: "sent", label: "보낸편지함", icon: "file" },
  { key: "draft", label: "임시보관함", icon: "file" },
  { key: "trash", label: "휴지통", icon: "file" },
];

function userName(users: User[], currentUser: User, id: string) {
  if (id === currentUser.id) return "나";
  return users.find((u) => u.id === id)?.name || "알 수 없음";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function MailView({ currentUser, users }: Props) {
  const [box, setBox] = useState<MailBox>("inbox");
  const [mails, setMails] = useState<Mail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeMailId, setActiveMailId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Mail | null>(null);

  const refresh = useCallback((targetBox: MailBox) => {
    api.listMail(targetBox).then((res) => {
      setMails(res.mails);
      setUnreadCount(res.unreadCount);
    });
  }, []);

  useEffect(() => {
    refresh(box);
  }, [box, refresh]);

  const activeMail = mails.find((m) => m.id === activeMailId) || null;

  async function openMail(mail: Mail) {
    setActiveMailId(mail.id);
    const { mail: fresh } = await api.getMail(mail.id);
    setMails((prev) => prev.map((m) => (m.id === fresh.id ? fresh : m)));
    if (box === "inbox" && !mail.readAt) refresh(box);
  }

  async function handleSend(data: { subject: string; body: string; toIds: string[]; ccIds: string[] }) {
    if (editingDraft) {
      await api.updateMailDraft(editingDraft.id, data);
      await api.sendMailDraft(editingDraft.id);
    } else {
      await api.createMail({ ...data, draft: false });
    }
    setShowCompose(false);
    setEditingDraft(null);
    setBox("sent");
  }

  async function handleSaveDraft(data: { subject: string; body: string; toIds: string[]; ccIds: string[] }) {
    if (editingDraft) {
      await api.updateMailDraft(editingDraft.id, data);
    } else {
      await api.createMail({ ...data, draft: true });
    }
    setShowCompose(false);
    setEditingDraft(null);
    setBox("draft");
  }

  async function handleToggleStar(mailId: string) {
    const { mail } = await api.starMail(mailId);
    setMails((prev) => prev.map((m) => (m.id === mailId ? mail : m)));
  }

  async function handleDelete(mailId: string) {
    await api.deleteMail(mailId);
    setActiveMailId(null);
    refresh(box);
  }

  return (
    <div className="projects-view">
      <div className="projects-sidebar">
        <div className="projects-sidebar-header">
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setEditingDraft(null); setShowCompose(true); }}>
            <Icon name="plus" size={14} /> 메일 쓰기
          </button>
        </div>
        <ul className="project-list">
          {BOXES.map((b) => (
            <li key={b.key}>
              <button className={`project-list-item ${box === b.key ? "active" : ""}`} onClick={() => setBox(b.key)}>
                <Icon name={b.icon} size={14} />
                {b.label}
                {b.key === "inbox" && unreadCount > 0 && <span className="badge mail-unread-badge">{unreadCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="projects-main">
        <div className="projects-main-header">
          <h2>{BOXES.find((b) => b.key === box)?.label}</h2>
        </div>

        <ul className="mail-list">
          {mails.length === 0 && <p className="sidebar-empty">메일이 없습니다.</p>}
          {mails.map((m) => (
            <li
              key={m.id}
              className={`mail-list-item ${!m.readAt && box === "inbox" ? "unread" : ""}`}
              onClick={() => (m.isDraft ? (setEditingDraft(m), setShowCompose(true)) : openMail(m))}
            >
              <button
                className={`mail-star ${m.starred ? "on" : ""}`}
                onClick={(e) => { e.stopPropagation(); handleToggleStar(m.id); }}
              >
                <Icon name="star" size={14} />
              </button>
              <span className="mail-list-person">
                {box === "sent" || box === "draft"
                  ? m.recipients.filter((r) => r.kind === "to").map((r) => userName(users, currentUser, r.userId)).join(", ") || "(받는사람 없음)"
                  : userName(users, currentUser, m.fromUserId)}
              </span>
              <span className="mail-list-subject">
                {m.isDraft && <span className="mail-draft-tag">임시</span>}
                {m.subject || "(제목 없음)"}
                <span className="mail-list-preview"> - {m.body.replace(/\n/g, " ").slice(0, 40)}</span>
              </span>
              <span className="mail-list-date">{formatDate(m.updatedAt)}</span>
            </li>
          ))}
        </ul>
      </div>

      {showCompose && (
        <NewMailModal
          users={users}
          currentUser={currentUser}
          draftToEdit={editingDraft || undefined}
          onCancel={() => { setShowCompose(false); setEditingDraft(null); }}
          onSend={handleSend}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {activeMail && (
        <MailDetailModal
          mail={activeMail}
          users={users}
          currentUser={currentUser}
          onClose={() => setActiveMailId(null)}
          onToggleStar={() => handleToggleStar(activeMail.id)}
          onDelete={() => handleDelete(activeMail.id)}
        />
      )}
    </div>
  );
}
