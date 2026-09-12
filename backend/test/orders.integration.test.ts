import { PDFDocument } from "pdf-lib";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db, findProduct, replaceStore, unreadNotificationsFor } from "../src/data/repo";

const app = createApp();

const STUDENT = { email: "gangadhar@mlrit.ac.in", password: "demo1234" };
const STAFF = { email: "scope@mlrit.ac.in", password: "demo1234" };

async function makePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([420, 595]);
  return Buffer.from(await doc.save());
}

async function login(email: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

async function uploadPdf(token: string, pages = 3, name = "notes.pdf") {
  const res = await request(app)
    .post("/api/documents/")
    .set("Authorization", `Bearer ${token}`)
    .attach("file", await makePdf(pages), { filename: name, contentType: "application/pdf" });
  expect(res.status).toBe(201);
  return res.body.data as { documentId: string; pageCount: number | null };
}

beforeEach(() => {
  replaceStore();
});

describe("quote endpoint (POST /api/orders/quote)", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/orders/quote").send({ serviceType: "STATIONERY" });
    expect(res.status).toBe(401);
  });

  it("quotes a stationery-only order with service fee and validates stock", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "STATIONERY", items: [{ productId: "pen-blue", qty: 2 }] });

    expect(res.status).toBe(200);
    const q = res.body.data;
    expect(q.currency).toBe("INR");
    expect(q.pricingVersion).toBeGreaterThan(0);
    expect(new Date(q.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(q.items).toEqual([
      { productId: "pen-blue", name: "Blue Pen", qty: 2, unitPaise: 1000, linePaise: 2000 },
    ]);
    expect(q.stationeryPaise).toBe(2000);
    expect(q.printingPaise).toBe(0);
    expect(q.totalPaise).toBe(2000 + q.serviceFeePaise);
  });

  it("rejects overselling when stock is insufficient", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const before = findProduct("pen-blue")!.stock;
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "STATIONERY", items: [{ productId: "pen-blue", qty: before + 1 }] });
    expect(res.status).toBe(422);
    // No stock mutation on a rejected quote.
    expect(findProduct("pen-blue")!.stock).toBe(before);
  });

  it("quotes a custom page range and dedupes overlapping pages", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 8, "thesis.pdf");
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serviceType: "PRINTING",
        documentId: doc.documentId,
        pageRange: "1-5, 3-8",
        copies: 2,
      });
    expect(res.status).toBe(200);
    const q = res.body.data;
    expect(q.configuration.pageRangeMode).toBe("custom");
    // Unique pages 1..8 → 8 pages, even though the raw spec lists 5+6.
    expect(q.configuration.selectedPages).toBe(8);
    expect(q.printingPaise).toBe(8 * 2 * q.ratePaise);
  });

  it("rejects a page range beyond the document", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 4, "short.pdf");
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId, pageRange: "5" });
    expect(res.status).toBe(422);
  });

  it("forbids quoting another user's document", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 3, "mine.pdf");
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId });
    expect(res.status).toBe(200);
    const registration = await request(app).post("/api/auth/register").send({
      name: "Other Student",
      email: "other.student@college.edu",
      password: "demo1234",
    });
    expect(registration.status).toBe(201);
    const other = registration.body.data.token as string;
    const res2 = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${other}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId });
    expect(res2.status).toBe(403);
  });
});

