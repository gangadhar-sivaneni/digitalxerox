import {
  deleteOrder,
  deletePayment,
  findOrderById,
  findOrderByIdempotency,
  findPaymentByOrder,
  findPaymentByRazorpayOrder,
  listOrders,
  updatePayment,
} from "../data/repo";
import type { Order, Payment, User } from "../types";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { activatePaidOrder, createPendingOrder, releaseOrderStock } from "./orders.service";
import {
  confirmRazorpayPayment,
  createRazorpayOrder,
  razorpayGatewayConfig,
} from "./razorpay.service";

export interface CheckoutIntentResult {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: "INR";
  keyId: string;
  mode: "live" | "mock";
  alreadyPaid: boolean;
  order: Order;
}

export interface CheckoutProof {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Step 1 of the online flow (mirrors POST /api/orders but keeps the order
 * UNPAID and activatable only after the gateway reports success). Idempotent
 * on `idempotencyKey` — retries reuse the pending order + its Razorpay order.
 */
export async function initiateCheckout(
  user: User,
  input: Parameters<typeof createPendingOrder>[1],
  idempotencyKey?: string
): Promise<CheckoutIntentResult> {
  const activeCount = listOrders().filter(
    (o) => o.userId === user.userId && ["RECEIVED", "PROCESSING"].includes(o.status)
  ).length;
  if (activeCount >= 3) {
    throw ApiError.unprocessable(
      "You already have active orders. Please wait for one to be completed before placing another."
    );
  }

  if (idempotencyKey) {
    const existing = findOrderByIdempotency(idempotencyKey);
    if (existing) {
      if (existing.userId !== user.userId) throw ApiError.forbidden();
      const payment = findPaymentByOrder(existing.orderId);
      if (existing.paymentStatus === "PAID") {
        return toIntent(existing, "", true);
      }
      if (!payment) throw ApiError.internal("Payment record missing for this checkout.");
      if (!payment.razorpayOrderId) {
        const rzp = await createRazorpayOrder({
          amountPaise: existing.totalPaise,
          receipt: existing.orderId,
        });
        updatePayment(payment.paymentId, { razorpayOrderId: rzp.id, gateway: "RAZORPAY" });
        return toIntent(existing, rzp.id, false);
      }
      return toIntent(existing, payment.razorpayOrderId, false);
    }
  }

  const { order, payment } = createPendingOrder(user, input, idempotencyKey);
  const rzp = await createRazorpayOrder({ amountPaise: order.totalPaise, receipt: order.orderId });
  updatePayment(payment.paymentId, { razorpayOrderId: rzp.id, gateway: "RAZORPAY" });
  return toIntent(order, rzp.id, false);
}

/** Step 2: verify the payment proof, then activate (mint token + enter queue). */
export async function completeCheckout(user: User, proof: CheckoutProof): Promise<Order> {
  const order = findOrderById(proof.orderId);
  if (!order) throw ApiError.notFound("Checkout not found.");
  if (order.userId !== user.userId) throw ApiError.forbidden();

  if (order.paymentStatus === "PAID") return order; // idempotent replay of a settled order
  if (order.status !== "UNPAID") {
    throw ApiError.unprocessable("This checkout is no longer pending payment.");
  }

  const payment = findPaymentByOrder(order.orderId);
  if (!payment) throw ApiError.internal("Payment record missing for this checkout.");
  if (payment.razorpayOrderId !== proof.razorpayOrderId) {
    throw ApiError.unprocessable("Checkout details do not match the payment order.");
  }

  await confirmRazorpayPayment({
    razorpayOrderId: proof.razorpayOrderId,
    razorpayPaymentId: proof.razorpayPaymentId,
    razorpaySignature: proof.razorpaySignature,
    expectedAmountPaise: order.totalPaise,
  });

  return activatePaidOrder(order, {
    payment,
    transactionId: proof.razorpayPaymentId,
    method: "ONLINE",
  }, user);
}

/** Cancels a checkout that was never paid — returns stock and removes the UNPAID
 *  placeholder so dead orders never reach the queue or staff views. */
export function abandonCheckout(user: User, orderId: string): void {
  const order = findOrderById(orderId);
  if (!order) throw ApiError.notFound("Checkout not found.");
  if (order.userId !== user.userId) throw ApiError.forbidden();
  if (order.status !== "UNPAID") return; // already paid / in queue — nothing to abandon

  releaseOrderStock(order);
  const payment = findPaymentByOrder(order.orderId);
  if (payment) deletePayment(payment.paymentId);
  deleteOrder(order.orderId);
  logger.info("Checkout abandoned", { orderId });
}

/**
 * Activates an UNPAID order from a verified payment.captured webhook. Safe to
 * call repeatedly — settled/serving orders are returned untouched.
 */
export function activateFromWebhook(
  razorpayOrderId: string,
  transactionId: string
): Order | undefined {
  const payment = findPaymentByRazorpayOrder(razorpayOrderId) as Payment | undefined;
  if (!payment) return undefined;
  const order = findOrderById(payment.orderId);
  if (!order || order.status !== "UNPAID") return undefined;
  return activatePaidOrder(
    order,
    { payment, transactionId, method: "ONLINE" },
    { userId: "system", name: "Razorpay webhook" }
  );
}

function toIntent(order: Order, razorpayOrderId: string, alreadyPaid: boolean): CheckoutIntentResult {
  return {
    orderId: order.orderId,
    razorpayOrderId,
    amountPaise: order.totalPaise,
    currency: "INR",
    keyId: razorpayGatewayConfig().keyId,
    mode: razorpayGatewayConfig().mock ? "mock" : "live",
    alreadyPaid,
    order,
  };
}