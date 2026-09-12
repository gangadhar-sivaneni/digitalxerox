import { useAuth } from "../auth/AuthContext";
import { useLive } from "../../hooks/useLive";
import { listNotifications, markAllNotificationsRead } from "../../services/api/notifications";
import { displayQueueText } from "../../utils/format";

function clockOrAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function iconFor(kind: string): string {
  switch (kind) {
    case "READY":
      return "M20 6L9 17l-5-5";
    case "REJECTED":
      return "M6 6l12 12M18 6L6 18";
    default:
      return "M5 12h14M13 6l6 6-6 6";
  }
}

export function NotificationsPage() {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLive(() => listNotifications(token ?? ""), { intervalMs: 15_000 });
  const notifications = data ?? [];

  return (
    <div className="spage">
      <div className="page page-narrow">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="page-title">Notifications</div>
            <p className="page-sub" style={{ marginBottom: 14 }}>Order updates from the counter.</p>
          </div>
          {notifications.some((n) => !n.read) ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (token) await markAllNotificationsRead(token);
                reload();
              }}
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600 }}>
            {(error as Error).message}
          </div>
        ) : loading ? (
          <div className="panel panel-pad">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="panel panel-pad muted" style={{ textAlign: "center" }}>
            Nothing here yet. We'll ping you when your order moves.
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div key={n.notificationId} className={"notif" + (n.read ? "" : " unread")}>
                <div className={"ni" + (n.kind === "READY" ? " ready" : n.kind === "REJECTED" ? " rej" : "")}>
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d={iconFor(n.kind)} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="nb">
                  <b>{displayQueueText(n.title)}</b>
                  <p>{displayQueueText(n.body)}</p>
                </div>
                <div className="nt">{clockOrAgo(n.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}