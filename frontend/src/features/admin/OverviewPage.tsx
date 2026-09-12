import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLive } from "../../hooks/useLive";
import { getAdminOverview } from "../../services/api/admin";
import { rupees } from "../../utils/format";
import { Seg } from "../../components/ui/Seg";
import type { AnalyticsRange } from "../../types";

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`);

function maxIn(byHour: number[]): number {
  return Math.max(1, ...byHour);
}

function rangeSubtitle(range: AnalyticsRange, from: string, to: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (range === "today") return `Today · ${fmt(to)}`;
  return `${range === "week" ? "Last 7 days" : "This month"} · ${fmt(from)} – ${fmt(to)}`;
}

export function OverviewPage() {
  const { token } = useAuth();
  const [range, setRange] = useState<AnalyticsRange>("today");
  const { data, loading, error } = useLive(() => getAdminOverview(token ?? "", range), {
    intervalMs: 15_000,
    refreshKey: range,
  });

  return (
    <div className="apage">
      <div className="page page-wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div className="page-title">Overview</div>
            <p className="page-sub">{data ? `${rangeSubtitle(data.range, data.from, data.to)} · ${data.shopName}` : "Loading…"}</p>
          </div>
          <Seg
            name="overview-range"
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ value: r.key, title: r.label }))}
          />
        </div>

        {error ? (
          <div className="panel panel-pad" style={{ marginTop: 22, color: "var(--st-rej)", fontWeight: 600 }}>
            {(error as Error).message}
          </div>
        ) : loading || !data ? (
          <div className="panel panel-pad" style={{ marginTop: 22 }}>Loading…</div>
        ) : (
          <>
            <div className="kpi-row" style={{ marginTop: 6 }}>
              <div className="kpi"><span className="kl">Orders</span><span className="kn">{data.orders}</span><span className="kd">{data.completed} completed in range</span></div>
              <div className="kpi"><span className="kl">Revenue</span><span className="kn mono">{rupees(data.revenuePaise)}</span><span className="kd">paid orders in range</span></div>
              <div className="kpi"><span className="kl">Avg turnaround</span><span className="kn">{data.avgTurnaroundMinutes}<em>min</em></span><span className="kd">completed in range</span></div>
              <div className="kpi"><span className="kl">Rejection rate</span><span className="kn">{data.rejectionRate.toFixed(1)}<em>%</em></span><span className="kd">{data.rejected} rejected in range</span></div>
            </div>

            <div className="split" style={{ marginTop: 22, ["--side" as string]: "360px" }}>
              <div className="chartcard">
                <div className="cc-head"><span>Orders by hour</span><span className="muted">peak {data.peakHour}:00</span></div>
                <div className="bars bars-24">
                  {HOUR_LABELS.map((label, i) => {
                    const count = data.ordersByHour[i] ?? 0;
                    const h = Math.round((count / maxIn(data.ordersByHour)) * 100);
                    return (
                      <div key={label} className={"bar" + (h >= 85 ? " hi" : "")} style={{ ["--h" as string]: h + "%" }} title={count + " orders"}>
                        <span></span>
                        <small>{label}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="panel panel-pad">
                <div className="label" style={{ marginBottom: 14 }}>Service mix</div>
                {data.serviceMix.filter((m) => m.label !== "XEROX").map((m) => (
                  <div className="mixrow" key={m.label}>
                    <span>{m.label}</span>
                    <div className="mixbar"><i style={{ width: m.pct + "%" }}></i></div>
                    <span className="mono">{m.pct}%</span>
                  </div>
                ))}
                <div className="rc-sep" style={{ margin: "16px 0" }}></div>
                <div className="label" style={{ marginBottom: 10 }}>Queue performance</div>
                <div className="mixrow">
                  <span>Receiving</span>
                  <div className="mixbar"><i style={{ width: Math.min(100, Math.max(4, data.queue.received * 10)) + "%" }}></i></div>
                  <span className="mono">{data.queue.received}</span>
                </div>
                <div className="mixrow">
                  <span>Processing</span>
                  <div className="mixbar"><i style={{ width: Math.min(100, Math.max(4, data.queue.processing * 10)) + "%" }}></i></div>
                  <span className="mono">{data.queue.processing}</span>
                </div>
                <div className="mixrow">
                  <span>Ready</span>
                  <div className="mixbar"><i style={{ width: Math.min(100, Math.max(4, data.queue.ready * 10)) + "%" }}></i></div>
                  <span className="mono">{data.queue.ready}</span>
                </div>
                <div className="rc-sep" style={{ margin: "16px 0" }}></div>
                <div className="label" style={{ marginBottom: 10 }}>Low stock</div>
                {data.lowStock.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13.5 }}>All items are stocked.</div>
                ) : (
                  data.lowStock.map((p) => (
                    <div className="mixrow" key={p.productId}>
                      <span>{p.name}</span>
                      <span className="badge" data-st="rejected" style={{ marginLeft: "auto" }}>
                        <span className="dot"></span>{p.stock} available · {p.reserved} reserved
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}