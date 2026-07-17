import { useState } from "react";
import type { Channel, User } from "../types";
import Icon from "./Icon";

interface Props {
  channel: Channel;
  users: User[];
  currentUserId: string;
  onlineUserIds: Set<string>;
  onClose: () => void;
  onAddMembers: (memberIds: string[]) => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function ChannelMembersModal({
  channel,
  users,
  currentUserId,
  onlineUserIds,
  onClose,
  onAddMembers,
  onLeave,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(channel.members.map((m) => m.id));
  const invitable = users.filter((u) => !memberIds.has(u.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    setError(null);
    try {
      await onAddMembers([...selected]);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "멤버 추가에 실패했습니다.");
    } finally {
      setAdding(false);
    }
  }

  async function handleLeave() {
    if (!confirm("이 채널에서 나가시겠어요?")) return;
    setLeaving(true);
    setError(null);
    try {
      await onLeave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "나가기에 실패했습니다.");
      setLeaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal member-list-modal" onClick={(e) => e.stopPropagation()}>
        <h3># {channel.name}</h3>

        <div>
          <div className="sidebar-section-header">
            <span>멤버 {channel.members.length}명</span>
          </div>
          <ul className="modal-member-list">
            {channel.members.map((m) => (
              <li key={m.id} className="member-row">
                <span>
                  <span className={`presence-dot ${onlineUserIds.has(m.id) ? "online" : ""}`} />
                  {m.name}
                  {m.id === currentUserId ? " (나)" : ""}
                  <span className="member-dept"> · {m.department}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {invitable.length > 0 && (
          <div>
            <div className="sidebar-section-header">
              <span>새 멤버 초대</span>
            </div>
            <div className="modal-member-list">
              {invitable.map((u) => (
                <label key={u.id} className="modal-member-item">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                  {u.name} <span className="member-dept">({u.department})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="leave-channel-button" onClick={handleLeave} disabled={leaving}>
            <Icon name="close" size={13} /> {leaving ? "나가는 중..." : "채널 나가기"}
          </button>
          <div style={{ flex: 1 }} />
          {invitable.length > 0 && (
            <button type="button" onClick={handleAdd} disabled={selected.size === 0 || adding}>
              {adding ? "추가 중..." : `초대 (${selected.size})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
