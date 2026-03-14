import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { hardhat, baseSepolia, base } from "viem/chains";

// Cache for 30 seconds
export const revalidate = 30;

function getChainConfig() {
  const id = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (id === "8453") return { chain: base, rpc: process.env.BASE_RPC_URL || "https://mainnet.base.org" };
  if (id === "84532") return { chain: baseSepolia, rpc: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org" };
  return { chain: hardhat, rpc: "http://127.0.0.1:8545" };
}

const FACTORY_ABI = [
  {
    inputs: [],
    name: "getMarkets",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MARKET_QUESTION_ABI = [
  {
    inputs: [],
    name: "question",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const BET_PLACED = parseAbiItem(
  "event BetPlaced(address indexed bettor, uint8 outcomeIndex, uint256 amount)"
);
const BET_WITHDRAWN = parseAbiItem(
  "event BetWithdrawn(address indexed bettor, uint8 outcomeIndex, uint256 tokenAmount, uint256 refund, uint256 penalty)"
);

export interface GlobalEvent {
  type: "bet" | "withdraw";
  bettor: string;
  outcomeIndex: number;
  amount: number;
  timestamp: number;
  txHash: string;
  marketAddress: string;
  marketQuestion: string;
}

const MAX_EVENTS = 20;

export async function GET() {
  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (!factoryAddress || !/^0x[a-fA-F0-9]{40}$/.test(factoryAddress)) {
    return NextResponse.json({ events: [] });
  }

  try {
    const { chain, rpc } = getChainConfig();
    const client = createPublicClient({ chain, transport: http(rpc) });

    // 1. Get all market addresses from factory
    const markets = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: "getMarkets",
    });

    if (!markets || markets.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // 2. Fetch questions + events for all markets in parallel
    const marketQuestions = await Promise.all(
      markets.map((addr) =>
        client
          .readContract({
            address: addr,
            abi: MARKET_QUESTION_ABI,
            functionName: "question",
          })
          .catch(() => "Unknown Market")
      )
    );

    const questionMap = new Map<string, string>();
    markets.forEach((addr, i) => {
      questionMap.set(addr.toLowerCase(), marketQuestions[i]);
    });

    // 3. Fetch BetPlaced + BetWithdrawn logs for ALL markets at once
    const [betLogs, withdrawLogs] = await Promise.all([
      client.getLogs({
        address: markets as `0x${string}`[],
        event: BET_PLACED,
        fromBlock: 0n,
        toBlock: "latest",
      }),
      client.getLogs({
        address: markets as `0x${string}`[],
        event: BET_WITHDRAWN,
        fromBlock: 0n,
        toBlock: "latest",
      }),
    ]);

    // 4. Merge all events
    type RawEvent = {
      blockNumber: bigint;
      logIndex: number;
      type: "bet" | "withdraw";
      bettor: string;
      outcomeIndex: number;
      amount: bigint;
      txHash: string;
      marketAddress: string;
    };

    const allEvents: RawEvent[] = [];

    for (const log of betLogs) {
      allEvents.push({
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        type: "bet",
        bettor: log.args.bettor!,
        outcomeIndex: Number(log.args.outcomeIndex),
        amount: log.args.amount!,
        txHash: log.transactionHash,
        marketAddress: log.address.toLowerCase(),
      });
    }

    for (const log of withdrawLogs) {
      allEvents.push({
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        type: "withdraw",
        bettor: log.args.bettor!,
        outcomeIndex: Number(log.args.outcomeIndex),
        amount: log.args.refund!,
        txHash: log.transactionHash,
        marketAddress: log.address.toLowerCase(),
      });
    }

    // Sort newest first
    allEvents.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(b.blockNumber - a.blockNumber);
      return b.logIndex - a.logIndex;
    });

    // Take only the most recent events
    const recent = allEvents.slice(0, MAX_EVENTS);

    if (recent.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // 5. Fetch block timestamps for the recent events
    const uniqueBlocks = [...new Set(recent.map((e) => e.blockNumber))];
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

    // 6. Build response
    const events: GlobalEvent[] = recent.map((evt) => ({
      type: evt.type,
      bettor: evt.bettor,
      outcomeIndex: evt.outcomeIndex,
      amount: Math.round(parseFloat(formatUnits(evt.amount, 6)) * 100) / 100,
      timestamp: blockTimestamps.get(evt.blockNumber) || 0,
      txHash: evt.txHash,
      marketAddress: evt.marketAddress,
      marketQuestion: questionMap.get(evt.marketAddress) || "Unknown Market",
    }));

    return NextResponse.json({ events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/events/recent]", message);
    return NextResponse.json(
      { error: "Failed to fetch global events", detail: message },
      { status: 500 }
    );
  }
}
