import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { displayToken } from "../../utils/format";
import { useLive } from "../../hooks/useLive";
import { getStaffQueue } from "../../services/api/staff";

function NowServing() {
  const { token } = useAuth();
  const { data } = useLive(() => getStaffQueue(token ?? ""), { intervalMs: 8000 });
  return (
    <div className="s-serving">
      <span className="l">NOW SERVING</span>
      <span className="t">{data?.nowServing ? displayToken(data.nowServing) : "—"}</span>
    </div>
  );
}

export function StaffShell() {
  const { user } = useAuth();
  return (
    <AppShell
      brand={
        <div className="brand">
          <div className="mark">XR</div>
          <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 15 }}>
            Operations
          </span>
        </div>
      }
      navItems={[
        { to: "/staff", end: true, label: "Queue" },
        { to: "/staff/completed", label: "Completed" },
      ]}
      right={
        <>
          <NowServing />
          {user?.role === "ADMIN" ? (
            <Link className="s-link" to="/admin">Admin ↗</Link>
          ) : null}
        </>
      }
    />
  );
}