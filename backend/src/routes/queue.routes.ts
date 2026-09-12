import { Router } from "express";
import { getSettings } from "../data/repo";
import { nowServingToken, queueFor } from "../services/queue.service";
import { asyncHandler } from "../utils/errors";

const router = Router();

router.get("/live", asyncHandler(async (_req, res) => {
  const nowServing = nowServingToken();
  const queue = nowServing ? queueFor(nowServing) : undefined;
  res.json({
    data: {
      activeCount: queue?.active.length ?? 0,
      nowServing,
      etaMinutes: queue?.active[0]?.etaMinutes ?? 0,
      avgProcessingMinutes: getSettings().avgProcessingMinutes,
      updatedAt: new Date().toISOString(),
    },
  });
}));

export default router;
