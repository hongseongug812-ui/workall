import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { getSocket } from "../socket";

interface Props {
  channelId: string;
  onSend: (content: string) => Promise<void>;
}

const TYPING_STOP_DELAY = 2000;

export default function MessageInput({ channelId, onSend }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    setValue("");
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

  async function submit() {
    const content = value.trim();
    if (!content || sending) return;
    setSending(true);
    stopTyping();
    try {
      await onSend(content);
      setValue("");
    } catch {
      // 실패 시 입력값을 보존해 재전송할 수 있게 둔다.
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="message-input">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={stopTyping}
        placeholder="메시지를 입력하세요 (Enter로 전송, Shift+Enter로 줄바꿈)"
        rows={2}
      />
      <button onClick={submit} disabled={!value.trim() || sending}>
        전송
      </button>
    </div>
  );
}
