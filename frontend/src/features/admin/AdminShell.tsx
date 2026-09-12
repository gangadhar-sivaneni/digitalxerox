import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { useAuth } from "../auth/AuthContext";

export function AdminShell() {
  const { user } = useAuth();
  return (
    <AppShell
      brand={
        <div className="brand">
          <div className="mark">XR</div>
          <div className="wm">
            <b>Digital</b> <span>Xerox</span> <em>Admin</em>
          </div>
        </div>
      }
      navItems={[
        { to: "/admin", end: true, label: "Overview" },
        { to: "/admin/pricing", label: "Pricing" },
        { to: "/admin/products", label: "Products" },
        { to: "/admin/staff", label: "Staff" },
        { to: "/admin/audits", label: "Audits" },
      ]}
      appbarClassName="admin"
      right={
        user?.role === "ADMIN" ? (
          <Link className="s-link" to="/staff">Operations ↗</Link>
        ) : null
      }
    />
  );
}