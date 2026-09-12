import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { BellIcon } from "../../components/ui/Icons";

function Bell({ hasUnread }: { hasUnread: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      className="iconbtn"
      aria-label="Notifications"
      title="Notifications"
      onClick={() => navigate("/student/notifications")}
    >
      {BellIcon}
      {hasUnread ? <span className="dotn"></span> : null}
    </button>
  );
}

export function StudentShell() {
  const { unread } = useAuth();
  return (
    <AppShell
      navItems={[
        { to: "/student", end: true, label: "Dashboard" },
        { to: "/student/order", label: "New order" },
        { to: "/student/track", label: "Track" },
        { to: "/student/history", label: "History" },
      ]}
      right={<Bell hasUnread={unread > 0} />}
    />
  );
}