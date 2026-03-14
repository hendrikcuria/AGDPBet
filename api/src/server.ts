import express from "express";
import cors from "cors";
import { config } from "./config";
import { getDb } from "./db/schema";
import { startScheduler } from "./services/scheduler";
import leaderboardRoutes from "./routes/leaderboard";
import marketRoutes from "./routes/markets";
import adminRoutes from "./routes/admin";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/markets", marketRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize database
getDb();

// Start server, then start scheduler (async)
app.listen(config.port, async () => {
  console.log(`\n[AGDPBet API] Running on http://localhost:${config.port}`);
  console.log(`[AGDPBet API] Endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/leaderboard`);
  console.log(`  GET  /api/leaderboard/live`);
  console.log(`  GET  /api/leaderboard/epoch/current`);
  console.log(`  GET  /api/leaderboard/epochs`);
  console.log(`  GET  /api/leaderboard/prize-pool`);
  console.log(`  GET  /api/leaderboard/:epochNumber`);
  console.log(`  GET  /api/markets`);
  console.log(`  GET  /api/markets/:address`);
  console.log(`  POST /api/admin/resolve/propose`);
  console.log(`  POST /api/admin/resolve/finalize`);
  console.log(`  POST /api/admin/resolve/emergency`);

  // Start scheduler (fetches initial data from Virtuals API)
  await startScheduler();
});
