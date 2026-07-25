import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import type { DriveFile, DriveFolder, Space, User } from "../types";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  users: User[];
}

function formatSize(bytes: number | null) {
  if (bytes === null) return "-";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function FolderTree({
  folders,
  parentId,
  activeFolderId,
  onSelect,
  depth,
}: {
  folders: DriveFolder[];
  parentId: string | null;
  activeFolderId: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
}) {
  const children = folders.filter((f) => f.parentId === parentId);
  if (children.length === 0) return null;
  return (
    <ul className="wiki-tree" style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      {children.map((f) => (
        <li key={f.id}>
          <div className={`wiki-tree-item ${activeFolderId === f.id ? "active" : ""}`}>
            <button className="wiki-tree-item-title" onClick={() => onSelect(f.id)}>
              <Icon name="folder" size={13} /> {f.name}
            </button>
          </div>
          <FolderTree folders={folders} parentId={f.id} activeFolderId={activeFolderId} onSelect={onSelect} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export default function DriveView({ currentUser, users }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listSpaces().then(({ spaces: list }) => {
      setSpaces(list);
      if (list.length > 0) setActiveSpaceId((prev) => prev || list[0].id);
    });
  }, []);

  const refreshFolders = useCallback((spaceId: string) => {
    api.listDriveFolders(spaceId).then(({ folders: list }) => setFolders(list));
  }, []);

  const refreshFiles = useCallback((spaceId: string, folderId: string | null) => {
    api.listDriveFiles(spaceId, folderId || undefined).then(({ files: list }) => setFiles(list));
  }, []);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshFolders(activeSpaceId);
    setActiveFolderId(null);
  }, [activeSpaceId, refreshFolders]);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshFiles(activeSpaceId, activeFolderId);
  }, [activeSpaceId, activeFolderId, refreshFiles]);

  async function handleNewFolder() {
    if (!activeSpaceId) return;
    const name = prompt("새 폴더 이름을 입력하세요");
    if (!name || !name.trim()) return;
    await api.createDriveFolder({ spaceId: activeSpaceId, parentId: activeFolderId, name: name.trim() });
    refreshFolders(activeSpaceId);
  }

  async function handleUpload(file: File) {
    if (!activeSpaceId) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadFile(file);
      await api.createDriveFile({
        spaceId: activeSpaceId,
        folderId: activeFolderId,
        name: file.name,
        url: uploaded.url,
        mime: uploaded.mime,
        size: uploaded.size,
      });
      refreshFiles(activeSpaceId, activeFolderId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!activeSpaceId) return;
    if (!confirm("이 파일을 삭제할까요?")) return;
    try {
      await api.deleteDriveFile(fileId);
      refreshFiles(activeSpaceId, activeFolderId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "삭제 권한이 없습니다.");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!activeSpaceId) return;
    if (!confirm("이 폴더를 삭제할까요? (비어있어야 삭제 가능)")) return;
    try {
      await api.deleteDriveFolder(folderId);
      setActiveFolderId(null);
      refreshFolders(activeSpaceId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "폴더 삭제에 실패했습니다.");
    }
  }

  function uploaderName(id: string) {
    if (id === currentUser.id) return "나";
    return users.find((u) => u.id === id)?.name || "?";
  }

  const activeFolderName = folders.find((f) => f.id === activeFolderId)?.name;

  return (
    <div className="projects-view">
      <div className="projects-sidebar">
        <div className="projects-sidebar-header">
          <select className="space-select" value={activeSpaceId || ""} onChange={(e) => setActiveSpaceId(e.target.value || null)}>
            {spaces.length === 0 && <option value="">스페이스 없음</option>}
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="sidebar-section-header">
          <span>폴더</span>
          <button className="link-button" onClick={handleNewFolder} disabled={!activeSpaceId}>
            <Icon name="plus" size={12} /> 새 폴더
          </button>
        </div>
        <div className={`wiki-tree-item ${activeFolderId === null ? "active" : ""}`}>
          <button className="wiki-tree-item-title" onClick={() => setActiveFolderId(null)}>
            <Icon name="folder" size={13} /> 전체 파일
          </button>
        </div>
        <FolderTree folders={folders} parentId={null} activeFolderId={activeFolderId} onSelect={setActiveFolderId} depth={0} />
      </div>

      <div className="projects-main">
        {!activeSpaceId ? (
          <div className="projects-empty-state">
            <div className="projects-empty-state-icon"><Icon name="folder" size={32} /></div>
            <p>스페이스를 먼저 선택하세요.</p>
          </div>
        ) : (
          <>
            <div className="projects-main-header">
              <h2>{activeFolderName || "전체 파일"}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                {activeFolderId && (
                  <button className="link-button" onClick={() => handleDeleteFolder(activeFolderId)}>
                    <Icon name="trash" size={12} /> 폴더 삭제
                  </button>
                )}
                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Icon name="plus" size={14} /> {uploading ? "업로드 중..." : "파일 업로드"}
                </button>
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="task-list-view">
              <div className="task-table-card">
                <table className="task-table">
                  <thead>
                    <tr><th>이름</th><th>업로더</th><th>크기</th><th>날짜</th><th></th></tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td className="task-table-title">
                          <a href={f.url} target="_blank" rel="noreferrer"><Icon name="file" size={13} /> {f.name}</a>
                        </td>
                        <td>{uploaderName(f.uploadedBy)}</td>
                        <td>{formatSize(f.size)}</td>
                        <td>{formatDate(f.createdAt)}</td>
                        <td><button className="link-button" onClick={() => handleDeleteFile(f.id)}><Icon name="trash" size={12} /></button></td>
                      </tr>
                    ))}
                    {files.length === 0 && <tr><td colSpan={5} className="sidebar-empty">파일이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
