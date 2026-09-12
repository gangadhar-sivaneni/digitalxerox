import { useNavigate } from "react-router-dom";
import { Flowbar } from "../../components/ui/Flowbar";
import { Icon } from "../../components/ui/Icons";
import { useOrderFlow } from "./OrderFlowContext";
import { displayToken, rupees } from "../../utils/format";

function readyIn(estimatedReadyAt?: string): string {
  if (!estimatedReadyAt) return "a few minutes";
  const ms = new Date(estimatedReadyAt).getTime() - Date.now();
  const min = Math.ceil(ms / 60000);
  if (min <= 0) return "a few minutes";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function SuccessPage() {
  const navigate = useNavigate();
  const { order, reset } = useOrderFlow();

  const paid = order?.paymentStatus === "PAID";
  const amountLabel = paid ? "Amount paid" : "Amount due";

  return (
    <div className="spage">
      <div className="page">
        <Flowbar step={5} />
        {!order ? (
          <div className="panel panel-pad" style={{ maxWidth: 460, margin: "30px auto" }}>
            <p style={{ fontWeight: 600 }}>
              Your order was placed, but the receipt is no longer in memory.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => navigate("/student/track")}>
                Track your orders
              </button>
              <button className="btn btn-primary" onClick={() => navigate("/student")}>
                Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="success">
            <div className="stamp">
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="sk">ORDER PLACED · SHOW THIS TOKEN AT THE COUNTER</div>
            <div className="bigtok">{displayToken(order.token)}</div>
            <div className="msg">
              Queued. We'll notify you when it's ready.
            </div>

            <div className="etacard">
              <div>
                <span className="lbl">Estimated ready</span>
                <span className="num">{readyIn(order.estimatedReadyAt)}</span>
              </div>
              <div>
                <span className="lbl">{amountLabel}</span>
                <span className="num">{order ? rupees(order.totalPaise) : "—"}</span>
              </div>
              <div>
                <span className="lbl">Payment</span>
                <span className="num" style={{ fontSize: 15 }}>
                  {order.paymentMethod === "CASH"
                    ? "Cash at counter"
                    : order.paymentMethod === "ONLINE"
                      ? "Paid online (Razorpay) · " + order.transactionId
                      : order.paymentMethod || "—"}
                </span>
              </div>
            </div>

            <div className="leave" style={{ marginTop: 18 }}>
              <span className="leave-clock" aria-hidden="true">
                <Icon>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
                </Icon>
              </span>
              <span>You'll be notified when it's ready. Track the live queue anytime.</span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => navigate("/student/track")}>
                Track order
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  reset();
                  navigate("/student");
                }}
              >
                Back to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}