import { formatUnits } from "viem";

export const MARKET_TYPE_LABELS: Record<number, string> = {
  0: "Epoch Winner",
  1: "Top 10",
  2: "Head-to-Head",
  3: "Long Tail",
};

export const MARKET_TYPE_COLORS: Record<number, string> = {
  0: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  1: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  2: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  3: "bg-green-500/20 text-green-400 border-green-500/30",
};

export const OUTCOME_LABELS: Record<number, string> = {
  0: "Unresolved",
  1: "Yes",
  2: "No",
  3: "Invalid",
};

/** Format a bigint with given decimals to a readable string */
export function formatCollateral(amount: bigint, decimals: number): string {
  return parseFloat(formatUnits(amount, decimals)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a bigint (6 decimal USDC) to a readable string */
export function formatUSDC(amount: bigint): string {
  return formatCollateral(amount, 6);
}

/** Format a number as USDC (for display-only values) */
export function formatUSDCNum(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format bigint (18 decimal) price as percentage */
export function formatProbability(price: bigint): string {
  const pct = (Number(price) / 1e18) * 100;
  return pct.toFixed(1) + "%";
}

/** Format timestamp to time remaining string */
export function formatTimeRemaining(resolutionTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = resolutionTime - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Shorten an address for display */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Check if a market is in sniping window (< 1 hour until resolution) */
export function isSnipingWindow(resolutionTime: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const diff = resolutionTime - now;
  return diff > 0 && diff < 3600;
}

/** Calculate parimutuel payout multiplier */
export function calcPayoutMultiplier(poolForSide: bigint, totalPool: bigint): number {
  if (poolForSide === 0n || totalPool === 0n) return 0;
  return Number(totalPool) / Number(poolForSide);
}

/** Format payout multiplier as string */
export function formatMultiplier(multiplier: number): string {
  return multiplier.toFixed(2) + "x";
}
