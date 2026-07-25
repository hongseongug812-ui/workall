import { useState } from "react";
import type { CrmCustomer, CrmLead, CrmLeadStage } from "../types";
import Icon from "./Icon";

interface Props {
  leads: CrmLead[];
  customers: CrmCustomer[];
  onMoveLead: (leadId: string, stage: CrmLeadStage) => void;
  onCreateLead: (customerId: string, title: string, stage: CrmLeadStage) => Promise<void>;
  onDeleteLead: (leadId: string) => void;
}

const STAGES: { key: CrmLeadStage; label: string }[] = [
  { key: "prospecting", label: "발굴" },
  { key: "meeting", label: "미팅" },
  { key: "proposal", label: "제안" },
  { key: "won", label: "계약 완료" },
];

function customerName(customers: CrmCustomer[], id: string) {
  return customers.find((c) => c.id === id)?.name || "?";
}

export default function CrmLeadPipeline({ leads, customers, onMoveLead, onCreateLead, onDeleteLead }: Props) {
  const [dragOverStage, setDragOverStage] = useState<CrmLeadStage | null>(null);
  const [addingStage, setAddingStage] = useState<CrmLeadStage | null>(null);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newTitle, setNewTitle] = useState("");

  async function handleAdd(stage: CrmLeadStage) {
    if (!newCustomerId || !newTitle.trim()) return;
    await onCreateLead(newCustomerId, newTitle.trim(), stage);
    setNewTitle("");
    setNewCustomerId("");
    setAddingStage(null);
  }

  return (
    <div className="kanban-board">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.key);
        return (
          <div
            key={stage.key}
            className={`kanban-column ${dragOverStage === stage.key ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
            onDragLeave={() => setDragOverStage((prev) => (prev === stage.key ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              const leadId = e.dataTransfer.getData("text/lead-id");
              if (leadId) onMoveLead(leadId, stage.key);
              setDragOverStage(null);
            }}
          >
            <div className="kanban-column-header">
              <span>{stage.label}</span>
              <span className="kanban-column-count">{stageLeads.length}</span>
            </div>
            <div className="kanban-column-body">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)}
                >
                  <div className="kanban-card-title">{lead.title}</div>
                  <div className="kanban-card-meta">
                    <span>{customerName(customers, lead.customerId)}</span>
                  </div>
                  <button className="link-button" onClick={() => onDeleteLead(lead.id)}>
                    <Icon name="trash" size={11} />
                  </button>
                </div>
              ))}

              {addingStage === stage.key ? (
                <div className="kanban-add-task-form" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <select value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)}>
                    <option value="">고객 선택</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="리드 제목"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd(stage.key)}
                  />
                  <button className="link-button" onClick={() => handleAdd(stage.key)}>추가</button>
                </div>
              ) : (
                <button className="kanban-add-task" onClick={() => setAddingStage(stage.key)}>
                  <Icon name="plus" size={14} /> 리드 추가
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
