import { useEffect, useState } from "react";
import type { Channel, ChannelNote, ChecklistItem, Message } from "../types";
import Icon from "./Icon";

interface Props {
  channel: Channel;
  pinnedMessages: Message[];
  note: ChannelNote | undefined;
  checklistItems: ChecklistItem[];
  onClose: () => void;
  onUnpin: (messageId: string) => void;
  onNoteChange: (content: string) => void;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string, done: boolean) => void;
  onDeleteChecklistItem: (itemId: string) => void;
}

export default function ChannelInfoPanel({
  channel,
  pinnedMessages,
  note,
  checklistItems,
  onClose,
  onUnpin,
  onNoteChange,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: Props) {
  const [noteDraft, setNoteDraft] = useState(note?.content || "");
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    setNoteDraft(note?.content || "");
  }, [channel.id, note?.content]);

  function submitNote() {
    if (noteDraft !== (note?.content || "")) onNoteChange(noteDraft);
  }

  function submitNewItem() {
    const text = newItemText.trim();
    if (!text) return;
    onAddChecklistItem(text);
    setNewItemText("");
  }

  const memberName = (id: string) => channel.members.find((m) => m.id === id)?.name || "알 수 없음";
  const doneCount = checklistItems.filter((i) => i.done).length;

  return (
    <aside className="channel-info-panel">
      <header className="channel-info-header">
        <h3>채널 정보</h3>
        <button className="icon-button" onClick={onClose} title="닫기">
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="channel-info-body">
        <section className="channel-info-section">
          <h4>
            <Icon name="pin" size={13} /> 고정된 메시지
          </h4>
          {pinnedMessages.length === 0 && <p className="channel-info-empty">고정된 메시지가 없습니다.</p>}
          <ul className="channel-info-pinned-list">
            {pinnedMessages.map((m) => (
              <li key={m.id}>
                <span className="channel-info-pinned-sender">{memberName(m.senderId)}</span>
                <span className="channel-info-pinned-content">
                  {m.content || (m.attachment ? `[파일] ${m.attachment.name}` : "")}
                </span>
                <button className="link-button" onClick={() => onUnpin(m.id)}>
                  해제
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="channel-info-section">
          <h4>
            <Icon name="edit" size={13} /> 노트
          </h4>
          <textarea
            className="channel-info-note"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={submitNote}
            placeholder="이 채널에 공유할 메모를 남겨보세요."
            rows={5}
          />
        </section>

        <section className="channel-info-section">
          <h4>
            <Icon name="checkDouble" size={13} /> 체크리스트
            {checklistItems.length > 0 && (
              <span className="channel-info-count">
                {doneCount}/{checklistItems.length}
              </span>
            )}
          </h4>
          <ul className="channel-info-checklist">
            {checklistItems.map((item) => (
              <li key={item.id} className={item.done ? "done" : ""}>
                <button
                  className="checklist-check"
                  onClick={() => onToggleChecklistItem(item.id, !item.done)}
                  title={item.done ? "완료 취소" : "완료 처리"}
                >
                  {item.done && <Icon name="check" size={12} />}
                </button>
                <span className="checklist-text">{item.text}</span>
                <button className="checklist-delete" onClick={() => onDeleteChecklistItem(item.id)} title="삭제">
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
          <div className="channel-info-add-item">
            <input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewItem();
              }}
              placeholder="할 일 추가"
            />
            <button onClick={submitNewItem} title="추가">
              <Icon name="plus" size={14} />
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
