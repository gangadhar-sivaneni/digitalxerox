import {
  findUserById,
  getSettings,
  listOrders,
  listProducts,
} from "../data/repo";
import type { Order } from "../types";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function staffStats() {
  const orders = listOrders();
  const today = orders.filter((o) => isToday(o.createdAt));
  const completedToday = today.filter((o) => o.status === "COMPLETED");
  const revenuePaise = today
    .filter((o) => o.paymentStatus === "PAID" && o.status !== "REJECTED" && o.status !== "CANCELLED")
    .reduce((s, o) => s + o.totalPaise, 0);
  return {
    inQueue: orders.filter((o) => ["RECEIVED", "PROCESSING"].includes(o.status)).length,
    processing: orders.filter((o) => o.status === "PROCESSING").length,
    ready: orders.filter((o) => o.status === "READY").length,
    completedToday: completedToday.length,
    revenuePaise,
    avgProcessingMinutes: getSettings().avgProcessingMinutes,
  };
}

export function orderToStaffRow(o: Order) {
  const student = findUserById(o.userId);
  return {
    orderId: o.orderId,
    token: o.token,
    status: o.status,
    serviceType: o.serviceType,
    fileName: o.fileName || (o.items && o.items.length ? o.items.map((i) => `${i.name} ×${i.qty}`).join(", ") : "—"),
    pageCount: o.pageCount,
    copies: o.copies,
    paperSize: o.paperSize,
    colorMode: o.colorMode,
    sides: o.sides,
    totalPaise: o.totalPaise,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    studentName: student?.name || "—",
    studentId: student?.studentId,
    createdAt: o.createdAt,
    waitingMinutes: Math.max(0, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000)),
    itemCount: (o.items || []).length,
  };
}

export type AnalyticsRange = "today" | "week" | "month";

// Day boundaries follow the shop's local clock, matching the local-hour
// bucketing in `adminOverview`. The old UTC-midnight start caused orders
// placed after local midnight to drop out of the "today" window.
function rangeWindow(range: AnalyticsRange): { from: Date; to: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "week") start.setDate(start.getDate() - 6);
  if (range === "month") start.setDate(1);
  return { from: start, to: now };
}

function reservedStockByProduct(): Map<string, number> {
  const map = new Map<string, number>();
  listOrders()
    .filter((o) => ["RECEIVED", "PROCESSING"].includes(o.status))
    .forEach((o) => {
      for (const it of o.items || []) {
        map.set(it.productId, (map.get(it.productId) || 0) + it.qty);
      }
    });
  return map;
}

export function productInventoryView() {
  const reserved = reservedStockByProduct();
  return listProducts(true).map((p) => ({
    productId: p.productId,
    name: p.name,
    description: p.description,
    pricePaise: p.pricePaise,
    price: p.pricePaise / 100,
    stock: p.stock,
    reserved: reserved.get(p.productId) || 0,
    minStock: p.minStock,
    active: p.active,
    updatedAt: p.updatedAt,
    low: p.stock <= p.minStock,
    imageUrl: p.imageUrl,
  }));
}

export function adminOverview(range: AnalyticsRange = "today") {
  const orders = listOrders();
  const products = listProducts(true);
  const { from, to } = rangeWindow(range);
  const inWindow = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

  const completedInWindow = inWindow.filter((o) => o.status === "COMPLETED");
  const rejectedInWindow = inWindow.filter((o) => o.status === "REJECTED");
  const revenuePaise = inWindow
    .filter((o) => o.paymentStatus === "PAID" && o.status !== "REJECTED" && o.status !== "CANCELLED")
    .reduce((s, o) => s + o.totalPaise, 0);

  const avgTurnaroundMinutes =
    completedInWindow.length > 0
      ? Math.round(
          completedInWindow.reduce((s, o) => {
            const end = o.completedAt || o.createdAt;
            return s + (new Date(end).getTime() - new Date(o.createdAt).getTime()) / 60000;
          }, 0) / completedInWindow.length
        )
      : 0;

  const rejectionRate = inWindow.length > 0 ? (rejectedInWindow.length / inWindow.length) * 100 : 0;

  const byHour = new Array(24).fill(0);
  inWindow.forEach((o) => {
    const h = new Date(o.createdAt).getHours();
    byHour[h] += 1;
  });

  const mix: { label: string; count: number; pct: number }[] = [];
  for (const svc of ["PRINTING", "XEROX", "STATIONERY"]) {
    const count = inWindow.filter((o) => o.serviceType === svc).length;
    mix.push({ label: svc, count, pct: inWindow.length ? Math.round((count / inWindow.length) * 100) : 0 });
  }

  const reserved = reservedStockByProduct();
  const lowStock = products
    .map((p) => ({
      product: p,
      reserved: reserved.get(p.productId) || 0,
      available: p.stock,
    }))
    .filter(({ product: p, available }) => p.active && available <= p.minStock)
    .map((p) => ({
      productId: p.product.productId,
      name: p.product.name,
      stock: p.available,
      reserved: p.reserved,
      minStock: p.product.minStock,
    }));

  // Queue performance: live depth + throughput picture for the range.
  const nowOrders = listOrders();
  const queue = {
    received: nowOrders.filter((o) => o.status === "RECEIVED").length,
    processing: nowOrders.filter((o) => o.status === "PROCESSING").length,
    ready: nowOrders.filter((o) => o.status === "READY").length,
  };
  const peakHour = byHour.reduce((hi, c, i) => (c > byHour[hi] ? i : hi), 9);

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    orders: inWindow.length,
    completed: completedInWindow.length,
    rejected: rejectedInWindow.length,
    revenuePaise,
    avgTurnaroundMinutes,
    rejectionRate,
    ordersByHour: byHour,
    peakHour,
    serviceMix: mix,
    queue,
    lowStock,
    shopName: getSettings().shopName,
  };
}