import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import type { User } from "../types";
import Icon from "./Icon";

interface Props {
  currentUser: User;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

export default function ProfileModal({ currentUser, onClose, onUpdated }: Props) {
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    if (!name.trim()) {
      setProfileError("이름을 입력하세요.");
      return;
    }
    setProfileSaving(true);
    try {
      const { user } = await api.updateProfile({ name: name.trim(), department: department.trim() });
      onUpdated(user);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "프로필 수정에 실패했습니다.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 8) {
      setPasswordError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <h3>내 정보</h3>
          <button className="link-button" onClick={onClose}>
            <Icon name="close" size={14} /> 닫기
          </button>
        </div>

        <form onSubmit={handleProfileSubmit} className="profile-section">
          <div className="profile-section-title">
            <Icon name="user" size={15} /> 프로필
          </div>
          <label>
            이름
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            부서
            <input value={department} onChange={(e) => setDepartment(e.target.value)} />
          </label>
          {profileError && <p className="auth-error">{profileError}</p>}
          {profileSaved && <p className="profile-success">저장되었습니다.</p>}
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? "저장 중..." : "프로필 저장"}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="profile-section">
          <div className="profile-section-title">
            <Icon name="lock" size={15} /> 비밀번호 변경
          </div>
          <label>
            현재 비밀번호
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            새 비밀번호 (8자 이상)
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {passwordError && <p className="auth-error">{passwordError}</p>}
          {passwordSaved && <p className="profile-success">비밀번호가 변경되었습니다.</p>}
          <button type="submit" disabled={passwordSaving}>
            {passwordSaving ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
