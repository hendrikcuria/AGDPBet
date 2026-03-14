import { Router, Request, Response } from "express";
import { getLatestLeaderboard, getFinalRankings } from "../db/schema";
import { scrapeAndStore, scrapeLeaderboard, fetchEpochs, fetchPrizePool } from "../services/scraper";
import { getCurrentEpochNumber, getCachedEpoch } from "../services/scheduler";

const router = Router();

// GET /api/leaderboard — Current epoch live rankings
router.get("/", async (_req: Request, res: Response) => {
  try {
    const epochNumber = getCurrentEpochNumber();
    let leaderboard = getLatestLeaderboard(epochNumber || undefined);

    // If no data in DB yet, do an initial scrape
    if (leaderboard.length === 0) {
      await scrapeAndStore();
      leaderboard = getLatestLeaderboard();
    }

    res.json({
      epoch: getCurrentEpochNumber(),
      leaderboard,
      updatedAt: leaderboard[0]?.scraped_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API] Leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// GET /api/leaderboard/live — Fetch fresh data directly from Virtuals API (bypass DB)
router.get("/live", async (_req: Request, res: Response) => {
  try {
    const { agents, epoch } = await scrapeLeaderboard();
    res.json({
      epoch: epoch?.epochNumber || getCurrentEpochNumber(),
      epochStatus: epoch?.status,
      leaderboard: agents,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API] Live leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch live leaderboard" });
  }
});

// GET /api/leaderboard/epoch/current — Current epoch info
router.get("/epoch/current", async (_req: Request, res: Response) => {
  try {
    const epoch = getCachedEpoch();

    if (!epoch) {
      res.json({
        epochNumber: 0,
        status: "UNKNOWN",
        message: "No epoch data available yet. Try again in a moment.",
      });
      return;
    }

    const now = new Date();
    const endTime = new Date(epoch.endsAt);
    const timeRemainingMs = Math.max(0, endTime.getTime() - now.getTime());

    res.json({
      epochNumber: epoch.epochNumber,
      epochId: epoch.id,
      status: epoch.status,
      startsAt: epoch.startsAt,
      endsAt: epoch.endsAt,
      timeRemainingMs,
      isLastHour: timeRemainingMs > 0 && timeRemainingMs < 3600000,
    });
  } catch (err) {
    console.error("[API] Epoch info error:", err);
    res.status(500).json({ error: "Failed to fetch epoch info" });
  }
});

// GET /api/leaderboard/epochs — All epochs
router.get("/epochs", async (_req: Request, res: Response) => {
  try {
    const epochs = await fetchEpochs();
    res.json({ epochs });
  } catch (err) {
    console.error("[API] Epochs error:", err);
    res.status(500).json({ error: "Failed to fetch epochs" });
  }
});

// GET /api/leaderboard/prize-pool — Current epoch prize pool
router.get("/prize-pool", async (_req: Request, res: Response) => {
  try {
    const epoch = getCachedEpoch();
    if (!epoch) {
      res.status(404).json({ error: "No active epoch" });
      return;
    }
    const pool = await fetchPrizePool(epoch.id);
    res.json({ epoch: epoch.epochNumber, prizePool: pool });
  } catch (err) {
    console.error("[API] Prize pool error:", err);
    res.status(500).json({ error: "Failed to fetch prize pool" });
  }
});

// GET /api/leaderboard/:epochNumber — Historical epoch rankings
router.get("/:epochNumber", (req: Request, res: Response) => {
  const epochNumber = parseInt(req.params.epochNumber as string);
  if (isNaN(epochNumber)) {
    res.status(400).json({ error: "Invalid epoch number" });
    return;
  }

  // Try final rankings first, fall back to latest
  let rankings = getFinalRankings(epochNumber);
  if (rankings.length === 0) {
    rankings = getLatestLeaderboard(epochNumber);
  }

  res.json({ epoch: epochNumber, leaderboard: rankings });
});

export default router;
