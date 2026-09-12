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

export type PaymentGateway = "RAZORPAY";

export type ServiceType = "PRINTING" | "XEROX" | "STATIONERY";

export type PaperSize = "A4" | "A3";
export type ColorMode = "bw" | "color";
export type Sides = "single" | "double";

export interface User {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  studentId?: string;
  counter?: string;
  active: boolean;
  removedAt?: string;
  preferences?: {
    paperSize?: PaperSize;
    colorMode?: ColorMode;
  };
  createdAt: string;
}

export interface PublicUser {
  userId: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  counter?: string;
  active: boolean;
  createdAt: string;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  category: "STATIONERY";
  pricePaise: number;
  stock: number;
  minStock: number;
  active: boolean;
  updatedAt: string;
  imageUrl?: string;
}

export interface PriceRule {
  id: string;
  paper: PaperSize;
  colorMode: ColorMode;
  ratePaise: number;
  updatedAt: string;
}

export interface ShopSettings {
  shopName: string;
  openingTime: string;
  closingTime: string;
  avgProcessingMinutes: number;
  open: boolean;
  serviceFeePaise: number;
  maxUploadMB: number;
  maxFilesPerOrder: number;
  pricingVersion: number;
  updatedAt: string;
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

export interface Order {
  orderId: string;
  /** Empty until online payment is confirmed — minted by activatePaidOrder. */
  token: string;
  userId: string;
  idempotencyKey?: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  serviceType: ServiceType;
  documentId?: string;
  documentIds?: string[];
  fileName?: string;
  totalDocumentPages: number;
  pageCount: number;
  selectedPages: number;
  pageRange: string;
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
  items: OrderItem[];
  pricingVersion: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  rejectionReason?: string;
  processingBy?: string;
  preparedBy?: string;
  estimatedReadyAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  userId: string;
  amountPaise: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  gateway?: PaymentGateway;
  /** Razorpay order id created server-side for the checkout. */
  razorpayOrderId?: string;
  transactionId?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
}

export interface DocumentRecord {
  documentId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  storageKey: string;
  createdAt: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  kind: "ORDER" | "PAYMENT" | "REJECTED" | "READY" | "GENERAL";
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditEntry {
  auditId: string;
  actorId: string;
  actorRole: Role | "SYSTEM";
  action: string;
  targetKind: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  at: string;
}

export interface Counters {
  tokenSeq: number;
  orderSeq: number;
}

export interface Database {
  users: User[];
  products: Product[];
  pricing: PriceRule[];
  settings: ShopSettings;
  orders: Order[];
  payments: Payment[];
  documents: DocumentRecord[];
  notifications: Notification[];
  audits: AuditEntry[];
  counters: Counters;
}