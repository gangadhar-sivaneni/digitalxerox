import type { OrderStatus, PaymentStatus, Role } from "../types";

export const SESSION_STORAGE_KEY = "dx.session.v1";

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  ADMIN: "Administrator",
};

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  STAFF: "/staff",
  ADMIN: "/admin",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  UNPAID: "Awaiting payment",
  RECEIVED: "Received",
  PROCESSING: "Processing",
  READY: "Ready",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_STEP: Record<OrderStatus, 0 | 1 | 2 | 3 | -1> = {
  UNPAID: -1,
  RECEIVED: 0,
  PROCESSING: 1,
  READY: 2,
  COMPLETED: 3,
  REJECTED: -1,
  CANCELLED: -1,
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Unpaid",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_ST: Record<PaymentStatus, string> = {
  PENDING: "unpaid",
  PAID: "paid",
  FAILED: "unpaid",
  REFUNDED: "unpaid",
};

export const ORDER_STATUS_ST: Record<OrderStatus, string> = {
  UNPAID: "received",
  RECEIVED: "received",
  PROCESSING: "processing",
  READY: "ready",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "received",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  ONLINE: "Paid online (Razorpay)",
  UPI: "UPI",
  CARD: "Card",
  CASH: "Cash at counter",
};

export const SERVICE_LABEL: Record<string, string> = {
  PRINTING: "Printing",
  XEROX: "Xerox",
  STATIONERY: "Stationery",
};

/**
 * Development fixtures — seeded by the backend. NEVER production credentials.
 * See backend/src/data/seedData.ts. In production these are removed and the
 * shop invites real college accounts.
 */
export const DEV_FIXTURES = {
  note: "Development credentials (seeded backend only)",
  accounts: [
    { label: "Student", email: "gangadhar@mlrit.ac.in" },
    { label: "Staff", email: "scope@mlrit.ac.in" },
    { label: "Admin", email: "mlrit@mlrit.ac.in" },
  ],
  password: "demo1234",
} as const;