import type { Order, StaffQueueRow, StaffRow, StaffStats } from "../../types";
import { apiGet, apiPost } from "./client";

export async function getStaffStats(token: string): Promise<StaffStats> {
  return apiGet<StaffStats>("/staff/stats", token);
}

export interface StaffQueueData {
  rows: StaffQueueRow[];
  counts: { inQueue: number; processing: number; ready: number };
  nowServing?: string;
}

export async function getStaffQueue(token: string, q?: string): Promise<StaffQueueData> {
  const qs = q ? "?" + new URLSearchParams({ q }).toString() : "";
  return apiGet<StaffQueueData>("/staff/queue" + qs, token);
}

export async function listStaffOrders(
  token: string,
  scope: "active" | "completed" | "rejected" | "all" = "active",
  q?: string
): Promise<StaffRow[]> {
  const params = new URLSearchParams({ scope });
  if (q) params.set("q", q);
  return apiGet<StaffRow[]>("/staff/orders?" + params.toString(), token);
}

export async function getStaffOrder(token: string, idOrToken: string): Promise<{
  order: Order;
  student?: { name: string; email: string; studentId?: string };
  payment?: { status: string; method?: string; transactionId?: string; amount: number };
  document?: { documentId: string; fileName: string; pageCount: number | null; sizeLabel: string; accessUrl: string; mimeType?: string };
  documents?: Array<{ documentId: string; fileName: string; pageCount: number | null; sizeLabel: string; accessUrl: string; mimeType?: string }>;
}> {
  return apiGet("/staff/orders/" + encodeURIComponent(idOrToken), token);
}

export async function setOrderStatus(
  token: string,
  idOrToken: string,
  status: "PROCESSING" | "READY" | "COMPLETED" | "REJECTED",
  reason?: string
): Promise<Order> {
  return apiPost("/staff/orders/" + encodeURIComponent(idOrToken) + "/status", {
    status,
    reason,
  }, token);
}