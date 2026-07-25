const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");

const router = express.Router();

const WIDGET_TYPES = ["my_tasks", "recent_wiki", "finance_progress", "new_leads"];

router.get("/widgets", requireAuth, requirePermission("dashboard", "read"), (req, res) => {
  res.json({ widgets: db.listDashboardWidgets(req.userId) });
});

router.post("/widgets", requireAuth, requirePermission("dashboard", "write"), (req, res) => {
  const { type, size, config } = req.body || {};
  if (!WIDGET_TYPES.includes(type)) {
    return res.status(400).json({ error: `type은 다음 중 하나여야 합니다: ${WIDGET_TYPES.join(", ")}` });
  }
  if (size !== undefined && !["small", "medium", "large"].includes(size)) {
    return res.status(400).json({ error: "size가 올바르지 않습니다." });
  }
  if (config?.spaceId && !db.isSpaceMember(config.spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  const widget = db.createDashboardWidget(req.userId, { type, size, config });
  res.status(201).json({ widget });
});

router.patch("/widgets/:id", requireAuth, requirePermission("dashboard", "update"), (req, res) => {
  const { size, config } = req.body || {};
  if (config?.spaceId && !db.isSpaceMember(config.spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  const widget = db.updateDashboardWidget(req.params.id, req.userId, { size, config });
  if (!widget) return res.status(404).json({ error: "위젯을 찾을 수 없습니다." });
  res.json({ widget });
});

router.post("/widgets/reorder", requireAuth, requirePermission("dashboard", "update"), (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds 배열이 필요합니다." });
  }
  res.json({ widgets: db.reorderDashboardWidgets(req.userId, orderedIds) });
});

router.delete("/widgets/:id", requireAuth, requirePermission("dashboard", "delete"), (req, res) => {
  const ok = db.deleteDashboardWidget(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: "위젯을 찾을 수 없습니다." });
  res.status(204).end();
});

// 위젯이 실제로 화면에 그릴 데이터. type별로 필요한 모듈의 요약 함수를 호출한다.
router.get("/widgets/:id/data", requireAuth, requirePermission("dashboard", "read"), (req, res) => {
  const widgets = db.listDashboardWidgets(req.userId);
  const widget = widgets.find((w) => w.id === req.params.id);
  if (!widget) return res.status(404).json({ error: "위젯을 찾을 수 없습니다." });

  const spaceId = widget.config?.spaceId;
  if (spaceId && !db.isSpaceMember(spaceId, req.userId)) {
    return res.status(403).json({ error: "이 스페이스의 멤버가 아닙니다." });
  }
  if (!spaceId) {
    return res.json({ configured: false });
  }

  if (widget.type === "my_tasks") {
    return res.json({ configured: true, tasks: db.listMyDueTasks(spaceId, req.userId) });
  }
  if (widget.type === "recent_wiki") {
    return res.json({ configured: true, pages: db.listRecentWikiPages(spaceId, 5) });
  }
  if (widget.type === "finance_progress") {
    const summary = db.financeSummary(spaceId, { months: 1 });
    const currentIncome = summary.cashflow[summary.cashflow.length - 1]?.income || 0;
    const goal = Number(widget.config?.monthlyGoal) || 0;
    return res.json({ configured: true, currentIncome, goal, month: summary.currentMonth });
  }
  if (widget.type === "new_leads") {
    return res.json({ configured: true, count: db.countNewLeadsThisWeek(spaceId) });
  }
  return res.status(400).json({ error: "알 수 없는 위젯 타입입니다." });
});

module.exports = router;
