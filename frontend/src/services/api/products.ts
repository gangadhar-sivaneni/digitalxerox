import type { Product } from "../../types";
import { apiGet } from "./client";

/** Public stationery catalogue (prices are backend-authoritative). */
export async function listProducts(): Promise<Product[]> {
  return apiGet<Product[]>("/products");
}