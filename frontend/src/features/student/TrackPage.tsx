import { DotBadge, EmptyState } from "../../components/ui/Badges";
import { useAuth } from "../auth/AuthContext";
import { useLive } from "../../hooks/useLive";
import { listMyOrders } from "../../services/api/orders";
import { countdown } from "./trackHelpers";
import { displayToken, fullSpec, minutesAgo } from "../../utils/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_ST, ORDER_STATUS_STEP } from "../../constants";
import type { Order } from "../../types";

const CHECK_PATH = "M20 6L9 17l-5-5";
const DASH_PATH = "M5 12h14";

function Check() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d={CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dash() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d={DASH_PATH} strokeLinecap="round" />
    </svg>
  );
}

interface TrackEntry {
  key: string;
  done: boolean;
  active: boolean;
  title: string;
  note: string;
}

function Timeline({ order }: { order: Order }) {
  const step = ORDER_STATUS_STEP[order.status];
  const isRejected = order.status === "REJECTED";

  const entries: TrackEntry[] = isRejected
    ? [
        { key: "received", done: true, active: false, title: "Order received", note: order.fileName ? order.fileName + " received" : "Order received" },
        { key: "rejected", done: true, active: true, title: "Rejected", note: order.rejectionReason || "See the staff note." },
      ]
    : [
        { key: "received", done: step >= 1, active: step === 0, title: "Order received", note: "Token issued · in queue" },
        { key: "paid", done: step >= 1, active: step === 0, title: order.paymentStatus === "PAID" ? "Payment confirmed" : "Payment due at counter", note: order.paymentStatus === "PAID" ? (order.paymentMethod ? "· " + order.paymentMethod : "") : "You can pay when you collect" },
        { key: "processing", done: step >= 2, active: step === 1, title: "Processing", note: step >= 2 ? "Finished printing" : "Waiting in queue" },
        { key: "ready", done: step >= 3, active: step === 2, title: "Ready for collection", note: "You'll get a notification" },
        { key: "completed", done: step >= 3, active: step === 3, title: "Completed", note: "Collected at the counter" },
      ];

  return (
    <div>
      <div className="label" style={{ marginBottom: 18 }}>Order progress</div>
      <div className="track">
        {entries.map((e) => (
          <div key={e.key} className={"tr" + (e.done ? " done" : e.active ? " active" : " pending")}>
            <div className="mk">{e.done || e.active ? <Check /> : <Dash />}</div>
            <div>
              <h4>{e.title}</h4>
              <small>{e.note}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveQueue({ order }: { order: Order }) {
  const active = order.queue?.active ?? [];
  const ahead = order.queue?.aheadCount ?? 0;

  return (
    <>
      <div className="queue" style={{ marginBottom: 16 }}>
        <div className="qh">
          <span>LIVE QUEUE</span>
          <span>{ahead} ahead of you</span>
        </div>
        {active.length === 0 ? (
          <p className="muted" style={{ padding: "12px 0", fontSize: 13 }}>Queue is empty.</p>
        ) : (
          active.map((r) => (
            <div className={"qrow" + (r.yours ? " you" : "")} key={r.token}>
              <span className="qt">{displayToken(r.token)}</span>
              <span className="qs">{r.yours ? "You · " + (r.status === "PROCESSING" ? "processing" : "waiting") : r.status === "PROCESSING" ? "Processing" : "Waiting"}</span>
              {r.isCurrent ? <span className="mtag">NOW</span> : null}
            </div>
          ))
        )}
      </div>
      <div className="panel panel-pad">
        <div className="label" style={{ marginBottom: 10 }}>Collection</div>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
          Xerox shop, beside canteen (ground floor).
        </p>
        <div className="track-token-box">
          <span className="label">Your token</span>
          <span className="tokchip">{displayToken(order.token)}</span>
        </div>
      </div>
    </>
  );
}

export function TrackPage() {
  const { token } = useAuth();
  const { data: orders, loading, error } = useLive(
    () => listMyOrders(token ?? ""),
    {
      intervalMs: 10_000,
      active: (d) => {
        const rows = (d as Order[] | null) ?? [];
        return rows.some((o) => ["RECEIVED", "PROCESSING", "READY"].includes(o.status));
      },
    }
  );
  const active = orders?.filter((o) => ["RECEIVED", "PROCESSING", "READY"].includes(o.status)) ?? [];

  if (loading) {
    return <div className="spage"><div className="page"><div className="panel panel-pad">Loading…</div></div></div>;
  }
  if (error) {
    return <div className="spage"><div className="page"><div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600 }}>{(error as Error).message}</div></div></div>;
  }

  return (
    <div className="spage">
      <div className="page">
        {active.length === 0 ? (
          <div>
            <div className="page-title">Track</div>
            <p className="page-sub">Live queue · first come, first served</p>
            <div style={{ marginTop: 18 }}>
              <EmptyState
                title="Nothing is in the queue"
                body="Orders you place appear here with a live ETA. When it says Ready, come collect."
              />
            </div>
          </div>
        ) : (
          active.map((o) => {
            const ready = o.status === "READY";
            return (
              <div key={o.orderId}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div className="page-title" style={{ fontFamily: "var(--f-mono)", fontWeight: 700 }}>{displayToken(o.token)}</div>
                      <DotBadge st={ORDER_STATUS_ST[o.status]} label={ORDER_STATUS_LABEL[o.status]} />
                    </div>
                    <p className="page-sub">{o.fileName || "Stationery order"} · {fullSpec(o)} · placed {minutesAgo(o.createdAt)} ago</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="label" style={{ margin: 0 }}>Ready in about</div>
                    <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 26 }}>
                      {ready ? "now" : countdown(o)}
                    </div>
                  </div>
                </div>

                <div className="split" style={{ marginTop: 26 }}>
                  <div className="panel panel-pad"><Timeline order={o} /></div>
                  <div className="sticky-side"><LiveQueue order={o} /></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}