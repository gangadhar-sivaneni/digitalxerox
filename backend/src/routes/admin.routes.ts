import { Router } from "express";
import { z } from "zod";
import {
  deleteProduct,
  findProduct,
  findUserById,
  getPricingRules,
  getSettings,
  insertAudit,
  insertStaffUser,
  listAudits,
  listOrders,
  listUsers,
  nextId,
  updatePricingRule,
  updateSettings,
  updateUser,
  upsertProduct,
} from "../data/repo";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/error";
import { adminOverview, productInventoryView, type AnalyticsRange } from "../services/analytics.service";
import { ApiError, asyncHandler } from "../utils/errors";
import bcrypt from "bcryptjs";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const RANGES: AnalyticsRange[] = ["today", "week", "month"];

router.get("/overview", asyncHandler(async (req, res) => {
  const range = RANGES.includes(req.query.range as AnalyticsRange)
    ? (req.query.range as AnalyticsRange)
    : "today";
  res.json({ data: adminOverview(range) });
}));

/* ---------- inventory / products ---------- */

// Admin bridge away from the public catalogue: returns every product
// (active + deactivated) with reserved/available inventory numbers.
router.get("/products", asyncHandler(async (_req, res) => {
  res.json({ data: productInventoryView() });
}));

const productSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional().default(""),
  pricePaise: z.number().int().min(0),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0).optional().default(0),
  active: z.boolean().optional(),
  imageUrl: z.string().max(1_000_000).refine((value) => value.startsWith("data:image/") || /^https?:\/\//.test(value), "Enter a valid image URL.").nullable().optional(),
});

router.post("/products", validate(productSchema), asyncHandler(async (req, res) => {
  const actor = req.user!;
  const { name, description, pricePaise, stock, minStock, active, imageUrl } = req.body as z.infer<typeof productSchema>;
  const product = upsertProduct({
    productId: nextId("prod"),
    name,
    description: description || "",
    category: "STATIONERY",
    pricePaise,
    stock,
    minStock: minStock ?? 0,
    active: active ?? true,
    updatedAt: new Date().toISOString(),
    imageUrl: imageUrl || undefined,
  });
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "PRODUCT_CREATED",
    targetKind: "product",
    targetId: product.productId,
    meta: { name: product.name, pricePaise: product.pricePaise, stock: product.stock },
  });
  res.status(201).json({ data: product });
}));

router.patch("/products/:id", validate(productSchema.partial()), asyncHandler(async (req, res) => {
  const actor = req.user!;
  const existing = findProduct(req.params.id);
  if (!existing) throw ApiError.notFound("Product not found.");
  const patch = req.body as Partial<z.infer<typeof productSchema>>;
  const before = { pricePaise: existing.pricePaise, stock: existing.stock, active: existing.active };
  const product = upsertProduct({
    ...existing,
    name: patch.name ?? existing.name,
    description: patch.description ?? existing.description,
    pricePaise: patch.pricePaise ?? existing.pricePaise,
    stock: patch.stock ?? existing.stock,
    minStock: patch.minStock ?? existing.minStock,
    active: patch.active ?? existing.active,
    imageUrl: patch.imageUrl === null ? undefined : patch.imageUrl ?? existing.imageUrl,
    updatedAt: new Date().toISOString(),
  });
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "PRODUCT_UPDATED",
    targetKind: "product",
    targetId: product.productId,
    meta: {
      name: product.name,
      priceBefore: before.pricePaise,
      priceAfter: product.pricePaise,
      stockBefore: before.stock,
      stockAfter: product.stock,
      activeBefore: before.active,
      activeAfter: product.active,
    },
  });
  res.json({ data: product });
}));

router.delete("/products/:id", asyncHandler(async (req, res) => {
  const actor = req.user!;
  const ok = deleteProduct(req.params.id);
  if (!ok) throw ApiError.notFound("Product not found.");
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "PRODUCT_DELETED",
    targetKind: "product",
    targetId: req.params.id,
  });
  res.json({ data: { ok: true } });
}));

/* ---------- pricing ---------- */

const pricingSchema = z.object({ ratePaise: z.number().int().min(1) });

router.patch("/pricing/:id", validate(pricingSchema), asyncHandler(async (req, res) => {
  const actor = req.user!;
  const rule = getPricingRules().find((p) => p.id === req.params.id);
  if (!rule) throw ApiError.notFound("Pricing rule not found.");
  const { ratePaise } = req.body as z.infer<typeof pricingSchema>;
  updatePricingRule(req.params.id, ratePaise, new Date().toISOString());
  const settings = getSettings();
  // New rates apply to new orders only; existing orders keep their locked price.
  updateSettings({ pricingVersion: settings.pricingVersion + 1 });
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "PRICE_CHANGED",
    targetKind: "pricing",
    targetId: rule.id,
    meta: {
      paper: rule.paper,
      colorMode: rule.colorMode,
      ratePaiseBefore: rule.ratePaise,
      ratePaiseAfter: ratePaise,
      // pinned total is never rewritten retroactively on existing orders
    },
  });
  res.json({ data: { ...rule, ratePaise } });
}));

/* ---------- settings ---------- */

const settingsSchema = z.object({
  open: z.boolean().optional(),
  avgProcessingMinutes: z.number().int().min(1).optional(),
  maxUploadMB: z.number().int().min(1).optional(),
});

