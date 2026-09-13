import { Router } from "express";
import { z } from "zod";
import {
  findOrderById,
  findOrderByIdempotency,
  findOrderByToken,
  findDocument,
  listOrders,
  nextId,
} from "../data/repo";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/error";
import { calculateOrderPricing, createOrder } from "../services/orders.service";
import { payOrder } from "../services/payments.service";
import { queueFor } from "../services/queue.service";
import { ApiError, asyncHandler } from "../utils/errors";
import { rupees } from "../utils/format";
import { orderDTO } from "../utils/serialize";
import { orderConfigSchema, orderCreateSchema } from "../validation";

const router = Router();

router.use(requireAuth);

/**
 * Stateless quote for the ordering flow. The backend re-prices at checkout,
 * so a quote that goes stale (price changed / stock ran out) is simply
 * re-quoted — the client never submits a total.
 */
router.post("/quote", validate(orderConfigSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof orderConfigSchema>;
  const user = req.user!;
  const serviceType = body.serviceType || "PRINTING";

  const { resolved, price } = calculateOrderPricing(user, body);

  const doc = resolved.documentId ? findDocument(resolved.documentId) : undefined;
  res.json({
    data: {
      quoteId: nextId("qt"),
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      currency: "INR",
      document: doc
        ? {
            documentId: doc.documentId,
            fileName: doc.fileName,
            sizeBytes: doc.sizeBytes,
            sizeLabel: formatBytes(doc.sizeBytes),
            pageCount: doc.pageCount,
            exactPageCount: doc.pageCount != null,
          }
        : undefined,
      configuration: {
        serviceType,
        pageRange: price.pageRange.pageRange,
        pageRangeMode: price.pageRange.mode,
        selectedPages: price.selectedPages,
        copies: price.copies,
        paperSize: price.paperSize,
        colorMode: price.colorMode,
        sides: price.sides,
      },
      items: price.items,
      printingPaise: price.printingPaise,
      stationeryPaise: price.stationeryPaise,
      serviceFeePaise: price.serviceFeePaise,
      discountPaise: price.discountPaise,
      totalPaise: price.totalPaise,
      total: rupees(price.totalPaise),
      ratePaise: price.ratePaise,
      pricingVersion: price.pricingVersion,
    },
  });
}));

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

router.post("/", validate(orderCreateSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof orderCreateSchema>;
  const idempotencyKey = body.idempotencyKey || req.header("x-idempotency-key");
  const user = req.user!;

  if (idempotencyKey) {
    const existing = findOrderByIdempotency(idempotencyKey);
    if (existing) {
      if (existing.userId !== user.userId) throw ApiError.forbidden();
      res.json({ data: orderDTO(existing, queueFor(existing.token, user.userId)) });
      return;
    }
  }

  const activeCount = listOrders().filter(
    (o) => o.userId === user.userId && ["RECEIVED", "PROCESSING"].includes(o.status)
  ).length;
  if (activeCount >= 3) {
    throw ApiError.unprocessable(
      "You already have active orders. Please wait for one to be completed before placing another."
    );
  }

  const order = createOrder(user, body, idempotencyKey);
  res.status(201).json({ data: orderDTO(order, queueFor(order.token, user.userId)) });
}));

// Legacy instant-pay endpoint. Digital methods now go through the Razorpay
// gateway via /api/payments — this route only records a cash-at-counter choice.
const paySchema = z.object({
  method: z.enum(["CASH"]),
  idempotencyKey: z.string().min(8).max(120).optional(),
});

router.post("/:id/pay", validate(paySchema), asyncHandler(async (req, res) => {
  const order = findOrder(String(req.params.id), req.user!);
  const { method, idempotencyKey } = req.body as z.infer<typeof paySchema>;
  const result = payOrder(order, method, idempotencyKey);
  res.json({ data: orderDTO(result.order, queueFor(result.order.token, req.user!.userId)) });
}));

router.get("/", asyncHandler(async (req, res) => {
  const user = req.user!;
  const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
  const orders = listOrders()
    .filter((o) => o.userId === user.userId)
    .filter((o) => o.status !== "UNPAID")
    .filter((o) => (status ? o.status === status : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ data: orders.map((o) => orderDTO(o, queueFor(o.token, user.userId))) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const order = findOrder(String(req.params.id), req.user!);
  res.json({ data: orderDTO(order, queueFor(order.token, req.user!.userId)) });
}));

router.get("/:id/queue", asyncHandler(async (req, res) => {
  const order = findOrder(String(req.params.id), req.user!);
  res.json({ data: queueFor(order.token, req.user!.userId) });
}));

function findOrder(idOrToken: string, requester: { userId: string; role: string }) {
  const order = findOrderByToken(idOrToken) || findOrderById(idOrToken);
  if (!order) throw ApiError.notFound("Order not found.");
  const isStaff = requester.role === "STAFF" || requester.role === "ADMIN";
  if (order.userId !== requester.userId && !isStaff) {
    throw ApiError.forbidden("You do not have access to this order.");
  }
  return order;
}

export default router;