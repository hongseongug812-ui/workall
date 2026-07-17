import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Channel, Message } from "../types";
import { API_BASE } from "../api";
import { MessageContent } from "../linkify";
import Icon from "./Icon";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const IMAGE_MIME_RE = /^image\//;

interface Props {
  channel: Channel;
  messages: Message[];
  currentUserId: string;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => void;
  onOpenThread?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function MessageList({
  channel,
  messages,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onOpenThread,
  onPin,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevFirstIdRef = useRef<string | undefined>(undefined);
  const prevLastIdRef = useRef<string | undefined>(undefined);
  const prevScrollHeightRef = useRef(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);

  // 새 메시지가 뒤에 붙으면 맨 아래로, 이전 메시지가 앞에 붙으면(더 불러오기)
  // 스크롤 위치를 시각적으로 유지한다.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const firstId = messages[0]?.id;
    const lastId = messages[messages.length - 1]?.id;

    if (lastId !== prevLastIdRef.current) {
      container.scrollTop = container.scrollHeight;
    } else if (firstId !== prevFirstIdRef.current) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
    }

    prevFirstIdRef.current = firstId;
    prevLastIdRef.current = lastId;
    prevScrollHeightRef.current = container.scrollHeight;
  }, [messages]);

  const memberName = (id: string) => channel.members.find((m) => m.id === id)?.name || "알 수 없음";
  const memberNames = channel.members.map((m) => m.name);
  const currentUserName = memberName(currentUserId);

  function startEdit(m: Message) {
    setEditingId(m.id);
    setEditValue(m.content || "");
  }

  async function submitEdit(messageId: string) {
    const content = editValue.trim();
    if (!content) return;
    await onEdit(messageId, content);
    setEditingId(null);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, messageId: string) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit(messageId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  let lastDate = "";

  return (
    <div className="message-list" ref={containerRef} onClick={() => setReactionPickerFor(null)}>
      {hasMore && (
        <div className="load-more-row">
          <button className="load-more-button" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "불러오는 중..." : "이전 메시지 더 보기"}
          </button>
        </div>
      )}
      {messages.length === 0 && <p className="message-empty">아직 메시지가 없습니다. 첫 메시지를 보내보세요.</p>}
      {messages.map((m) => {
        const mine = m.senderId === currentUserId;
        const date = formatDate(m.createdAt);
        const showDateDivider = date !== lastDate;
        lastDate = date;
        const deleted = !!m.deletedAt;
        const isEditing = editingId === m.id;

        return (
          <div key={m.id}>
            {showDateDivider && <div className="date-divider">{date}</div>}
            <div className={`message-row ${mine ? "mine" : ""}`}>
              {!mine && <div className="avatar small">{memberName(m.senderId).slice(0, 1)}</div>}
              <div className="message-bubble-wrap">
                {!mine && <div className="message-sender">{memberName(m.senderId)}</div>}
                {m.pinnedAt && (
                  <div className="pinned-badge">
                    <Icon name="pin" size={11} /> 고정됨
                  </div>
                )}

                {isEditing ? (
                  <div className="message-edit-box">
                    <textarea
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, m.id)}
                      rows={2}
                    />
                    <div className="message-edit-actions">
                      <button type="button" onClick={() => setEditingId(null)}>
                        취소
                      </button>
                      <button type="button" onClick={() => submitEdit(m.id)}>
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`message-bubble ${deleted ? "deleted" : ""}`}>
                    {deleted ? (
                      "삭제된 메시지입니다"
                    ) : (
                      <>
                        {m.attachment && (
                          <div className="attachment">
                            {IMAGE_MIME_RE.test(m.attachment.mime) ? (
                              <a href={`${API_BASE}${m.attachment.url}`} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={`${API_BASE}${m.attachment.url}`}
                                  alt={m.attachment.name}
                                  className="attachment-image"
                                />
                              </a>
                            ) : (
                              <a
                                className="attachment-file"
                                href={`${API_BASE}${m.attachment.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Icon name="file" size={16} /> {m.attachment.name}
                                <span className="attachment-size">{formatSize(m.attachment.size)}</span>
                              </a>
                            )}
                          </div>
                        )}
                        {m.content && (
                          <div className="message-text">
                            <MessageContent text={m.content} memberNames={memberNames} currentUserName={currentUserName} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!deleted && !isEditing && (
                  <div className="message-meta-row">
                    <span className="message-time">{formatTime(m.createdAt)}</span>
                    {m.editedAt && <span className="message-edited">(수정됨)</span>}
                  </div>
                )}

                {!deleted && m.reactions.length > 0 && (
                  <div className="reaction-row">
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        className={`reaction-pill ${r.reactedByMe ? "mine" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReact(m.id, r.emoji);
                        }}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}

                {!deleted && !isEditing && (
                  <div className="message-hover-actions">
                    <div className="reaction-picker-wrap">
                      <button
                        title="반응 추가"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReactionPickerFor(reactionPickerFor === m.id ? null : m.id);
                        }}
                      >
                        <Icon name="smile" size={15} />
                      </button>
                      {reactionPickerFor === m.id && (
                        <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                onReact(m.id, emoji);
                                setReactionPickerFor(null);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {onOpenThread && (
                      <button title="스레드로 답장" onClick={() => onOpenThread(m.id)}>
                        <Icon name="message" size={15} />
                        {m.replyCount > 0 ? <span>{m.replyCount}</span> : null}
                      </button>
                    )}
                    {onPin && (
                      <button title={m.pinnedAt ? "고정 해제" : "메시지 고정"} onClick={() => onPin(m.id)}>
                        <Icon name="pin" size={15} />
                      </button>
                    )}
                    {mine && (
                      <button title="수정" onClick={() => startEdit(m)}>
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                    {mine && (
                      <button
                        title="삭제"
                        onClick={() => {
                          if (confirm("이 메시지를 삭제할까요?")) onDelete(m.id);
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                )}

                {onOpenThread && m.replyCount > 0 && (
                  <button className="thread-summary" onClick={() => onOpenThread(m.id)}>
                    <Icon name="message" size={14} /> {m.replyCount}개 답장
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
