import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { PermissionModule, Role, RolePermission, User } from "../types";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface Props {
  currentUser: User;
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "최고 관리자",
  dept_admin: "부서 관리자",
  member: "일반 사용자",
  guest: "게스트",
};

const MODULE_LABEL: Record<PermissionModule, string> = {
  messenger: "메신저",
  project: "프로젝트",
  wiki: "위키",
  crm: "CRM",
  finance: "재무",
  dashboard: "대시보드",
  admin: "관리자",
};

const FLAG_LABEL: { key: keyof Omit<RolePermission, "role" | "module">; label: string }[] = [
  { key: "canRead", label: "읽기" },
  { key: "canWrite", label: "쓰기" },
  { key: "canUpdate", label: "수정" },
  { key: "canDelete", label: "삭제" },
];

export default function AdminView({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = currentUser.role === "super_admin";

  useEffect(() => {
    Promise.all([api.listAdminUsers(), api.listRolePermissions()])
      .then(([usersRes, permsRes]) => {
        setUsers(usersRes.users);
        setRoles(permsRes.roles);
        setModules(permsRes.modules);
        setPermissions(permsRes.permissions);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "관리자 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, role: Role) {
    setError(null);
    try {
      const { user } = await api.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "권한 그룹 변경에 실패했습니다.");
    }
  }

  function getPermission(role: Role, module: PermissionModule) {
    return (
      permissions.find((p) => p.role === role && p.module === module) || {
        role,
        module,
        canRead: false,
        canWrite: false,
        canUpdate: false,
        canDelete: false,
      }
    );
  }

  async function toggleFlag(role: Role, module: PermissionModule, flagKey: keyof Omit<RolePermission, "role" | "module">) {
    if (!canEdit) return;
    const current = getPermission(role, module);
    const next = { ...current, [flagKey]: !current[flagKey] };
    setPermissions((prev) => {
      const exists = prev.some((p) => p.role === role && p.module === module);
      return exists ? prev.map((p) => (p.role === role && p.module === module ? next : p)) : [...prev, next];
    });
    try {
      await api.setRolePermission(role, module, {
        canRead: next.canRead,
        canWrite: next.canWrite,
        canUpdate: next.canUpdate,
        canDelete: next.canDelete,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "권한 변경에 실패했습니다.");
    }
  }

  return (
    <div className="projects-main admin-view-page">
      <div className="projects-main-header">
        <h2>관리자</h2>
      </div>

      {loading && <p className="sidebar-empty">불러오는 중...</p>}
      {error && <p className="auth-error">{error}</p>}
      {!canEdit && !loading && (
        <p className="admin-readonly-hint">
          <Icon name="lock" size={13} /> 최고 관리자만 권한을 변경할 수 있습니다. 지금은 읽기 전용으로 보고 있어요.
        </p>
      )}

      {!loading && (
        <>
          <section className="admin-section">
            <h3>사용자 권한 그룹</h3>
            <div className="task-table-card">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>사용자</th>
                    <th>부서</th>
                    <th>이메일</th>
                    <th>권한 그룹</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="admin-user-cell">
                          <Avatar name={u.name} avatarUrl={u.avatarUrl} size={26} />
                          {u.name}
                          {u.id === currentUser.id && <span className="notification-time"> (나)</span>}
                        </div>
                      </td>
                      <td>{u.department}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={!canEdit}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h3>권한 매트릭스 (권한 그룹 × 모듈)</h3>
            <div className="task-table-card admin-matrix-wrap">
              <table className="task-table admin-matrix-table">
                <thead>
                  <tr>
                    <th>모듈</th>
                    {roles.map((r) => (
                      <th key={r}>{ROLE_LABEL[r]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => (
                    <tr key={m}>
                      <td className="admin-matrix-module">{MODULE_LABEL[m]}</td>
                      {roles.map((r) => {
                        const perm = getPermission(r, m);
                        return (
                          <td key={r}>
                            <div className="admin-flag-group">
                              {FLAG_LABEL.map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  className={`admin-flag-toggle ${perm[f.key] ? "on" : ""}`}
                                  disabled={!canEdit}
                                  title={f.label}
                                  onClick={() => toggleFlag(r, m, f.key)}
                                >
                                  {f.label.slice(0, 1)}
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
