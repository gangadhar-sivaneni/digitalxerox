import { useAuth } from "../auth/AuthContext";
import { useLive } from "../../hooks/useLive";
import { listAudits } from "../../services/api/admin";
import type { AuditEntry } from "../../types";
import { displayQueueText } from "../../utils/format";

function clock(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ACTION_LABEL: Record<string, string> = {
  PRICE_CHANGED: "Price changed",
  PRODUCT_CREATED: "Product created",
  PRODUCT_UPDATED: "Product updated",
  PRODUCT_DELETED: "Product deleted",
  STAFF_CREATED: "Staff created",
  STAFF_UPDATED: "Staff updated",
  STAFF_ACCESS_RESET: "Staff access reset",
  SETTINGS_CHANGED: "Settings changed",
  STATUS_CHANGED: "Status changed",
  ORDER_REJECTED: "Order rejected",
  REFUND_INITIATED: "Refund initiated",
  ORDER_CREATED: "Order created",
  SEED: "Seed",
};

function actionLabel(a: string): string {
  return ACTION_LABEL[a] ?? a.replace(/_/g, " ");
}

function summary(a: AuditEntry): string {
  const m = a.meta || {};
  switch (a.action) {
    case "PRICE_CHANGED":
      return `${m.paper} ${m.colorMode === "color" ? "Colour" : "B&W"}: ₹${Number(m.ratePaiseBefore) / 100} → ₹${Number(m.ratePaiseAfter) / 100}`;
    case "PRODUCT_UPDATED":
      if (m.stockBefore !== m.stockAfter) return `stock ${m.stockBefore} → ${m.stockAfter}`;
      if (m.priceBefore !== m.priceAfter) return `price ₹${Number(m.priceBefore) / 100} → ₹${Number(m.priceAfter) / 100}`;
      if (m.activeBefore !== m.activeAfter) return m.activeAfter ? "reactivated" : "deactivated";
      return "updated";
    case "ORDER_REJECTED":
      return String(m.reason || "");
    case "REFUND_INITIATED":
      return displayQueueText(`₹${Number(m.amountPaise) / 100} · ${m.orderToken ?? ""}`);
    case "STATUS_CHANGED":
      return `${m.from || ""} → ${m.to || ""}`;
    default:
      return "";
  }
}

export function AuditPage() {
  const { token } = useAuth();
  const { data, loading, error } = useLive(() => listAudits(token ?? ""), { intervalMs: 60_000 });
  const audits = data ?? [];

  return (
    <div className="apage">
      <div className="page page-wide">
        <div className="page-title">Audit log</div>
        <p className="page-sub">Every price, product, inventory, staff and refund action, with the actor who did it.</p>

        {error ? (
          <div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600 }}>
            {(error as Error).message}
          </div>
        ) : loading ? (
          <div className="panel panel-pad">Loading…</div>
        ) : audits.length === 0 ? (
          <div className="panel panel-pad muted" style={{ textAlign: "center" }}>No audit records match.</div>
        ) : (
          <table className="otable">
            <thead>
              <tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.auditId} style={{ cursor: "default" }}>
                  <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12.5 }}>{clock(a.at)}</td>
                  <td>
                    <b>{a.actorName ?? a.actorId}</b>
                    <div className="det">{a.actorRole}</div>
                  </td>
                  <td><span className="badge sq" style={{ borderColor: "var(--line-2)" }}>{actionLabel(a.action)}</span></td>
                  <td className="muted mono">{a.targetKind}{a.targetId ? " · " + a.targetId : ""}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{summary(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}