describe("order creation (idempotent, stock, payment)", () => {
  it("creates an order with selectedPages, token and estimatedReadyAt", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 10, "lab.pdf");
    const res = await request(app)
      .post("/api/orders/")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId, pageRange: "1-3", idempotencyKey: "test-key-0001" });
    expect(res.status).toBe(201);
    const o = res.body.data;
    expect(o.token).toMatch(/^Q\d+$/);
    expect(o.selectedPages).toBe(3);
    expect(o.pageRange).toBe("1-3");
    expect(o.paymentStatus).toBe("PENDING");
    expect(Number(o.total)).toBe(o.totalPaise / 100);
    expect(new Date(o.estimatedReadyAt).getTime()).toBeGreaterThan(Date.now());
    expect(o.queue).toBeDefined();
  });

  it("is idempotent: the same key returns the same order and token", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 5);
    const payload = {
      serviceType: "PRINTING",
      documentId: doc.documentId,
      copies: 1,
      idempotencyKey: "test-key-idem-1",
    };
    const first = await request(app).post("/api/orders/").set("Authorization", `Bearer ${token}`).send(payload);
    const second = await request(app).post("/api/orders/").set("Authorization", `Bearer ${token}`).send(payload);
    // Idempotent replay is served (200) with the already-created order.
    expect(second.status).toBe(200);
    expect(second.body.data.orderId).toBe(first.body.data.orderId);
    expect(second.body.data.token).toBe(first.body.data.token);
    expect(db().orders.filter((o) => o.idempotencyKey === "test-key-idem-1").length).toBe(1);
    expect(db().payments.filter((p) => p.orderId === first.body.data.orderId).length).toBe(1);
  });

  it("decrements stock when stationery is ordered", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const before = findProduct("pen-blue")!.stock;
    const res = await request(app)
      .post("/api/orders/")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serviceType: "STATIONERY",
        items: [{ productId: "pen-blue", qty: 3 }],
        idempotencyKey: "test-key-stock-1",
      });
    expect(res.status).toBe(201);
    expect(findProduct("pen-blue")!.stock).toBe(before - 3);
  });

  it("does not create an order when stock runs out mid-flow", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const res = await request(app)
      .post("/api/orders/")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "STATIONERY", items: [{ productId: "pen-blue", qty: 9999 }] });
    expect(res.status).toBe(422);
    expect(db().orders.length).toBe(0); // clean slate remains unchanged
  });

  it("refuses a student with too many active orders", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      name: "Limit Test",
      email: "limit@college.edu",
      password: "secret123",
    });
    const token = reg.body.data.token as string;
    for (let i = 0; i < 3; i++) {
      const ok = await request(app)
        .post("/api/orders/")
        .set("Authorization", `Bearer ${token}`)
        .send({ serviceType: "STATIONERY", idempotencyKey: `limit-key-${i}` });
      expect(ok.status).toBe(201);
    }
    const blocked = await request(app)
      .post("/api/orders/")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "STATIONERY", idempotencyKey: "limit-key-999" });
    expect(blocked.status).toBe(422);
  });
});

