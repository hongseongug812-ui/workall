import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setAuthToken } from "../api";
import { connectSocket, disconnectSocket } from "../socket";
import type { User } from "../types";

const STORAGE_KEY = "messenger-mvp:token";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; department: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((token: string, nextUser: User) => {
    localStorage.setItem(STORAGE_KEY, token);
    setAuthToken(token);
    connectSocket(token);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    api
      .me()
      .then(({ user: me }) => applySession(token, me))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setAuthToken(null);
      })
      .finally(() => setLoading(false));
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: nextUser } = await api.login({ email, password });
      applySession(token, nextUser);
    },
    [applySession]
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string; department: string }) => {
      const { token, user: nextUser } = await api.register(data);
      applySession(token, nextUser);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    disconnectSocket();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
