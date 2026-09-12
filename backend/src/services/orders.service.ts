import {
  findDocument,
  findOrderByIdempotency,
  findPaymentByOrder,
  findProduct,
  getSettings,
  insertNotification,
  insertOrder,
  insertPayment,
  insertAudit,
  listOrders,
  nextId,
  nextOrderSeq,
  nextToken,
  updateOrder,
  updatePayment,
  upsertProduct,
} from "../data/repo";
import type { Notification, Order, OrderStatus, Payment, PaymentMethod, User } from "../types";
import { ApiError } from "../utils/errors";
import { displayToken } from "../utils/format";
import { logger } from "../utils/logger";
import { purgeDocumentsForTerminalOrder } from "./documents.service";
import { calculatePrice, type PriceBreakdown, type PriceLine } from "./pricing.service";

const WAITING = new Set<Order["status"]>(["RECEIVED", "PROCESSING"]);

export function createNotification(
  userId: string,
  title: string,
  body: string,
  kind: Notification["kind"],
  orderId?: string
): void {
  insertNotification({
    notificationId: nextId("ntf"),
    userId,
    title,
    body,
    kind,
    orderId,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  UNPAID: [],
  RECEIVED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["READY", "REJECTED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface CreateOrderInput {
  serviceType: Order["serviceType"];
  documentId?: string;
  documentIds?: string[];
  documentConfigs?: DocumentConfigInput[];
  pageRange?: string | null;
  copies?: number;
  paperSize?: Order["paperSize"];
  colorMode?: Order["colorMode"];
  sides?: Order["sides"];
  items?: { productId: string; qty: number }[];
  manualPages?: number;
}

export interface DocumentConfigInput {
  documentId: string;
  pageRange?: string | null;
  copies?: number;
  paperSize?: Order["paperSize"];
  colorMode?: Order["colorMode"];
  sides?: Order["sides"];
  manualPages?: number;
}

/**
 * Resolves the uploaded document (and its printable page count) for pricing.
 * Shared by the quote and create order paths so both validate identically.
 */
export function resolveDocumentForPricing(
  user: User,
  serviceType: Order["serviceType"],
  documentId?: string,
  documentIds?: string[],
  manualPages?: number
): { documentId?: string; documentIds?: string[]; fileNames?: string[]; totalDocumentPages: number } {
  if (serviceType === "STATIONERY") return { totalDocumentPages: 0 };
  const ids = documentIds?.length ? documentIds : documentId ? [documentId] : [];
  if (!ids.length) {
    throw ApiError.unprocessable("Please upload your document first.");
  }
  const docs = ids.map((id) => findDocument(id));
  if (docs.some((doc) => !doc)) throw ApiError.notFound("Uploaded document not found.");
  if (docs.some((doc) => doc!.userId !== user.userId)) throw ApiError.forbidden("You do not own this document.");
  const unresolved = docs.some((doc) => doc!.pageCount == null);
  if (unresolved && (!manualPages || !Number.isInteger(manualPages) || manualPages < 1 || manualPages > 2000)) {
    throw ApiError.unprocessable("We couldn't read the page count for one or more files. Please enter the total page count.");
  }
  const totalDocumentPages = docs.reduce((sum, doc) => sum + (doc!.pageCount ?? 0), 0) || manualPages!;
  return {
    documentId: docs[0]!.documentId,
    documentIds: docs.map((doc) => doc!.documentId),
    fileNames: docs.map((doc) => doc!.fileName),
    totalDocumentPages,
  };
}

export function calculateOrderPricing(user: User, input: CreateOrderInput): {
  price: PriceBreakdown;
  resolved: ReturnType<typeof resolveDocumentForPricing>;
} {
  const serviceType = input.serviceType || "PRINTING";
  const prefs = user.preferences || {};
  if (!input.documentConfigs?.length) {
    const resolved = resolveDocumentForPricing(user, serviceType, input.documentId, input.documentIds, input.manualPages);
    return {
      resolved,
      price: calculatePrice({
        serviceType,
        totalDocumentPages: resolved.totalDocumentPages,
        pageRange: input.pageRange || "all",
        copies: input.copies ?? 1,
        paperSize: input.paperSize || prefs.paperSize || "A4",
        colorMode: input.colorMode || prefs.colorMode || "bw",
        sides: input.sides || "double",
        items: input.items,
      }),
    };
  }

  const parts = input.documentConfigs.map((config, index) => {
    const resolved = resolveDocumentForPricing(user, serviceType, config.documentId, undefined, config.manualPages);
    return calculatePrice({
      serviceType,
      totalDocumentPages: resolved.totalDocumentPages,
      pageRange: config.pageRange || "all",
      copies: config.copies ?? 1,
      paperSize: config.paperSize || prefs.paperSize || "A4",
      colorMode: config.colorMode || prefs.colorMode || "bw",
      sides: config.sides || "double",
      items: index === 0 ? input.items : undefined,
    });
  });
  const first = parts[0];
  const resolved = resolveDocumentForPricing(user, serviceType, undefined, input.documentConfigs.map((config) => config.documentId), input.manualPages);
  const printingPaise = parts.reduce((sum, part) => sum + part.printingPaise, 0);
  const billedPages = parts.reduce((sum, part) => sum + part.selectedPages * part.copies, 0);
  const price: PriceBreakdown = {
    ...first,
    pageRange: { pageRange: "multiple", pageCount: parts.reduce((sum, part) => sum + part.selectedPages, 0), mode: "all" },
    selectedPages: parts.reduce((sum, part) => sum + part.selectedPages, 0),
    copies: 1,
    ratePaise: billedPages > 0 ? Math.round(printingPaise / billedPages) : first.ratePaise,
    printingPaise,
    stationeryPaise: parts.reduce((sum, part) => sum + part.stationeryPaise, 0),
    serviceFeePaise: first.serviceFeePaise,
    totalPaise: parts.reduce((sum, part) => sum + part.printingPaise, 0) + parts.reduce((sum, part) => sum + part.stationeryPaise, 0) + first.serviceFeePaise,
    items: parts.flatMap((part) => part.items),
  };
  return { price, resolved };
}

/** Reserves stock for stationery lines — the pricing engine has already
 *  validated `stock >= qty`, so this is a safe decrement in single-process mode. */
function reserveStock(items: PriceLine[]): void {
  for (const it of items) {
    const product = findProduct(it.productId);
    if (!product) continue;
    upsertProduct({ ...product, stock: Math.max(0, product.stock - it.qty) });
  }
}

/** Releases stock back (order rejected / cancelled). */
function releaseStock(items: Order["items"]): void {
  for (const it of items) {
    const product = findProduct(it.productId);
    if (!product) continue;
    upsertProduct({ ...product, stock: product.stock + it.qty });
  }
}

/** Shared gate: shop open, pricing resolved. */
function priceOrder(user: User, input: CreateOrderInput) {
  const settings = getSettings();
  if (!settings.open) {
    throw ApiError.unprocessable(
      "The shop is currently closed. Please come back during opening hours."
    );
  }
  const serviceType = input.serviceType || "PRINTING";
  const { resolved, price } = calculateOrderPricing(user, input);
  return { settings, serviceType, resolved, price };
}

export function createOrder(user: User, input: CreateOrderInput, idempotencyKey?: string) {
  if (idempotencyKey) {
    const existing = findOrderByIdempotency(idempotencyKey);
    if (existing) {
      logger.info("Order idempotency hit", { orderId: existing.orderId, key: idempotencyKey });
      return existing;
    }
  }

  const { settings, serviceType, resolved, price } = priceOrder(user, input);

  reserveStock(price.items);

  const token = nextToken();
  const now = new Date().toISOString();
  const ahead = listOrders().filter((o) => WAITING.has(o.status)).length;
  const avg = Math.max(1, settings.avgProcessingMinutes);
  const queueMinutes = Math.max(avg, ahead * avg);
  const estimatedReadyAt = new Date(Date.now() + queueMinutes * 60_000).toISOString();

  const order: Order = {
    orderId: `ord_${String(nextOrderSeq()).padStart(4, "0")}`,
    token,
    userId: user.userId,
    idempotencyKey,
    status: "RECEIVED",
    statusHistory: [{ status: "RECEIVED", at: now, by: user.userId, byName: user.name }],
    serviceType,
    documentId: resolved.documentId,
    documentIds: resolved.documentIds,
    fileName: resolved.fileNames?.join(", "),
    totalDocumentPages: resolved.totalDocumentPages,
    pageCount: price.selectedPages,
    selectedPages: price.selectedPages,
    pageRange: price.pageRange.pageRange,
    copies: price.copies,
    paperSize: price.paperSize,
    colorMode: price.colorMode,
    sides: price.sides,
    ratePaise: price.ratePaise,
    printingPaise: price.printingPaise,
    stationeryPaise: price.stationeryPaise,
    serviceFeePaise: price.serviceFeePaise,
    discountPaise: price.discountPaise,
    totalPaise: price.totalPaise,
    items: price.items,
    pricingVersion: price.pricingVersion,
    paymentStatus: "PENDING",
    estimatedReadyAt,
    createdAt: now,
    updatedAt: now,
  };
  insertOrder(order);

  insertPayment({
    paymentId: nextId("pay"),
    orderId: order.orderId,
    userId: user.userId,
    amountPaise: order.totalPaise,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  });

  createNotification(
    user.userId,
    `Order ${displayToken(token)} received`,
    "Your order is in the queue. We'll notify you the moment it's ready.",
    "ORDER",
    order.orderId
  );

  insertAudit({
    actorId: user.userId,
    actorRole: user.role,
    action: "ORDER_CREATED",
    targetKind: "order",
    targetId: order.orderId,
    meta: { token, totalPaise: order.totalPaise, estMinutes: queueMinutes },
  });
  logger.info("Order created", { orderId: order.orderId, token });

  return order;
}

/** Releases reserved stationery back to stock (used when a checkout is abandoned). */
export function releaseOrderStock(order: Order): void {
  releaseStock(order.items);
}

/**
 * Online checkout path: creates the order in an UNPAID state (no token yet,
 * stock reserved) and returns its payment record. The token is minted only
 * when the payment is confirmed via activatePaidOrder.
 */
export function createPendingOrder(
  user: User,
  input: CreateOrderInput,
  idempotencyKey?: string
): { order: Order; payment: Payment } {
  const { resolved, price } = priceOrder(user, input);

  reserveStock(price.items);

  const now = new Date().toISOString();
  const order: Order = {
    orderId: `ord_${String(nextOrderSeq()).padStart(4, "0")}`,
    token: "",
    userId: user.userId,
    idempotencyKey,
    status: "UNPAID",
    statusHistory: [{ status: "UNPAID", at: now, by: user.userId, byName: user.name, note: "Awaiting online payment" }],
    serviceType: input.serviceType || "PRINTING",
    documentId: resolved.documentId,
    documentIds: resolved.documentIds,
    fileName: resolved.fileNames?.join(", "),
    totalDocumentPages: resolved.totalDocumentPages,
    pageCount: price.selectedPages,
    selectedPages: price.selectedPages,
    pageRange: price.pageRange.pageRange,
    copies: price.copies,
    paperSize: price.paperSize,
    colorMode: price.colorMode,
    sides: price.sides,
    ratePaise: price.ratePaise,
    printingPaise: price.printingPaise,
    stationeryPaise: price.stationeryPaise,
    serviceFeePaise: price.serviceFeePaise,
    discountPaise: price.discountPaise,
    totalPaise: price.totalPaise,
    items: price.items,
    pricingVersion: price.pricingVersion,
    paymentStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
  };
  insertOrder(order);

  const payment: Payment = {
    paymentId: nextId("pay"),
    orderId: order.orderId,
    userId: user.userId,
    amountPaise: order.totalPaise,
    status: "PENDING",
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
  insertPayment(payment);

  logger.info("Pending order created (awaiting payment)", { orderId: order.orderId });
  return { order, payment };
}

/**
 * Confirms a completed online payment: mints the order token, moves the order
 * into the queue (RECEIVED) and marks the payment as settled. Idempotent —
 * replaying for an already-paid order returns the current state unchanged.
 */
export function activatePaidOrder(
  order: Order,
  opts: { payment: Payment; transactionId: string; method: PaymentMethod },
  actor?: { userId: string; name: string }
): Order {
  if (order.status !== "UNPAID" || order.paymentStatus === "PAID") {
    return order;
  }

  const settings = getSettings();
  const token = nextToken();
  const now = new Date().toISOString();
  const ahead = listOrders().filter((o) => WAITING.has(o.status)).length;
  const avg = Math.max(1, settings.avgProcessingMinutes);
  const queueMinutes = Math.max(avg, ahead * avg);
  const estimatedReadyAt = new Date(Date.now() + queueMinutes * 60_000).toISOString();

  updatePayment(opts.payment.paymentId, {
    status: "PAID",
    method: opts.method,
    transactionId: opts.transactionId,
    settledAt: now,
  });

  const updated = updateOrder(order.orderId, {
    token,
    status: "RECEIVED",
    statusHistory: [
      ...order.statusHistory,
      { status: "RECEIVED", at: now, by: actor?.userId ?? "system", byName: actor?.name ?? "Online payment", note: "Payment confirmed" },
    ],
    paymentStatus: "PAID",
    paymentMethod: opts.method,
    transactionId: opts.transactionId,
    estimatedReadyAt,
  })!;

  createNotification(
    order.userId,
    `Order ${displayToken(token)} received`,
    "Your order is in the queue. We'll notify you the moment it's ready.",
    "ORDER",
    order.orderId
  );
  createNotification(
    order.userId,
    `Payment confirmed for ${displayToken(token)}`,
    `₹${(order.totalPaise / 100).toFixed(2)} paid via ${opts.method === "ONLINE" ? "Razorpay" : opts.method}. Transaction ${opts.transactionId}.`,
    "PAYMENT",
    order.orderId
  );

  insertAudit({
    actorId: order.userId,
    actorRole: "STUDENT",
    action: "PAYMENT_SUCCESS",
    targetKind: "order",
    targetId: order.orderId,
    meta: { method: opts.method, transactionId: opts.transactionId, amountPaise: order.totalPaise, gateway: "Razorpay" },
  });
  insertAudit({
    actorId: order.userId,
    actorRole: "STUDENT",
    action: "ORDER_CREATED",
    targetKind: "order",
    targetId: order.orderId,
    meta: { token, totalPaise: order.totalPaise, estMinutes: queueMinutes },
  });
  logger.info("Order paid and activated", { orderId: order.orderId, token, method: opts.method });
  return updated;
}

export function applyOrderTransition(
  order: Order,
  to: OrderStatus,
  actor: User,
  note?: string
): Order {
  if (!canTransition(order.status, to)) {
    throw ApiError.unprocessable(
      `Cannot move an order from ${order.status} to ${to}.`
    );
  }
  const now = new Date().toISOString();
  const patch: Partial<Order> = { status: to, updatedAt: now };
  if (to === "PROCESSING") patch.processingBy = actor.userId;
  if (to === "READY") patch.preparedBy = actor.userId;
  if (to === "COMPLETED") patch.completedAt = now;

  const updated = updateOrder(order.orderId, patch)!;
  updated.statusHistory.push({
    status: to,
    at: now,
    by: actor.userId,
    byName: actor.name,
    note,
  });
  // statusHistory persists through mutation of the shared object:
  const fresh = { ...updated, statusHistory: updated.statusHistory };

  if (to === "PROCESSING") {
    createNotification(order.userId, `Order ${displayToken(order.token)} is being processed`, "Your document is at the machine now.", "ORDER", order.orderId);
  } else if (to === "READY") {
    createNotification(order.userId, `Order ${displayToken(order.token)} is ready for collection`, "Show your token at the Block C counter.", "READY", order.orderId);
  } else if (to === "COMPLETED") {
    createNotification(order.userId, `Order ${displayToken(order.token)} completed`, "Collected at the counter. See you next time!", "ORDER", order.orderId);
  }
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "STATUS_CHANGED",
    targetKind: "order",
    targetId: order.orderId,
    meta: { from: order.status, to, note },
  });

  if (to === "COMPLETED" || to === "REJECTED") {
    purgeDocumentsForTerminalOrder(order);
  }

  return fresh;
}

export function rejectOrder(order: Order, actor: User, reason: string): Order {
  if (!["RECEIVED", "PROCESSING"].includes(order.status)) {
    throw ApiError.unprocessable("This order can no longer be rejected.");
  }
  const updated = applyOrderTransition(order, "REJECTED", actor, reason);
  updateOrder(order.orderId, { rejectionReason: reason });

  // Return reserved stationery back to the shelf.
  releaseStock(order.items);

  // Simulated automatic refund (only when money actually changed hands).
  const payment = findPaymentByOrder(order.orderId);
  if (payment && payment.status === "PAID") {
    updatePayment(payment.paymentId, { status: "REFUNDED" });
    updateOrder(order.orderId, { paymentStatus: "REFUNDED" });
    createNotification(
      order.userId,
      `Payment refunded for ${displayToken(order.token)}`,
      `₹${(order.totalPaise / 100).toFixed(2)} returned to your ${payment.method === "ONLINE" ? "Razorpay account" : payment.method || "account"} (${payment.transactionId || "REF" + displayToken(order.token)}).`,
      "PAYMENT",
      order.orderId
    );
    insertAudit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "REFUND_INITIATED",
      targetKind: "payment",
      targetId: payment.paymentId,
      meta: { orderToken: order.token, amountPaise: order.totalPaise, transactionId: payment.transactionId },
    });
    insertAudit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "ORDER_REJECTED",
      targetKind: "order",
      targetId: order.orderId,
      meta: { reason, refundPaise: order.totalPaise },
    });
    createNotification(
      order.userId,
      `Order ${displayToken(order.token)} was rejected`,
      `Your order was rejected: ${reason || "See counter for details"}. Your payment is being refunded.`,
      "REJECTED",
      order.orderId
    );
    const result = { ...updated, rejectionReason: reason, paymentStatus: "REFUNDED" as const };
    return result;
  }

  createNotification(
    order.userId,
    `Order ${displayToken(order.token)} was rejected`,
    `Your order was rejected: ${reason || "See counter for details"}. No payment was taken.`,
    "REJECTED",
    order.orderId
  );
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "ORDER_REJECTED",
    targetKind: "order",
    targetId: order.orderId,
    meta: { reason, refundPaise: 0 },
  });
  return { ...updated, rejectionReason: reason, paymentStatus: order.paymentStatus };
}