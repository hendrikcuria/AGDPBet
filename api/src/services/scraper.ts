import { upsertAgent, insertRanking, upsertEpoch, clearEpochRankings } from "../db/schema";

// --- API base URLs ---
const VIRTUALS_API = "https://api.virtuals.io";
const ACPX_API = "https://acpx.virtuals.io";

// --- Types ---

export interface EpochData {
  id: number;
  epochNumber: number;
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "FINALIZING" | "FINALIZED";
}

export interface RankingEntry {
  agentId: number;
  agentName: string;
  agentWalletAddress: string;
  tokenAddress?: string;
  profilePic?: string;
  tag?: string;
  role?: string;
  symbol?: string;
  hasGraduated?: boolean;
  successRate?: number;
  successfulJobCount?: number;
  uniqueBuyerCount?: number;
  totalRevenue?: number;
  rank: number;
  prizePoolPercentage?: number;
  agentScore?: number;
}

export interface ScrapedAgent {
  rank: number;
  name: string;
  agentId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  profilePic?: string;
  score?: number;
  weeklyRevenue?: number;
  jobCount?: number;
  uniqueUsers?: number;
  successRate?: number;
}

// --- Fetch epochs from Virtuals API ---

export async function fetchEpochs(): Promise<EpochData[]> {
  const url = `${VIRTUALS_API}/api/agdp-leaderboard-epochs?sort=epochNumber:desc`;
  console.log("[Scraper] Fetching epochs from", url);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch epochs: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data: any[] };
  return (json.data || []).map((e: any) => ({
    id: e.id,
    epochNumber: e.epochNumber,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    status: e.status,
  }));
}

export async function fetchCurrentEpoch(): Promise<EpochData | null> {
  const epochs = await fetchEpochs();
  // Return the first active or most recent epoch
  const active = epochs.find((e) => e.status === "ACTIVE");
  if (active) return active;
  // Fallback: most recent (already sorted desc)
  return epochs[0] || null;
}

// --- Fetch ranking for an epoch ---

export async function fetchRanking(epochId: number): Promise<RankingEntry[]> {
  const url = `${VIRTUALS_API}/api/agdp-leaderboard-epochs/${epochId}/ranking?pagination[pageSize]=1000`;
  console.log("[Scraper] Fetching ranking for epoch id", epochId);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ranking: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data: any[] };
  return (json.data || []) as RankingEntry[];
}

// --- Fetch prize pool for an epoch ---

export interface PrizePool {
  acpPrizeInPool: number;
  platformPrizeInPool: number;
  totalUsdcInPrizePool: number;
}

export async function fetchPrizePool(epochId: number): Promise<PrizePool | null> {
  const url = `${VIRTUALS_API}/api/agdp-leaderboard-epochs/${epochId}/prize-pool`;

  const res = await fetch(url);
  if (!res.ok) return null;

  return (await res.json()) as PrizePool;
}

// --- Convert ranking data to our format ---

function rankingToScrapedAgent(entry: RankingEntry): ScrapedAgent {
  return {
    rank: entry.rank,
    name: entry.agentName,
    agentId: entry.agentId,
    tokenSymbol: entry.symbol,
    tokenAddress: entry.tokenAddress,
    profilePic: entry.profilePic,
    score: entry.agentScore,
    weeklyRevenue: entry.totalRevenue,
    jobCount: entry.successfulJobCount,
    uniqueUsers: entry.uniqueBuyerCount,
    successRate: entry.successRate,
  };
}

// --- Main scrape function ---

/**
 * Fetch the live leaderboard from the real Virtuals Protocol ACPX API.
 * Uses api.virtuals.io for epochs & rankings data.
 */
export async function scrapeLeaderboard(epochId?: number): Promise<{ agents: ScrapedAgent[]; epoch: EpochData | null }> {
  console.log("[Scraper] Fetching leaderboard data from Virtuals API...");

  let epoch: EpochData | null = null;

  if (epochId) {
    // Fetch all epochs to find the one with matching id
    const epochs = await fetchEpochs();
    epoch = epochs.find((e) => e.id === epochId) || null;
  } else {
    epoch = await fetchCurrentEpoch();
  }

  if (!epoch) {
    console.warn("[Scraper] No epoch found, returning empty leaderboard");
    return { agents: [], epoch: null };
  }

  const ranking = await fetchRanking(epoch.id);
  const agents = ranking.map(rankingToScrapedAgent);

  console.log(`[Scraper] Fetched ${agents.length} agents for Epoch ${epoch.epochNumber} (${epoch.status})`);
  return { agents, epoch };
}

/**
 * Fetch and store leaderboard data in the database.
 * Deduplicates by only keeping the latest ranking per agent per epoch.
 */
export async function scrapeAndStore(epochId?: number): Promise<{ epochNumber: number; agentCount: number }> {
  const { agents, epoch } = await scrapeLeaderboard(epochId);

  if (!epoch || agents.length === 0) {
    console.warn("[Scraper] No data to store");
    return { epochNumber: 0, agentCount: 0 };
  }

  const isFinal = epoch.status === "FINALIZED";

  // Store epoch info
  upsertEpoch(epoch.epochNumber, epoch.startsAt, epoch.endsAt, isFinal);

  // Clear stale rankings before re-inserting (removes agents that dropped off)
  // Only for non-finalized epochs — finalized data is immutable
  if (!isFinal) {
    clearEpochRankings(epoch.epochNumber);
  }

  // Store agent rankings
  for (const agent of agents) {
    const agentDbId = upsertAgent(agent.name, agent.tokenSymbol, agent.tokenAddress, agent.profilePic);
    insertRanking(
      epoch.epochNumber,
      agentDbId,
      agent.rank,
      agent.score,
      agent.weeklyRevenue,
      agent.jobCount,
      agent.uniqueUsers,
      agent.successRate,
      isFinal
    );
  }

  console.log(`[Scraper] Stored ${agents.length} rankings for Epoch ${epoch.epochNumber} (final: ${isFinal})`);
  return { epochNumber: epoch.epochNumber, agentCount: agents.length };
}
