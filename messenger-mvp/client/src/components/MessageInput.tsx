import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { getSocket } from "../socket";
import { api } from "../api";
import type { Attachment } from "../types";

interface Props {
  channelId: string;
  onSend: (content: string, attachment?: Attachment) => Promise<void>;
}

const TYPING_STOP_DELAY = 2000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default function MessageInput({ channelId, onSend }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    setPendingFile(null);
    setError(null);
    isTypingRef.current = false;
  }, [channelId]);

  function stopTyping() {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket().emit("typing", { channelId, isTyping: false });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }

  function handleChange(next: string) {
    setValue(next);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit("typing", { channelId, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_STOP_DELAY);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="message-input-area">
      {pendingFile && (
        <div className="pending-file">
          📎 {pendingFile.name} ({(pendingFile.size / 1024).toFixed(0)}KB)
          <button type="button" onClick={() => setPendingFile(null)}>
            ✕
          </button>
        </div>
      )}
      {error && <p className="auth-error">{error}</p>}
      <div className="message-input">
        <input ref={fileInputRef} type="file" hidden onChange={handleFilePick} />
        <button
          type="button"
          className="attach-button"
          title="파일 첨부"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder="메시지를 입력하세요 (Enter로 전송, Shift+Enter로 줄바꿈)"
          rows={2}
        />
        <button onClick={submit} disabled={(!value.trim() && !pendingFile) || sending}>
          {uploading ? "업로드 중..." : "전송"}
        </button>
      </div>
    </div>
  );
}
