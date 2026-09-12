import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Flowbar } from "../../components/ui/Flowbar";
import { Icon } from "../../components/ui/Icons";
import { useAuth } from "../auth/AuthContext";
import { buildOrderInput, useOrderFlow } from "./OrderFlowContext";
import {
  abandonCheckout,
  createOrder,
  getOrder,
  initiateCheckout,
  payCash,
  verifyCheckout,
  type CheckoutIntent,
} from "../../services/api/orders";
import { loadRazorpayScript, mockRazorpayProof, type RazorpayResponse } from "../../services/razorpay";
import { rupees } from "../../utils/format";

type PayMethod = "ONLINE" | "CASH";

const METHOD_META: Record<PayMethod, { title: string; sub: string; ico: ReactElement }> = {
  ONLINE: {
    title: "Pay online",
    sub: "UPI · Cards · Netbanking via Razorpay",
    ico: (
      <Icon>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M3 10h18" strokeLinecap="round" />
        <path d="M7.5 15h4.5" strokeLinecap="round" />
      </Icon>
    ),
  },
  CASH: {
    title: "Cash",
    sub: "Pay at pickup",
    ico: (
      <Icon>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <circle cx="12" cy="12" r="2.6" />
      </Icon>
    ),
  },
};

function errorText(e: unknown): string {
  return (e as Error)?.message || "Payment failed. Please try again.";
}

