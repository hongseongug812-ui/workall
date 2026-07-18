import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Attachment, Channel, ChannelNote, ChecklistItem, Message, User, UserStatus } from "../types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ThreadPanel from "./ThreadPanel";
import ChannelMembersModal from "./ChannelMembersModal";
import ChannelInfoPanel from "./ChannelInfoPanel";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  channel: Channel | null;
  users: User[];
  messages: Message[];
  pinnedMessages: Message[];
  channelNote: ChannelNote | undefined;
  checklistItems: ChecklistItem[];
  onlineUserIds: Set<string>;
  statusesByUser: Record<string, UserStatus>;
  typingUserIds: Set<string>;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  onLoadMoreMessages: () => void;
  onSend: (channelId: string, content: string, opts?: { parentMessageId?: string; attachment?: Attachment }) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onOpenThread: (messageId: string) => void;
  activeThreadParent: Message | null;
  threadReplies: Message[];
  onCloseThread: () => void;
  onAddMembers: (channelId: string, memberIds: string[]) => Promise<void>;
  onLeaveChannel: (channelId: string) => Promise<void>;
  onSetMuted: (channelId: string, muted: boolean) => Promise<void>;
  onNoteChange: (channelId: string, content: string) => void;
  onAddChecklistItem: (channelId: string, text: string) => void;
  onToggleChecklistItem: (channelId: string, itemId: string, done: boolean) => void;
  onDeleteChecklistItem: (channelId: string, itemId: string) => void;
}

const STATUS_LABEL: Record<string, string> = { online: "온라인", away: "자리비움", dnd: "방해금지" };

export default function ChatWindow({
  currentUser,
  channel,
  users,
  messages,
  pinnedMessages,
  channelNote,
  checklistItems,
  onlineUserIds,
  statusesByUser,
  typingUserIds,
  hasMoreMessages,
  loadingMoreMessages,
  onLoadMoreMessages,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onForward,
  onOpenThread,
  activeThreadParent,
  threadReplies,
  onCloseThread,
  onAddMembers,
  onLeaveChannel,
  onSetMuted,
  onNoteChange,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: Props) {
  const [showMembers, setShowMembers] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const dragDepthRef = useRef(0);

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setDroppedFile(file);
  }

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
  const dmStatus = dmPartner ? statusesByUser[dmPartner.id] : undefined;
  const dmOnline = dmPartner ? onlineUserIds.has(dmPartner.id) : false;

  let subtitle: string;
  if (channel.type === "dm") {
    if (!dmOnline) subtitle = "오프라인";
    else if (dmStatus?.statusMessage) subtitle = dmStatus.statusMessage;
    else if (dmStatus && dmStatus.status !== "online") subtitle = STATUS_LABEL[dmStatus.status];
    else subtitle = "온라인";
  } else {
    subtitle = `멤버 ${channel.members.length}명`;
  }

  const typingNames = [...typingUserIds]
    .filter((id) => id !== currentUser.id)
    .map((id) => channel.members.find((m) => m.id === id)?.name)
    .filter(Boolean);

  function handleOpenThread(messageId: string) {
    setShowInfo(false);
    onOpenThread(messageId);
  }

  function toggleInfoPanel() {
    if (!showInfo) onCloseThread();
    setShowInfo((v) => !v);
  }

  return (
    <main className="chat-window">
      <div
        className={`chat-main ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="drop-overlay">
            <span className="drop-overlay-label">
              <Icon name="attach" size={28} />
              여기에 파일을 놓아 첨부하세요
            </span>
          </div>
        )}
        <header className="chat-header">
          <div>
            <h2>{channel.type === "group" ? `# ${channel.name}` : channel.name}</h2>
            <span className="chat-subtitle">{subtitle}</span>
          </div>
          <div className="chat-header-actions">
            <button
              className={`icon-button chat-header-button ${showInfo ? "active" : ""}`}
              title="채널 정보"
              onClick={toggleInfoPanel}
            >
              <Icon name="info" size={15} />
              {pinnedMessages.length > 0 && <span>{pinnedMessages.length}</span>}
            </button>
            <button
              className="icon-button chat-header-button"
              title={channel.muted ? "알림 켜기" : "알림 끄기"}
              onClick={() => onSetMuted(channel.id, !channel.muted)}
            >
              <Icon name={channel.muted ? "bellOff" : "bell"} size={15} />
            </button>
            {channel.type === "group" && (
              <button className="icon-button chat-header-button" title="멤버 관리" onClick={() => setShowMembers(true)}>
                <Icon name="users" size={15} /> 멤버
              </button>
            )}
          </div>
        </header>

        <MessageList
          channel={channel}
          messages={messages}
          currentUserId={currentUser.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          onOpenThread={handleOpenThread}
          onPin={onPin}
          onForward={onForward}
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
          externalFile={droppedFile}
          onExternalFileConsumed={() => setDroppedFile(null)}
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

      {showInfo && !activeThreadParent && (
        <ChannelInfoPanel
          channel={channel}
          pinnedMessages={pinnedMessages}
          note={channelNote}
          checklistItems={checklistItems}
          onClose={() => setShowInfo(false)}
          onUnpin={onPin}
          onNoteChange={(content) => onNoteChange(channel.id, content)}
          onAddChecklistItem={(text) => onAddChecklistItem(channel.id, text)}
          onToggleChecklistItem={(itemId, done) => onToggleChecklistItem(channel.id, itemId, done)}
          onDeleteChecklistItem={(itemId) => onDeleteChecklistItem(channel.id, itemId)}
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
