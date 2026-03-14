import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { hardhat, baseSepolia, base } from "viem/chains";

// Cache for 60 seconds — prevents client chart renders from hammering the RPC
export const revalidate = 60;

function getChainConfig() {
  const id = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (id === "8453") return { chain: base, rpc: process.env.BASE_RPC_URL || "https://mainnet.base.org" };
  if (id === "84532") return { chain: baseSepolia, rpc: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org" };
  return { chain: hardhat, rpc: "http://127.0.0.1:8545" };
}

const BET_PLACED = parseAbiItem(
  "event BetPlaced(address indexed bettor, uint8 outcomeIndex, uint256 amount)"
);
const BET_WITHDRAWN = parseAbiItem(
  "event BetWithdrawn(address indexed bettor, uint8 outcomeIndex, uint256 tokenAmount, uint256 refund, uint256 penalty)"
);

export interface PoolSnapshot {
  timestamp: number;
  poolYes: number;
  poolNo: number;
  totalPool: number;
}

export interface MarketEvent {
  type: "bet" | "withdraw";
  bettor: string;
  outcomeIndex: number;
  amount: number;
  timestamp: number;
  txHash: string;
}

export interface MarketOverview {
  totalBets: number;
  totalWithdrawals: number;
  uniqueBettors: number;
  largestBet: number;
  largestBettor: string;
  totalVolumeYes: number;
  totalVolumeNo: number;
}

export interface MarketHistoryResponse {
  snapshots: PoolSnapshot[];
  events: MarketEvent[];
  overview: MarketOverview;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const marketAddress = address as `0x${string}`;

  try {
    const { chain, rpc } = getChainConfig();
    const client = createPublicClient({ chain, transport: http(rpc) });

    // Use a recent starting block to avoid RPC range limits (10k block max on public RPCs)
    // Base Sepolia produces ~2s blocks, so 50k blocks ≈ ~28 hours — plenty for fresh markets
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;

    // Fetch both event types in parallel
    const [betLogs, withdrawLogs] = await Promise.all([
      client.getLogs({
        address: marketAddress,
        event: BET_PLACED,
        fromBlock,
        toBlock: "latest",
      }),
      client.getLogs({
        address: marketAddress,
        event: BET_WITHDRAWN,
        fromBlock,
        toBlock: "latest",
      }),
    ]);

    // Merge and sort all events by block number + log index
    type EventEntry = {
      blockNumber: bigint;
      logIndex: number;
      type: "bet" | "withdraw";
      bettor: string;
      outcomeIndex: number;
      amount: bigint;
      txHash: string;
    };

    const events: EventEntry[] = [];

    for (const log of betLogs) {
      events.push({
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        type: "bet",
        bettor: log.args.bettor!,
        outcomeIndex: Number(log.args.outcomeIndex),
        amount: log.args.amount!,
        txHash: log.transactionHash,
      });
    }

    for (const log of withdrawLogs) {
      events.push({
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        type: "withdraw",
        bettor: log.args.bettor!,
        outcomeIndex: Number(log.args.outcomeIndex),
        amount: log.args.refund!,
        txHash: log.transactionHash,
      });
    }

    events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
      return a.logIndex - b.logIndex;
    });

    if (events.length === 0) {
      const empty: MarketHistoryResponse = {
        snapshots: [],
        events: [],
        overview: { totalBets: 0, totalWithdrawals: 0, uniqueBettors: 0, largestBet: 0, largestBettor: "", totalVolumeYes: 0, totalVolumeNo: 0 },
      };
      return NextResponse.json(empty);
    }

    // Fetch real block timestamps (batched to avoid RPC spam)
    const uniqueBlocks = [...new Set(events.map((e) => e.blockNumber))];
    const blockTimestamps = new Map<bigint, number>();
    const BATCH = 10;

    for (let i = 0; i < uniqueBlocks.length; i += BATCH) {
      const batch = uniqueBlocks.slice(i, i + BATCH);
      const blocks = await Promise.all(
        batch.map((bn) => client.getBlock({ blockNumber: bn }))
      );
      for (const block of blocks) {
        blockTimestamps.set(block.number, Number(block.timestamp));
      }
    }

    // Build snapshots, events list, and overview
    let poolYes = 0;
    let poolNo = 0;

    const firstTimestamp = blockTimestamps.get(events[0].blockNumber) || 0;
    const snapshots: PoolSnapshot[] = [
      { timestamp: firstTimestamp > 0 ? firstTimestamp - 1 : 0, poolYes: 0, poolNo: 0, totalPool: 0 },
    ];

    const marketEvents: MarketEvent[] = [];
    const bettors = new Set<string>();
    let totalBets = 0;
    let totalWithdrawals = 0;
    let largestBet = 0;
    let largestBettor = "";
    let totalVolumeYes = 0;
    let totalVolumeNo = 0;

    for (const evt of events) {
      const amount = parseFloat(formatUnits(evt.amount, 6));
      const ts = blockTimestamps.get(evt.blockNumber) || 0;

      if (evt.type === "bet") {
        if (evt.outcomeIndex === 0) poolYes += amount;
        else poolNo += amount;
        totalBets++;
        bettors.add(evt.bettor.toLowerCase());
        if (evt.outcomeIndex === 0) totalVolumeYes += amount;
        else totalVolumeNo += amount;
        if (amount > largestBet) {
          largestBet = amount;
          largestBettor = evt.bettor;
        }
      } else {
        if (evt.outcomeIndex === 0) poolYes = Math.max(0, poolYes - amount);
        else poolNo = Math.max(0, poolNo - amount);
        totalWithdrawals++;
      }

      snapshots.push({
        timestamp: ts,
        poolYes: Math.round(poolYes * 100) / 100,
        poolNo: Math.round(poolNo * 100) / 100,
        totalPool: Math.round((poolYes + poolNo) * 100) / 100,
      });

      marketEvents.push({
        type: evt.type,
        bettor: evt.bettor,
        outcomeIndex: evt.outcomeIndex,
        amount: Math.round(amount * 100) / 100,
        timestamp: ts,
        txHash: evt.txHash,
      });
    }

    const response: MarketHistoryResponse = {
      snapshots,
      events: marketEvents.reverse(), // newest first
      overview: {
        totalBets,
        totalWithdrawals,
        uniqueBettors: bettors.size,
        largestBet: Math.round(largestBet * 100) / 100,
        largestBettor,
        totalVolumeYes: Math.round(totalVolumeYes * 100) / 100,
        totalVolumeNo: Math.round(totalVolumeNo * 100) / 100,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/markets/history]", message);
    return NextResponse.json(
      { error: "Failed to fetch market history", detail: message },
      { status: 500 },
    );
  }
}
