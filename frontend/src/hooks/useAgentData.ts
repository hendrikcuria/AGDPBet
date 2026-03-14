"use client";

import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/contracts";

/* ─── Public types ─── */

export interface AgentMetrics {
  /** Unique stable identifier — lowercase name */
  id: string;
  /** Display name from Virtuals API */
  name: string;
  /** Token ticker, e.g. "AIXBT" */
  tokenSymbol: string | null;
  /** Profile picture URL from Virtuals API */
  profilePic: string | null;
  /** Current epoch rank (1-indexed) */
  rank: number;
  /** Composite aGDP score */
  score: number;
  /** Weekly revenue in USD */
  weeklyRevenue: number;
  /** Number of completed jobs this epoch */
  jobCount: number;
  /** Unique buyers / users */
  uniqueUsers: number;
  /** Success rate as percentage 0-100 */
  successRate: number;
  /** ISO timestamp of last data refresh */
  scrapedAt: string;
  /** Whether metrics are real or deterministic mocks */
  isMock: boolean;
}

export interface AgentDataResult {
  /** All agents indexed by lowercase name */
  agents: Map<string, AgentMetrics>;
  /** Ordered array by rank */
  ranked: AgentMetrics[];
  /** Look up an agent by name (case-insensitive) */
  getByName: (name: string) => AgentMetrics | undefined;
  /** Look up an agent by token symbol (case-insensitive) */
  getBySymbol: (symbol: string) => AgentMetrics | undefined;
  /** Get display name for an agent, returns the input if not found */
  resolveAgentName: (nameOrSymbol: string) => string;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current epoch number */
  epoch: number | null;
}

/* ─── Deterministic mock generation ─── */

/**
 * Seeded PRNG — deterministic pseudo-random from a string seed.
 * Produces values in [0, 1) that are stable across page loads.
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) / 4294967296);
  };
}

/**
 * Generate deterministic mock metrics for an agent name/address.
 * Used when the API returns null for optional fields,
 * keeping the UI populated and consistent across reloads.
 */
export function generateMockMetrics(name: string, rank: number = 999): AgentMetrics {
  const rng = seededRandom(name.toLowerCase());

  return {
    id: name.toLowerCase(),
    name,
    tokenSymbol: null,
    profilePic: null,
    rank,
    score: Math.round(rng() * 80000 + 20000),
    weeklyRevenue: Math.round(rng() * 50000 + 1000),
    jobCount: Math.round(rng() * 5000 + 100),
    uniqueUsers: Math.round(rng() * 2000 + 50),
    successRate: Math.round(rng() * 30 + 65), // 65-95%
    scrapedAt: new Date().toISOString(),
    isMock: true,
  };
}

/* ─── API response shape (mirrors useLeaderboard) ─── */

interface LeaderboardAPIResponse {
  epoch: number;
  leaderboard: Array<{
    rank: number;
    name: string;
    token_symbol: string | null;
    profile_pic: string | null;
    score: number | null;
    weekly_revenue: number | null;
    job_count: number | null;
    unique_users: number | null;
    success_rate: number | null;
    scraped_at: string;
  }>;
  updatedAt: string;
}

/**
 * Hydrate a raw API row into a fully-populated AgentMetrics,
 * using deterministic mocks for any null fields.
 */
function hydrateAgent(raw: LeaderboardAPIResponse["leaderboard"][number]): AgentMetrics {
  const mock = generateMockMetrics(raw.name, raw.rank);

  return {
    id: raw.name.toLowerCase(),
    name: raw.name,
    tokenSymbol: raw.token_symbol,
    profilePic: raw.profile_pic || null,
    rank: raw.rank,
    score: raw.score ?? mock.score,
    weeklyRevenue: raw.weekly_revenue ?? mock.weeklyRevenue,
    jobCount: raw.job_count ?? mock.jobCount,
    uniqueUsers: raw.unique_users ?? mock.uniqueUsers,
    successRate: raw.success_rate ?? mock.successRate,
    scrapedAt: raw.scraped_at,
    isMock: raw.score == null && raw.weekly_revenue == null,
  };
}

/* ─── Hook ─── */

/**
 * Centralized agent data hook.
 * Fetches live agent metrics from the API backend (which scrapes Virtuals),
 * hydrates null fields with deterministic mocks,
 * and provides fast lookup by name or symbol.
 *
 * Uses react-query with 30s refetch to stay current.
 */
export function useAgentData(): AgentDataResult {
  const { data, isLoading, error } = useQuery<LeaderboardAPIResponse>({
    queryKey: ["agentData"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch agent data");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Build lookup maps
  const agents = new Map<string, AgentMetrics>();
  const symbolMap = new Map<string, AgentMetrics>();
  const ranked: AgentMetrics[] = [];

  if (data?.leaderboard) {
    for (const raw of data.leaderboard) {
      const agent = hydrateAgent(raw);
      agents.set(agent.id, agent);
      if (agent.tokenSymbol) {
        symbolMap.set(agent.tokenSymbol.toLowerCase(), agent);
      }
      ranked.push(agent);
    }
    ranked.sort((a, b) => a.rank - b.rank);
  }

  const getByName = (name: string): AgentMetrics | undefined => {
    return agents.get(name.toLowerCase());
  };

  const getBySymbol = (symbol: string): AgentMetrics | undefined => {
    return symbolMap.get(symbol.toLowerCase());
  };

  const resolveAgentName = (nameOrSymbol: string): string => {
    const byName = getByName(nameOrSymbol);
    if (byName) return byName.name;
    const bySymbol = getBySymbol(nameOrSymbol);
    if (bySymbol) return bySymbol.name;
    return nameOrSymbol;
  };

  return {
    agents,
    ranked,
    getByName,
    getBySymbol,
    resolveAgentName,
    isLoading,
    error: error as Error | null,
    epoch: data?.epoch ?? null,
  };
}

/**
 * Extract agent names mentioned in a market question string.
 * Matches against the known agent registry.
 */
export function extractAgentNames(
  question: string,
  agentMap: Map<string, AgentMetrics>
): string[] {
  const found: string[] = [];
  const lowerQ = question.toLowerCase();
  for (const [id, agent] of agentMap) {
    if (lowerQ.includes(id)) {
      found.push(agent.name);
    } else if (agent.tokenSymbol && lowerQ.includes(agent.tokenSymbol.toLowerCase())) {
      found.push(agent.name);
    }
  }
  return found;
}
