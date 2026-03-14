import { Router, Request, Response } from "express";
import { proposeResolution, finalizeResolution, emergencyResolve } from "../services/resolver";

const router = Router();

// Simple API key auth for admin endpoints
function requireAuth(req: Request, res: Response, next: Function) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// POST /api/admin/resolve/propose — Propose a market resolution
router.post("/resolve/propose", requireAuth, async (req: Request, res: Response) => {
  const { marketAddress, outcome } = req.body;

  if (!marketAddress || outcome === undefined) {
    res.status(400).json({ error: "marketAddress and outcome required" });
    return;
  }

  try {
    const txHash = await proposeResolution(marketAddress, outcome);
    res.json({ success: true, txHash });
  } catch (err: any) {
    console.error("[Admin] Propose resolution error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/resolve/finalize — Finalize a pending resolution
router.post("/resolve/finalize", requireAuth, async (req: Request, res: Response) => {
  const { marketAddress } = req.body;

  if (!marketAddress) {
    res.status(400).json({ error: "marketAddress required" });
    return;
  }

  try {
    const txHash = await finalizeResolution(marketAddress);
    res.json({ success: true, txHash });
  } catch (err: any) {
    console.error("[Admin] Finalize resolution error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/resolve/emergency — Emergency resolve (owner only)
router.post("/resolve/emergency", requireAuth, async (req: Request, res: Response) => {
  const { marketAddress, outcome } = req.body;

  if (!marketAddress || outcome === undefined) {
    res.status(400).json({ error: "marketAddress and outcome required" });
    return;
  }

  try {
    const txHash = await emergencyResolve(marketAddress, outcome);
    res.json({ success: true, txHash });
  } catch (err: any) {
    console.error("[Admin] Emergency resolve error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