export function PaymentPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { config, document, documents, documentConfigs, cart, quote, order, setOrder, createKey } = useOrderFlow();
  const [method, setMethod] = useState<PayMethod>("ONLINE");
  const [checkout, setCheckout] = useState<CheckoutIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Starting payment…");
  const [simulate, setSimulate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const checkoutRef = useRef<CheckoutIntent | null>(null);
  const settledRef = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // A checkout that was created but never completed would leak a reserved order —
  // abandon it on unmount (safe: an already-settled order is never touched).
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const pending = checkoutRef.current;
      if (pending && !settledRef.current && tokenRef.current) {
        void abandonCheckout(pending.orderId, tokenRef.current).catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (order && order.paymentStatus === "PAID") navigate("/student/order/success");
  }, [order, navigate]);

  const online = method === "ONLINE";
  const amountPaise = checkout?.amountPaise ?? order?.totalPaise ?? quote?.totalPaise ?? 0;
  const priceChanged =
    checkout && quote && checkout.amountPaise !== quote.totalPaise;

  const verifyProof = useCallback(async (intent: CheckoutIntent, response: RazorpayResponse) => {
    if (!tokenRef.current) return;
    setError(null);
    setBusy(true);
    setStage("Verifying payment…");
    try {
      const verified = await verifyCheckout(
        {
          orderId: intent.orderId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        },
        tokenRef.current
      );
      if (!alive.current) return;
      settledRef.current = true;
      setOrder(verified);
      navigate("/student/order/success");
    } catch (e) {
      if (!alive.current) return;
      setError(errorText(e));
      setBusy(false);
      setStage("Payment verification failed");
    }
  }, [setOrder, navigate]);

  const runOnline = useCallback(async () => {
    if (!token) return;
    setError(null);
    setBusy(true);
    setStage("Preparing secure payment…");
    try {
      let intent = checkoutRef.current;
      if (!intent) {
        intent = await initiateCheckout(
          { ...buildOrderInput(config, document, cart, documents, documentConfigs), idempotencyKey: createKey },
          token
        );
        if (!alive.current) return;
        keepIntent(intent);
      }
      if (intent.alreadyPaid) {
        settledRef.current = true;
        const existing = await getOrder(intent.orderId, token);
        if (!alive.current) return;
        setOrder(existing);
        navigate("/student/order/success");
        return;
      }
      if (intent.mode === "mock") {
        // No real keys configured — the backend runs its simulator.
        setBusy(false);
        setSimulate(true);
        return;
      }
      await loadRazorpayScript();
      if (!alive.current) return;
      setBusy(false);
      setStage("Awaiting payment…");
      const rzp = new (window.Razorpay!)({
        key: intent.keyId,
        amount: intent.amountPaise,
        currency: intent.currency,
        order_id: intent.razorpayOrderId,
        name: "Digital Xerox",
        description: "Order " + intent.orderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        handler: (response: RazorpayResponse) => {
          void verifyProof(intent!, response);
        },
        modal: { ondismiss: () => { if (alive.current) setBusy(false); } },
      });
      rzp.open();
    } catch (e) {
      if (!alive.current) return;
      setError(errorText(e));
      setBusy(false);
    }
  }, [token, user, config, document, cart, documents, documentConfigs, createKey, setOrder, navigate, verifyProof]);

  const simulateSuccess = useCallback(async () => {
    const intent = checkoutRef.current;
    if (!intent || !tokenRef.current) return;
    setBusy(true);
    setStage("Verifying payment…");
    try {
      const verified = await verifyCheckout(mockRazorpayProof(intent.orderId, intent.razorpayOrderId), tokenRef.current);
      if (!alive.current) return;
      settledRef.current = true;
      setOrder(verified);
      navigate("/student/order/success");
    } catch (e) {
      if (!alive.current) return;
      setError(errorText(e));
      setBusy(false);
    }
  }, [setOrder, navigate]);

  const runCash = useCallback(async () => {
    if (!token) return;
    setError(null);
    setBusy(true);
    setStage("Booking your slot…");
    try {
      let created = order;
      if (!created) {
        created = await createOrder(
          { ...buildOrderInput(config, document, cart, documents, documentConfigs), idempotencyKey: createKey },
          token
        );
        if (!alive.current) return;
        setOrder(created);
      }
      if (created.paymentStatus !== "PAID") {
        created = await payCash(created.orderId, token);
        if (!alive.current) return;
        settledRef.current = true;
        setOrder(created);
      }
      navigate("/student/order/success");
    } catch (e) {
      if (!alive.current) return;
      setError(errorText(e));
      setBusy(false);
    }
  }, [token, config, document, cart, order, documents, documentConfigs, createKey, setOrder, navigate]);

  function keepIntent(intent: CheckoutIntent) {
    checkoutRef.current = intent;
    setCheckout(intent);
  }

  const cancelCheckout = useCallback(async () => {
    const pending = checkoutRef.current;
    if (pending && token) {
      try {
        await abandonCheckout(pending.orderId, token);
      } catch {
        // Best-effort — leaving without abandon is fine, it's not billable.
      }
    }
    checkoutRef.current = null;
    settledRef.current = false;
    setCheckout(null);
    setSimulate(false);
    setError(null);
  }, [token]);

  const pay = online ? (simulate ? simulateSuccess : runOnline) : runCash;

  return (
    <div className="spage">
      <div className="page">
        <Flowbar step={4} />
        <div className="page-title">Pay</div>
        <p className="page-sub">
          {online ? "Secure online payment powered by Razorpay." : "Pay when you collect — no amount is charged now."}
        </p>

        <div style={{ maxWidth: 460, margin: "26px auto 0" }}>
          {priceChanged ? (
            <div className="panel panel-pad" style={{ marginBottom: 16, color: "var(--st-warn)", fontWeight: 600, fontSize: 14 }}>
              The final price was updated to {rupees(checkout!.amountPaise)}. You were quoted {rupees(quote!.totalPaise)}.
            </div>
          ) : null}

          <div className="panel panel-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span>Amount due</span>
            <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 24 }}>
              {rupees(amountPaise)}
            </span>
          </div>

          <div style={{ marginTop: 18 }}>
            {(Object.keys(METHOD_META) as PayMethod[]).map((m) => (
              <div
                key={m}
                className={"paym" + (method === m ? " sel" : "")}
                role="radio"
                aria-checked={method === m}
                tabIndex={0}
                onClick={() => setMethod(m)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setMethod(m);
                }}
              >
                <span className="pm-ic">{METHOD_META[m].ico}</span>
                <span className="pm-tx">
                  <b>
                    {METHOD_META[m].title}
                    {m === "ONLINE" && checkout?.mode === "mock" ? (
                      <span className="demo-tag" style={{ marginLeft: 8 }}>SIMULATOR</span>
                    ) : null}
                  </b>
                  <small>{METHOD_META[m].sub}</small>
                </span>
                <span className="mk"></span>
              </div>
            ))}
          </div>

          {checkout && simulate ? (
            <div className="panel panel-pad" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="demo-tag">DEMO KEYS</span>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  No Razorpay keys configured yet — approve the simulated payment to test the full flow.
                </span>
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={busy} onClick={() => void pay()}>
                {busy ? stage : "Approve simulated payment"}
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="panel panel-pad" style={{ marginTop: 16, color: "var(--st-rej)", fontWeight: 600, fontSize: 14 }}>
              {error}
            </div>
          ) : null}

          {busy ? (
            <div className="pay-processing" style={{ marginTop: 24 }}>
              <div className="ring"></div>
              <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18 }}>{stage}</div>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 20 }}
              disabled={amountPaise <= 0}
              onClick={() => void pay()}
            >
              {online ? "Pay " + rupees(amountPaise) + " with Razorpay" : "Place order · pay at counter"}
            </button>
          )}

          {checkout ? (
            <div className="hint" style={{ textAlign: "center", marginTop: 14 }}>
              Changed your mind?{" "}
              <button
                className="linkbtn"
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: "inherit" }}
                onClick={() => void cancelCheckout()}
                disabled={busy}
              >
                Cancel this payment
              </button>{" "}
              — your cart is kept.
            </div>
          ) : (
            <div className="hint" style={{ textAlign: "center", marginTop: 14 }}>
              {online
                ? "You'll be redirected to Razorpay's secure checkout to complete the payment."
                : "For cash orders the payment is settled when you collect."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}