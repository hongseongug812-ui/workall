import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { User, WikiPageVersion } from "../types";
import Icon from "./Icon";

interface Props {
  pageId: string;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onRestored: () => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function WikiVersionHistoryPanel({ pageId, users, currentUser, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<WikiPageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  function editorName(userId: string) {
    if (userId === currentUser.id) return "나";
    return users.find((u) => u.id === userId)?.name || "알 수 없음";
  }

  useEffect(() => {
    api
      .listWikiVersions(pageId)
      .then(({ versions: list }) => setVersions(list))
      .catch((err) => setError(err instanceof ApiError ? err.message : "히스토리를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [pageId]);

  async function handleRestore(versionId: string) {
    if (!confirm("이 버전으로 되돌릴까요? 현재 내용은 새 버전으로 보관됩니다.")) return;
    setRestoringId(versionId);
    try {
      await api.restoreWikiVersion(pageId, versionId);
      onRestored();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "복원에 실패했습니다.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>버전 히스토리</h3>
          <button className="link-button" onClick={onClose}>
            <Icon name="close" size={14} /> 닫기
          </button>
        </div>

        {loading && <p className="sidebar-empty">불러오는 중...</p>}
        {error && <p className="auth-error">{error}</p>}
        {!loading && versions.length === 0 && <p className="sidebar-empty">저장된 이전 버전이 없습니다.</p>}

        <ul className="wiki-version-list">
          {versions.map((v) => (
            <li key={v.id} className="wiki-version-row">
              <div>
                <div>{v.title}</div>
                <div className="notification-time">{editorName(v.editedBy)} · {formatDateTime(v.createdAt)}</div>
              </div>
              <button disabled={restoringId === v.id} onClick={() => handleRestore(v.id)}>
                {restoringId === v.id ? "복원 중..." : "이 버전으로 복원"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
