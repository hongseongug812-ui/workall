import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import type { CrmActivity, CrmActivityType, CrmCustomField, CrmCustomer, User } from "../types";
import Icon from "./Icon";

interface Props {
  customerId: string;
  fields: CrmCustomField[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onChanged: (customer: CrmCustomer) => void;
  onDeleted: (customerId: string) => void;
}

const ACTIVITY_LABEL: Record<CrmActivityType, string> = { meeting: "미팅", call: "통화", email: "이메일", note: "메모" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CrmCustomerDetailModal({ customerId, fields, users, currentUser, onClose, onChanged, onDeleted }: Props) {
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [activityType, setActivityType] = useState<CrmActivityType>("note");
  const [activityContent, setActivityContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCrmCustomer(customerId)
      .then((res) => {
        setCustomer(res.customer);
        setName(res.customer.name);
        setEmail(res.customer.email || "");
        setPhone(res.customer.phone || "");
        setActivities(res.activities);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "고객 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [customerId]);

  async function saveBase() {
    if (!customer) return;
    const { customer: updated } = await api.updateCrmCustomer(customerId, { name, email, phone });
    setCustomer(updated);
    onChanged(updated);
  }

  async function setFieldValue(fieldId: string, value: string) {
    const { customer: updated } = await api.setCrmCustomValue(customerId, fieldId, value);
    setCustomer(updated);
    onChanged(updated);
  }

  async function handleDelete() {
    if (!confirm("이 고객을 삭제할까요?")) return;
    await api.deleteCrmCustomer(customerId);
    onDeleted(customerId);
    onClose();
  }

  async function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    if (!activityContent.trim()) return;
    const { activity } = await api.addCrmActivity(customerId, { type: activityType, content: activityContent.trim() });
    setActivities((prev) => [activity, ...prev]);
    setActivityContent("");
  }

  function authorName(userId: string) {
    if (userId === currentUser.id) return "나";
    return users.find((u) => u.id === userId)?.name || "알 수 없음";
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>고객</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="link-button" onClick={handleDelete}><Icon name="trash" size={14} /> 삭제</button>
            <button className="link-button" onClick={onClose}><Icon name="close" size={14} /> 닫기</button>
          </div>
        </div>

        {loading && <p className="sidebar-empty">불러오는 중...</p>}
        {error && <p className="auth-error">{error}</p>}

        {customer && (
          <>
            <div className="task-detail-meta-row">
              <label>
                이름
                <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveBase} />
              </label>
              <label>
                이메일
                <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={saveBase} />
              </label>
              <label>
                전화번호
                <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={saveBase} />
              </label>
            </div>

            {fields.length > 0 && (
              <div className="task-detail-section">
                <div className="sidebar-section-header"><span>추가 정보</span></div>
                <div className="task-detail-meta-row">
                  {fields.map((f) => (
                    <label key={f.id}>
                      {f.label}
                      {f.type === "select" ? (
                        <select
                          defaultValue={customer.customFields[f.id] || ""}
                          onChange={(e) => setFieldValue(f.id, e.target.value)}
                        >
                          <option value="">-</option>
                          {(f.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                          defaultValue={customer.customFields[f.id] || ""}
                          onBlur={(e) => setFieldValue(f.id, e.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="task-detail-section">
              <div className="sidebar-section-header"><span>활동 타임라인 ({activities.length})</span></div>
              <ul className="task-comment-list">
                {activities.map((a) => (
                  <li key={a.id} className="task-comment-row">
                    <span className={`priority-badge activity-badge-${a.type}`}>{ACTIVITY_LABEL[a.type]}</span>
                    <div>
                      <div className="task-comment-meta">
                        <strong>{authorName(a.createdBy)}</strong>
                        <span className="notification-time">{formatDateTime(a.createdAt)}</span>
                      </div>
                      <div>{a.content}</div>
                    </div>
                  </li>
                ))}
                {activities.length === 0 && <p className="sidebar-empty">활동 기록이 없습니다.</p>}
              </ul>
              <form onSubmit={handleAddActivity} className="crm-activity-form">
                <select value={activityType} onChange={(e) => setActivityType(e.target.value as CrmActivityType)}>
                  {(Object.keys(ACTIVITY_LABEL) as CrmActivityType[]).map((t) => (
                    <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>
                  ))}
                </select>
                <input value={activityContent} onChange={(e) => setActivityContent(e.target.value)} placeholder="활동 내용 입력..." />
                <button type="submit"><Icon name="send" size={16} /></button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
