/**
 * DisplayMarket — Bridge between on-chain MarketData (bigints) and
 * what the Figma design components expect (plain numbers, outcome arrays).
 */

import { formatUnits } from "viem";
import type { MarketData } from "@/hooks/useMarkets";
import type { AgentMetrics } from "@/hooks/useAgentData";

/* ─── Types ─── */

export type MarketTypeStr = "epoch-winner" | "top-10" | "head-to-head" | "long-tail";
export type MarketStatus = "active" | "sniping" | "resolved" | "resolved-invalid";

export interface DisplayOutcome {
  id: string;              // "yes" | "no"
  label: string;           // "YES" | "NO"
  totalDeposits: number;   // pool side in human-readable units
  color: string;           // tailwind-compatible color
}

export interface DisplayMarket {
  // On-chain identity
  address: `0x${string}`;
  id: string;

  // Display fields matching Figma expectations
  question: string;
  type: MarketTypeStr;
  status: MarketStatus;
  totalPool: number;
  protocolFeePct: number;
  outcomes: DisplayOutcome[];
  winningOutcomeId?: string;
  endTime: number;           // ms timestamp
  featured: boolean;

  /** Agent names detected in the market question (resolved from live data) */
  agentNames: string[];

  // Preserved raw on-chain data for contract interactions
  raw: MarketData;
}

/* ─── Converters ─── */

const MARKET_TYPE_MAP: Record<number, MarketTypeStr> = {
  0: "epoch-winner",
  1: "top-10",
  2: "head-to-head",
  3: "long-tail",
};

function getStatus(m: MarketData): MarketStatus {
  if (m.resolved) {
    return m.outcome === 3 ? "resolved-invalid" : "resolved";
  }
  const now = Math.floor(Date.now() / 1000);
  const diff = m.resolutionTime - now;
  if (diff > 0 && diff < 3600) return "sniping";
  return "active";
}

function getWinningOutcomeId(m: MarketData): string | undefined {
  if (!m.resolved) return undefined;
  if (m.outcome === 1) return "yes";
  if (m.outcome === 2) return "no";
  return undefined; // invalid/tie
}

/**
 * Max number of agent tags expected per market type.
 * Epoch-winner, top-10, long-tail reference 1 agent; head-to-head references 2.
 */
const MAX_AGENTS_BY_TYPE: Record<number, number> = {
  0: 1, // epoch-winner
  1: 1, // top-10
  2: 2, // head-to-head
  3: 1, // long-tail
};

/**
 * Check if an agent name/symbol appears as a whole word in the question.
 * Uses word-boundary matching to avoid partial hits (e.g. "AI" matching "AIXBT").
 */
function matchesWholeWord(question: string, term: string): boolean {
  if (!term || term.length === 0) return false;
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  return pattern.test(question);
}

/**
 * Resolve agent names mentioned in a market question against the live registry.
 * Uses word-boundary matching and caps results by market type.
 * Longer names are matched first to avoid shorter substrings stealing the match.
 */
function resolveAgentNames(
  question: string,
  agentRegistry?: Map<string, AgentMetrics>,
  marketType?: number
): string[] {
  if (!agentRegistry || agentRegistry.size === 0) return [];
  const maxAgents = marketType !== undefined ? (MAX_AGENTS_BY_TYPE[marketType] ?? 2) : 5;

  // Sort agents by name length descending so longer names match first
  const sortedAgents = [...agentRegistry.values()].sort(
    (a, b) => b.name.length - a.name.length
  );

  const found: string[] = [];
  for (const agent of sortedAgents) {
    if (found.length >= maxAgents) break;
    // Match on full agent name (word boundary)
    if (matchesWholeWord(question, agent.name)) {
      found.push(agent.name);
    }
    // Also match on token symbol (e.g. "$AIXBT" or bare "AIXBT")
    else if (agent.tokenSymbol && matchesWholeWord(question, agent.tokenSymbol)) {
      found.push(agent.name);
    }
  }
  return found;
}

/**
 * Hydrate the market question with canonical agent names from live data.
 * Replaces approximate/stale names in on-chain questions with the
 * current display name from the Virtuals API.
 */
