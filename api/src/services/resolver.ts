import { ethers } from "ethers";
import { config } from "../config";
import { getFinalRankings } from "../db/schema";

// Minimal ABI for oracle contract interaction
const ORACLE_ABI = [
  "function proposeResolution(address market, uint8 outcome) external",
  "function finalizeResolution(address market) external",
  "function emergencyResolve(address market, uint8 outcome) external",
];

const MARKET_ABI = [
  "function question() view returns (string)",
  "function marketType() view returns (uint8)",
  "function resolutionTime() view returns (uint256)",
  "function resolved() view returns (bool)",
];

const FACTORY_ABI = [
  "function getMarkets() view returns (address[])",
  "function getMarketCount() view returns (uint256)",
];

export interface MarketInfo {
  address: string;
  question: string;
  marketType: number;
  resolutionTime: number;
  resolved: boolean;
}

/**
 * Get a signer for submitting resolution transactions
 */
function getSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  return new ethers.Wallet(config.privateKey, provider);
}

/**
 * Fetch all active (unresolved) markets from the factory
 */
export async function getActiveMarkets(): Promise<MarketInfo[]> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const factory = new ethers.Contract(config.factoryAddress, FACTORY_ABI, provider);

  const marketAddresses: string[] = await factory.getMarkets();
  const markets: MarketInfo[] = [];

  for (const addr of marketAddresses) {
    const market = new ethers.Contract(addr, MARKET_ABI, provider);
    const [question, marketType, resolutionTime, resolved] = await Promise.all([
      market.question(),
      market.marketType(),
      market.resolutionTime(),
      market.resolved(),
    ]);

    if (!resolved) {
      markets.push({
        address: addr,
        question,
        marketType: Number(marketType),
        resolutionTime: Number(resolutionTime),
        resolved,
      });
    }
  }

  return markets;
}

/**
 * Determine the outcome for a market based on final leaderboard data
 * Returns: 1 = Yes, 2 = No, 3 = Invalid
 */
export function determineOutcome(
  market: MarketInfo,
  finalRankings: { rank: number; name: string }[]
): number {
  const question = market.question.toLowerCase();

  // Extract agent name from question (basic pattern matching)
  // In production, store agent metadata in the market DB record
  switch (market.marketType) {
    case 0: // EPOCH_WINNER — "Will X be #1?"
    case 1: // TOP_10 — "Will X be Top 10?"
    case 2: // HEAD_TO_HEAD — "Will A rank higher than B?"
    case 3: // LONG_TAIL — "Will any agent outside Top 50 break into Top 10?"
      // For MVP, return a placeholder. Real implementation would parse
      // the question and match against rankings.
      break;
  }

  // Default: return Invalid if we can't determine
  console.log(`[Resolver] Cannot auto-determine outcome for: "${market.question}"`);
  return 3; // Invalid
}

/**
 * Propose resolution for a market via the oracle contract
 */
export async function proposeResolution(
  marketAddress: string,
  outcome: number
): Promise<string> {
  const signer = getSigner();
  const oracle = new ethers.Contract(config.oracleAddress, ORACLE_ABI, signer);

  const tx = await oracle.proposeResolution(marketAddress, outcome);
  const receipt = await tx.wait();
  console.log(`[Resolver] Proposed resolution for ${marketAddress}: outcome=${outcome}, tx=${receipt.hash}`);
  return receipt.hash;
}

/**
 * Finalize a pending resolution (after timelock)
 */
export async function finalizeResolution(marketAddress: string): Promise<string> {
  const signer = getSigner();
  const oracle = new ethers.Contract(config.oracleAddress, ORACLE_ABI, signer);

  const tx = await oracle.finalizeResolution(marketAddress);
  const receipt = await tx.wait();
  console.log(`[Resolver] Finalized resolution for ${marketAddress}, tx=${receipt.hash}`);
  return receipt.hash;
}

/**
 * Emergency resolve (bypasses timelock, owner only)
 */
export async function emergencyResolve(
  marketAddress: string,
  outcome: number
): Promise<string> {
  const signer = getSigner();
  const oracle = new ethers.Contract(config.oracleAddress, ORACLE_ABI, signer);

  const tx = await oracle.emergencyResolve(marketAddress, outcome);
  const receipt = await tx.wait();
  console.log(`[Resolver] Emergency resolved ${marketAddress}: outcome=${outcome}, tx=${receipt.hash}`);
  return receipt.hash;
}
