import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../data/repo";
import type { Role, User } from "../types";
import { ApiError } from "../utils/errors";
import { verifyToken } from "../services/auth.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { sub: string; role: Role };
      user?: User;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const hdr = req.headers.authorization;
  if (hdr && hdr.startsWith("Bearer ")) return hdr.slice(7).trim();
  if (req.query && typeof req.query.access_token === "string") return req.query.access_token;
  return undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized("Sign in to continue.");
    const payload = verifyToken(token);
    const user = findUserById(payload.sub);
    if (!user || !user.active) throw ApiError.unauthorized("Your account is no longer active.");
    req.auth = payload;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}