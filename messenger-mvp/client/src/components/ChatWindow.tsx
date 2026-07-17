import { useState } from "react";
import type { Attachment, Channel, Message, User } from "../types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ThreadPanel from "./ThreadPanel";
import ChannelMembersModal from "./ChannelMembersModal";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  channel: Channel | null;
  users: User[];
  messages: Message[];
  onlineUserIds: Set<string>;
  typingUserIds: Set<string>;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  onLoadMoreMessages: () => void;
  onSend: (channelId: string, content: string, opts?: { parentMessageId?: string; attachment?: Attachment }) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => void;
  onOpenThread: (messageId: string) => void;
  activeThreadParent: Message | null;
  threadReplies: Message[];
  onCloseThread: () => void;
  onAddMembers: (channelId: string, memberIds: string[]) => Promise<void>;
  onLeaveChannel: (channelId: string) => Promise<void>;
}

export default function ChatWindow({
  currentUser,
  channel,
  users,
  messages,
  onlineUserIds,
  typingUserIds,
  hasMoreMessages,
  loadingMoreMessages,
  onLoadMoreMessages,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onOpenThread,
  activeThreadParent,
  threadReplies,
  onCloseThread,
  onAddMembers,
  onLeaveChannel,
}: Props) {
  const [showMembers, setShowMembers] = useState(false);

  if (!channel) {
    return (
      <main className="chat-window empty-state">
        <div className="empty-state-card">
          <span className="empty-state-icon"><Icon name="sparkles" size={27} /></span>
          <h2>대화를 시작해보세요</h2>
          <p>왼쪽에서 채널이나 동료를 선택하면<br />메시지를 바로 주고받을 수 있어요.</p>
        </div>
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
          {channel.type === "group" && (
            <div className="chat-header-actions">
              <button className="icon-button chat-header-button" title="멤버 관리" onClick={() => setShowMembers(true)}>
                <Icon name="users" size={15} /> 멤버
              </button>
            </div>
          )}
        </header>

        <MessageList
          channel={channel}
          messages={messages}
          currentUserId={currentUser.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          onOpenThread={onOpenThread}
          hasMore={hasMoreMessages}
          loadingMore={loadingMoreMessages}
          onLoadMore={onLoadMoreMessages}
        />

        <div className="typing-indicator">
          {typingNames.length > 0 && `${typingNames.join(", ")}님이 입력 중...`}
        </div>

        <MessageInput
          channelId={channel.id}
          members={channel.members}
          onSend={(content, attachment) => onSend(channel.id, content, { attachment })}
        />
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

      {showMembers && (
        <ChannelMembersModal
          channel={channel}
          users={users}
          currentUserId={currentUser.id}
          onlineUserIds={onlineUserIds}
          onClose={() => setShowMembers(false)}
          onAddMembers={(memberIds) => onAddMembers(channel.id, memberIds)}
          onLeave={async () => {
            await onLeaveChannel(channel.id);
            setShowMembers(false);
          }}
        />
      )}
    </main>
  );
}
