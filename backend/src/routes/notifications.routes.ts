import { Router } from "express";
import { z } from "zod";
import { listNotificationsFor, markAllNotificationsRead, markNotificationRead } from "../data/repo";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/error";
import { ApiError, asyncHandler } from "../utils/errors";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const notifications = listNotificationsFor(req.user!.userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50)
    .map((n) => ({
      notificationId: n.notificationId,
      title: n.title,
      body: n.body,
      kind: n.kind,
      orderId: n.orderId,
      read: n.read,
      createdAt: n.createdAt,
    }));
  res.json({ data: notifications });
}));

const readSchema = z.object({
  read: z.boolean().optional(),
});

router.post("/:id/read", validate(readSchema), asyncHandler(async (req, res) => {
  const read = (req.body as z.infer<typeof readSchema>).read ?? true;
  const ok = markNotificationRead(req.params.id, req.user!.userId);
  if (!ok) throw ApiError.notFound("Notification not found.");
  res.json({ data: { ok: true, read } });
}));

router.post("/read-all", asyncHandler(async (req, res) => {
  markAllNotificationsRead(req.user!.userId);
  res.json({ data: { ok: true } });
}));

export default router;