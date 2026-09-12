import { findUserById, listOrders } from "../data/repo";
import type { Order } from "../types";

export interface QueueRow {
  token: string;
  orderId: string;
  status: Order["status"];
  secondsAgo: number;
  yours: boolean;
  isCurrent: boolean;
  etaMinutes: number;
  etaSeconds: number;
}

export interface QueueView {
  active: QueueRow[];
  aheadCount: number;
  etaMinutes: number;
  etaSeconds: number;
  nowServing?: string;
}

const WAITING = new Set<Order["status"]>(["RECEIVED", "PROCESSING"]);

/**
 * The live queue is derived from real active orders (First Come, First Served).
 * Wait time = queue position × 20 seconds per member.
 */
export function queueFor(tokenOrId: string, viewerUserId?: string): QueueView {
  const orders = listOrders()
    .filter((o) => WAITING.has(o.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const targetIndex = Math.max(
    orders.findIndex((o) => o.token === tokenOrId || o.orderId === tokenOrId),
    -1
  );

  const secondsPerMember = 20;
  const active = orders.map((o, i) => ({
    token: o.token,
    orderId: o.orderId,
    status: o.status,
    secondsAgo: Math.max(0, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 1000)),
    yours: o.token === tokenOrId || o.orderId === tokenOrId || o.userId === viewerUserId,
    isCurrent: i === 0 && o.status === "PROCESSING",
    etaMinutes: Math.ceil(((i + 1) * secondsPerMember) / 60),
    etaSeconds: (i + 1) * secondsPerMember,
  }));

  const aheadCount = targetIndex >= 0 ? targetIndex : 0;
  const etaSeconds = targetIndex >= 0 ? (targetIndex + 1) * secondsPerMember : orders.length * secondsPerMember;
  const etaMinutes = Math.ceil(etaSeconds / 60);

  return {
    active,
    aheadCount,
    etaMinutes,
    etaSeconds,
    nowServing: orders[0]?.token,
  };
}

export function nowServingToken(): string | undefined {
  const orders = listOrders()
    .filter((o) => WAITING.has(o.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return orders.find((o) => o.status === "PROCESSING")?.token ?? orders[0]?.token;
}

export function activeOrderCounts() {
  const orders = listOrders();
  return {
    inQueue: orders.filter((o) => ["RECEIVED", "PROCESSING"].includes(o.status)).length,
    processing: orders.filter((o) => o.status === "PROCESSING").length,
    ready: orders.filter((o) => o.status === "READY").length,
  };
}

export function servedByStaffName(order: Order): string | undefined {
  const userId = order.processingBy || order.preparedBy;
  if (!userId) return undefined;
  return findUserById(userId)?.name;
}