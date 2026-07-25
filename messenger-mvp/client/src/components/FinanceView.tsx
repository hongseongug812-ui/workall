import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { CrmCustomer, FinanceInvoice, FinanceKind, FinanceSubscription, FinanceSummary, FinanceTransaction, Space, User } from "../types";
import Icon from "./Icon";
import NewFinanceTransactionModal from "./NewFinanceTransactionModal";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoicePrintModal from "./InvoicePrintModal";

interface Props {
  currentUser: User;
  users: User[];
}

type Tab = "transactions" | "subscriptions" | "invoices" | "dashboard";

const PIE_COLORS = ["#6c5ce7", "#0984e3", "#00b894", "#f9a826", "#e84393", "#e17055", "#00cec9"];

function won(n: number) {
  return `${n.toLocaleString()}원`;
}

function customerName(customers: CrmCustomer[], id: string | null) {
  if (!id) return "-";
  return customers.find((c) => c.id === id)?.name || "-";
}

export default function FinanceView({ currentUser: _currentUser, users: _users }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<FinanceSubscription[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [showNewTx, setShowNewTx] = useState(false);
  const [showNewSub, setShowNewSub] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);

  const [subName, setSubName] = useState("");
  const [subKind, setSubKind] = useState<FinanceKind>("expense");
  const [subCategory, setSubCategory] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subDay, setSubDay] = useState("1");

  useEffect(() => {
    api.listSpaces().then(({ spaces: list }) => {
      setSpaces(list);
      if (list.length > 0) setActiveSpaceId((prev) => prev || list[0].id);
    });
  }, []);

  const refreshAll = useCallback((spaceId: string) => {
    api.listCrmCustomers(spaceId).then(({ customers: list }) => setCustomers(list));
    api.listFinanceTransactions(spaceId).then(({ transactions: list }) => setTransactions(list));
    api.listFinanceSubscriptions(spaceId).then(({ subscriptions: list }) => setSubscriptions(list));
    api.listFinanceInvoices(spaceId).then(({ invoices: list }) => setInvoices(list));
    api.getFinanceSummary(spaceId).then(setSummary);
  }, []);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshAll(activeSpaceId);
  }, [activeSpaceId, refreshAll]);

  async function handleCreateTx(data: {
    date: string; kind: FinanceKind; category: string; amount: number;
    customerId?: string | null; memo?: string; receipt?: { url: string; name: string; mime: string; size: number };
  }) {
    if (!activeSpaceId) return;
    const { transaction } = await api.createFinanceTransaction({ spaceId: activeSpaceId, ...data });
    setTransactions((prev) => [transaction, ...prev]);
    setShowNewTx(false);
    api.getFinanceSummary(activeSpaceId).then(setSummary);
  }

  async function handleDeleteTx(txId: string) {
    if (!confirm("이 거래 기록을 삭제할까요?")) return;
    await api.deleteFinanceTransaction(txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (activeSpaceId) api.getFinanceSummary(activeSpaceId).then(setSummary);
  }

  async function handleAddSubscription(e: FormEvent) {
    e.preventDefault();
    if (!activeSpaceId || !subName.trim() || !subCategory.trim() || !subAmount) return;
    const { subscription } = await api.createFinanceSubscription({
      spaceId: activeSpaceId,
      name: subName.trim(),
      kind: subKind,
      category: subCategory.trim(),
      amount: Number(subAmount),
      dayOfMonth: Number(subDay),
    });
    setSubscriptions((prev) => [...prev, subscription]);
    setSubName(""); setSubCategory(""); setSubAmount(""); setSubDay("1");
    setShowNewSub(false);
  }

  async function handleToggleSubscription(sub: FinanceSubscription) {
    const { subscription } = await api.setFinanceSubscriptionActive(sub.id, !sub.active);
    setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? subscription : s)));
  }

  async function handleDeleteSubscription(subId: string) {
    await api.deleteFinanceSubscription(subId);
    setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
  }

  async function handleCreateInvoice(data: { customerId: string; items: { description: string; qty: number; unitPrice: number }[]; issueDate?: string; dueDate?: string }) {
    if (!activeSpaceId) return;
    const { invoice } = await api.createFinanceInvoice({ spaceId: activeSpaceId, ...data });
    setInvoices((prev) => [invoice, ...prev]);
    setShowNewInvoice(false);
  }

  const maxCashflow = summary ? Math.max(1, ...summary.cashflow.flatMap((c) => [c.income, c.expense])) : 1;
  const totalExpense = summary ? summary.categoryBreakdown.reduce((s, c) => s + c.amount, 0) : 0;

  let pieCursor = 0;
  const pieGradientParts = summary
    ? summary.categoryBreakdown.map((c, i) => {
        const pct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0;
        const start = pieCursor;
        pieCursor += pct;
        return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${pieCursor}%`;
      })
    : [];

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
        <div className="view-tabs" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
            <Icon name="board" size={15} /> 대시보드
          </button>
          <button className={tab === "transactions" ? "active" : ""} onClick={() => setTab("transactions")}>
            <Icon name="list" size={15} /> 거래 내역
          </button>
          <button className={tab === "subscriptions" ? "active" : ""} onClick={() => setTab("subscriptions")}>
            <Icon name="clock" size={15} /> 구독 관리
          </button>
          <button className={tab === "invoices" ? "active" : ""} onClick={() => setTab("invoices")}>
            <Icon name="file" size={15} /> 인보이스
          </button>
        </div>
      </div>

      <div className="projects-main">
        {!activeSpaceId && (
          <div className="projects-empty-state">
            <Icon name="board" size={40} />
            <p>스페이스를 먼저 선택하세요.</p>
          </div>
        )}

        {activeSpaceId && tab === "dashboard" && summary && (
          <>
            <div className="projects-main-header"><h2>재무 요약</h2></div>
            <div className="finance-dashboard">
              <div className="finance-chart-card">
                <div className="sidebar-section-header"><span>월별 현금 흐름</span></div>
                <div className="cashflow-chart">
                  {summary.cashflow.map((c) => (
                    <div key={c.month} className="cashflow-bar-group">
                      <div className="cashflow-bars">
                        <div className="cashflow-bar income" style={{ height: `${(c.income / maxCashflow) * 100}%` }} title={`수입 ${won(c.income)}`} />
                        <div className="cashflow-bar expense" style={{ height: `${(c.expense / maxCashflow) * 100}%` }} title={`지출 ${won(c.expense)}`} />
                      </div>
                      <div className="cashflow-month-label">{c.month.slice(5)}월</div>
                    </div>
                  ))}
                </div>
                <div className="cashflow-legend">
                  <span><i className="legend-dot income" /> 수입</span>
                  <span><i className="legend-dot expense" /> 지출</span>
                </div>
              </div>

              <div className="finance-chart-card">
                <div className="sidebar-section-header"><span>{summary.currentMonth} 카테고리별 지출</span></div>
                {summary.categoryBreakdown.length === 0 ? (
                  <p className="sidebar-empty">이번 달 지출 기록이 없습니다.</p>
                ) : (
                  <div className="pie-chart-row">
                    <div className="pie-chart" style={{ background: `conic-gradient(${pieGradientParts.join(", ")})` }} />
                    <ul className="pie-legend">
                      {summary.categoryBreakdown.map((c, i) => (
                        <li key={c.category}>
                          <i className="legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {c.category} · {won(c.amount)} ({totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSpaceId && tab === "transactions" && (
          <>
            <div className="projects-main-header">
              <h2>거래 내역</h2>
              <button onClick={() => setShowNewTx(true)}><Icon name="plus" size={14} /> 새 거래</button>
            </div>
            <div className="task-list-view">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>날짜</th><th>구분</th><th>카테고리</th><th>거래처</th><th>금액</th><th>영수증</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td><span className={`priority-badge ${t.kind === "income" ? "priority-low" : "priority-high"}`}>{t.kind === "income" ? "수입" : "지출"}</span></td>
                      <td>{t.category}{t.memo ? ` · ${t.memo}` : ""}</td>
                      <td>{customerName(customers, t.customerId)}</td>
                      <td>{won(t.amount)}</td>
                      <td>{t.receipt ? <a href={t.receipt.url} target="_blank" rel="noreferrer"><Icon name="attach" size={13} /></a> : "-"}</td>
                      <td><button className="link-button" onClick={() => handleDeleteTx(t.id)}><Icon name="trash" size={12} /></button></td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={7} className="sidebar-empty">거래 기록이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSpaceId && tab === "subscriptions" && (
          <>
            <div className="projects-main-header">
              <h2>구독(반복 결제)</h2>
              <button onClick={() => setShowNewSub((v) => !v)}><Icon name="plus" size={14} /> 새 구독</button>
            </div>
            {showNewSub && (
              <form className="crm-filter-row" onSubmit={handleAddSubscription} style={{ marginBottom: 16, flexWrap: "wrap" }}>
                <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="구독 이름 (예: Slack)" />
                <select value={subKind} onChange={(e) => setSubKind(e.target.value as FinanceKind)}>
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
                <input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="카테고리" />
                <input type="number" value={subAmount} onChange={(e) => setSubAmount(e.target.value)} placeholder="금액" />
                <input type="number" value={subDay} onChange={(e) => setSubDay(e.target.value)} min={1} max={28} style={{ width: 70 }} title="매월 결제일" />
                <button type="submit">추가</button>
              </form>
            )}
            <div className="task-list-view">
              <table className="task-table">
                <thead>
                  <tr><th>이름</th><th>구분</th><th>카테고리</th><th>금액</th><th>결제일</th><th>상태</th><th></th></tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.kind === "income" ? "수입" : "지출"}</td>
                      <td>{s.category}</td>
                      <td>{won(s.amount)}</td>
                      <td>매월 {s.dayOfMonth}일</td>
                      <td>
                        <button className="link-button" onClick={() => handleToggleSubscription(s)}>
                          {s.active ? "활성" : "중지됨"}
                        </button>
                      </td>
                      <td><button className="link-button" onClick={() => handleDeleteSubscription(s.id)}><Icon name="trash" size={12} /></button></td>
                    </tr>
                  ))}
                  {subscriptions.length === 0 && <tr><td colSpan={7} className="sidebar-empty">등록된 구독이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSpaceId && tab === "invoices" && (
          <>
            <div className="projects-main-header">
              <h2>인보이스</h2>
              <button onClick={() => setShowNewInvoice(true)}><Icon name="plus" size={14} /> 새 인보이스</button>
            </div>
            <div className="task-list-view">
              <table className="task-table">
                <thead>
                  <tr><th>번호</th><th>고객</th><th>발행일</th><th>상태</th><th></th></tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="task-table-title" onClick={() => setPrintInvoiceId(inv.id)}>{inv.invoiceNumber}</td>
                      <td>{customerName(customers, inv.customerId)}</td>
                      <td>{inv.issueDate}</td>
                      <td>{inv.status}</td>
                      <td><button className="link-button" onClick={() => setPrintInvoiceId(inv.id)}><Icon name="file" size={12} /> 보기</button></td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={5} className="sidebar-empty">인보이스가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showNewTx && <NewFinanceTransactionModal customers={customers} onCancel={() => setShowNewTx(false)} onCreate={handleCreateTx} />}
      {showNewInvoice && <NewInvoiceModal customers={customers} onCancel={() => setShowNewInvoice(false)} onCreate={handleCreateInvoice} />}
      {printInvoiceId && <InvoicePrintModal invoiceId={printInvoiceId} onClose={() => setPrintInvoiceId(null)} />}
    </div>
  );
}
