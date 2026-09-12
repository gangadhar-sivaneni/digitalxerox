import { findPricingRule, findProduct, getSettings, listProducts } from "../data/repo";
import type { ColorMode, PaperSize, ServiceType, Sides } from "../types";
import { ApiError } from "../utils/errors";
import { parsePageRange, type PageRangeResult } from "./pricing.range";

export interface PriceLine {
  productId: string;
  name: string;
  qty: number;
  unitPaise: number;
  linePaise: number;
}

export interface PriceRequest {
  serviceType: ServiceType;
  totalDocumentPages: number;
  pageRange: string | null;
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
  items?: { productId: string; qty: number }[];
}

export interface PriceBreakdown {
  serviceType: ServiceType;
  pageRange: PageRangeResult;
  selectedPages: number;
  copies: number;
  ratePaise: number;
  printingPaise: number;
  stationeryPaise: number;
  serviceFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  pricingVersion: number;
  items: PriceLine[];
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
}

/**
 * The single pricing engine. Every amount is computed in integer paise.
 * The frontend may preview a price for UX, but the backend is the source
 * of truth — the client never submits a total.
 */
export function calculatePrice(req: PriceRequest): PriceBreakdown {
  if (!["PRINTING", "XEROX", "STATIONERY"].includes(req.serviceType)) {
    throw ApiError.unprocessable("Unsupported service type.");
  }
  if (!["A4", "A3"].includes(req.paperSize)) {
    throw ApiError.unprocessable("Unsupported paper size.");
  }
  if (!["bw", "color"].includes(req.colorMode)) {
    throw ApiError.unprocessable("Unsupported colour mode.");
  }
  if (!["single", "double"].includes(req.sides)) {
    throw ApiError.unprocessable("Unsupported sides selection.");
  }

  const copies = Math.max(1, Math.min(99, Math.floor(req.copies || 1)));
  const sides = req.sides || "double";
  const settings = getSettings();

  const rule = findPricingRule(req.paperSize, req.colorMode);
  if (!rule) {
    throw ApiError.unprocessable("This paper/colour combination is not available right now.");
  }

  const productMap = new Map(listProducts(true).map((p) => [p.productId, p]));
  const items: PriceLine[] = [];
  for (const it of req.items || []) {
    const qty = Math.floor(it.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const product = productMap.get(it.productId);
    if (!product) throw ApiError.unprocessable(`Unknown product "${it.productId}".`);
    if (!product.active) throw ApiError.unprocessable(`"${product.name}" is not available right now.`);
    if (product.stock < qty) {
      throw ApiError.unprocessable(`Only ${product.stock} × "${product.name}" left in stock.`);
    }
    items.push({
      productId: product.productId,
      name: product.name,
      qty,
      unitPaise: product.pricePaise,
      linePaise: product.pricePaise * qty,
    });
  }

  let pageRange: PageRangeResult = { pageRange: "all", pageCount: 0, mode: "all" };
  let printingPaise = 0;

  if (req.serviceType !== "STATIONERY") {
    if (req.totalDocumentPages < 1) {
      throw ApiError.unprocessable("Upload a document to configure printing options.");
    }
    pageRange = parsePageRange(req.pageRange, req.totalDocumentPages);
    printingPaise = pageRange.pageCount * copies * rule.ratePaise;
  }

  const stationeryPaise = items.reduce((s, i) => s + i.linePaise, 0);
  const serviceFeePaise = settings.serviceFeePaise;
  const discountPaise = 0;
  const totalPaise = printingPaise + stationeryPaise + serviceFeePaise - discountPaise;

  return {
    serviceType: req.serviceType,
    pageRange,
    selectedPages: pageRange.pageCount,
    copies,
    ratePaise: rule.ratePaise,
    printingPaise,
    stationeryPaise,
    serviceFeePaise,
    discountPaise,
    totalPaise,
    pricingVersion: settings.pricingVersion,
    items,
    paperSize: req.paperSize,
    colorMode: req.colorMode,
    sides,
  };
}