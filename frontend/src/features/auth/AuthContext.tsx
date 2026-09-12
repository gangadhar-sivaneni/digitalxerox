import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_HOME } from "../../constants";
import { apiPost } from "../../services/api/client";
import { me } from "../../services/api/auth";
import { clearSession, loadSession, saveSession } from "../../services/storage/session";
import type { Session, User } from "../../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  authenticated: boolean;
  loading: boolean;
  unread: number;
  login: (email: string, password: string, next?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  homePath: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const sessionToken = session?.token;

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    me(sessionToken)
      .then((res) => {
        if (cancelled) return;
        const fresh = { token: sessionToken, user: res.user };
        saveSession(fresh);
        setSession(fresh);
        setUnread(res.unread);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setSession(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  // Live unread count for the notification bell — the page never needs a
  // manual refresh to show "Order ready" events arriving from the counter.
  useEffect(() => {
    if (!sessionToken) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      me(sessionToken).then(
        (res) => setUnread(res.unread),
        () => undefined
      );
    }, 30_000);
    return () => window.clearInterval(id);
  }, [sessionToken]);

  const login = useCallback(
    async (email: string, password: string, next?: string) => {
      const data = await apiPost<Session>("/auth/login", { email, password });
      saveSession(data);
      setSession(data);
      setUnread(0);
      navigate(next && next.startsWith("/") ? next : ROLE_HOME[data.user.role], { replace: true });
    },
    [navigate]
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const res = await me(sessionToken);
      const fresh = { token: sessionToken, user: res.user };
      saveSession(fresh);
      setSession(fresh);
      setUnread(res.unread);
    } catch {
      /* session revalidation happens elsewhere; keep the cached profile */
    }
  }, [sessionToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      authenticated: Boolean(session),
      loading,
      unread,
      login,
      logout,
      refreshUser,
      homePath: session ? ROLE_HOME[session.user.role] : "/login",
    }),
    [session, loading, unread, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}