function hydrateQuestion(
  question: string,
  agentRegistry?: Map<string, AgentMetrics>
): string {
  if (!agentRegistry || agentRegistry.size === 0) return question;
  let hydrated = question;
  for (const [, agent] of agentRegistry) {
    // Case-insensitive replace of agent name with canonical casing
    const regex = new RegExp(escapeRegex(agent.name), "gi");
    hydrated = hydrated.replace(regex, agent.name);
    // Also replace bare token symbol references
    if (agent.tokenSymbol) {
      const symRegex = new RegExp(`\\$${escapeRegex(agent.tokenSymbol)}`, "gi");
      hydrated = hydrated.replace(symRegex, `$${agent.tokenSymbol}`);
    }
  }
  return hydrated;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convert raw on-chain MarketData to Figma-friendly DisplayMarket.
 *
 * @param m        — On-chain MarketData from wagmi
 * @param agentRegistry — Optional map of live agent data (from useAgentData).
 *                         When provided, agent names in the question are resolved
 *                         to their canonical display names.
 */
export function toDisplayMarket(
  m: MarketData,
  agentRegistry?: Map<string, AgentMetrics>
): DisplayMarket {
  const decimals = m.collateralDecimals;
  const poolYesNum = parseFloat(formatUnits(m.poolYes, decimals));
  const poolNoNum = parseFloat(formatUnits(m.poolNo, decimals));
  const totalPoolNum = parseFloat(formatUnits(m.totalPool, decimals));

  return {
    address: m.address,
    id: m.address,
    question: hydrateQuestion(m.question, agentRegistry),
    type: MARKET_TYPE_MAP[m.marketType] || "long-tail",
    status: getStatus(m),
    totalPool: totalPoolNum,
    protocolFeePct: Number(m.redemptionFeeBps) / 100, // 200 bps → 2%
    outcomes: [
      {
        id: "yes",
        label: "YES",
        totalDeposits: poolYesNum,
        color: "#10B981", // emerald
      },
      {
        id: "no",
        label: "NO",
        totalDeposits: poolNoNum,
        color: "#EF4444", // red
      },
    ],
    winningOutcomeId: getWinningOutcomeId(m),
    endTime: m.resolutionTime * 1000, // seconds → ms
    featured: false, // can be set externally
    agentNames: resolveAgentNames(m.question, agentRegistry, m.marketType),
    raw: m,
  };
}

/* ─── Helpers operating on DisplayMarket ─── */

/** Estimated payout multiplier for a given outcome */
export function getEstMultiplier(market: DisplayMarket, outcomeId: string): number {
  const outcome = market.outcomes.find((o) => o.id === outcomeId);
  if (!outcome || outcome.totalDeposits === 0 || market.totalPool === 0) return 0;
  return market.totalPool / outcome.totalDeposits;
}

/** Your share of the winning pool given a deposit amount */
export function getShareOfPool(
  market: DisplayMarket,
  outcomeId: string,
  depositAmount: number
): number {
  const outcome = market.outcomes.find((o) => o.id === outcomeId);
  if (!outcome) return 0;
  const newPool = outcome.totalDeposits + depositAmount;
  if (newPool === 0) return 0;
  return (depositAmount / newPool) * 100;
}

/**
 * Velocity score (0-100) — how "hot" a pool is.
 * Higher totalPool = higher score, capped at 100.
 */
export function getVelocityScore(market: DisplayMarket): number {
  if (market.totalPool === 0) return 0;
  // Scale: 0 at $0, 50 at $10k, 100 at $100k+
  return Math.min(100, Math.round(Math.sqrt(market.totalPool / 100) * 10));
}

/**
 * Generate deterministic sparkline data from market address.
 * Returns 12 data points for the MicroSparkline component.
 */
export function getSparklineData(market: DisplayMarket, outcomeId: string): number[] {
  // Seed from address bytes for determinism
  const seed = parseInt(market.address.slice(2, 10), 16);
  const outcome = market.outcomes.find((o) => o.id === outcomeId);
  const baseValue = outcome ? outcome.totalDeposits : 0;

  const points: number[] = [];
  let val = baseValue * 0.3;
  for (let i = 0; i < 12; i++) {
    const noise = Math.sin(seed * (i + 1) * 0.7) * 0.3;
    val = val + (baseValue * 0.05) + (noise * baseValue * 0.1);
    points.push(Math.max(0, val));
  }
  return points;
}

/** Is the sparkline trending up? */
export function isSparklineRising(data: number[]): boolean {
  if (data.length < 2) return true;
  return data[data.length - 1] > data[0];
}
