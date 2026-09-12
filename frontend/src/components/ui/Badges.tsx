import type { ReactNode } from "react";
import type { OrderStatus } from "../../types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_ST, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_ST } from "../../constants";
import type { PaymentStatus } from "../../types";

export function DotBadge({ st, label }: { st: string; label: string }) {
  return (
    <span className="badge" data-st={st}>
      <span className="dot"></span>
      {label}
    </span>
  );
}

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <DotBadge st={ORDER_STATUS_ST[status]} label={ORDER_STATUS_LABEL[status]} />;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <DotBadge st={PAYMENT_STATUS_ST[status]} label={PAYMENT_STATUS_LABEL[status]} />;
}

export function TokenChip({ token }: { token: string }) {
  return <span className="tokchip">{token}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel panel-pad" style={{ textAlign: "center", padding: "48px 22px" }}>
      <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>{title}</div>
      {body ? <p className="muted" style={{ marginTop: 8, fontSize: 14.5 }}>{body}</p> : null}
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  );
}