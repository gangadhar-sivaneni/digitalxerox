import {
  findPaymentByOrder,
  insertAudit,
  updateOrder,
  updatePayment,
} from "../data/repo";
import type { Order, Payment, User } from "../types";
import { ApiError } from "../utils/errors";
import { displayToken } from "../utils/format";
import { logger } from "../utils/logger";
import { createNotification } from "./orders.service";

function rupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

/**
 * Cash-at-counter choice. Digital payment no longer lives here — it goes
 * through the Razorpay gateway (/api/payments), which is what mints tokens.
 */
export function payOrder(
  order: Order,
  method: "CASH",
  idempotencyKey?: string
): { order: Order; payment: Payment; idempotent: boolean } {
  if (method !== "CASH") {
    throw ApiError.unprocessable(
      "Digital payment is handled by the online gateway. Choose CASH at the counter."
    );
  }

  const payment = findPaymentByOrder(order.orderId);
  if (!payment) throw ApiError.internal("Payment record missing for this order.");

  if (order.paymentStatus === "PAID") {
    return { order, payment, idempotent: true };
  }

  updatePayment(payment.paymentId, { method: "CASH" });
  updateOrder(order.orderId, { paymentMethod: "CASH" });
  createNotification(
    order.userId,
    `Cash payment selected for ${displayToken(order.token)}`,
    `Pay ${rupees(order.totalPaise)} at the counter when collecting.`,
    "PAYMENT",
    order.orderId
  );
  logger.info("Cash-at-counter chosen", { orderId: order.orderId });
  return { order: { ...order, paymentMethod: "CASH" }, payment: { ...payment, method: "CASH" }, idempotent: false };
}

/** Staff marks a cash-at-counter order as paid. */
export function verifyCashPayment(order: Order, actor: User, amountPaise: number) {
  if (order.paymentStatus === "PAID") return order;
  if (order.paymentMethod && order.paymentMethod !== "CASH") {
    throw ApiError.unprocessable("This order was paid digitally — refund via the payment flow.");
  }
  const payment = findPaymentByOrder(order.orderId);
  const now = new Date().toISOString();
  if (payment) {
    updatePayment(payment.paymentId, { status: "PAID", method: "CASH", settledAt: now });
  }
  const updated = updateOrder(order.orderId, { paymentStatus: "PAID", paymentMethod: "CASH" })!;
  createNotification(
    order.userId,
    `Payment confirmed for ${displayToken(order.token)}`,
    `${rupees(order.totalPaise)} received in cash at the counter.`,
    "PAYMENT",
    order.orderId
  );
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "PAYMENT_VERIFIED_CASH",
    targetKind: "order",
    targetId: order.orderId,
    meta: { amountPaise },
  });
  return updated;
}

export function declineActivePayment(order: Order) {
  const payment = findPaymentByOrder(order.orderId);
  if (payment && payment.status === "PENDING") {
    updatePayment(payment.paymentId, { status: "FAILED" });
  }
}