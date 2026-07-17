import type { Channel, Message, User } from "../types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface Props {
  currentUser: User;
  channel: Channel | null;
  messages: Message[];
  onlineUserIds: Set<string>;
  typingUserIds: Set<string>;
  onSend: (channelId: string, content: string) => Promise<void>;
}

export default function ChatWindow({ currentUser, channel, messages, onlineUserIds, typingUserIds, onSend }: Props) {
  if (!channel) {
    return (
      <main className="chat-window empty-state">
        <p>왼쪽에서 채널이나 동료를 선택해 대화를 시작하세요.</p>
      </main>
    );
  }

  const otherMembers = channel.members.filter((m) => m.id !== currentUser.id);
  const dmPartner = otherMembers[0];
  const subtitle =
    channel.type === "dm"
      ? dmPartner && onlineUserIds.has(dmPartner.id)
        ? "온라인"
        : "오프라인"
      : `멤버 ${channel.members.length}명`;

  const typingNames = [...typingUserIds]
    .filter((id) => id !== currentUser.id)
    .map((id) => channel.members.find((m) => m.id === id)?.name)
    .filter(Boolean);

  return (
    <main className="chat-window">
      <header className="chat-header">
        <div>
          <h2>{channel.type === "group" ? `# ${channel.name}` : channel.name}</h2>
          <span className="chat-subtitle">{subtitle}</span>
        </div>
      </header>

      <MessageList channel={channel} messages={messages} currentUserId={currentUser.id} />

      <div className="typing-indicator">
        {typingNames.length > 0 && `${typingNames.join(", ")}님이 입력 중...`}
      </div>

      <MessageInput channelId={channel.id} onSend={(content) => onSend(channel.id, content)} />
    </main>
  );
}
