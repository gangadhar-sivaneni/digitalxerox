import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError, zodItems } from "../utils/errors";
import { logger } from "../utils/logger";

export function validate<T>(schema: ZodType<T>, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(ApiError.unprocessable("Please check the information you entered.", zodItems(err)));
        return;
      }
      next(err);
    }
  };
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound("Route not found."));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: { code: "UNPROCESSABLE_ENTITY", message: "Invalid input.", details: zodItems(err) },
    });
    return;
  }
  const message = err instanceof Error ? err.message : "Something went wrong.";
  logger.error("Unhandled error", { path: req.path, message });
  // Never leak stack traces to users.
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  });
}