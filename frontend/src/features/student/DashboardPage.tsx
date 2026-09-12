import { useNavigate } from "react-router-dom";
import { EmptyState, OrderBadge } from "../../components/ui/Badges";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../hooks/useApi";
import { listMyOrders } from "../../services/api/orders";
import {
  displayToken,
  fullSpec,
  greetingForName,
  isActive,
  rupees,
  waitTime,
} from "../../utils/format";
import { ORDER_STATUS_STEP } from "../../constants";
import type { Order } from "../../types";

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Could not load your orders.";
}

function MiniTrack({ order }: { order: Order }) {
  const step = ORDER_STATUS_STEP[order.status];
  const marks = ["done", "done", step >= 1 ? "done" : "", step >= 2 ? "done" : ""];
  const labels = ["Received", "Paid", "Processing", "Ready"];
  return (
    <>
      <div className="mini-track">
        {marks.map((m, i) => (
          <div className={"m" + (m ? " " + m : "")} key={i}>
            <div className="d"></div>
            {i < marks.length - 1 ? <div className="ln"></div> : null}
          </div>
        ))}
      </div>
      <div className="mini-track-labels">
        {labels.map((l, i) => (
          <span key={l} className={marks[i] ? "done" : ""}>
            {l}
          </span>
        ))}
      </div>
    </>
  );
}

function ActiveCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  const ready = order.status === "READY";
  return (
    <div className="hero-order">
      <div className="ho-top">
        <span className="ho-tok">{displayToken(order.token)}</span>
        <OrderBadge status={order.status} />
      </div>
      <div className="ho-body">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
            <div className="filerow" style={{ border: "none", padding: 0, gap: 11, background: "transparent" }}>
              <div className="fi" style={{ width: 34, height: 40 }}></div>
              <div className="meta">
                <b>{order.fileName || "Stationery order"}</b>
                <small>{fullSpec(order)}</small>
              </div>
            </div>
          </div>
          <MiniTrack order={order} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
            {ready ? "Your order is" : "Ready in about"}
          </div>
          <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 30 }}>
            {ready ? "now" : waitTime(order.queue?.etaSeconds)}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate("/student/track")}>
            View order
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading }
    = useApi(() => listMyOrders(token ?? ""));

  const active = data?.filter((o) => isActive(o.status))[0] ?? null;
  const recent = data?.filter((o) => !isActive(o.status)).slice(0, 3) ?? [];

  return (
    <div className="spage">
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="page-title">{greetingForName(user?.name)}</div>
            <p className="page-sub">
              {active
                ? "You have one order in progress."
                : "You have no active orders right now."}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/student/order")}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New order
          </button>
        </div>

        {error ? (
          <div className="panel panel-pad" style={{ marginTop: 26, color: "var(--st-rej)", fontWeight: 600, fontSize: 14 }}>
            {errorText(error)}
          </div>
        ) : loading ? (
          <div className="panel panel-pad" style={{ marginTop: 26 }}>Loading…</div>
        ) : (
          <>
            <div style={{ marginTop: 26 }}>
              <div className="label" style={{ marginBottom: 12 }}>Active order</div>
              {active ? <ActiveCard order={active} /> : <EmptyState
                title="No active order"
                body="Upload a document, configure the print, and get a token — all before you leave your seat."
                action={<button className="btn btn-primary" onClick={() => navigate("/student/order")}>Start an order</button>}
              />}
            </div>

            <div className="grid-3" style={{ marginTop: 28 }}>
              <div className="action-tile" onClick={() => navigate("/student/order")}>
                <div className="ti">
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><b>New order</b><small>Upload &amp; configure</small></div>
              </div>
              <div className="action-tile" onClick={() => navigate("/student/track")}>
                <div className="ti">
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><b>Track order</b><small>Live queue &amp; ETA</small></div>
              </div>
              <div className="action-tile" onClick={() => navigate("/student/history")}>
                <div className="ti">
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 4v3.4h3.4M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><b>Order history</b><small>Past orders &amp; reprints</small></div>
              </div>
            </div>

            <div style={{ marginTop: 34 }}>
              <div className="label" style={{ marginBottom: 2 }}>Recent orders</div>
              {recent.length === 0 ? (
                <div className="muted" style={{ padding: "6px 0" }}>No past orders yet.</div>
              ) : (
                <div className="hist">
                  {recent.map((o) => (
                    <div className="hrow" key={o.orderId} onClick={() => navigate("/student/track")} style={{ cursor: "pointer" }}>
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}