describe("payments (Razorpay gateway, simulator mode)", () => {
  async function payOnline(token: string, idempotencyKey: string) {
    const doc = await uploadPdf(token, 4);
    const intent = await request(app)
      .post("/api/payments/razorpay/intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId, idempotencyKey });
    expect(intent.status).toBe(201);
    const body = intent.body.data as { orderId: string; razorpayOrderId: string };
    const verified = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: body.orderId,
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: "pay_mock_test_1",
        razorpaySignature: "signature_mock_test_1",
      });
    expect(verified.status).toBe(200);
    return { token, orderId: body.orderId, razorpayOrderId: body.razorpayOrderId };
  }

  it("creates an UNPAID checkout and mints the token only after verified payment", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 4);
    const intent = await request(app)
      .post("/api/payments/razorpay/intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId, idempotencyKey: "pay-key-ord-1" });
    expect(intent.status).toBe(201);
    const body = intent.body.data;
    expect(body.razorpayOrderId).toMatch(/^order_mock_/);
    expect(body.mode).toBe("mock");
    expect(body.alreadyPaid).toBe(false);

    // No token before payment — the order is invisible to normal listing.
    const pending = db().orders.find((o) => o.orderId === body.orderId)!;
    expect(pending.status).toBe("UNPAID");
    expect(pending.token).toBe("");
    expect(pending.paymentStatus).toBe("PENDING");
    const list = await request(app).get("/api/orders/").set("Authorization", `Bearer ${token}`);
    expect(list.body.data.map((o: { orderId: string }) => o.orderId)).not.toContain(body.orderId);

    const verified = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: body.orderId,
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: "pay_mock_test_1",
        razorpaySignature: "signature_mock_test_1",
      });
    expect(verified.status).toBe(200);
    expect(verified.body.data.status).toBe("RECEIVED");
    expect(verified.body.data.token).toMatch(/^Q\d+$/);
    expect(verified.body.data.paymentStatus).toBe("PAID");
    expect(verified.body.data.paymentMethod).toBe("ONLINE");
    expect(db().payments.find((p) => p.orderId === body.orderId)?.status).toBe("PAID");

    const unread = unreadNotificationsFor(db().users.find((u) => u.email === STUDENT.email)!.userId);
    expect(unread).toBeGreaterThanOrEqual(2); // received + paid
  });

  it("rejects verification for a mismatched checkout", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 4);
    const intent = await request(app)
      .post("/api/payments/razorpay/intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ serviceType: "PRINTING", documentId: doc.documentId, idempotencyKey: "pay-key-mismatch" });
    const body = intent.body.data;
    const bad = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: body.orderId,
        razorpayOrderId: "order_mock_someone_else",
        razorpayPaymentId: "pay_mock_test_2",
        razorpaySignature: "signature_mock_test_2",
      });
    expect(bad.status).toBe(422);
    expect(db().orders.find((o) => o.orderId === body.orderId)?.status).toBe("UNPAID");
  });

  it("is idempotent: replaying a successful verify never double-charges", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const { orderId, razorpayOrderId } = await payOnline(token, "pay-key-ord-2");
    const proof = {
      orderId,
      razorpayOrderId,
      razorpayPaymentId: "pay_mock_test_1",
      razorpaySignature: "signature_mock_test_1",
    };
    const firstToken = db().orders.find((o) => o.orderId === orderId)!.token;
    const replay = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send(proof);
    expect(replay.status).toBe(200);
    expect(replay.body.data.token).toBe(firstToken);
    expect(db().payments.filter((p) => p.orderId === orderId).length).toBe(1);
  });

  it("an intent can be retried with the same key without duplicating the order", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 4);
    const payload = { serviceType: "PRINTING", documentId: doc.documentId, idempotencyKey: "pay-key-int" };
    const first = await request(app).post("/api/payments/razorpay/intent").set("Authorization", `Bearer ${token}`).send(payload);
    const second = await request(app).post("/api/payments/razorpay/intent").set("Authorization", `Bearer ${token}`).send(payload);
    expect(second.status).toBe(201);
    expect(second.body.data.orderId).toBe(first.body.data.orderId);
    expect(second.body.data.razorpayOrderId).toBe(first.body.data.razorpayOrderId);
    expect(db().orders.filter((o) => o.idempotencyKey === "pay-key-int").length).toBe(1);
  });

  it("abandoning a checkout returns stock and removes the pending order", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const before = findProduct("pen-blue")!.stock;
    const intent = await request(app)
      .post("/api/payments/razorpay/intent")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serviceType: "STATIONERY",
        items: [{ productId: "pen-blue", qty: 3 }],
        idempotencyKey: "abandon-key-ord",
      });
    expect(intent.status).toBe(201);
    const orderId = intent.body.data.orderId;
    expect(findProduct("pen-blue")!.stock).toBe(before - 3);

    const ab = await request(app)
      .post(`/api/payments/${orderId}/abandon`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(ab.status).toBe(200);
    expect(db().orders.find((o) => o.orderId === orderId)).toBeUndefined();
    expect(db().payments.find((p) => p.orderId === orderId)).toBeUndefined();
    expect(findProduct("pen-blue")!.stock).toBe(before);
  });

  it("lets a rejected PAID order be refunded and restocks the stationery", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const before = findProduct("record-book")!.stock;
    const intent = await request(app)
      .post("/api/payments/razorpay/intent")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serviceType: "STATIONERY",
        items: [{ productId: "record-book", qty: 2 }],
        idempotencyKey: "refund-key-ord",
      });
    const body = intent.body.data;
    await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: body.orderId,
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: "pay_mock_test_3",
        razorpaySignature: "signature_mock_test_3",
      });
    expect(findProduct("record-book")!.stock).toBe(before - 2);

    const staff = await login(STAFF.email, STAFF.password);
    const rej = await request(app)
      .post(`/api/staff/orders/${body.orderId}/status`)
      .set("Authorization", `Bearer ${staff}`)
      .send({ status: "REJECTED", reason: "pages were blank" });
    expect(rej.status).toBe(200);

    const order = db().orders.find((o) => o.orderId === body.orderId)!;
    expect(order.status).toBe("REJECTED");
    expect(order.paymentStatus).toBe("REFUNDED");
    expect(order.rejectionReason).toBe("pages were blank");
    expect(db().payments.find((p) => p.orderId === body.orderId)!.status).toBe("REFUNDED");
    expect(findProduct("record-book")!.stock).toBe(before);
  });
});

describe("student profile preferences", () => {
  it("persists editable defaults via PATCH /auth/profile", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const patch = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ preferences: { paperSize: "A3", colorMode: "color" } });
    expect(patch.status).toBe(200);
    expect(patch.body.data.user.preferences).toMatchObject({ paperSize: "A3", colorMode: "color" });

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.data.user.preferences).toMatchObject({ paperSize: "A3", colorMode: "color" });
  });
});

describe("document upload pipeline", () => {
  it("streams an exact page count for a real PDF", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const doc = await uploadPdf(token, 7);
    expect(doc.pageCount).toBe(7);
  });

  it("rejects a claimed PDF that is not actually a PDF", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    const docCountBefore = db().documents.length;
    const res = await request(app)
      .post("/api/documents/")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("this is not a pdf at all", "utf8"), {
        filename: "fake.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(422);
    // Nothing is persisted for an invalid upload.
    expect(db().documents.length).toBe(docCountBefore);
  });

  it("counts an image upload as exactly one page", async () => {
    const token = await login(STUDENT.email, STUDENT.password);
    // Minimal 1x1 PNG.
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
        "1f15c4890000000d4944415478da63fcffff3f030005fe02fea7e5c87b" +
        "0000000049454e44ae426082",
      "hex"
    );
    const res = await request(app)
      .post("/api/documents/")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", png, { filename: "id.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.data.pageCount).toBe(1);
  });
});