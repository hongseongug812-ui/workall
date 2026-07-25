import { useRef } from "react";
import { api } from "../api";
import type { WikiBlock, WikiBlockType } from "../types";
import Icon from "./Icon";

interface Props {
  blocks: WikiBlock[];
  onChange: (blocks: WikiBlock[]) => void;
  onCommit: (blocks: WikiBlock[]) => void;
  readOnly?: boolean;
}

const BLOCK_LABEL: Record<WikiBlockType, string> = {
  heading: "제목",
  paragraph: "텍스트",
  quote: "인용구",
  divider: "구분선",
  image: "이미지",
  table: "표",
  code: "코드",
};

function newBlock(type: WikiBlockType): WikiBlock {
  const id = crypto.randomUUID();
  if (type === "table") return { id, type, rows: [["", ""], ["", ""]] };
  if (type === "image") return { id, type, url: "" };
  return { id, type, text: "" };
}

export default function WikiBlockEditor({ blocks, onChange, onCommit, readOnly }: Props) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function updateBlock(id: string, patch: Partial<WikiBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function commitNow(next?: WikiBlock[]) {
    onCommit(next || blocks);
  }

  function addBlock(afterId: string | null, type: WikiBlockType) {
    const block = newBlock(type);
    const index = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
    const next = [...blocks.slice(0, index + 1), block, ...blocks.slice(index + 1)];
    onChange(next);
    commitNow(next);
  }

  function removeBlock(id: string) {
    const next = blocks.filter((b) => b.id !== id);
    onChange(next);
    commitNow(next);
  }

  async function handleImageUpload(id: string, file: File) {
    const attachment = await api.uploadFile(file);
    const next = blocks.map((b) => (b.id === id ? { ...b, url: attachment.url } : b));
    onChange(next);
    commitNow(next);
  }

  function updateTableCell(blockId: string, rowIdx: number, colIdx: number, value: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.rows) return;
    const rows = block.rows.map((r, ri) => (ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : r));
    updateBlock(blockId, { rows });
  }

  function addTableRow(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.rows) return;
    const cols = block.rows[0]?.length || 2;
    const next = blocks.map((b) => (b.id === blockId ? { ...b, rows: [...(b.rows || []), Array(cols).fill("")] } : b));
    onChange(next);
    commitNow(next);
  }

  function addTableCol(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.rows) return;
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, rows: (b.rows || []).map((r) => [...r, ""]) } : b
    );
    onChange(next);
    commitNow(next);
  }

  return (
    <div className="wiki-block-editor">
      {blocks.map((block) => (
        <div key={block.id} className="wiki-block-row">
          <div className="wiki-block-content">
            {block.type === "heading" && (
              <input
                className="wiki-block-heading"
                value={block.text || ""}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                onBlur={() => commitNow()}
                placeholder="제목"
                readOnly={readOnly}
              />
            )}
            {block.type === "paragraph" && (
              <textarea
                className="wiki-block-paragraph"
                value={block.text || ""}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                onBlur={() => commitNow()}
                placeholder="내용을 입력하세요 ([[문서명]]으로 다른 문서를 링크할 수 있어요)"
                rows={2}
                readOnly={readOnly}
              />
            )}
            {block.type === "quote" && (
              <textarea
                className="wiki-block-quote"
                value={block.text || ""}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                onBlur={() => commitNow()}
                placeholder="인용구"
                rows={2}
                readOnly={readOnly}
              />
            )}
            {block.type === "divider" && <hr className="wiki-block-divider" />}
            {block.type === "code" && (
              <textarea
                className="wiki-block-code"
                value={block.text || ""}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                onBlur={() => commitNow()}
                placeholder="코드를 입력하세요"
                rows={4}
                readOnly={readOnly}
              />
            )}
            {block.type === "image" &&
              (block.url ? (
                <img className="wiki-block-image" src={block.url} alt="" />
              ) : (
                <div className="wiki-block-image-placeholder">
                  <input
                    ref={(el) => { fileInputRefs.current[block.id] = el; }}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])}
                  />
                  <button type="button" onClick={() => fileInputRefs.current[block.id]?.click()}>
                    <Icon name="image" size={16} /> 이미지 업로드
                  </button>
                </div>
              ))}
            {block.type === "table" && block.rows && (
              <div className="wiki-block-table-wrap">
                <table className="wiki-block-table">
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>
                            <input
                              value={cell}
                              onChange={(e) => updateTableCell(block.id, ri, ci, e.target.value)}
                              onBlur={() => commitNow()}
                              readOnly={readOnly}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!readOnly && (
                  <div className="wiki-block-table-actions">
                    <button className="link-button" onClick={() => addTableRow(block.id)}>+ 행</button>
                    <button className="link-button" onClick={() => addTableCol(block.id)}>+ 열</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="wiki-block-toolbar">
              <select
                className="wiki-block-add-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) addBlock(block.id, e.target.value as WikiBlockType);
                }}
                title="아래에 블록 추가"
              >
                <option value="">+ 블록</option>
                {(Object.keys(BLOCK_LABEL) as WikiBlockType[]).map((t) => (
                  <option key={t} value={t}>{BLOCK_LABEL[t]}</option>
                ))}
              </select>
              <button className="link-button" onClick={() => removeBlock(block.id)}>
                <Icon name="trash" size={12} />
              </button>
            </div>
          )}
        </div>
      ))}

      {!readOnly && blocks.length === 0 && (
        <button className="kanban-add-task" onClick={() => addBlock(null, "paragraph")}>
          <Icon name="plus" size={14} /> 블록 추가
        </button>
      )}
    </div>
  );
}
