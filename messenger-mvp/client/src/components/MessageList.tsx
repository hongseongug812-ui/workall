import { useEffect, useRef } from "react";
import type { Channel, Message } from "../types";

interface Props {
  channel: Channel;
  messages: Message[];
  currentUserId: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default function MessageList({ channel, messages, currentUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const memberName = (id: string) => channel.members.find((m) => m.id === id)?.name || "알 수 없음";

  let lastDate = "";

  return (
    <div className="message-list">
      {messages.length === 0 && <p className="message-empty">아직 메시지가 없습니다. 첫 메시지를 보내보세요.</p>}
      {messages.map((m) => {
        const mine = m.senderId === currentUserId;
        const date = formatDate(m.createdAt);
        const showDateDivider = date !== lastDate;
        lastDate = date;
        return (
          <div key={m.id}>
            {showDateDivider && <div className="date-divider">{date}</div>}
            <div className={`message-row ${mine ? "mine" : ""}`}>
              {!mine && <div className="avatar small">{memberName(m.senderId).slice(0, 1)}</div>}
              <div className="message-bubble-wrap">
                {!mine && <div className="message-sender">{memberName(m.senderId)}</div>}
                <div className="message-bubble">{m.content}</div>
                <div className="message-time">{formatTime(m.createdAt)}</div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
