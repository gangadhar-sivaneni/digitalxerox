import type { Order, QueueView, Quote } from "../../types";
import { apiGet, apiPost } from "./client";

export async function listMyOrders(token: string, status?: string): Promise<Order[]> {
  const qs = status ? "?status=" + encodeURIComponent(status) : "";
  return apiGet<Order[]>("/orders" + qs, token);
}

export async function getOrder(idOrToken: string, token: string): Promise<Order> {
  return apiGet<Order>("/orders/" + encodeURIComponent(idOrToken), token);
}

export async function getOrderQueue(idOrToken: string, token: string): Promise<QueueView> {
  return apiGet<QueueView>("/orders/" + encodeURIComponent(idOrToken) + "/queue", token);
}

export interface CreateOrderInput {
  serviceType: "PRINTING" | "XEROX" | "STATIONERY";
  documentId?: string;
  documentIds?: string[];
  documentConfigs?: {
    documentId: string;
    pageRange?: string | null;
    copies?: number;
    paperSize?: "A4" | "A3";
    colorMode?: "bw" | "color";
    sides?: "single" | "double";
    manualPages?: number;
  }[];
  pageRange?: string | null;
  copies?: number;
  paperSize?: "A4" | "A3";
  colorMode?: "bw" | "color";
  sides?: "single" | "double";
  manualPages?: number;
  items?: { productId: string; qty: number }[];
  idempotencyKey?: string;
}

export async function createOrder(input: CreateOrderInput, token: string): Promise<Order> {
  return apiPost<Order>("/orders", input, token);
}

/** Stateless checkout quote. The backend re-prices at order creation. */
export async function quoteOrder(
  input: Omit<CreateOrderInput, "idempotencyKey">,
  token: string
): Promise<Quote> {
  return apiPost<Quote>("/orders/quote", input, token);
}

export async function payCash(orderId: string, token: string): Promise<Order> {
  return apiPost<Order>("/orders/" + encodeURIComponent(orderId) + "/pay", {
    method: "CASH",
  }, token);
}

/* ---------- Razorpay online checkout ---------- */

export interface CheckoutIntent {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: "INR";
  keyId: string;
  mode: "live" | "mock";
  alreadyPaid: boolean;
}

/** Creates an UNPAID order + Razorpay order server-side (idempotent via createKey). */
export async function initiateCheckout(input: CreateOrderInput, token: string): Promise<CheckoutIntent> {
  return apiPost<CheckoutIntent>("/payments/razorpay/intent", input, token);
}

export interface CheckoutVerifyInput {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/** Verifies the payment proof; the token is minted only on success. */
export async function verifyCheckout(input: CheckoutVerifyInput, token: string): Promise<Order> {
  return apiPost<Order>("/payments/razorpay/verify", input, token);
}

/** Cancels a checkout that was never paid (releases stock server-side). */
export async function abandonCheckout(orderId: string, token: string): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>("/payments/" + encodeURIComponent(orderId) + "/abandon", {}, token);
}