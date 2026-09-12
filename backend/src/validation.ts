import { z } from "zod";

/** Order configuration shared by quote, order creation and checkout intent. */
export const orderConfigSchema = z.object({
  serviceType: z.enum(["PRINTING", "XEROX", "STATIONERY"]),
  documentId: z.string().optional(),
  documentIds: z.array(z.string()).min(1).max(10).optional(),
  documentConfigs: z.array(z.object({
    documentId: z.string(),
    pageRange: z.string().nullable().optional(),
    copies: z.number().int().min(1).max(99).optional(),
    paperSize: z.enum(["A4", "A3"]).optional(),
    colorMode: z.enum(["bw", "color"]).optional(),
    sides: z.enum(["single", "double"]).optional(),
    manualPages: z.number().int().min(1).max(2000).optional(),
  })).min(1).max(10).optional(),
  pageRange: z.string().nullable().optional(),
  copies: z.number().int().min(1).max(99).optional(),
  paperSize: z.enum(["A4", "A3"]).optional(),
  colorMode: z.enum(["bw", "color"]).optional(),
  sides: z.enum(["single", "double"]).optional(),
  manualPages: z.number().int().min(1).max(2000).optional(),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(99) })).optional(),
});

export const orderCreateSchema = orderConfigSchema.extend({
  idempotencyKey: z.string().min(8).max(120).optional(),
});

export type OrderConfig = z.infer<typeof orderConfigSchema>;
export type OrderCreate = z.infer<typeof orderCreateSchema>;