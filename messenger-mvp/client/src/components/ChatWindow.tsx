import type { Attachment, Channel, Message, User } from "../types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ThreadPanel from "./ThreadPanel";

interface Props {
  currentUser: User;
  channel: Channel | null;
  messages: Message[];
  onlineUserIds: Set<string>;
  typingUserIds: Set<string>;
  onSend: (channelId: string, content: string, opts?: { parentMessageId?: string; attachment?: Attachment }) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => void;
  onOpenThread: (messageId: string) => void;
  activeThreadParent: Message | null;
  threadReplies: Message[];
  onCloseThread: () => void;
}

export default function ChatWindow({
  currentUser,
  channel,
  messages,
  onlineUserIds,
  typingUserIds,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onOpenThread,
  activeThreadParent,
  threadReplies,
  onCloseThread,
}: Props) {
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
      <div className="chat-main">
        <header className="chat-header">
          <div>
            <h2>{channel.type === "group" ? `# ${channel.name}` : channel.name}</h2>
            <span className="chat-subtitle">{subtitle}</span>
          </div>
        </header>

        <MessageList
          channel={channel}
          messages={messages}
          currentUserId={currentUser.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          onOpenThread={onOpenThread}
        />

        <div className="typing-indicator">
          {typingNames.length > 0 && `${typingNames.join(", ")}님이 입력 중...`}
        </div>

        <MessageInput channelId={channel.id} onSend={(content, attachment) => onSend(channel.id, content, { attachment })} />
      </div>

      {activeThreadParent && (
        <ThreadPanel
          channel={channel}
          currentUser={currentUser}
          parent={activeThreadParent}
          replies={threadReplies}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          onSendReply={(content, attachment) =>
            onSend(channel.id, content, { parentMessageId: activeThreadParent.id, attachment })
          }
          onClose={onCloseThread}
        />
      )}
    </main>
  );
}
