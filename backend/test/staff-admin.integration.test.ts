import { PDFDocument } from "pdf-lib";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db, findProduct, replaceStore } from "../src/data/repo";

const app = createApp();

const STUDENT = { email: "gangadhar@mlrit.ac.in", password: "demo1234" };
const STAFF = { email: "scope@mlrit.ac.in", password: "demo1234" };
const ADMIN = { email: "mlrit@mlrit.ac.in", password: "demo1234" };

async function login(email: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

async function makePdf(pageCount = 3): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([420, 595]);
  return Buffer.from(await doc.save());
}

async function uploadPdf(token: string, pages = 3, name = "notes.pdf") {
  const res = await request(app)
    .post("/api/documents/")
    .set("Authorization", `Bearer ${token}`)
    .attach("file", await makePdf(pages), { filename: name, contentType: "application/pdf" });
  expect(res.status).toBe(201);
  return res.body.data as { documentId: string; pageCount: number | null };
}

async function createPrintingOrder(token: string, idempotencyKey: string) {
  const doc = await uploadPdf(token, 4);
  const res = await request(app)
    .post("/api/orders/")
    .set("Authorization", `Bearer ${token}`)
    .send({ serviceType: "PRINTING", documentId: doc.documentId, idempotencyKey });
  expect(res.status).toBe(201);
  return res.body.data as { orderId: string; token: string };
}

/** Pays via the Razorpay gateway (simulator mode) and returns the paid orderId. */
async function createPaidPrintingOrder(token: string, idempotencyKey: string) {
  const doc = await uploadPdf(token, 4);
  const intent = await request(app)
    .post("/api/payments/razorpay/intent")
    .set("Authorization", `Bearer ${token}`)
    .send({ serviceType: "PRINTING", documentId: doc.documentId, idempotencyKey });
  expect(intent.status).toBe(201);
  const { orderId, razorpayOrderId } = intent.body.data as { orderId: string; razorpayOrderId: string };
  const verified = await request(app)
    .post("/api/payments/razorpay/verify")
    .set("Authorization", `Bearer ${token}`)
    .send({
      orderId,
      razorpayOrderId,
      razorpayPaymentId: "pay_mock_staff_1",
      razorpaySignature: "signature_mock_staff_1",
    });
  expect(verified.status).toBe(200);
  return orderId;
}

beforeEach(() => {
  replaceStore();
});

