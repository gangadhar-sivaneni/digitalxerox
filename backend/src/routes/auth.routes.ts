import { Router } from "express";
import { z } from "zod";
import { findUserById, unreadNotificationsFor, updateUser } from "../data/repo";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/error";
import { login, me, register } from "../services/auth.service";
import { asyncHandler } from "../utils/errors";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Enter a valid college email."),
  password: z.string().min(1, "Password is required."),
});

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid college email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  studentId: z.string().optional(),
});

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const result = login(req.body.email, req.body.password);
  res.json({ data: result });
}));

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const result = register(req.body);
  res.status(201).json({ data: result });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({
    data: {
      user: me(req.user!.userId),
      unread: unreadNotificationsFor(req.user!.userId),
    },
  });
}));

const updateProfileSchema = z.object({
  preferences: z.object({
    paperSize: z.enum(["A4", "A3"]).optional(),
    colorMode: z.enum(["bw", "color"]).optional(),
  }).optional(),
});

router.patch("/profile", requireAuth, validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const user = findUserById(req.user!.userId)!;
  const { preferences } = req.body as z.infer<typeof updateProfileSchema>;
  const prefs = { ...(user.preferences || {}), ...(preferences || {}) };
  updateUser(user.userId, { preferences: prefs });
  res.json({ data: { user: me(user.userId) } });
}));

export default router;