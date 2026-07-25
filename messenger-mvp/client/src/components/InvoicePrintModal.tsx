import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { CrmCustomer, FinanceInvoice } from "../types";
import Icon from "./Icon";

interface Props {
  invoiceId: string;
  onClose: () => void;
}

function formatCurrency(n: number) {
  return `${n.toLocaleString()}원`;
}

export default function InvoicePrintModal({ invoiceId, onClose }: Props) {
  const [invoice, setInvoice] = useState<FinanceInvoice | null>(null);
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFinanceInvoice(invoiceId)
      .then((res) => {
        setInvoice(res.invoice);
        setCustomer(res.customer);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "인보이스를 불러오지 못했습니다."));
  }, [invoiceId]);

  const total = invoice ? invoice.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0) : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal invoice-print-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row no-print">
          <h3>인보이스</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="link-button" onClick={() => window.print()}>
              <Icon name="file" size={14} /> PDF로 저장 / 인쇄
            </button>
            <button className="link-button" onClick={onClose}>
              <Icon name="close" size={14} /> 닫기
            </button>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {invoice && customer && (
          <div id="invoice-print-area">
            <div className="invoice-doc-header">
              <h1>INVOICE</h1>
              <div>{invoice.invoiceNumber}</div>
            </div>
            <div className="invoice-doc-meta">
              <div>
                <div className="notification-time">청구 대상</div>
                <div><strong>{customer.name}</strong></div>
                {customer.email && <div>{customer.email}</div>}
                {customer.phone && <div>{customer.phone}</div>}
              </div>
              <div>
                <div><span className="notification-time">발행일</span> {invoice.issueDate}</div>
                {invoice.dueDate && <div><span className="notification-time">만기일</span> {invoice.dueDate}</div>}
                <div><span className="notification-time">상태</span> {invoice.status}</div>
              </div>
            </div>

            <table className="invoice-doc-table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>수량</th>
                  <th>단가</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.description}</td>
                    <td>{it.qty}</td>
                    <td>{formatCurrency(it.unitPrice)}</td>
                    <td>{formatCurrency(it.qty * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>합계</td>
                  <td>{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