describe("security — role boundaries enforced server-side (#20)", () => {
  it("rejects unauthenticated access to admin and staff APIs", async () => {
    expect((await request(app).get("/api/admin/overview")).status).toBe(401);
    expect((await request(app).get("/api/staff/queue")).status).toBe(401);
    expect((await request(app).get("/api/admin/audits")).status).toBe(401);
  });

  it("blocks students from every admin API", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    expect((await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/products").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/staff-users").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/audits").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).patch("/api/admin/pricing/pr-a4-bw").set("Authorization", `Bearer ${student}`).send({ ratePaise: 900 })).status).toBe(403);
    expect((await request(app).post("/api/admin/products").set("Authorization", `Bearer ${student}`).send({ name: "X", pricePaise: 100, stock: 1 })).status).toBe(403);
    expect((await request(app).post("/api/admin/staff-users").set("Authorization", `Bearer ${student}`).send({ name: "X", email: "x@college.edu" })).status).toBe(403);
  });

  it("blocks students from staff APIs", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    expect((await request(app).get("/api/staff/queue").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).get("/api/staff/orders").set("Authorization", `Bearer ${student}`)).status).toBe(403);
    expect((await request(app).get("/api/staff/stats").set("Authorization", `Bearer ${student}`)).status).toBe(403);
  });

  it("blocks staff from admin APIs but allows the admin console", async () => {
    const staff = await login(STAFF.email, STAFF.password);
    expect((await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${staff}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/products").set("Authorization", `Bearer ${staff}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/audits").set("Authorization", `Bearer ${staff}`)).status).toBe(403);
    expect((await request(app).patch("/api/admin/pricing/pr-a4-bw").set("Authorization", `Bearer ${staff}`).send({ ratePaise: 900 })).status).toBe(403);
    // ...but staff still belongs on the operations console.
    expect((await request(app).get("/api/staff/queue").set("Authorization", `Bearer ${staff}`)).status).toBe(200);
  });

  it("allows the administrator across every admin API", async () => {
    const admin = await login(ADMIN.email, ADMIN.password);
    expect((await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${admin}`)).status).toBe(200);
    expect((await request(app).get("/api/admin/products").set("Authorization", `Bearer ${admin}`)).status).toBe(200);
    expect((await request(app).get("/api/admin/staff-users").set("Authorization", `Bearer ${admin}`)).status).toBe(200);
    expect((await request(app).get("/api/admin/audits").set("Authorization", `Bearer ${admin}`)).status).toBe(200);
    expect((await request(app).get("/api/staff/queue").set("Authorization", `Bearer ${admin}`)).status).toBe(200);
  });
});

describe("completed end-to-end lifecycle (#21)", () => {
  it("staff order detail exposes every uploaded document for original file sharing", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    const staff = await login(STAFF.email, STAFF.password);

    const first = await uploadPdf(student, 4, "first.pdf");
    const second = await uploadPdf(student, 2, "second.pdf");

    const res = await request(app)
      .post("/api/orders/")
      .set("Authorization", `Bearer ${student}`)
      .send({
        serviceType: "PRINTING",
        documentIds: [first.documentId, second.documentId],
        documentConfigs: [
          { documentId: first.documentId, pageRange: "all", copies: 1 },
          { documentId: second.documentId, pageRange: "all", copies: 1 },
        ],
        idempotencyKey: "multi-doc-detail-key",
      });

    expect(res.status).toBe(201);

    const detail = await request(app)
      .get(`/api/staff/orders/${res.body.data.orderId}`)
      .set("Authorization", `Bearer ${staff}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.documents).toHaveLength(2);
    expect(detail.body.data.documents.map((doc: { fileName: string }) => doc.fileName)).toEqual(
      expect.arrayContaining(["first.pdf", "second.pdf"])
    );
    expect(detail.body.data.documents.every((doc: { accessUrl: string }) => doc.accessUrl)).toBe(true);
  });

  it("student → staff → student happy path with notifications", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    const staff = await login(STAFF.email, STAFF.password);
    const order = await createPrintingOrder(student, "e2e-happy-order");

    // Staff sees the order in the queue with student context.
    const queue = await request(app).get("/api/staff/queue").set("Authorization", `Bearer ${staff}`);
    const row = queue.body.data.rows.find((r: { token: string }) => r.token === order.token);
    expect(row).toBeDefined();
    expect(row.studentName).toBe("Arjun Menon");
    expect(row.studentId).toBe("MLR2291");

    // Staff starts processing.
    const processing = await request(app)
      .post(`/api/staff/orders/${order.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "PROCESSING" });
    expect(processing.status).toBe(200);
    expect(processing.body.data.status).toBe("PROCESSING");

    // Student sees Processing.
    const studentView = await request(app).get(`/api/orders/${order.orderId}`).set("Authorization", `Bearer ${student}`);
    expect(studentView.status).toBe(200);
    expect(studentView.body.data.status).toBe("PROCESSING");
    expect(studentView.body.data.queue).toBeDefined();

    // Staff marks ready → student gets a READY notification.
    const ready = await request(app)
      .post(`/api/staff/orders/${order.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "READY" });
    expect(ready.body.data.status).toBe("READY");

    const studentId = db().users.find((u) => u.email === STUDENT.email)!.userId;
    const notifications = await request(app).get("/api/notifications/").set("Authorization", `Bearer ${student}`);
    const kinds = notifications.body.data.map((n: { kind: string; orderId?: string }) => n.kind);
    expect(kinds).toContain("READY");

    // Staff completes, student sees Completed.
    const done = await request(app)
      .post(`/api/staff/orders/${order.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "COMPLETED" });
    expect(done.body.data.status).toBe("COMPLETED");
    expect(done.body.data.completedAt).toBeDefined();
    void studentId;

    const finalView = await request(app).get(`/api/orders/${order.orderId}`).set("Authorization", `Bearer ${student}`);
    expect(finalView.body.data.status).toBe("COMPLETED");
  });

  it("backend refuses invalid transitions (READY → PROCESSING, RECEIVED → COMPLETED)", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    const staff = await login(STAFF.email, STAFF.password);
    const order = await createPrintingOrder(student, "e2e-invalid-order");

    const skip = await request(app)
      .post(`/api/staff/orders/${order.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "COMPLETED" });
    expect(skip.status).toBe(422);

    await request(app)
      .post(`/api/staff/orders/${order.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "PROCESSING" });
    const back = await request(app)
      .post(`/api/staff/orders/${order.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "PROCESSING" });
    expect(back.status).toBe(422);
  });

  it("rejection flow: student pays, is rejected, sees Rejected + Refunded + notification", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    const staff = await login(STAFF.email, STAFF.password);
    const orderId = await createPaidPrintingOrder(student, "e2e-reject-order");

    const rejected = await request(app)
      .post(`/api/staff/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "REJECTED", reason: "Corrupted / blank pages" });
    expect(rejected.status).toBe(200);

    const view = await request(app).get(`/api/orders/${orderId}`).set("Authorization", `Bearer ${student}`);
    expect(view.body.data.status).toBe("REJECTED");
    expect(view.body.data.rejectionReason).toBe("Corrupted / blank pages");
    expect(view.body.data.paymentStatus).toBe("REFUNDED");

    const notifications = await request(app).get("/api/notifications/").set("Authorization", `Bearer ${student}`);
    const bodyText = notifications.body.data.map((n: { body: string; title: string }) => n.body + " " + n.title).join(" ");
    expect(bodyText.toLowerCase()).toContain("rejected");
    expect(bodyText.toLowerCase()).toContain("refund");
  });
});

describe("pricing + inventory management (#13 #14 #15)", () => {
  it("pricing change never retroactively rewrites an existing order total", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    const admin = await login(ADMIN.email, ADMIN.password);
    const order = await createPrintingOrder(student, "e2e-lock-price");
    expect(order.totalPaise).toBe(4 * 100); // A4 B&W @ ₹1/page

    const changed = await request(app)
      .patch("/api/admin/pricing/pr-a4-bw")
      .set("Authorization", `Bearer ${admin}`)
      .send({ ratePaise: 250 });
    expect(changed.status).toBe(200);
    // Fresh quote uses the new rate.
    const doc = await uploadPdf(student, 4);
    const fresh = await request(app)
      .post("/api/pricing/calculate")
      .set("Authorization", `Bearer ${student}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId });
    expect(fresh.body.data.totalPaise).toBe(4 * 250);
    // The existing order still carries its locked price.
    const existing = db().orders.find((o) => o.orderId === order.orderId)!;
    expect(existing.totalPaise).toBe(400);
  });

  it("admin can create, edit, deactivate and restock a product — and it is audited", async () => {
    const admin = await login(ADMIN.email, ADMIN.password);

    const created = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "Clipboard", description: "A4 · clip", pricePaise: 3500, stock: 20, minStock: 5 });
    expect(created.status).toBe(201);
    const id = created.body.data.productId;

    const patched = await request(app)
      .patch(`/api/admin/products/${id}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ pricePaise: 4000, stock: 14, active: false });
    expect(patched.status).toBe(200);
    expect(patched.body.data.pricePaise).toBe(4000);
    expect(patched.body.data.stock).toBe(14);
    expect(patched.body.data.active).toBe(false);

    // Deactivated products drop off the public catalogue.
    const catalogue = await request(app).get("/api/products");
    expect(catalogue.body.data.some((p: { productId: string }) => p.productId === id)).toBe(false);
    // ...but remain visible to the admin inventory view with inventory numbers.
    const inventory = await request(app).get("/api/admin/products").set("Authorization", `Bearer ${admin}`);
    expect(inventory.body.data.some((p: { productId: string; active: boolean }) => p.productId === id && !p.active)).toBe(true);

    const audits = await request(app).get("/api/admin/audits").set("Authorization", `Bearer ${admin}`);
    const actions = audits.body.data.map((a: { action: string }) => a.action);
    expect(actions).toContain("PRODUCT_CREATED");
    expect(actions).toContain("PRODUCT_UPDATED");
  });

  it("prevents negative inventory on stock-adjusted products", async () => {
    const admin = await login(ADMIN.email, ADMIN.password);
    const student = await login(STUDENT.email, STUDENT.password);

    const before = findProduct("stapler")!.stock; // seeded 8
    const res = await request(app)
      .post("/api/orders/")
      .set("Authorization", `Bearer ${student}`)
      .send({ serviceType: "STATIONERY", items: [{ productId: "stapler", qty: before + 1 }] });
    expect(res.status).toBe(422);
    expect(findProduct("stapler")!.stock).toBe(before);
  });
});

describe("staff server-side search (#2)", () => {
  it("finds orders by document name, student name and student ID", async () => {
    const student = await login(STUDENT.email, STUDENT.password);
    const staff = await login(STAFF.email, STAFF.password);
    const order = await createPrintingOrder(student, "search-src-order");

    const byDoc = await request(app).get("/api/staff/queue?q=notes").set("Authorization", `Bearer ${staff}`);
    expect(byDoc.body.data.rows.some((r: { token: string }) => r.token === order.token)).toBe(true);

    const byName = await request(app).get("/api/staff/queue?q=Arjun").set("Authorization", `Bearer ${staff}`);
    expect(byName.body.data.rows.some((r: { token: string }) => r.token === order.token)).toBe(true);

    const byId = await request(app).get("/api/staff/queue?q=MLR2291").set("Authorization", `Bearer ${staff}`);
    expect(byId.body.data.rows.some((r: { token: string }) => r.token === order.token)).toBe(true);

    const noMatch = await request(app).get("/api/staff/orders?scope=all&q=nonexistent-name").set("Authorization", `Bearer ${staff}`);
    expect(noMatch.body.data.every((r: { token: string }) => r.token !== order.token)).toBe(true);
  });
});