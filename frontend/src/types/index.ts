export type Role = "STUDENT" | "STAFF" | "ADMIN";

export type OrderStatus =
  | "UNPAID"
  | "RECEIVED"
  | "PROCESSING"
  | "READY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentMethod = "ONLINE" | "UPI" | "CARD" | "CASH";

export type ServiceType = "PRINTING" | "XEROX" | "STATIONERY";

export type PaperSize = "A4" | "A3";
export type ColorMode = "bw" | "color";
export type Sides = "single" | "double";

export interface User {
  userId: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  counter?: string;
  active: boolean;
  preferences?: {
    paperSize?: PaperSize;
    colorMode?: ColorMode;
  };
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPaise: number;
  linePaise: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: string;
  note?: string;
  by?: string;
  byName?: string;
}

export interface DocumentMeta {
  documentId: string;
  fileName: string;
  sizeBytes: number;
  sizeLabel: string;
  pageCount: number | null;
  mimeType: string;
}

export interface QueueRow {
  token: string;
  orderId: string;
  status: OrderStatus;
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

export interface Order {
  orderId: string;
  token: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  serviceType: ServiceType;
  documentId?: string;
  documentIds?: string[];
  fileName?: string;
  documents?: DocumentMeta[];
  totalDocumentPages: number;
  pageCount: number;
  selectedPages: number;
  pageRange: string;
  pageRangeMode?: "all" | "custom";
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
  ratePaise: number;
  printingPaise: number;
  stationeryPaise: number;
  serviceFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  total: number;
  items: OrderItem[];
  pricingVersion: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  estimatedReadyAt?: string;
  completedAt?: string;
  documentMeta?: DocumentMeta;
  queue?: QueueView;
}

export interface Notification {
  notificationId: string;
  title: string;
  body: string;
  kind: "ORDER" | "PAYMENT" | "REJECTED" | "READY" | "GENERAL";
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface PriceRule {
  id: string;
  paper: PaperSize;
  colorMode: ColorMode;
  ratePaise: number;
  rate: number;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  pricePaise: number;
  price: number;
  stock: number;
  minStock?: number;
  reserved?: number;
  active?: boolean;
  updatedAt?: string;
  low?: boolean;
  category?: string;
  imageUrl?: string;
}

export interface StaffStats {
  inQueue: number;
  processing: number;
  ready: number;
  completedToday: number;
  revenuePaise: number;
  avgProcessingMinutes: number;
}

export interface StaffQueueRow {
  orderId: string;
  token: string;
  status: OrderStatus;
  serviceType: ServiceType;
  studentName?: string;
  studentId?: string;
  userId: string;
  fileName?: string;
  numPages: number;
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
  totalPaise: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  position: number;
  etaMinutes: number;
}

export type AnalyticsRange = "today" | "week" | "month";

export interface AdminOverview {
  range: AnalyticsRange;
  from: string;
  to: string;
  orders: number;
  completed: number;
  rejected: number;
  revenuePaise: number;
  avgTurnaroundMinutes: number;
  rejectionRate: number;
  ordersByHour: number[];
  peakHour: number;
  serviceMix: { label: string; count: number; pct: number }[];
  queue: { received: number; processing: number; ready: number };
  lowStock: { productId: string; name: string; stock: number; reserved: number; minStock: number }[];
  shopName: string;
}

export interface AuditEntry {
  auditId: string;
  actorId: string;
  actorName?: string;
  actorRole: Role | "SYSTEM";
  action: string;
  targetKind: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  at: string;
}

export type StaffUser = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  counter?: string;
  active: boolean;
  createdAt?: string;
};

export interface StaffRow {
  orderId: string;
  token: string;
  status: OrderStatus;
  serviceType: ServiceType;
  fileName?: string;
  pageCount: number;
  copies: number;
  total: number;
  totalPaise: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  studentName: string;
  studentId?: string;
  createdAt: string;
  completedAt?: string;
  servedBy?: string;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface QuoteDocument {
  documentId: string;
  fileName: string;
  sizeBytes: number;
  sizeLabel: string;
  pageCount: number | null;
  exactPageCount: boolean;
}

export interface Quote {
  quoteId: string;
  expiresAt: string;
  currency: string;
  document?: QuoteDocument;
  configuration: {
    serviceType: ServiceType;
    pageRange: string;
    pageRangeMode: "all" | "custom";
    selectedPages: number;
    copies: number;
    paperSize: PaperSize;
    colorMode: ColorMode;
    sides: Sides;
  };
  items: OrderItem[];
  printingPaise: number;
  stationeryPaise: number;
  serviceFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  ratePaise: number;
  pricingVersion: number;
}