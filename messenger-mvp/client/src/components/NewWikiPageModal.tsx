import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { WikiTemplate } from "../types";

interface Props {
  parentTitle: string | null;
  onCancel: () => void;
  onCreate: (data: { title: string; template?: string }) => Promise<void>;
}

export default function NewWikiPageModal({ parentTitle, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("");
  const [templates, setTemplates] = useState<WikiTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listWikiTemplates().then(({ templates: list }) => setTemplates(list));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("문서 제목을 입력하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ title: title.trim(), template: template || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 문서</h3>
        {parentTitle && <p className="sidebar-empty">'{parentTitle}' 하위 문서로 생성됩니다.</p>}
        <label>
          문서 제목
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 온보딩 가이드" autoFocus />
        </label>
        <label>
          템플릿
          <select value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="">빈 문서</option>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="submit" disabled={submitting}>{submitting ? "생성 중..." : "생성"}</button>
        </div>
      </form>
    </div>
  );
}
