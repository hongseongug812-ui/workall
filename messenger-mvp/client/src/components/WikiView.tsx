import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Space, User, WikiBacklink, WikiBlock, WikiPage } from "../types";
import Icon from "./Icon";
import WikiBlockEditor from "./WikiBlockEditor";
import NewWikiPageModal from "./NewWikiPageModal";
import WikiVersionHistoryPanel from "./WikiVersionHistoryPanel";

interface Props {
  currentUser: User;
  users: User[];
}

function parseBlocks(content: string): WikiBlock[] {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function WikiTree({
  pages,
  parentId,
  activePageId,
  onSelect,
  onAddChild,
  depth,
}: {
  pages: WikiPage[];
  parentId: string | null;
  activePageId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  depth: number;
}) {
  const children = pages.filter((p) => p.parentId === parentId).sort((a, b) => a.position - b.position);
  if (children.length === 0) return null;
  return (
    <ul className="wiki-tree" style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      {children.map((p) => (
        <li key={p.id}>
          <div className={`wiki-tree-item ${activePageId === p.id ? "active" : ""}`}>
            <button className="wiki-tree-item-title" onClick={() => onSelect(p.id)}>
              <Icon name="file" size={13} /> {p.title}
            </button>
            <button className="link-button wiki-tree-add" onClick={() => onAddChild(p.id)} title="하위 문서 추가">
              <Icon name="plus" size={11} />
            </button>
          </div>
          <WikiTree pages={pages} parentId={p.id} activePageId={activePageId} onSelect={onSelect} onAddChild={onAddChild} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export default function WikiView({ currentUser, users }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [page, setPage] = useState<WikiPage | null>(null);
  const [backlinks, setBacklinks] = useState<WikiBacklink[]>([]);
  const [blocks, setBlocks] = useState<WikiBlock[]>([]);
  const [title, setTitle] = useState("");
  const [newPageParentId, setNewPageParentId] = useState<string | null | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listSpaces().then(({ spaces: list }) => {
      setSpaces(list);
      if (list.length > 0) setActiveSpaceId((prev) => prev || list[0].id);
    });
  }, []);

  const refreshPages = useCallback((spaceId: string) => {
    api.listWikiPages(spaceId).then(({ pages: list }) => setPages(list));
  }, []);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshPages(activeSpaceId);
    setActivePageId(null);
  }, [activeSpaceId, refreshPages]);

  const openPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    api
      .getWikiPage(pageId)
      .then((res) => {
        setPage(res.page);
        setTitle(res.page.title);
        setBlocks(parseBlocks(res.page.content));
        setBacklinks(res.backlinks);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "문서를 불러오지 못했습니다."));
  }, []);

  async function handleCreatePage(data: { title: string; template?: string }) {
    if (!activeSpaceId || newPageParentId === undefined) return;
    const { page: created } = await api.createWikiPage({
      spaceId: activeSpaceId,
      parentId: newPageParentId,
      title: data.title,
      template: data.template,
    });
    setPages((prev) => [...prev, created]);
    setNewPageParentId(undefined);
    openPage(created.id);
  }

  async function saveBlocks(next: WikiBlock[]) {
    if (!activePageId) return;
    const { page: updated } = await api.updateWikiPage(activePageId, { content: next });
    setPage(updated);
    setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function saveTitle() {
    if (!activePageId || !page || title.trim() === page.title) return;
    const { page: updated } = await api.updateWikiPage(activePageId, { title: title.trim() });
    setPage(updated);
    setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleDeletePage() {
    if (!activePageId) return;
    if (!confirm("이 문서를 삭제할까요?")) return;
    try {
      await api.deleteWikiPage(activePageId);
      setPages((prev) => prev.filter((p) => p.id !== activePageId));
      setActivePageId(null);
      setPage(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "삭제에 실패했습니다. 하위 문서를 먼저 삭제하세요.");
    }
  }

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
          <span>문서</span>
          <button className="link-button" onClick={() => setNewPageParentId(null)} disabled={!activeSpaceId}>
            <Icon name="plus" size={12} /> 새 문서
          </button>
        </div>
        <WikiTree pages={pages} parentId={null} activePageId={activePageId} onSelect={openPage} onAddChild={setNewPageParentId} depth={0} />
        {pages.length === 0 && <p className="sidebar-empty">문서가 없습니다.</p>}
      </div>

      <div className="projects-main">
        {error && <p className="auth-error">{error}</p>}
        {!page && (
          <div className="projects-empty-state">
            <div className="projects-empty-state-icon"><Icon name="file" size={32} /></div>
            <p>왼쪽에서 문서를 선택하거나 새로 만들어보세요.</p>
          </div>
        )}
        {page && (
          <>
            <div className="wiki-page-header">
              <input
                className="wiki-page-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="link-button" onClick={() => setShowHistory(true)}>
                  <Icon name="clock" size={14} /> 히스토리
                </button>
                <button className="link-button" onClick={handleDeletePage}>
                  <Icon name="trash" size={14} /> 삭제
                </button>
              </div>
            </div>

            <div className="wiki-page-body">
              <WikiBlockEditor blocks={blocks} onChange={setBlocks} onCommit={saveBlocks} />

              {backlinks.length > 0 && (
                <div className="wiki-backlinks">
                  <div className="sidebar-section-header"><span>이 문서를 참조하는 문서</span></div>
                  <ul className="wiki-backlink-list">
                    {backlinks.map((b) => (
                      <li key={b.id}>
                        <button className="link-button" onClick={() => openPage(b.id)}>
                          <Icon name="file" size={12} /> {b.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {newPageParentId !== undefined && (
        <NewWikiPageModal
          parentTitle={newPageParentId ? pages.find((p) => p.id === newPageParentId)?.title || null : null}
          onCancel={() => setNewPageParentId(undefined)}
          onCreate={handleCreatePage}
        />
      )}
      {showHistory && activePageId && (
        <WikiVersionHistoryPanel
          pageId={activePageId}
          users={users}
          currentUser={currentUser}
          onClose={() => setShowHistory(false)}
          onRestored={() => openPage(activePageId)}
        />
      )}
    </div>
  );
}
