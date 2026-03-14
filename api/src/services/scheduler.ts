import cron from "node-cron";
import { scrapeAndStore, fetchCurrentEpoch, EpochData } from "./scraper";
import { config } from "../config";

// Cached epoch data (refreshed on every scrape)
let cachedEpoch: EpochData | null = null;

/**
 * Get the current epoch number from the cached API data.
 * Falls back to fetching from the API if no cache exists.
 */
export async function getCurrentEpoch(): Promise<EpochData | null> {
  if (cachedEpoch) return cachedEpoch;
  try {
    cachedEpoch = await fetchCurrentEpoch();
    return cachedEpoch;
  } catch (err) {
    console.error("[Scheduler] Failed to fetch current epoch:", err);
    return null;
  }
}

/**
 * Synchronous getter for cached epoch number (for routes that need it).
 * Returns 0 if not yet loaded.
 */
export function getCurrentEpochNumber(): number {
  return cachedEpoch?.epochNumber || 0;
}

/**
 * Get cached epoch data synchronously.
 */
export function getCachedEpoch(): EpochData | null {
  return cachedEpoch;
}

/**
 * Run a single scrape cycle and update cached epoch.
 */
async function runScrape() {
  try {
    const result = await scrapeAndStore();
    // Update cached epoch
    cachedEpoch = await fetchCurrentEpoch();
    console.log(`[Scheduler] Scrape complete: Epoch ${result.epochNumber}, ${result.agentCount} agents`);
  } catch (err) {
    console.error("[Scheduler] Scrape error:", err);
  }
}

/**
 * Start the periodic scraping scheduler.
 * - Fetches live data from the Virtuals Protocol API
 * - Runs every 5 minutes normally, every 60 seconds in the last hour
 */
export async function startScheduler() {
  // Initial scrape on startup
  console.log("[Scheduler] Running initial scrape...");
  await runScrape();

  // Scrape every 5 minutes
  cron.schedule(`*/${config.scrapeIntervalMinutes} * * * *`, async () => {
    await runScrape();
  });

  const epoch = cachedEpoch;
  if (epoch) {
    console.log(`[Scheduler] Started: scraping every ${config.scrapeIntervalMinutes} minutes`);
    console.log(`[Scheduler] Current epoch: ${epoch.epochNumber} (${epoch.status})`);
    console.log(`[Scheduler] Epoch ends: ${epoch.endsAt}`);
  } else {
    console.log("[Scheduler] Started but no epoch data available yet");
  }
}
