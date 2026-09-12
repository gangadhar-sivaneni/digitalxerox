import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROLE_HOME } from "../../constants";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../types";

/** Full-page placeholder while the session is being validated on boot. */
function AuthLoading() {
  return (
    <div style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
      <div className="muted" style={{ fontFamily: "var(--f-mono)", fontSize: 13 }}>
        Signing you in…
      </div>
    </div>
  );
}

function useRequireRole(roles: Role[]): { allowed: boolean; redirectTo: string } {
  const { authenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return { allowed: false, redirectTo: "" };

  if (!authenticated || !user) {
    return {
      allowed: false,
      redirectTo:
        "/login" + (location.pathname !== "/login" ? "?next=" + encodeURIComponent(location.pathname) : ""),
    };
  }
  if (!roles.includes(user.role)) {
    return { allowed: false, redirectTo: ROLE_HOME[user.role] };
  }
  return { allowed: true, redirectTo: "" };
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { allowed, redirectTo } = useRequireRole(["STUDENT", "STAFF", "ADMIN"]);
  const { loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!allowed) return <Navigate to={redirectTo || "/login"} replace />;
  return <>{children}</>;
}

export function RequireStudent({ children }: { children: ReactNode }) {
  const { allowed, redirectTo } = useRequireRole(["STUDENT"]);
  const { loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!allowed) return <Navigate to={redirectTo || "/login"} replace />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const { allowed, redirectTo } = useRequireRole(["STAFF", "ADMIN"]);
  if (loading) return <AuthLoading />;
  if (!allowed) return <Navigate to={redirectTo || "/login"} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const { allowed, redirectTo } = useRequireRole(["ADMIN"]);
  if (loading) return <AuthLoading />;
  if (!allowed) return <Navigate to={redirectTo || "/login"} replace />;
  return <>{children}</>;
}