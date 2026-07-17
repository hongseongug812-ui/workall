import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Channel, Message, User } from "../types";
import Icon from "./Icon";

interface Props {
  channels: Channel[];
  currentUser: User;
  onClose: () => void;
  onSelectResult: (message: Message) => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SearchPanel({ channels, currentUser, onClose, onSelectResult }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .search(trimmed)
        .then(({ messages }) => {
          setResults(messages);
          setError(null);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : "검색에 실패했습니다."))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function channelLabel(channelId: string) {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return "알 수 없는 채널";
    return channel.type === "group" ? `# ${channel.name}` : channel.name;
  }

  function senderName(channelId: string, senderId: string) {
    if (senderId === currentUser.id) return "나";
    const channel = channels.find((c) => c.id === channelId);
    return channel?.members.find((m) => m.id === senderId)?.name || "알 수 없음";
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <Icon className="search-field-icon" name="search" size={17} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메시지 검색 (2자 이상)"
          />
          <button className="link-button" onClick={onClose}>
            <Icon name="close" size={14} /> 닫기
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {searching && <p className="sidebar-empty">검색 중...</p>}
        {!searching && query.trim().length >= 2 && results.length === 0 && !error && (
          <p className="sidebar-empty">검색 결과가 없습니다.</p>
        )}

        <ul className="search-results">
          {results.map((m) => (
            <li key={m.id}>
              <button className="search-result-item" onClick={() => onSelectResult(m)}>
                <div className="search-result-meta">
                  <span className="search-result-channel">{channelLabel(m.channelId)}</span>
                  <span className="search-result-sender">{senderName(m.channelId, m.senderId)}</span>
                  <span className="search-result-time">{formatDateTime(m.createdAt)}</span>
                </div>
                <div className="search-result-content">{m.content}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
