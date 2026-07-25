const express = require("express");
const db = require("../db");
const { requireAuth, requirePermission } = require("../auth");
const { publicUser } = require("./auth");

const router = express.Router();

// 사용자 목록 + 현재 롤 (관리자 화면의 사용자-권한 매핑 표)
router.get("/users", requireAuth, requirePermission("admin", "read"), (req, res) => {
  res.json({ users: db.listUsers().map(publicUser) });
});

// 사용자 롤 변경은 조직 전체 권한 구조를 바꾸는 작업이라 super_admin만 허용한다.
router.patch("/users/:id/role", requireAuth, requirePermission("admin", "update"), (req, res) => {
  if (req.userRole !== "super_admin") {
    return res.status(403).json({ error: "최고 관리자만 권한 그룹을 변경할 수 있습니다." });
  }
  const { role } = req.body || {};
  if (!db.ROLES.includes(role)) {
    return res.status(400).json({ error: `role은 다음 중 하나여야 합니다: ${db.ROLES.join(", ")}` });
  }
  const result = db.updateUserRole(req.params.id, role);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ user: publicUser(result.user) });
});

// 권한 그룹 x 모듈 매트릭스 조회
router.get("/permissions", requireAuth, requirePermission("admin", "read"), (req, res) => {
  res.json({ roles: db.ROLES, modules: db.MODULES, permissions: db.listRolePermissions() });
});

// 권한 그룹 x 모듈 매트릭스 수정 (읽기/쓰기/수정/삭제 가능 여부)
router.put("/permissions/:role/:module", requireAuth, requirePermission("admin", "update"), (req, res) => {
  if (req.userRole !== "super_admin") {
    return res.status(403).json({ error: "최고 관리자만 권한을 변경할 수 있습니다." });
  }
  const { role, module } = req.params;
  const { canRead, canWrite, canUpdate, canDelete } = req.body || {};
  const result = db.setRolePermission(role, module, { canRead, canWrite, canUpdate, canDelete });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ permission: { role, module, ...result.permission } });
});

module.exports = router;
