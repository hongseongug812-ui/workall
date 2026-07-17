import type { Attachment, Channel, Message, User } from "../types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface Props {
  channel: Channel;
  currentUser: User;
  parent: Message;
  replies: Message[];
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => void;
  onSendReply: (content: string, attachment?: Attachment) => Promise<void>;
  onClose: () => void;
}

export default function ThreadPanel({
  channel,
  currentUser,
  parent,
  replies,
  onEdit,
  onDelete,
  onReact,
  onSendReply,
  onClose,
}: Props) {
  return (
    <aside className="thread-panel">
      <header className="thread-header">
        <span>스레드</span>
        <button className="link-button" onClick={onClose}>
          ✕ 닫기
        </button>
      </header>
      <div className="thread-parent">
        <MessageList
          channel={channel}
          messages={[parent]}
          currentUserId={currentUser.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
        />
      </div>
      <div className="thread-divider">{replies.length}개 답장</div>
      <div className="thread-replies">
        <MessageList
          channel={channel}
          messages={replies}
          currentUserId={currentUser.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
        />
      </div>
      <MessageInput channelId={channel.id} onSend={onSendReply} />
    </aside>
  );
}
