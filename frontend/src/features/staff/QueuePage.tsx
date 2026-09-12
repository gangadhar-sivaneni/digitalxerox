import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DotBadge } from "../../components/ui/Badges";
import { SearchIcon } from "../../components/ui/Icons";
import { useAuth } from "../auth/AuthContext";
import { useLive } from "../../hooks/useLive";
import { getStaffQueue, getStaffStats } from "../../services/api/staff";
import { displayToken, relativeMinLabel, rupees } from "../../utils/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_ST, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_ST } from "../../constants";
import type { OrderStatus, StaffQueueRow } from "../../types";

function Stat({ name, value, mono, tone }: { name: string; value: string; mono?: boolean; tone?: string }) {
  return (
    <div className={"stat" + (tone ? " " + tone : "")}>
      <span className={"sn" + (mono ? " mono" : "")}>{value}</span>
      <span className="sl">{name}</span>
    </div>
  );
}

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "All active" },
  { key: "RECEIVED", label: "Received" },
  { key: "PROCESSING", label: "Processing" },
  { key: "READY", label: "Ready" },
];

function serviceTag(serviceType: string) {
  if (serviceType === "STATIONERY") {
    return <span className="svc-tag stat"><i></i>Stat.</span>;
  }
  if (serviceType === "XEROX") {
    return <span className="svc-tag xerox"><i></i>Xerox</span>;
  }
  return <span className="svc-tag"><i></i>Print</span>;
}

export function QueuePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState("");
  const debounce = useRef<number>();

  // Server-side, debounced search (token, document, student name, student ID).
  useEffect(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => setSearched(q.trim()), 250);
    return () => window.clearTimeout(debounce.current);
  }, [q]);

  const statsApi = useLive(() => getStaffStats(token ?? ""));
  const queueApi = useLive(() => getStaffQueue(token ?? "", searched), { intervalMs: 8000 });

  const rows = useMemo(() => {
    const all = queueApi.data?.rows ?? [];
    if (filter === "all") return all;
    return all.filter((r) => r.status === filter);
  }, [queueApi.data, filter]);

  const stats = statsApi.data;

  return (
    <div className="fpage">
      <div className="page page-wide">
        <div className="stat-row">
          <Stat name="In queue" value={String(stats?.inQueue ?? "—")} />
          <Stat name="Processing" value={String(stats?.processing ?? "—")} tone="proc" />
          <Stat name="Ready to collect" value={String(stats?.ready ?? "—")} tone="ready" />
          <Stat name="Completed today" value={String(stats?.completedToday ?? "—")} />
          <Stat name="Revenue today" value={stats ? rupees(stats.revenuePaise) : "—"} mono />
        </div>

        <div className="toolbar" style={{ marginTop: 22 }}>
          <div className="search">
            {SearchIcon}
            <input
              id="staff-search"
              placeholder="Search token, student, or document…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={"chipf" + (filter === f.key ? " on" : "")}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <div className="sp"></div>
          <span className="hint" style={{ margin: 0 }}>
            Live · updates automatically
          </span>
        </div>

        {statsApi.error || queueApi.error ? (
          <div className="panel panel-pad" style={{ marginTop: 18, color: "var(--st-rej)", fontWeight: 600 }}>
            Could not load the queue.
          </div>
        ) : (
          <table className="otable" id="staff-table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th>Token</th><th>Document</th><th>Type</th><th>Configuration</th>
                <th className="r">Amount</th><th>Payment</th><th>Status</th><th className="r">Waiting</th>
              </tr>
            </thead>
            <tbody>
              {queueApi.loading ? (
                <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 22 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 22 }}>Nothing active right now.</td></tr>
              ) : (
                rows.map((r: StaffQueueRow) => (
                  <tr key={r.orderId} data-token={r.token} data-open="1" onClick={() => navigate("/staff/orders/" + r.token)} style={{ cursor: "pointer" }}>
                    <td className="tk">{displayToken(r.token)}</td>
                    <td className="doc"><span className="fi-sm"></span>{r.fileName || "Stationery order"}{r.studentName ? <span className="det"> · {r.studentName}</span> : null}</td>
                    <td>{serviceTag(r.serviceType)}</td>
                    <td className="cfg">{r.numPages} pg · {r.copies} · {r.paperSize} · {r.colorMode === "color" ? "Colour" : "B&W"} · {r.sides === "double" ? "Double" : "Single"}</td>
                    <td className="r mono">{rupees(r.totalPaise)}</td>
                    <td className="r"><DotBadge st={PAYMENT_STATUS_ST[r.paymentStatus]} label={PAYMENT_STATUS_LABEL[r.paymentStatus]} /></td>
                    <td><DotBadge st={ORDER_STATUS_ST[r.status]} label={ORDER_STATUS_LABEL[r.status]} /></td>
                    <td className="r muted">{relativeMinLabel(r.createdAt)}</td>
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