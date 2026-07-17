import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { getSocket } from "../socket";
import type { Attendance, TeamAttendanceEntry, User } from "../types";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  onClose: () => void;
}

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

function formatDuration(checkInAt: string | null, checkOutAt: string | null) {
  if (!checkInAt || !checkOutAt) return "-";
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}시간 ${minutes}분`;
}

export default function AttendancePanel({ currentUser, onClose }: Props) {
  const [today, setToday] = useState<Attendance | null>(null);
  const [team, setTeam] = useState<TeamAttendanceEntry[]>([]);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [todayRes, teamRes, historyRes] = await Promise.all([
      api.getTodayAttendance(),
      api.getTeamAttendanceToday(),
      api.getAttendanceHistory(14),
    ]);
    setToday(todayRes.attendance);
    setTeam(teamRes.team);
    setHistory(historyRes.history);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "출퇴근 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));

    const socket = getSocket();
    const onUpdated = () => load().catch(() => {});
    socket.on("attendance:updated", onUpdated);
    return () => {
      socket.off("attendance:updated", onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckIn() {
    setBusy(true);
    setError(null);
    try {
      const { attendance } = await api.checkIn();
      setToday(attendance);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "체크인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    setError(null);
    try {
      const { attendance } = await api.checkOut();
      setToday(attendance);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "체크아웃에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal attendance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>출퇴근</h3>
          <button className="link-button" onClick={onClose}>
            <Icon name="close" size={14} /> 닫기
          </button>
        </div>

        {loading ? (
          <p className="sidebar-empty">불러오는 중...</p>
        ) : (
          <>
            <div className="attendance-today-card">
              <div>
                <div className="attendance-status-label">오늘 ({formatDate(new Date().toLocaleDateString("en-CA"))})</div>
                <div className="attendance-times">
                  <span>출근 {formatTime(today?.checkInAt ?? null)}</span>
                  <span>퇴근 {formatTime(today?.checkOutAt ?? null)}</span>
                </div>
              </div>
              {!today?.checkInAt && (
                <button className="attendance-action-button" onClick={handleCheckIn} disabled={busy}>
                  <Icon name="clock" size={16} /> 출근하기
                </button>
              )}
              {today?.checkInAt && !today?.checkOutAt && (
                <button className="attendance-action-button checkout" onClick={handleCheckOut} disabled={busy}>
                  <Icon name="clock" size={16} /> 퇴근하기
                </button>
              )}
              {today?.checkInAt && today?.checkOutAt && (
                <div className="attendance-done">
                  오늘 근무 완료 · {formatDuration(today.checkInAt, today.checkOutAt)}
                </div>
              )}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div>
              <div className="sidebar-section-header">
                <span>오늘 팀 현황</span>
              </div>
              <ul className="attendance-team-list">
                {team.map((t) => (
                  <li key={t.userId} className="attendance-team-row">
                    <span className={`presence-dot ${t.checkInAt ? "online" : ""}`} />
                    <span className="attendance-team-name">
                      {t.name}
                      {t.userId === currentUser.id ? " (나)" : ""}
                      <span className="member-dept"> · {t.department}</span>
                    </span>
                    <span className="attendance-team-status">
                      {t.checkOutAt
                        ? `퇴근 ${formatTime(t.checkOutAt)}`
                        : t.checkInAt
                          ? `출근 ${formatTime(t.checkInAt)}`
                          : "미출근"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="sidebar-section-header">
                <span>내 최근 기록</span>
              </div>
              <ul className="attendance-history-list">
                {history.length === 0 && <p className="sidebar-empty">기록이 없습니다.</p>}
                {history.map((h) => (
                  <li key={h.id} className="attendance-history-row">
                    <span>{formatDate(h.date)}</span>
                    <span>{formatTime(h.checkInAt)} - {formatTime(h.checkOutAt)}</span>
                    <span className="attendance-history-duration">{formatDuration(h.checkInAt, h.checkOutAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
