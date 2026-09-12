import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { notFound, errorHandler } from "./middleware/error";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import documentsRoutes from "./routes/documents.routes";
import notificationsRoutes from "./routes/notifications.routes";
import ordersRoutes from "./routes/orders.routes";
import paymentsRoutes from "./routes/payments.routes";
import pricingRoutes from "./routes/pricing.routes";
import productsRoutes from "./routes/products.routes";
import queueRoutes from "./routes/queue.routes";
import staffRoutes from "./routes/staff.routes";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());

  const origins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    })
  );

  // Razorpay webhook needs the raw body for HMAC verification — parse it before
  // express.json so it can never be consumed as JSON.
  app.use("/api/payments/razorpay/webhook", express.raw({ type: "*/*" }));

  app.use(express.json({ limit: "1mb" }));

  // Coarse bucket — hammers the API they're rate limited here first.
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2000,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
    })
  );
  app.use(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." } },
    })
  );
  app.use(
    "/api/orders",
    rateLimit({
      windowMs: 10 * 60 * 1000,
      max: 150,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ data: { ok: true, service: "digital-xerox", time: new Date().toISOString() } });
  });

  app.use(`/api/auth`, authRoutes);
  app.use(`/api/products`, productsRoutes);
  app.use(`/api/queue`, queueRoutes);
  app.use(`/api/pricing`, pricingRoutes);
  app.use(`/api/documents`, documentsRoutes);
  app.use(`/api/orders`, ordersRoutes);
  app.use(`/api/payments`, paymentsRoutes);
  app.use(`/api/notifications`, notificationsRoutes);
  app.use(`/api/staff`, staffRoutes);
  app.use(`/api/admin`, adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}