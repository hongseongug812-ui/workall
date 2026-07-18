import { useState } from "react";
import type { Channel } from "../types";
import Icon from "./Icon";

interface Props {
  channels: Channel[];
  onClose: () => void;
  onForward: (targetChannelIds: string[]) => Promise<void>;
}

export default function ForwardModal({ channels, onClose, onForward }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      await onForward([...selected]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "전달에 실패했습니다.");
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>메시지 전달</h3>
          <button className="link-button" onClick={onClose}>
            <Icon name="close" size={14} /> 닫기
          </button>
        </div>

        <div className="modal-member-list">
          {channels.map((c) => (
            <label key={c.id} className="modal-member-item">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              {c.type === "group" ? `# ${c.name}` : c.name}
            </label>
          ))}
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={sending}>
            취소
          </button>
          <button type="button" onClick={handleSubmit} disabled={selected.size === 0 || sending}>
            {sending ? "전달 중..." : `전달 (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
