import { Router } from "express";
import { z } from "zod";
import { findDocument, getPricingRules, getSettings } from "../data/repo";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/error";
import { calculatePrice } from "../services/pricing.service";
import { ApiError, asyncHandler } from "../utils/errors";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const rules = getPricingRules().map((r) => ({
    id: r.id,
    paper: r.paper,
    colorMode: r.colorMode,
    ratePaise: r.ratePaise,
    rate: r.ratePaise / 100,
  }));
  const settings = getSettings();
  res.json({
    data: {
      rules,
      fresh: {
        avgProcessingMinutes: settings.avgProcessingMinutes,
        open: settings.open,
      },
    },
  });
}));

const calcSchema = z.object({
  serviceType: z.enum(["PRINTING", "XEROX", "STATIONERY"]),
  documentId: z.string().optional(),
  pageRange: z.string().nullable().optional(),
  copies: z.number().int().min(1).max(99).optional(),
  paperSize: z.enum(["A4", "A3"]).optional(),
  colorMode: z.enum(["bw", "color"]).optional(),
  sides: z.enum(["single", "double"]).optional(),
  manualPages: z.number().int().min(1).max(2000).optional(),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(99) })).optional(),
});

router.post("/calculate", requireAuth, validate(calcSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof calcSchema>;
  let totalDocumentPages = 0;
  if (body.documentId) {
    const doc = findDocument(body.documentId);
    if (!doc) throw ApiError.notFound("Document not found.");
    if (doc.userId !== req.user!.userId) throw ApiError.forbidden("You do not own this document.");
    totalDocumentPages = doc.pageCount ?? body.manualPages ?? 0;
  } else if (body.manualPages) {
    totalDocumentPages = body.manualPages;
  }
  const breakdown = calculatePrice({
    serviceType: body.serviceType,
    totalDocumentPages,
    pageRange: body.pageRange ?? "all",
    copies: body.copies ?? 1,
    paperSize: body.paperSize ?? "A4",
    colorMode: body.colorMode ?? "bw",
    sides: body.sides ?? "double",
    items: body.items,
  });
  res.json({
    data: {
      total: breakdown.totalPaise / 100,
      totalPaise: breakdown.totalPaise,
      printingPaise: breakdown.printingPaise,
      stationeryPaise: breakdown.stationeryPaise,
      ratePaise: breakdown.ratePaise,
      pageCount: breakdown.pageRange.pageCount,
    },
  });
}));

export default router;