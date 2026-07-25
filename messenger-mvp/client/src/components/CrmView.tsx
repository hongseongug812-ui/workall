import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { CrmCustomField, CrmCustomer, CrmFieldType, CrmLead, CrmLeadStage, Space, User } from "../types";
import Icon from "./Icon";
import NewCrmCustomerModal from "./NewCrmCustomerModal";
import CrmCustomerDetailModal from "./CrmCustomerDetailModal";
import CrmLeadPipeline from "./CrmLeadPipeline";

interface Props {
  currentUser: User;
  users: User[];
}

type Tab = "customers" | "pipeline";

export default function CrmView({ currentUser, users }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [fields, setFields] = useState<CrmCustomField[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<CrmFieldType>("text");
  const [fieldOptions, setFieldOptions] = useState("");

  useEffect(() => {
    api.listSpaces().then(({ spaces: list }) => {
      setSpaces(list);
      if (list.length > 0) setActiveSpaceId((prev) => prev || list[0].id);
    });
  }, []);

  const refreshCustomers = useCallback((spaceId: string) => {
    api.listCrmCustomers(spaceId, { q: query || undefined, sortBy, order }).then(({ customers: list }) => setCustomers(list));
  }, [query, sortBy, order]);

  const refreshFields = useCallback((spaceId: string) => {
    api.listCrmFields(spaceId).then(({ fields: list }) => setFields(list));
  }, []);

  const refreshLeads = useCallback((spaceId: string) => {
    api.listCrmLeads(spaceId).then(({ leads: list }) => setLeads(list));
  }, []);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshCustomers(activeSpaceId);
    refreshFields(activeSpaceId);
    refreshLeads(activeSpaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId]);

  useEffect(() => {
    if (!activeSpaceId) return;
    refreshCustomers(activeSpaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortBy, order]);

  async function handleCreateCustomer(data: { name: string; email?: string; phone?: string }) {
    if (!activeSpaceId) return;
    const { customer } = await api.createCrmCustomer({ spaceId: activeSpaceId, ...data });
    setCustomers((prev) => [customer, ...prev]);
    setShowNewCustomer(false);
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSpaceId || !fieldLabel.trim()) return;
    const options = fieldType === "select" ? fieldOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const { field } = await api.createCrmField({ spaceId: activeSpaceId, label: fieldLabel.trim(), type: fieldType, options });
    setFields((prev) => [...prev, field]);
    setFieldLabel("");
    setFieldOptions("");
    setShowAddField(false);
  }

  async function handleMoveLead(leadId: string, stage: CrmLeadStage) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    await api.moveCrmLead(leadId, stage);
  }

  async function handleCreateLead(customerId: string, title: string, stage: CrmLeadStage) {
    if (!activeSpaceId) return;
    const { lead } = await api.createCrmLead({ spaceId: activeSpaceId, customerId, title, stage });
    setLeads((prev) => [...prev, lead]);
  }

  async function handleDeleteLead(leadId: string) {
    await api.deleteCrmLead(leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  }

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
          <button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>
            <Icon name="users" size={15} /> 고객 목록
          </button>
          <button className={tab === "pipeline" ? "active" : ""} onClick={() => setTab("pipeline")}>
            <Icon name="board" size={15} /> 리드 파이프라인
          </button>
        </div>
      </div>

      <div className="projects-main">
        {!activeSpaceId && (
          <div className="projects-empty-state">
            <Icon name="users" size={40} />
            <p>스페이스를 먼저 선택하세요. (프로젝트 메뉴에서 스페이스를 생성할 수 있어요)</p>
          </div>
        )}

        {activeSpaceId && tab === "customers" && (
          <>
            <div className="projects-main-header">
              <h2>고객 목록</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="link-button" onClick={() => setShowAddField(true)}>
                  <Icon name="plus" size={12} /> 필드 추가
                </button>
                <button onClick={() => setShowNewCustomer(true)}>
                  <Icon name="plus" size={14} /> 새 고객
                </button>
              </div>
            </div>

            <div className="crm-filter-row">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름, 이메일, 전화, 필드값 검색..." />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="createdAt">등록일</option>
                <option value="name">이름</option>
                <option value="updatedAt">수정일</option>
              </select>
              <select value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>

            <div className="task-list-view">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>이메일</th>
                    <th>전화번호</th>
                    {fields.map((f) => (
                      <th key={f.id}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="task-table-title" onClick={() => setActiveCustomerId(c.id)}>{c.name}</td>
                      <td>{c.email || "-"}</td>
                      <td>{c.phone || "-"}</td>
                      {fields.map((f) => (
                        <td key={f.id}>{c.customFields[f.id] || "-"}</td>
                      ))}
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan={3 + fields.length} className="sidebar-empty">고객이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSpaceId && tab === "pipeline" && (
          <>
            <div className="projects-main-header">
              <h2>리드 파이프라인</h2>
            </div>
            <CrmLeadPipeline
              leads={leads}
              customers={customers}
              onMoveLead={handleMoveLead}
              onCreateLead={handleCreateLead}
              onDeleteLead={handleDeleteLead}
            />
          </>
        )}
      </div>

      {showNewCustomer && <NewCrmCustomerModal onCancel={() => setShowNewCustomer(false)} onCreate={handleCreateCustomer} />}

      {showAddField && (
        <div className="modal-backdrop" onClick={() => setShowAddField(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleAddField}>
            <h3>커스텀 필드 추가</h3>
            <label>
              필드 이름
              <input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="예: 회사 규모" autoFocus />
            </label>
            <label>
              타입
              <select value={fieldType} onChange={(e) => setFieldType(e.target.value as CrmFieldType)}>
                <option value="text">텍스트</option>
                <option value="number">숫자</option>
                <option value="date">날짜</option>
                <option value="select">선택 목록</option>
              </select>
            </label>
            {fieldType === "select" && (
              <label>
                선택 옵션 (쉼표로 구분)
                <input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} placeholder="광고, 소개, 직접유입" />
              </label>
            )}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowAddField(false)}>취소</button>
              <button type="submit">추가</button>
            </div>
          </form>
        </div>
      )}

      {activeCustomerId && (
        <CrmCustomerDetailModal
          customerId={activeCustomerId}
          fields={fields}
          users={users}
          currentUser={currentUser}
          onClose={() => setActiveCustomerId(null)}
          onChanged={(updated) => setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
          onDeleted={(id) => setCustomers((prev) => prev.filter((c) => c.id !== id))}
        />
      )}
    </div>
  );
}
