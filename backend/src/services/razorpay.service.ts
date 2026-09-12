import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface RazorpayGatewayConfig {
  keyId: string;
  keySecret: string;
  apiBase: string;
  mock: boolean;
}

/** Live mode when a demo/real key-pair is configured; otherwise a deterministic
 *  in-process simulator so CI, tests and local play never touch the network. */
export function razorpayGatewayConfig(): RazorpayGatewayConfig {
  return {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    apiBase: env.RAZORPAY_API_BASE,
    mock: env.RAZORPAY_MOCK,
  };
}

let mockCounter = 0;
function nextMockId(prefix: "order" | "pay"): string {
  mockCounter += 1;
  return `${prefix}_mock_${Date.now().toString(36)}_${mockCounter.toString(36)}`;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createRazorpayOrder(p: {
  amountPaise: number;
  receipt: string;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret, apiBase, mock } = razorpayGatewayConfig();

  if (mock) {
    return { id: nextMockId("order"), amount: p.amountPaise, currency: "INR", status: "created" };
  }

  const res = await fetch(`${apiBase}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
    body: JSON.stringify({ amount: p.amountPaise, currency: "INR", receipt: p.receipt.slice(0, 40) }),
  });
  if (!res.ok) {
    const body = await safeBody(res);
    logger.error("Razorpay order creation failed", { status: res.status, body });
    throw ApiError.internal("Razorpay could not create an order for this checkout. Please try again.");
  }
  const data = (await res.json()) as { id?: unknown; amount?: unknown; currency?: unknown; status?: unknown };
  return {
    id: String(data.id ?? ""),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "INR"),
    status: String(data.status ?? ""),
  };
}

export function razorpaySignatureValid(
  p: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${p.razorpayOrderId}|${p.razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(p.razorpaySignature || "", "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Validates the X-Razorpay-Signature header over the raw webhook body. */
export function razorpayWebhookSignatureValid(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature || "", "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Verifies a Razorpay checkout response end-to-end. In live mode the HMAC
 *  signature is validated, and — when the API is reachable — the payment is
 *  additionally confirmed as captured for the right order and amount. */
export async function confirmRazorpayPayment(p: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  expectedAmountPaise: number;
}): Promise<void> {
  const { keyId, keySecret, apiBase, mock } = razorpayGatewayConfig();

  if (mock) {
    if (
      !p.razorpayOrderId.startsWith("order_mock_") ||
      !p.razorpayPaymentId.startsWith("pay_mock_")
    ) {
      throw ApiError.unprocessable("This does not look like a valid test payment.");
    }
    return;
  }

  if (!razorpaySignatureValid(p, keySecret)) {
    throw ApiError.unprocessable("Payment verification failed. No amount has been deducted.");
  }

  try {
    const res = await fetch(`${apiBase}/payments/${p.razorpayPaymentId}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        order_id?: unknown;
        status?: unknown;
        amount?: unknown;
        amount_paid?: unknown;
      };
      if (String(data.order_id) !== p.razorpayOrderId || String(data.status) !== "captured") {
        throw ApiError.unprocessable("Payment was not captured by the gateway. Please try again.");
      }
      const paid = Number(data.amount ?? data.amount_paid ?? -1);
      if (paid !== p.expectedAmountPaise) {
        throw ApiError.unprocessable("The paid amount does not match this order's total.");
      }
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    logger.warn("Razorpay payment fetch failed; relying on signature verification", {
      err: (e as Error).message,
    });
  }
}

async function safeBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.length > 300 ? text.slice(0, 300) + "…" : text;
  } catch {
    return "<unreadable>";
  }
}