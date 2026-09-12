import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrderBadge } from "../../components/ui/Badges";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../hooks/useApi";
import { listMyOrders } from "../../services/api/orders";
import { displayToken, fullSpec, rupees } from "../../utils/format";
import type { Order, OrderStatus } from "../../types";

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "PROCESSING", label: "Processing" },
  { key: "READY", label: "Ready" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
];

function dayGroup(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "TODAY";
  const yesterday = new Date(today.getTime() - 86400000);
  if (same(d, yesterday)) return "YESTERDAY";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

export function HistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useApi(() => listMyOrders(token ?? ""));
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const groups = useMemo(() => {
    const rows = (data ?? []).filter((o) => filter === "all" || o.status === filter);
    const map = new Map<string, Order[]>();
    for (const o of rows) {
      const g = dayGroup(o.createdAt);
      const arr = map.get(g) ?? [];
      arr.push(o);
      map.set(g, arr);
    }
    return [...map.entries()];
  }, [data, filter]);

  return (
    <div className="spage">
      <div className="page page-narrow">
        <div className="page-title">Order history</div>
        <p className="page-sub" style={{ marginBottom: 20 }}>
          Every order, newest first. Tap one to see details.
        </p>

        <div className="toolbar">
          {FILTERS.map((f) => (
            <button key={f.key} className={"chipf" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="panel panel-pad" style={{ marginTop: 18, color: "var(--st-rej)", fontWeight: 600 }}>
            {(error as Error).message}
          </div>
        ) : loading ? (
          <div className="panel panel-pad" style={{ marginTop: 18 }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div className="hist" style={{ marginTop: 18 }}>
            <div className="panel panel-pad muted" style={{ textAlign: "center" }}>No orders yet.</div>
          </div>
        ) : (
          <div className="hist">
            {groups.map(([group, orders]) => (
              <div key={group}>
                <div className="hgroup">{group}</div>
                {orders.map((o) => (
                  <div className="hrow" key={o.orderId} data-page="track" onClick={() => navigate("/student/track")} style={{ cursor: "pointer" }}>
                    <div className="ht">{displayToken(o.token)}</div>
                    <div className="hf">
                      <b>{o.fileName || "Stationery order"}</b>
                      <small>{fullSpec(o)}</small>
                    </div>
                    <OrderBadge status={o.status} />
                    <div className="hp">{rupees(o.totalPaise)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}