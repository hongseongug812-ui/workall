import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { DashboardWidget, Space, User, WidgetSize } from "../types";
import Icon from "./Icon";
import WidgetCard from "./WidgetCard";
import NewWidgetModal from "./NewWidgetModal";

interface Props {
  currentUser: User;
  onNavigateToProjects: () => void;
  onNavigateToWiki: () => void;
}

export default function HomeDashboard({ currentUser, onNavigateToProjects, onNavigateToWiki }: Props) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.listDashboardWidgets().then(({ widgets: list }) => setWidgets(list));
  }, []);

  useEffect(() => {
    refresh();
    api.listSpaces().then(({ spaces: list }) => setSpaces(list));
  }, [refresh]);

  function spaceName(spaceId?: string) {
    return spaces.find((s) => s.id === spaceId)?.name || "-";
  }

  async function handleAddWidget(data: { type: DashboardWidget["type"]; size: WidgetSize; spaceId: string; monthlyGoal?: number }) {
    const { widget } = await api.createDashboardWidget({
      type: data.type,
      size: data.size,
      config: { spaceId: data.spaceId, ...(data.monthlyGoal !== undefined ? { monthlyGoal: data.monthlyGoal } : {}) },
    });
    setWidgets((prev) => [...prev, widget]);
    setShowAddWidget(false);
  }

  async function handleResize(widget: DashboardWidget, size: WidgetSize) {
    setWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, size } : w)));
    await api.updateDashboardWidget(widget.id, { size });
  }

  async function handleDelete(widgetId: string) {
    await api.deleteDashboardWidget(widgetId);
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const ids = widgets.map((w) => w.id);
    const fromIndex = ids.indexOf(dragId);
    const toIndex = ids.indexOf(targetId);
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, dragId);
    setWidgets(ids.map((id) => widgets.find((w) => w.id === id)!));
    setDragId(null);
    setDragOverId(null);
    await api.reorderDashboardWidgets(ids);
  }

  return (
    <div className="projects-main home-dashboard-page">
      <div className="projects-main-header">
        <h2>안녕하세요, {currentUser.name}님</h2>
        <button onClick={() => setShowAddWidget(true)}>
          <Icon name="plus" size={14} /> 위젯 추가
        </button>
      </div>

      {widgets.length === 0 ? (
        <div className="projects-empty-state">
          <Icon name="board" size={40} />
          <p>위젯을 추가해서 나만의 홈 화면을 꾸며보세요.</p>
        </div>
      ) : (
        <div className="widget-grid">
          {widgets.map((w) => (
            <WidgetCard
              key={w.id}
              widget={w}
              spaceName={spaceName(w.config.spaceId)}
              onDragStart={() => setDragId(w.id)}
              onDragOver={() => setDragOverId(w.id)}
              onDrop={() => handleDrop(w.id)}
              dragOver={dragOverId === w.id}
              onResize={(size) => handleResize(w, size)}
              onDelete={() => handleDelete(w.id)}
              onOpenTask={onNavigateToProjects}
              onOpenWikiPage={onNavigateToWiki}
            />
          ))}
        </div>
      )}

      {showAddWidget && (
        <NewWidgetModal spaces={spaces} onCancel={() => setShowAddWidget(false)} onCreate={handleAddWidget} />
      )}
    </div>
  );
}
