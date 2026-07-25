import { useState } from "react";
import type { FormEvent } from "react";
import type { CrmCustomer, FinanceInvoiceItem } from "../types";
import Icon from "./Icon";

interface Props {
  customers: CrmCustomer[];
  onCancel: () => void;
  onCreate: (data: { customerId: string; items: FinanceInvoiceItem[]; issueDate?: string; dueDate?: string }) => Promise<void>;
}

function today() {
  return new Date().toLocaleDateString("en-CA");
}

export default function NewInvoiceModal({ customers, onCancel, onCreate }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<FinanceInvoiceItem[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<FinanceInvoiceItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  const total = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("고객을 선택하세요.");
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) return setError("항목을 1개 이상 입력하세요.");
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ customerId, items: validItems, issueDate, dueDate: dueDate || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "인보이스 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal task-detail-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 인보이스</h3>

        <label>
          고객
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">고객 선택</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <div className="form-row">
          <label>
            발행일
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </label>
          <label>
            만기일
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <div className="task-detail-section">
          <div className="sidebar-section-header"><span>항목</span></div>
          {items.map((it, i) => (
            <div key={i} className="invoice-item-row">
              <input
                placeholder="항목 설명"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <input
                type="number"
                placeholder="수량"
                value={it.qty}
                min={1}
                onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 1 })}
              />
              <input
                type="number"
                placeholder="단가"
                value={it.unitPrice}
                min={0}
                onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })}
              />
              <button type="button" className="link-button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <button type="button" className="link-button" onClick={() => setItems((prev) => [...prev, { description: "", qty: 1, unitPrice: 0 }])}>
            <Icon name="plus" size={12} /> 항목 추가
          </button>
          <div className="invoice-total">합계: {total.toLocaleString()}원</div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="submit" disabled={submitting}>{submitting ? "생성 중..." : "생성"}</button>
        </div>
      </form>
    </div>
  );
}
