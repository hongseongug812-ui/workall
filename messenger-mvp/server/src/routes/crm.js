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

// ---- 커스텀 필드 ----

router.get("/fields", requireAuth, requirePermission("crm", "read"), requireSpaceParam, (req, res) => {
  res.json({ fields: db.listCrmCustomFields(req.spaceId) });
});

router.post("/fields", requireAuth, requirePermission("crm", "write"), (req, res) => {
  const { spaceId, label, type, options } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof label !== "string" || !label.trim()) {
    return res.status(400).json({ error: "필드 이름을 입력하세요." });
  }
  if (type !== undefined && !["text", "number", "date", "select"].includes(type)) {
    return res.status(400).json({ error: "type이 올바르지 않습니다." });
  }
  const field = db.createCrmCustomField(spaceId, {
    label: label.trim(),
    type,
    options: Array.isArray(options) ? options : undefined,
  });
  res.status(201).json({ field });
});

router.delete("/fields/:id", requireAuth, requirePermission("crm", "delete"), (req, res) => {
  db.deleteCrmCustomField(req.params.id);
  res.status(204).end();
});

// ---- 고객사 및 연락처 ----

router.get("/customers", requireAuth, requirePermission("crm", "read"), requireSpaceParam, (req, res) => {
  const { q, sortBy, order } = req.query;
  const customers = db.listCrmCustomers(req.spaceId, {
    q: typeof q === "string" ? q : undefined,
    sortBy: typeof sortBy === "string" ? sortBy : undefined,
    order: typeof order === "string" ? order : undefined,
  });
  res.json({ customers });
});

router.post("/customers", requireAuth, requirePermission("crm", "write"), (req, res) => {
  const { spaceId, name, email, phone } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "고객명을 입력하세요." });
  }
  const customer = db.createCrmCustomer({ spaceId, name: name.trim(), email, phone, createdBy: req.userId });
  res.status(201).json({ customer });
});

function requireCustomerAccess(req, res, next) {
  const customer = db.findCrmCustomerById(req.params.id);
  if (!customer) return res.status(404).json({ error: "고객을 찾을 수 없습니다." });
  if (!db.isSpaceMember(customer.spaceId, req.userId)) {
    return res.status(403).json({ error: "이 고객 정보에 접근할 권한이 없습니다." });
  }
  req.customer = customer;
  next();
}

router.get("/customers/:id", requireAuth, requirePermission("crm", "read"), requireCustomerAccess, (req, res) => {
  res.json({ customer: req.customer, activities: db.listCrmActivities(req.customer.id) });
});

router.patch("/customers/:id", requireAuth, requirePermission("crm", "update"), requireCustomerAccess, (req, res) => {
  const { name, email, phone } = req.body || {};
  const customer = db.updateCrmCustomer(req.customer.id, { name, email, phone });
  res.json({ customer });
});

router.delete("/customers/:id", requireAuth, requirePermission("crm", "delete"), requireCustomerAccess, (req, res) => {
  db.deleteCrmCustomer(req.customer.id);
  res.status(204).end();
});

router.put(
  "/customers/:id/fields/:fieldId",
  requireAuth,
  requirePermission("crm", "update"),
  requireCustomerAccess,
  (req, res) => {
    const { value } = req.body || {};
    const customer = db.setCrmCustomValue(req.customer.id, req.params.fieldId, typeof value === "string" ? value : "");
    res.json({ customer });
  }
);

// ---- 활동 타임라인 ----

router.get("/customers/:id/activities", requireAuth, requirePermission("crm", "read"), requireCustomerAccess, (req, res) => {
  res.json({ activities: db.listCrmActivities(req.customer.id) });
});

router.post("/customers/:id/activities", requireAuth, requirePermission("crm", "write"), requireCustomerAccess, (req, res) => {
  const { type, content } = req.body || {};
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "내용을 입력하세요." });
  }
  if (type !== undefined && !["meeting", "call", "email", "note"].includes(type)) {
    return res.status(400).json({ error: "type이 올바르지 않습니다." });
  }
  const activity = db.addCrmActivity({ customerId: req.customer.id, type, content: content.trim(), createdBy: req.userId });
  res.status(201).json({ activity });
});

// ---- 리드 파이프라인 ----

router.get("/leads", requireAuth, requirePermission("crm", "read"), requireSpaceParam, (req, res) => {
  res.json({ leads: db.listCrmLeads(req.spaceId), stages: db.CRM_STAGES });
});

router.post("/leads", requireAuth, requirePermission("crm", "write"), (req, res) => {
  const { spaceId, customerId, title, stage } = req.body || {};
  if (typeof spaceId !== "string" || !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  const customer = db.findCrmCustomerById(customerId);
  if (!customer || customer.spaceId !== spaceId) {
    return res.status(400).json({ error: "올바른 고객을 선택하세요." });
  }
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "리드 제목을 입력하세요." });
  }
  const lead = db.createCrmLead({ spaceId, customerId, title: title.trim(), stage, createdBy: req.userId });
  res.status(201).json({ lead });
});

router.post("/leads/:id/move", requireAuth, requirePermission("crm", "update"), (req, res) => {
  const lead = db.findCrmLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: "리드를 찾을 수 없습니다." });
  if (!db.isSpaceMember(lead.spaceId, req.userId)) {
    return res.status(403).json({ error: "권한이 없습니다." });
  }
  const { stage } = req.body || {};
  const result = db.moveCrmLead(req.params.id, stage);
  if (result.error) return res.status(400).json({ error: "올바른 단계를 지정하세요." });
  res.json({ lead: result.lead });
});

router.delete("/leads/:id", requireAuth, requirePermission("crm", "delete"), (req, res) => {
  const lead = db.findCrmLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: "리드를 찾을 수 없습니다." });
  if (!db.isSpaceMember(lead.spaceId, req.userId)) {
    return res.status(403).json({ error: "권한이 없습니다." });
  }
  db.deleteCrmLead(req.params.id);
  res.status(204).end();
});

module.exports = router;
