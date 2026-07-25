import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { CrmCustomer, FinanceKind } from "../types";
import Icon from "./Icon";

interface Props {
  customers: CrmCustomer[];
  onCancel: () => void;
  onCreate: (data: {
    date: string; kind: FinanceKind; category: string; amount: number;
    customerId?: string | null; memo?: string; receipt?: { url: string; name: string; mime: string; size: number };
  }) => Promise<void>;
}

function today() {
  return new Date().toLocaleDateString("en-CA");
}

export default function NewFinanceTransactionModal({ customers, onCancel, onCreate }: Props) {
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<FinanceKind>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [memo, setMemo] = useState("");
  const [receipt, setReceipt] = useState<{ url: string; name: string; mime: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleReceiptSelect(file: File) {
    setUploading(true);
    try {
      const uploaded = await api.uploadFile(file);
      setReceipt(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "영수증 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!category.trim()) return setError("카테고리를 입력하세요.");
    if (!amountNum || amountNum <= 0) return setError("금액을 올바르게 입력하세요.");
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        date,
        kind,
        category: category.trim(),
        amount: amountNum,
        customerId: customerId || null,
        memo: memo.trim() || undefined,
        receipt: receipt || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "거래 등록에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>새 거래 기록</h3>

        <div className="form-row">
          <label>
            구분
            <select value={kind} onChange={(e) => setKind(e.target.value as FinanceKind)}>
              <option value="expense">지출</option>
              <option value="income">수입</option>
            </select>
          </label>
          <label>
            날짜
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label>
          카테고리
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: 소프트웨어 구독료, 인건비, 매출" />
        </label>
        <label>
          금액 (원)
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={1} />
        </label>
        <label>
          거래처 (CRM 연동, 선택)
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">연결 안 함</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          메모
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>

        <label>
          영수증 첨부
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleReceiptSelect(e.target.files[0])}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Icon name="attach" size={14} /> {uploading ? "업로드 중..." : receipt ? receipt.name : "파일 선택"}
            </button>
          </div>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={submitting}>취소</button>
          <button type="submit" disabled={submitting || uploading}>{submitting ? "등록 중..." : "등록"}</button>
        </div>
      </form>
    </div>
  );
}
