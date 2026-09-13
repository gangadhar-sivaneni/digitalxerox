import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/error";
import { abandonCheckout, completeCheckout, initiateCheckout, activateFromWebhook } from "../services/checkout.service";
import { razorpayWebhookSignatureValid } from "../services/razorpay.service";
import { queueFor } from "../services/queue.service";
import { asyncHandler } from "../utils/errors";
import { orderDTO } from "../utils/serialize";
import { orderCreateSchema } from "../validation";

const router = Router();

const webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().optional(),
        order_id: z.string().optional(),
      }),
    }),
  }),
});

// Razorpay calls this directly (no JWT header) — authentication happens via the
// X-Razorpay-Signature header. Registered before requireAuth on purpose.
router.post(
  "/razorpay/webhook",
  asyncHandler(async (req, res) => {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      // Webhook not configured yet — client-side verification still covers us.
      res.status(200).json({ data: { ignored: true } });
      return;
    }
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = (req.headers["x-razorpay-signature"] as string) || "";
    if (!razorpayWebhookSignatureValid(raw, signature, secret)) {
      res.status(401).json({ error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature." } });
      return;
    }
    const event = webhookSchema.safeParse(JSON.parse(raw.toString("utf8")));
    if (event.success && event.data.event === "payment.captured") {
      const entity = event.data.payload.payment.entity;
      if (entity.order_id && entity.id) {
        activateFromWebhook(entity.order_id, entity.id);
      }
    }
    res.status(200).json({ data: { ok: true } });
  })
);

router.use(requireAuth);

/**
 * POST /api/payments/razorpay/intent — reserves stock as an UNPAID order and
 * returns everything the client needs to open the Razorpay checkout. Idempotent
 * via idempotencyKey.
 */
router.post("/razorpay/intent", validate(orderCreateSchema), asyncHandler(async (req, res) => {
  const user = req.user!;
  const body = req.body as z.infer<typeof orderCreateSchema>;
  const idempotencyKey = body.idempotencyKey || req.header("x-idempotency-key");
  const intent = await initiateCheckout(user, body, idempotencyKey);
  res.status(intent.alreadyPaid ? 200 : 201).json({ data: intent });
}));

const verifySchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

/**
 * POST /api/payments/razorpay/verify — verifies the checkout response from the
 * client and mints the order token only after the gateway confirms the payment.
 */
router.post("/razorpay/verify", validate(verifySchema), asyncHandler(async (req, res) => {
  const user = req.user!;
  const proof = req.body as z.infer<typeof verifySchema>;
  const order = await completeCheckout(user, proof);
  res.json({ data: orderDTO(order, queueFor(order.token, user.userId)) });
}));

/** POST /api/payments/:orderId/abandon — cancels a checkout that was never paid. */
router.post("/:orderId/abandon", asyncHandler(async (req, res) => {
  abandonCheckout(req.user!, String(req.params.orderId));
  res.json({ data: { ok: true } });
}));

export default router;