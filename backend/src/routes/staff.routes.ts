import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  findDocument,
  findOrderById,
  findOrderByToken,
  findUserById,
  listOrders,
  listPayments,
} from "../data/repo";
import type { Order } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/error";
import { staffStats } from "../services/analytics.service";
import { applyOrderTransition, rejectOrder } from "../services/orders.service";
import { verifyCashPayment } from "../services/payments.service";
import { activeOrderCounts, nowServingToken, queueFor, servedByStaffName } from "../services/queue.service";
import { ApiError, asyncHandler } from "../utils/errors";
import { orderDTO } from "../utils/serialize";
import { toDocumentDTO } from "../services/documents.service";

const router = Router();
router.use(requireAuth, requireRole("STAFF", "ADMIN"));

function parseOrderId(id: string) {
  const order = findOrderByToken(id) || findOrderById(id);
  if (!order) throw ApiError.notFound("Order not found.");
  return order;
}

/** Server-side search: token, document name, student name, student ID. */
function matchesSearch(order: Order, q: string): boolean {
  const student = findUserById(order.userId);
  const haystack = [
    order.token,
    order.fileName || "",
    student?.name || "",
    student?.studentId || "",
    order.orderId,
    (order.items || []).map((i) => i.name).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w));
}

function searchQ(req: Request): string {
  return typeof req.query.q === "string" ? req.query.q.trim() : "";
}

router.get("/stats", asyncHandler(async (_req, res) => {
  res.json({ data: staffStats() });
}));

router.get("/queue", asyncHandler(async (req, res) => {
  const q = searchQ(req);
  const orders = listOrders()
    .filter((o) => ["RECEIVED", "PROCESSING"].includes(o.status))
    .filter((o) => (q ? matchesSearch(o, q) : true));
  const rows = [...orders]
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((o, i) => ({
      orderId: o.orderId,
      token: o.token,
      status: o.status,
      serviceType: o.serviceType,
      studentName: findUserById(o.userId)?.name || "",
      studentId: findUserById(o.userId)?.studentId,
      userId: o.userId,
      fileName: o.fileName,
      numPages: o.pageCount,
      copies: o.copies,
      paperSize: o.paperSize,
      colorMode: o.colorMode,
      sides: o.sides,
      totalPaise: o.totalPaise,
      total: o.totalPaise / 100,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      position: i + 1,
      etaMinutes: queueFor(o.token, undefined).etaMinutes,
    }));
  res.json({
    data: {
      rows,
      counts: activeOrderCounts(),
      nowServing: nowServingToken(),
    },
  });
}));

router.get("/orders", asyncHandler(async (req, res) => {
  const scope = typeof req.query.scope === "string" ? req.query.scope : "active";
  const q = searchQ(req);
  const orders = listOrders()
    .filter((o) => {
      if (scope === "active") return ["RECEIVED", "PROCESSING", "READY"].includes(o.status);
      if (scope === "completed") return o.status === "COMPLETED";
      if (scope === "rejected") return o.status === "REJECTED";
      return o.status !== "UNPAID";
    })
    .filter((o) => (q ? matchesSearch(o, q) : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const rows = orders.map((o) => ({
    orderId: o.orderId,
    token: o.token,
    status: o.status,
    serviceType: o.serviceType,
    fileName: o.fileName,
    pageCount: o.pageCount,
    copies: o.copies,
    total: o.totalPaise / 100,
    totalPaise: o.totalPaise,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    studentName: findUserById(o.userId)?.name || "—",
    studentId: findUserById(o.userId)?.studentId,
    createdAt: o.createdAt,
    completedAt: o.completedAt,
    servedBy: servedByStaffName(o),
  }));
  res.json({ data: rows });
}));

router.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = parseOrderId(String(req.params.id));
  const student = findUserById(order.userId);
  const payment = listPayments().find((p) => p.orderId === order.orderId);
  const documents = (order.documentIds?.length ? order.documentIds : order.documentId ? [order.documentId] : [])
    .map((documentId) => {
      const doc = findDocument(documentId);
      return doc ? { ...toDocumentDTO(doc), accessUrl: `/api/documents/${doc.documentId}/file` } : undefined;
    })
    .filter(Boolean);
  res.json({
    data: {
      order: orderDTO(order, queueFor(order.token, undefined)),
      student: student
        ? { name: student.name, email: student.email, studentId: student.studentId }
        : undefined,
      payment: payment
        ? { status: payment.status, method: payment.method, transactionId: payment.transactionId, amount: payment.amountPaise / 100 }
        : undefined,
      documents,
      document: documents[0],
    },
  });
}));

const statusSchema = z.object({
  status: z.enum(["PROCESSING", "READY", "COMPLETED", "REJECTED"]),
  reason: z.string().min(1).max(300).optional(),
});

router.post("/orders/:id/status", validate(statusSchema), asyncHandler(async (req, res) => {
  const order = parseOrderId(String(req.params.id));
  const { status, reason } = req.body as z.infer<typeof statusSchema>;
  if (status === "REJECTED") {
    const updated = rejectOrder(order, req.user!, reason || "Requested by staff.");
    res.json({ data: orderDTO(updated, queueFor(updated.token, undefined)) });
    return;
  }
  const updated = applyOrderTransition(order, status, req.user!, reason);
  // A cash-at-counter order is settled the moment the staff marks it completed —
  // otherwise it would stay PENDING forever and never count toward revenue.
  if (
    status === "COMPLETED" &&
    updated.paymentMethod === "CASH" &&
    updated.paymentStatus !== "PAID"
  ) {
    verifyCashPayment(order, req.user!, order.totalPaise);
  }
  res.json({ data: orderDTO(order, queueFor(order.token, undefined)) });
}));

const cashSchema = z.object({
  amountPaise: z.number().int().min(1),
});

router.post("/orders/:id/payment/verify-cash", validate(cashSchema), asyncHandler(async (req, res) => {
  const order = parseOrderId(String(req.params.id));
  const { amountPaise } = req.body as z.infer<typeof cashSchema>;
  if (amountPaise < order.totalPaise) {
    throw ApiError.unprocessable("Amount collected is less than the order total.");
  }
  const updated = verifyCashPayment(order, req.user!, amountPaise);
  res.json({ data: orderDTO(updated, queueFor(updated.token, undefined)) });
}));

export default router;