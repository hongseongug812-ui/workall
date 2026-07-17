import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { getSocket } from "../socket";
import { api } from "../api";
import type { Attachment, User } from "../types";
import Icon from "./Icon";

interface Props {
  channelId: string;
  members: User[];
  onSend: (content: string, attachment?: Attachment) => Promise<void>;
}

const TYPING_STOP_DELAY = 2000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MENTION_RE = /(?:^|\s)@([^\s@]*)$/;

export default function MessageInput({ channelId, members, onSend }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue("");
    setPendingFile(null);
    setError(null);
    setMentionQuery(null);
    isTypingRef.current = false;
  }, [channelId]);

  const mentionMatches = mentionQuery === null
    ? []
    : members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);

  function stopTyping() {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket().emit("typing", { channelId, isTyping: false });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }

  function handleChange(next: string, cursor: number) {
    setValue(next);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit("typing", { channelId, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_STOP_DELAY);

    const before = next.slice(0, cursor);
    const match = MENTION_RE.exec(before);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[1].length - 1);
      setMentionActiveIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function selectMention(name: string) {
    const cursor = mentionStart + 1 + (mentionQuery?.length || 0);
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const next = `${before}@${name} ${after}`;
    setValue(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = before.length + name.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError("파일이 너무 큽니다 (최대 20MB).");
      return;
    }
    setError(null);
    setPendingFile(file);
  }

  async function submit() {
    const content = value.trim();
    if (!content && !pendingFile) return;
    if (sending || uploading) return;

    setSending(true);
    stopTyping();
    setError(null);
    try {
      let attachment: Attachment | undefined;
      if (pendingFile) {
        setUploading(true);
        attachment = await api.uploadFile(pendingFile);
        setUploading(false);
      }
      await onSend(content, attachment);
      setValue("");
      setPendingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "전송에 실패했습니다.");
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionActiveIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionActiveIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionMatches[mentionActiveIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="message-input-area">
      {pendingFile && (
        <div className="pending-file">
          <Icon name="file" size={14} />
          <span>{pendingFile.name} ({(pendingFile.size / 1024).toFixed(0)}KB)</span>
          <button aria-label="첨부 파일 제거" type="button" onClick={() => setPendingFile(null)}>
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
      {error && <p className="auth-error">{error}</p>}
      <div className="message-input">
        <input ref={fileInputRef} type="file" hidden onChange={handleFilePick} />
        <button
          aria-label="파일 첨부"
          type="button"
          className="attach-button"
          title="파일 첨부"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="attach" size={19} />
        </button>
        <div className="textarea-wrap">
          {mentionQuery !== null && mentionMatches.length > 0 && (
            <div className="mention-autocomplete">
              {mentionMatches.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mention-autocomplete-item ${i === mentionActiveIndex ? "active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(m.name);
                  }}
                  onMouseEnter={() => setMentionActiveIndex(i)}
                >
                  <span>{m.name}</span>
                  <span className="member-dept">{m.department}</span>
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value, e.target.selectionStart)}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            placeholder="메시지를 입력하세요 (@이름으로 멘션, Enter로 전송, Shift+Enter로 줄바꿈)"
            rows={2}
          />
        </div>
        <button onClick={submit} disabled={(!value.trim() && !pendingFile) || sending}>
          {!uploading && <Icon name="send" size={16} />}
          {uploading ? "업로드 중..." : "전송"}
        </button>
      </div>
    </div>
  );
}
