import { useState } from "react";
import type { PresenceStatus, UserStatus } from "../types";

interface Props {
  status: UserStatus;
  onChange: (status: PresenceStatus, statusMessage: string | null) => void;
}

const OPTIONS: { value: PresenceStatus; label: string; dotClass: string }[] = [
  { value: "online", label: "온라인", dotClass: "online" },
  { value: "away", label: "자리비움", dotClass: "away" },
  { value: "dnd", label: "방해금지", dotClass: "dnd" },
];

export default function StatusPicker({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState(status.statusMessage || "");

  const current = OPTIONS.find((o) => o.value === status.status) || OPTIONS[0];

  function selectStatus(value: PresenceStatus) {
    onChange(value, draftMessage.trim() || null);
    setOpen(false);
  }

  function saveMessage() {
    onChange(status.status, draftMessage.trim() || null);
    setOpen(false);
  }

  return (
    <div className="status-picker-wrap">
      <button className="status-picker-trigger" onClick={() => setOpen((v) => !v)} title="상태 변경">
        <span className={`presence-dot status-${status.status}`} />
        <span className="status-picker-label">{status.statusMessage || current.label}</span>
      </button>
      {open && (
        <div className="status-picker-popover" onClick={(e) => e.stopPropagation()}>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`status-option ${status.status === o.value ? "active" : ""}`}
              onClick={() => selectStatus(o.value)}
            >
              <span className={`presence-dot status-${o.value}`} />
              {o.label}
            </button>
          ))}
          <input
            className="status-message-input"
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            placeholder="상태 메시지 (예: 회의중)"
            maxLength={60}
            onKeyDown={(e) => e.key === "Enter" && saveMessage()}
          />
          <button className="status-message-save" onClick={saveMessage}>
            저장
          </button>
        </div>
      )}
    </div>
  );
}
