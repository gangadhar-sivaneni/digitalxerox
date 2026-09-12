import bcrypt from "bcryptjs";
import type { Database, DocumentRecord, Notification, Order, OrderItem, Payment, User } from "../types";

const now = Date.now();
const mins = (n: number) => new Date(now - n * 60_000).toISOString();
const hrs = (n: number) => new Date(now - n * 3_600_000).toISOString();
const days = (n: number) => new Date(now - n * 86_400_000).toISOString();

export function buildSeedDb(): Database {
  const cfg = {
    arjunId: "usr_arjun",
    raviId: "usr_ravi",
    sumanId: "usr_suman",
  };

  const hash = bcrypt.hashSync("demo1234", 10);

  const users: User[] = [
    {
      userId: cfg.arjunId,
      name: "Gangadhar",
      email: "gangadhar@mlrit.ac.in",
      passwordHash: hash,
      role: "STUDENT",
      studentId: "MLR2291",
      active: true,
      preferences: { paperSize: "A4", colorMode: "bw" },
      createdAt: days(120),
    },
    {
      userId: cfg.raviId,
      name: "Scope",
      email: "scope@mlrit.ac.in",
      passwordHash: hash,
      role: "STAFF",
      counter: "Counter 1",
      active: true,
      createdAt: days(200),
    },
    {
      userId: cfg.sumanId,
      name: "MLRIT",
      email: "mlrit@mlrit.ac.in",
      passwordHash: hash,
      role: "ADMIN",
      active: true,
      createdAt: days(300),
    },
  ];

  const products = [
    {
      productId: "pen-blue",
      name: "Blue Pen",
      description: "Ball point · 0.7mm",
      pricePaise: 1000,
      stock: 240,
      minStock: 40,
    },
    {
      productId: "pen-black",
      name: "Black Pen",
      description: "Ball point · 0.7mm",
      pricePaise: 1000,
      stock: 320,
      minStock: 40,
    },
    {
      productId: "pencil",
      name: "Pencil",
      description: "HB · with eraser",
      pricePaise: 800,
      stock: 180,
      minStock: 30,
    },
    {
      productId: "notebook",
      name: "Notebook",
      description: "200 pages · ruled",
      pricePaise: 4500,
      stock: 86,
      minStock: 20,
    },
    {
      productId: "record-book",
      name: "Record Book",
      description: "Hardbound · A4",
      pricePaise: 8000,
      stock: 12,
      minStock: 15,
    },
    {
      productId: "file",
      name: "File",
      description: "Plastic · clip",
      pricePaise: 2500,
      stock: 150,
      minStock: 30,
    },
    {
      productId: "a4-sheets",
      name: "A4 Sheets",
      description: "Loose · per sheet",
      pricePaise: 200,
      stock: 2000,
      minStock: 300,
    },
    {
      productId: "marker",
      name: "Marker",
      description: "Permanent · black",
      pricePaise: 3000,
      stock: 30,
      minStock: 25,
    },
    {
      productId: "chart-paper",
      name: "Chart Paper",
      description: "Craft · full sheet",
      pricePaise: 1500,
      stock: 60,
      minStock: 15,
    },
    {
      productId: "stapler",
      name: "Stapler",
      description: "Standard · 24/6",
      pricePaise: 6000,
      stock: 8,
      minStock: 5,
    },
    {
      productId: "staples",
      name: "Staples",
      description: "Box · 24/6",
      pricePaise: 2000,
      stock: 120,
      minStock: 20,
    },
  ].map((p) => ({ ...p, category: "STATIONERY" as const, active: true, updatedAt: mins(600) }));

  const pricing = [
    { id: "pr-a4-bw", paper: "A4" as const, colorMode: "bw" as const, ratePaise: 100 },
    { id: "pr-a4-color", paper: "A4" as const, colorMode: "color" as const, ratePaise: 500 },
    { id: "pr-a3-bw", paper: "A3" as const, colorMode: "bw" as const, ratePaise: 200 },
    { id: "pr-a3-color", paper: "A3" as const, colorMode: "color" as const, ratePaise: 1000 },
  ].map((p) => ({ ...p, updatedAt: mins(600) }));

  const settings: Database["settings"] = {
    shopName: "Digital Xerox",
    openingTime: "09:00",
    closingTime: "18:00",
    avgProcessingMinutes: 5,
    open: true,
    serviceFeePaise: 0,
    maxUploadMB: 25,
    maxFilesPerOrder: 5,
    pricingVersion: 1,
    updatedAt: mins(600),
  };

  const orders: Order[] = [];
  const payments: Payment[] = [];
  let seqCounters = 0;

  function addOrder(
    o: {
      token: string;
      userId: string;
      minutesAgo: number;
      serviceType: Order["serviceType"];
      fileName: string;
      totalDocumentPages: number;
      pageCount: number;
      pageRange: string;
      copies: number;
      paperSize: Order["paperSize"];
      colorMode: Order["colorMode"];
      sides: Order["sides"];
      printingPaise: number;
      items?: OrderItem[];
      status: Order["status"];
      paymentStatus: Order["paymentStatus"];
      method?: "UPI" | "CARD" | "CASH";
      rejectionReason?: string;
      completedDelayMinutes?: number;
    }
  ) {
    const createdAt = mins(o.minutesAgo);
    const stationeryPaise = (o.items || []).reduce((s, i) => s + i.linePaise, 0);
    const totalPaise = o.printingPaise + stationeryPaise;
    const orderId = "ord_" + o.token.replace("-", "");
    const tx = o.paymentStatus === "PAID" ? "TXN" + (700000 + Number(o.token.split("-")[1])) : undefined;
    const seq = Number(o.token.split("-")[1]);

    const history: { status: Order["status"]; at: string; by?: string; byName?: string; note?: string }[] = [
      { status: "RECEIVED", at: createdAt },
    ];
    if (o.status === "PROCESSING") history.push({ status: "PROCESSING", at: mins(o.minutesAgo - 3), by: "usr_ravi" });
    if (o.status === "READY" || o.status === "COMPLETED") {
      history.push({ status: "PROCESSING", at: mins(o.minutesAgo - (o.completedDelayMinutes || 8)), by: "usr_ravi" });
      history.push({ status: "READY", at: mins(o.minutesAgo - (o.completedDelayMinutes ? o.completedDelayMinutes / 2 : 4)), by: "usr_ravi" });
    }
    if (o.status === "COMPLETED") history.push({ status: "COMPLETED", at: createdAt, by: "usr_ravi" });
    if (o.status === "REJECTED") history.push({ status: "REJECTED", at: mins(o.minutesAgo - 2), by: "usr_ravi", note: o.rejectionReason });
    history.push({ status: o.status, at: createdAt });

    const order: Order = {
      orderId,
      token: o.token,
      userId: o.userId,
      status: o.status,
      statusHistory: history,
      serviceType: o.serviceType,
      fileName: o.fileName,
      totalDocumentPages: o.totalDocumentPages,
      pageCount: o.pageCount,
      selectedPages: o.pageCount,
      pageRange: o.pageRange,
      copies: o.copies,
      paperSize: o.paperSize,
      colorMode: o.colorMode,
      sides: o.sides,
      ratePaise: o.paperSize === "A4" ? (o.colorMode === "bw" ? 100 : 500) : o.colorMode === "bw" ? 200 : 1000,
      printingPaise: o.printingPaise,
      stationeryPaise,
      serviceFeePaise: 0,
      discountPaise: 0,
      totalPaise,
      items: o.items || ([] as OrderItem[]),
      pricingVersion: 1,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.method,
      transactionId: tx,
      rejectionReason: o.rejectionReason,
      completedAt: o.status === "COMPLETED" ? createdAt : undefined,
      createdAt,
      updatedAt: createdAt,
    };
    orders.push(order);
    payments.push({
      paymentId: "pay_" + orderId,
      orderId,
      userId: o.userId,
      amountPaise: totalPaise,
      status: o.paymentStatus,
      method: o.method,
      transactionId: tx,
      createdAt,
      updatedAt: createdAt,
      settledAt: o.paymentStatus === "PAID" ? createdAt : undefined,
    });
    documents.push({
      documentId: "doc_" + o.token.replace("-", ""),
      userId: o.userId,
      fileName: o.fileName,
      mimeType: o.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      sizeBytes: 2_400_000,
      pageCount: o.totalDocumentPages,
      storageKey: "seed:" + o.token,
      createdAt,
    });
    if (o.token === "Q184" || o.token === "Q179") {
      notifications.push({
        notificationId: "ntf_" + o.token.replace("-", "") + "_received",
        userId: o.userId,
        title: "Order " + o.token + " received",
        body: "You're in the queue. We'll notify you the moment it's ready.",
        kind: "ORDER",
        orderId,
        read: false,
        createdAt,
      });
    }
    seqCounters = Math.max(seqCounters, seq);
    return order;
  }

  const documents: DocumentRecord[] = [];
  const notifications: Notification[] = [];

  const audits: Database["audits"] = [];

  return {
    users,
    products,
    pricing,
    settings,
    orders,
    payments,
    documents,
    notifications,
    audits,
    counters: { tokenSeq: seqCounters, orderSeq: seqCounters },
  };
}

