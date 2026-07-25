const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");

const router = express.Router();

function requireSpaceParam(req, res, next) {
  const { spaceId } = req.query;
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  req.spaceId = spaceId;
  next();
}

// ---- 트랜잭션(수입/지출) ----

router.get("/transactions", requireAuth, requirePermission("finance", "read"), requireSpaceParam, (req, res) => {
  const { month } = req.query;
  res.json({ transactions: db.listFinanceTransactions(req.spaceId, { month: typeof month === "string" ? month : undefined }) });
});

router.post("/transactions", requireAuth, requirePermission("finance", "write"), (req, res) => {
  const { spaceId, date, kind, category, amount, customerId, memo, receipt } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "날짜는 YYYY-MM-DD 형식이어야 합니다." });
  }
  if (!["income", "expense"].includes(kind)) {
    return res.status(400).json({ error: "kind는 income 또는 expense 여야 합니다." });
  }
  if (typeof category !== "string" || !category.trim()) {
    return res.status(400).json({ error: "카테고리를 입력하세요." });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "금액을 올바르게 입력하세요." });
  }
  if (customerId) {
    const customer = db.findCrmCustomerById(customerId);
    if (!customer || customer.spaceId !== spaceId) {
      return res.status(400).json({ error: "올바르지 않은 거래처입니다." });
    }
  }
  const hasReceipt =
    receipt && typeof receipt.url === "string" && typeof receipt.name === "string" && typeof receipt.mime === "string" && typeof receipt.size === "number";
  const tx = db.createFinanceTransaction({
    spaceId,
    date,
    kind,
    category: category.trim(),
    amount: Math.round(amount),
    customerId: customerId || null,
    memo: typeof memo === "string" ? memo : null,
    receipt: hasReceipt ? receipt : null,
    createdBy: req.userId,
  });
  res.status(201).json({ transaction: tx });
});

router.delete("/transactions/:id", requireAuth, requirePermission("finance", "delete"), (req, res) => {
  const tx = db.findFinanceTransactionById(req.params.id);
  if (!tx) return res.status(404).json({ error: "트랜잭션을 찾을 수 없습니다." });
  if (!db.isSpaceMember(tx.spaceId, req.userId)) return res.status(403).json({ error: "권한이 없습니다." });
  db.deleteFinanceTransaction(req.params.id);
  res.status(204).end();
});

// ---- 요약 대시보드 ----

router.get("/summary", requireAuth, requirePermission("finance", "read"), requireSpaceParam, (req, res) => {
  const months = Number(req.query.months) || 6;
  res.json(db.financeSummary(req.spaceId, { months: Math.min(Math.max(months, 1), 12) }));
});

// ---- 구독(반복 결제) ----

router.get("/subscriptions", requireAuth, requirePermission("finance", "read"), requireSpaceParam, (req, res) => {
  res.json({ subscriptions: db.listFinanceSubscriptions(req.spaceId) });
});

router.post("/subscriptions", requireAuth, requirePermission("finance", "write"), (req, res) => {
  const { spaceId, name, kind, category, amount, dayOfMonth, customerId } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "구독 이름을 입력하세요." });
  }
  if (!["income", "expense"].includes(kind)) {
    return res.status(400).json({ error: "kind는 income 또는 expense 여야 합니다." });
  }
  if (typeof category !== "string" || !category.trim()) {
    return res.status(400).json({ error: "카테고리를 입력하세요." });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "금액을 올바르게 입력하세요." });
  }
  const day = Number(dayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return res.status(400).json({ error: "결제일은 1~28 사이여야 합니다." });
  }
  const sub = db.createFinanceSubscription({
    spaceId,
    name: name.trim(),
    kind,
    category: category.trim(),
    amount: Math.round(amount),
    dayOfMonth: day,
    customerId: customerId || null,
    createdBy: req.userId,
  });
  res.status(201).json({ subscription: sub });
});

router.patch("/subscriptions/:id", requireAuth, requirePermission("finance", "update"), (req, res) => {
  const { active } = req.body || {};
  const sub = db.setFinanceSubscriptionActive(req.params.id, !!active);
  if (!sub) return res.status(404).json({ error: "구독을 찾을 수 없습니다." });
  res.json({ subscription: sub });
});

router.delete("/subscriptions/:id", requireAuth, requirePermission("finance", "delete"), (req, res) => {
  db.deleteFinanceSubscription(req.params.id);
  res.status(204).end();
});

// ---- 인보이스 ----

router.get("/invoices", requireAuth, requirePermission("finance", "read"), requireSpaceParam, (req, res) => {
  res.json({ invoices: db.listFinanceInvoices(req.spaceId) });
});

router.post("/invoices", requireAuth, requirePermission("finance", "write"), (req, res) => {
  const { spaceId, customerId, items, issueDate, dueDate } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  const customer = db.findCrmCustomerById(customerId);
  if (!customer || customer.spaceId !== spaceId) {
    return res.status(400).json({ error: "올바른 고객을 선택하세요." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "인보이스 항목을 1개 이상 입력하세요." });
  }
  const cleanItems = items.map((it) => ({
    description: typeof it.description === "string" ? it.description : "",
    qty: Number(it.qty) || 1,
    unitPrice: Number(it.unitPrice) || 0,
  }));
  const invoice = db.createFinanceInvoice({
    spaceId,
    customerId,
    items: cleanItems,
    issueDate: typeof issueDate === "string" ? issueDate : undefined,
    dueDate: typeof dueDate === "string" ? dueDate : undefined,
    createdBy: req.userId,
  });
  res.status(201).json({ invoice });
});

function requireInvoiceAccess(req, res, next) {
  const invoice = db.findFinanceInvoiceById(req.params.id);
  if (!invoice) return res.status(404).json({ error: "인보이스를 찾을 수 없습니다." });
  if (!db.isSpaceMember(invoice.spaceId, req.userId)) return res.status(403).json({ error: "권한이 없습니다." });
  req.invoice = invoice;
  next();
}

router.get("/invoices/:id", requireAuth, requirePermission("finance", "read"), requireInvoiceAccess, (req, res) => {
  res.json({ invoice: req.invoice, customer: db.findCrmCustomerById(req.invoice.customerId) });
});

router.patch("/invoices/:id", requireAuth, requirePermission("finance", "update"), requireInvoiceAccess, (req, res) => {
  const { status } = req.body || {};
  if (!["draft", "sent", "paid"].includes(status)) {
    return res.status(400).json({ error: "status가 올바르지 않습니다." });
  }
  const invoice = db.setFinanceInvoiceStatus(req.invoice.id, status);
  res.json({ invoice });
});

router.delete("/invoices/:id", requireAuth, requirePermission("finance", "delete"), requireInvoiceAccess, (req, res) => {
  db.deleteFinanceInvoice(req.invoice.id);
  res.status(204).end();
});

module.exports = router;
