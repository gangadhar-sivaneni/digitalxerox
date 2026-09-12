import type { PriceRule } from "../../types";
import { apiGet } from "./client";

export async function getPublicPricing(): Promise<{ rules: PriceRule[] }> {
  return apiGet<{ rules: PriceRule[] }>("/pricing");
}
