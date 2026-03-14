import { Router, Request, Response } from "express";
import { getDb } from "../db/schema";

const router = Router();

// GET /api/markets — All markets
router.get("/", (_req: Request, res: Response) => {
  const db = getDb();
  const markets = db
    .prepare(
      `SELECT address, question, market_type, collateral_token, epoch_number, agent_name,
              resolution_time, resolved, outcome, created_at
       FROM markets ORDER BY created_at DESC`
    )
    .all();

  res.json({ markets });
});

// GET /api/markets/:address — Market detail
router.get("/:address", (req: Request, res: Response) => {
  const db = getDb();
  const market = db.prepare("SELECT * FROM markets WHERE address = ?").get(req.params.address);

  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  res.json({ market });
});

export default router;
