import type { AdminOverview, AnalyticsRange, AuditEntry, PriceRule, Product, StaffUser } from "../../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export async function getAdminOverview(token: string, range: AnalyticsRange = "today"): Promise<AdminOverview> {
  return apiGet<AdminOverview>("/admin/overview?range=" + range, token);
}

export async function getPricing(token: string): Promise<{
  rules: PriceRule[];
  fresh: { avgProcessingMinutes: number; open: boolean };
}> {
  return apiGet("/pricing", token);
}

/** Full inventory view: active + deactivated products with reserved stock. */
export async function getAdminProducts(token: string): Promise<Product[]> {
  return apiGet<Product[]>("/admin/products", token);
}

export type ProductInput = {
  name: string;
  description?: string;
  pricePaise: number;
  stock: number;
  minStock?: number;
  active?: boolean;
  imageUrl?: string | null;
};

export async function createProduct(token: string, input: ProductInput): Promise<Product> {
  return apiPost<Product>("/admin/products", input, token);
}

export async function updateProduct(token: string, id: string, patch: Partial<ProductInput>): Promise<Product> {
  return apiPatch<Product>("/admin/products/" + encodeURIComponent(id), patch, token);
}

export async function deleteProduct(token: string, id: string): Promise<{ ok: boolean }> {
  return apiDelete("/admin/products/" + encodeURIComponent(id), token);
}

export async function updatePriceRule(token: string, id: string, ratePaise: number): Promise<void> {
  await apiPatch("/admin/pricing/" + id, { ratePaise }, token);
}

/* ---------- staff users ---------- */

export async function listStaffUsers(token: string): Promise<StaffUser[]> {
  return apiGet<StaffUser[]>("/admin/staff-users", token);
}

export async function createStaffUser(
  token: string,
  input: { name: string; email: string; counter?: string }
): Promise<StaffUser> {
  return apiPost<StaffUser>("/admin/staff-users", input, token);
}

export async function updateStaffUser(
  token: string,
  id: string,
  patch: { active?: boolean; counter?: string }
): Promise<StaffUser> {
  return apiPatch<StaffUser>("/admin/staff-users/" + encodeURIComponent(id), patch, token);
}

export async function deleteStaffUser(token: string, id: string): Promise<{ ok: boolean }> {
  return apiDelete("/admin/staff-users/" + encodeURIComponent(id), token);
}

export async function resetStaffPassword(
  token: string,
  id: string
): Promise<{ ok: boolean; message: string }> {
  return apiPost("/admin/staff-users/" + encodeURIComponent(id) + "/reset-password", {}, token);
}

/* ---------- audit log ---------- */

export async function listAudits(token: string, q?: string): Promise<AuditEntry[]> {
  const qs = q ? "?q=" + encodeURIComponent(q) : "";
  return apiGet<AuditEntry[]>("/admin/audits" + qs, token);
}