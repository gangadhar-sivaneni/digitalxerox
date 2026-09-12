import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { findUserByEmail, findUserById, insertUser, nextId, userPublic } from "../data/repo";
import type { Role, User } from "../types";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.userId, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }
}

export function login(email: string, password: string) {
  const user = findUserByEmail(email);
  if (!user) throw ApiError.unauthorized("No account found for that email.");
  if (!user.active) throw ApiError.forbidden("This account has been disabled.");
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Incorrect password.");
  logger.info("User signed in", { userId: user.userId, role: user.role });
  return { token: signToken(user), user: userPublic(user) };
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  studentId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = findUserByEmail(email);
  if (existing) throw ApiError.conflict("An account with that email already exists.");
  if (input.password.length < 6) {
    throw ApiError.unprocessable("Password must be at least 6 characters.");
  }

  const user: User = {
    userId: nextId("usr"),
    name: input.name.trim(),
    email,
    passwordHash: bcrypt.hashSync(input.password, 10),
    role: "STUDENT",
    studentId: input.studentId?.trim() || undefined,
    active: true,
    preferences: { paperSize: "A4", colorMode: "bw" },
    createdAt: new Date().toISOString(),
  };
  insertUser(user);
  logger.info("Student registered", { userId: user.userId });
  return { token: signToken(user), user: userPublic(user) };
}

export function me(userId: string) {
  const user = findUserById(userId);
  if (!user) throw ApiError.unauthorized("Account not found.");
  return userPublic(user);
}