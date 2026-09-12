import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../hooks/useApi";
import { getStaffStats, listStaffOrders } from "../../services/api/staff";
import { clockFrom, displayToken, rupees } from "../../utils/format";
import { fullSpec } from "../../utils/format";
import type { StaffRow } from "../../types";

export function CompletedPage() {
  const { token } = useAuth();
  const statsApi = useApi(() => getStaffStats(token ?? ""));
  const rowsApi = useApi(() => listStaffOrders(token ?? "", "completed"));

  const rows: StaffRow[] = rowsApi.data ?? [];
  const revenue = statsApi.data?.revenuePaise ?? 0;
  const count = statsApi.data?.completedToday ?? rows.length;

  return (
    <div className="fpage">
      <div className="page page-wide">
        <div className="page-title">Completed today</div>
        <p className="page-sub">
          {count} order{count === 1 ? "" : "s"} · {rupees(revenue)} collected
        </p>

        {rowsApi.error ? (
          <div className="panel panel-pad" style={{ marginTop: 18, color: "var(--st-rej)", fontWeight: 600 }}>
            {(rowsApi.error as Error).message}
          </div>
        ) : (
          <table className="otable" style={{ marginTop: 18 }}>
            <thead>
              <tr><th>Token</th><th>Document</th><th>Config</th><th className="r">Amount</th><th>Collected</th></tr>
            </thead>
            <tbody>
              {rowsApi.loading ? (
                <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 22 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 22 }}>Nothing collected yet today.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.orderId}>
                    <td className="tk">{displayToken(r.token)}</td>
                    <td className="doc"><span className="fi-sm"></span>{r.fileName || "Stationery order"}</td>
                    <td className="cfg">{fullSpec({ pageCount: r.pageCount, copies: r.copies })}</td>
                    <td className="r mono">{rupees(r.totalPaise)}</td>
                    <td className="muted">{r.completedAt ? clockFrom(r.completedAt) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}