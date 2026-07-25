import type { Mail, User } from "../types";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface Props {
  mail: Mail;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onEditDraft?: () => void;
}

function userName(users: User[], currentUser: User, id: string) {
  if (id === currentUser.id) return "나";
  return users.find((u) => u.id === id)?.name || "알 수 없음";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MailDetailModal({ mail, users, currentUser, onClose, onToggleStar, onDelete, onEditDraft }: Props) {
  const from = mail.fromUserId === currentUser.id ? currentUser : users.find((u) => u.id === mail.fromUserId);
  const toNames = mail.recipients.filter((r) => r.kind === "to").map((r) => userName(users, currentUser, r.userId));
  const ccNames = mail.recipients.filter((r) => r.kind === "cc").map((r) => userName(users, currentUser, r.userId));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>메일</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="link-button" onClick={onToggleStar}>
              <Icon name="star" size={14} /> {mail.starred ? "즐겨찾기 해제" : "즐겨찾기"}
            </button>
            {mail.isDraft && onEditDraft && (
              <button className="link-button" onClick={onEditDraft}>
                <Icon name="edit" size={14} /> 편집
              </button>
            )}
            <button className="link-button" onClick={onDelete}>
              <Icon name="trash" size={14} /> {mail.box === "trash" ? "완전 삭제" : "삭제"}
            </button>
            <button className="link-button" onClick={onClose}>
              <Icon name="close" size={14} /> 닫기
            </button>
          </div>
        </div>

        <div className="mail-detail-header">
          <div className="mail-detail-subject">{mail.subject || "(제목 없음)"}</div>
          <div className="mail-detail-meta">
            <Avatar name={from?.name || "?"} avatarUrl={from?.avatarUrl} size={30} />
            <div>
              <div><strong>{from?.id === currentUser.id ? "나" : from?.name || "알 수 없음"}</strong></div>
              <div className="notification-time">
                받는사람 {toNames.join(", ") || "-"}
                {ccNames.length > 0 && <> · 참조 {ccNames.join(", ")}</>}
              </div>
            </div>
            <span className="notification-time mail-detail-date">{formatDateTime(mail.createdAt)}</span>
          </div>
        </div>

        <div className="mail-detail-body">{mail.body || <span className="sidebar-empty">내용이 없습니다.</span>}</div>
      </div>
    </div>
  );
}
