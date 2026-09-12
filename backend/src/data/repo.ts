import { randomUUID } from "crypto";
import { env } from "../config/env";
import type {
  Database,
  DocumentRecord,
  Notification,
  Order,
  Payment,
  Product,
  User,
} from "../types";
import { buildSeedDb } from "./seedData";
import { JsonStore } from "./store";

const store = new JsonStore<Database>(env.DB_FILE, buildSeedDb);

export function db(): Database {
  return store.get();
}

export function persist(): void {
  store.save();
}

/** Rebuilds the store from seed data. Used by the CLI seed command. */
export function replaceStore(): Database {
  const next = buildSeedDb();
  store.replace(next);
  return next;
}

export function nextId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 12)}`;
}

/* ---------- counters / tokens ---------- */

export function nextToken(): string {
  const d = db();
  d.counters.tokenSeq += 1;
  const token = "Q" + d.counters.tokenSeq;
  persist();
  return token;
}

export function nextOrderSeq(): number {
  const d = db();
  d.counters.orderSeq += 1;
  const seq = d.counters.orderSeq;
  persist();
  return seq;
}

/* ---------- users ---------- */

export function findUserByEmail(email: string): User | undefined {
  return db().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(userId: string): User | undefined {
  return db().users.find((u) => u.userId === userId);
}

export function listUsers(role?: string): User[] {
  const users = db().users;
  return role ? users.filter((u) => u.role === role) : users;
}

export function insertUser(user: User): User {
  db().users.push(user);
  persist();
  return user;
}

export function insertStaffUser(input: {
  name: string;
  email: string;
  counter?: string;
  passHash: string;
}): User {
  const user: User = {
    userId: nextId("usr"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passHash,
    role: "STAFF",
    counter: input.counter,
    active: true,
    createdAt: new Date().toISOString(),
  };
  return insertUser(user);
}

export function updateUser(userId: string, patch: Partial<User>): User | undefined {
  const u = db().users.find((x) => x.userId === userId);
  if (!u) return undefined;
  Object.assign(u, patch, { userId });
  persist();
  return u;
}

export function userPublic(u: User) {
  return {
    userId: u.userId,
    name: u.name,
    email: u.email,
    role: u.role,
    studentId: u.studentId,
    counter: u.counter,
    active: u.active,
    preferences: u.preferences,
    createdAt: u.createdAt,
  };
}

/* ---------- products ---------- */

export function listProducts(includeInactive = false): Product[] {
  return db().products.filter((p) => includeInactive || p.active);
}

export function findProduct(productId: string): Product | undefined {
  return db().products.find((p) => p.productId === productId);
}

export function upsertProduct(product: Product): Product {
  const d = db();
  const i = d.products.findIndex((p) => p.productId === product.productId);
  if (i >= 0) d.products[i] = product;
  else d.products.push(product);
  persist();
  return product;
}

export function deleteProduct(productId: string): boolean {
  const d = db();
  const before = d.products.length;
  d.products = d.products.filter((p) => p.productId !== productId);
  if (d.products.length !== before) {
    persist();
    return true;
  }
  return false;
}

/* ---------- pricing ---------- */

export function getPricingRules() {
  return db().pricing;
}

export function findPricingRule(paper: string, colorMode: string) {
  return db().pricing.find((p) => p.paper === paper && p.colorMode === colorMode);
}

export function updatePricingRule(id: string, ratePaise: number, updatedAt: string) {
  const rule = db().pricing.find((p) => p.id === id);
  if (!rule) return undefined;
  rule.ratePaise = ratePaise;
  rule.updatedAt = updatedAt;
  persist();
  return rule;
}

/* ---------- settings ---------- */

export function getSettings() {
  return db().settings;
}

export function updateSettings(patch: Partial<Database["settings"]>) {
  const s = db().settings;
  Object.assign(s, patch, { updatedAt: new Date().toISOString() });
  persist();
  return s;
}

/* ---------- orders ---------- */

export function listOrders(): Order[] {
  return db().orders;
}

export function findOrderById(orderId: string): Order | undefined {
  return db().orders.find((o) => o.orderId === orderId);
}

export function findOrderByToken(token: string): Order | undefined {
  return db().orders.find((o) => o.token === token);
}

export function findOrderByIdempotency(key: string): Order | undefined {
  return db().orders.find((o) => o.idempotencyKey === key);
}

export function findOrderByTransaction(tx: string): Order | undefined {
  return db().orders.find((o) => o.transactionId === tx);
}

export function insertOrder(order: Order): Order {
  db().orders.push(order);
  persist();
  return order;
}

export function updateOrder(orderId: string, patch: Partial<Order>): Order | undefined {
  const o = db().orders.find((x) => x.orderId === orderId);
  if (!o) return undefined;
  Object.assign(o, patch, { orderId, updatedAt: new Date().toISOString() });
  persist();
  return o;
}

export function deleteOrder(orderId: string): boolean {
  const d = db();
  const before = d.orders.length;
  d.orders = d.orders.filter((o) => o.orderId !== orderId);
  if (d.orders.length !== before) {
    persist();
    return true;
  }
  return false;
}

/* ---------- payments ---------- */

export function listPayments(): Payment[] {
  return db().payments;
}

export function findPaymentByOrder(orderId: string): Payment | undefined {
  return db().payments.find((p) => p.orderId === orderId);
}

export function findPaymentByIdempotency(key: string): Payment | undefined {
  return db().payments.find((p) => p.idempotencyKey === key);
}

export function findPaymentByRazorpayOrder(razorpayOrderId: string): Payment | undefined {
  return db().payments.find((p) => p.razorpayOrderId === razorpayOrderId);
}

export function deletePayment(paymentId: string): boolean {
  const d = db();
  const before = d.payments.length;
  d.payments = d.payments.filter((p) => p.paymentId !== paymentId);
  if (d.payments.length !== before) {
    persist();
    return true;
  }
  return false;
}

export function insertPayment(payment: Payment): Payment {
  db().payments.push(payment);
  persist();
  return payment;
}

export function updatePayment(paymentId: string, patch: Partial<Payment>): Payment | undefined {
  const p = db().payments.find((x) => x.paymentId === paymentId);
  if (!p) return undefined;
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  persist();
  return p;
}

/* ---------- documents ---------- */

export function listDocuments(userId?: string): DocumentRecord[] {
  const docs = db().documents;
  return userId ? docs.filter((d) => d.userId === userId) : docs;
}

export function findDocument(documentId: string): DocumentRecord | undefined {
  return db().documents.find((d) => d.documentId === documentId);
}

export function insertDocument(doc: DocumentRecord): DocumentRecord {
  db().documents.push(doc);
  persist();
  return doc;
}

export function removeDocument(documentId: string): boolean {
  const d = db();
  const before = d.documents.length;
  d.documents = d.documents.filter((doc) => doc.documentId !== documentId);
  if (d.documents.length !== before) {
    persist();
    return true;
  }
  return false;
}

/* ---------- notifications ---------- */

export function listNotificationsFor(userId: string): Notification[] {
  return db()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function insertNotification(n: Notification): Notification {
  db().notifications.unshift(n);
  persist();
  return n;
}

export function unreadNotificationsFor(userId: string): number {
  return db().notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function markNotificationRead(notificationId: string, userId?: string): boolean {
  const d = db();
  const n = d.notifications.find((x) => x.notificationId === notificationId);
  if (!n) return false;
  if (userId && n.userId !== userId) return false;
  if (!n.read) {
    n.read = true;
    persist();
  }
  return true;
}

export function markAllNotificationsRead(userId: string): void {
  const d = db();
  let changed = false;
  d.notifications.forEach((n) => {
    if (n.userId === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) persist();
}

/* ---------- audits ---------- */

export function insertAudit(entry: Omit<Database["audits"][number], "auditId" | "at">) {
  const d = db();
  d.audits.push({ ...entry, auditId: "aud_" + randomUUID().slice(0, 8), at: new Date().toISOString() });
  persist();
}

export function listAudits(limit = 100) {
  return db()
    .audits.slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}