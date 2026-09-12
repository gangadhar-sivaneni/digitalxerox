import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import type { User } from "../../types";
import { LogoutIcon } from "../ui/Icons";

export interface NavItem {
  to: string;
  end?: boolean;
  label: string;
}

interface AppShellProps {
  /** Brand block rendered instead of the default Digital Xerox wordmark. */
  brand?: ReactNode;
  navItems: NavItem[];
  /** Extra content on the right (before the user chip). */
  right?: ReactNode;
  /** Extra classes for the app bar (e.g. "staffbar" or "admin"). */
  appbarClassName?: string;
}

function initials(user: User): string {
  return (user.name || user.email || "?").charAt(0).toUpperCase();
}

/**
 * One application shell for every role. Roles change the navigation and what
 * the user can reach — never the branding, typography or visual system.
 */
export function AppShell({ brand, navItems, right, appbarClassName }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="view">
      <div className="app">
        <div className={"appbar" + (appbarClassName ? " " + appbarClassName : "")}>
          {brand ?? (
            <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
              <div className="mark">XR</div>
              <div className="wm">
                <b>Digital</b> <span>Xerox</span>
              </div>
            </div>
          )}

          <nav className="appnav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) => (isActive ? "on" : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sp"></div>

          {right}

          <button
            className="iconbtn"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            style={{ marginRight: 6 }}
          >
            {LogoutIcon}
          </button>

          <div className="who" style={{ cursor: "default" }}>
            <span className="av">{user ? initials(user) : "?"}</span>
            <span>{user ? user.name.split(" ")[0] : ""}</span>
          </div>
        </div>

        <Outlet />
      </div>
    </section>
  );
}