router.patch("/settings", validate(settingsSchema), asyncHandler(async (req, res) => {
  const actor = req.user!;
  const patch = req.body as z.infer<typeof settingsSchema>;
  const settings = updateSettings(patch);
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "SETTINGS_CHANGED",
    targetKind: "settings",
    meta: { patch },
  });
  res.json({ data: settings });
}));

/* ---------- staff users ---------- */

router.get("/staff-users", asyncHandler(async (_req, res) => {
  const removedStaffIds = new Set(
    listAudits(1000)
      .filter((audit) => audit.action === "STAFF_DELETED" && audit.targetId)
      .map((audit) => audit.targetId as string)
  );
  const users = listUsers("STAFF").filter((u) => !u.removedAt && !removedStaffIds.has(u.userId)).map((u) => ({
    userId: u.userId,
    name: u.name,
    email: u.email,
    role: u.role,
    counter: u.counter,
    active: u.active,
    createdAt: u.createdAt,
  }));
  res.json({ data: users });
}));

const staffCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  counter: z.string().min(1).optional(),
});

router.post("/staff-users", validate(staffCreateSchema), asyncHandler(async (req, res) => {
  const actor = req.user!;
  const { name, email, counter } = req.body as z.infer<typeof staffCreateSchema>;
  const existing = listUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) throw ApiError.unprocessable("A user with this email already exists.");
  const user = insertStaffUser({
    name,
    email,
    counter,
    passHash: bcrypt.hashSync("demo1234", 10), // bootstrap password, must be changed
  });
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "STAFF_CREATED",
    targetKind: "user",
    targetId: user.userId,
    meta: { name: user.name, email: user.email, role: user.role, counter: user.counter },
  });
  res.status(201).json({ data: { userId: user.userId, name: user.name, email: user.email, role: user.role, counter: user.counter, active: user.active } });
}));

const staffPatchSchema = z.object({
  active: z.boolean().optional(),
  counter: z.string().min(1).optional(),
});

router.patch("/staff-users/:id", validate(staffPatchSchema), asyncHandler(async (req, res) => {
  const actor = req.user!;
  const target = findUserById(req.params.id);
  if (!target || target.role !== "STAFF") throw ApiError.notFound("Staff user not found.");
  const patch = req.body as z.infer<typeof staffPatchSchema>;
  const user = updateUser(req.params.id, { active: patch.active, counter: patch.counter })!;
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "STAFF_UPDATED",
    targetKind: "user",
    targetId: user.userId,
    meta: {
      name: user.name,
      email: user.email,
      activeBefore: target.active,
      activeAfter: user.active,
      counterBefore: target.counter,
      counterAfter: user.counter,
    },
  });
  res.json({ data: { userId: user.userId, name: user.name, email: user.email, counter: user.counter, active: user.active } });
}));

router.delete("/staff-users/:id", asyncHandler(async (req, res) => {
  const actor = req.user!;
  const target = findUserById(req.params.id);
  if (!target || target.role !== "STAFF") throw ApiError.notFound("Staff user not found.");
  updateUser(target.userId, { active: false, removedAt: new Date().toISOString() });
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "STAFF_DELETED",
    targetKind: "user",
    targetId: target.userId,
    meta: { name: target.name, email: target.email },
  });
  res.json({ data: { ok: true } });
}));

// "Reset access": reissues the bootstrap password so a displaced staff member
// can be signed back in by the shop. Never escalates the role.
router.post("/staff-users/:id/reset-password", asyncHandler(async (req, res) => {
  const actor = req.user!;
  const target = findUserById(req.params.id);
  if (!target || target.role !== "STAFF") throw ApiError.notFound("Staff user not found.");
  updateUser(req.params.id, { passwordHash: bcrypt.hashSync("demo1234", 10) });
  insertAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: "STAFF_ACCESS_RESET",
    targetKind: "user",
    targetId: target.userId,
    meta: { name: target.name, email: target.email },
  });
  res.json({ data: { ok: true, message: "Password reset to the bootstrap password." } });
}));

/* ---------- orders + audits ---------- */

router.get("/orders", asyncHandler(async (req, res) => {
  const orders = listOrders()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 200)
    .map((o) => {
      const student = findUserById(o.userId);
      return {
        orderId: o.orderId,
        token: o.token,
        status: o.status,
        serviceType: o.serviceType,
        fileName: o.fileName,
        total: o.totalPaise / 100,
        totalPaise: o.totalPaise,
        paymentStatus: o.paymentStatus,
        studentName: student?.name || "—",
        createdAt: o.createdAt,
      };
    });
  res.json({ data: orders });
}));

router.get("/audits", asyncHandler(async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase().trim() : "";
  const rows = listAudits(500)
    .filter((a) => {
      if (!q) return true;
      return (
        a.action.toLowerCase().includes(q) ||
        a.targetKind.toLowerCase().includes(q) ||
        (a.targetId || "").toLowerCase().includes(q) ||
        JSON.stringify(a.meta || {}).toLowerCase().includes(q)
      );
    })
    .map((a) => ({
      ...a,
      actorName: a.actorId === "SYSTEM" ? "System" : findUserById(a.actorId)?.name || a.actorId,
    }));
  res.json({ data: rows });
}));

export default router;