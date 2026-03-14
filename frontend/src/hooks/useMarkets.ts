"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, FACTORY_ABI, MARKET_ABI, getCollateralInfo } from "@/lib/contracts";

export interface MarketData {
  address: `0x${string}`;
  question: string;
  marketType: number;
  priceYes: bigint;
  priceNo: bigint;
  poolYes: bigint;
  poolNo: bigint;
  totalPool: bigint;
  resolved: boolean;
  outcome: number;
  resolutionTime: number;
  totalCollateral: bigint;
  redemptionFeeBps: bigint;
  withdrawalFeeBps: bigint;
  collateralToken: `0x${string}`;
  collateralDecimals: number;
  collateralSymbol: string;
}

export function useMarketAddresses() {
  return useReadContract({
    address: CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "getMarkets",
  });
}

export function useMarketData(address: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      { address, abi: MARKET_ABI, functionName: "question" },           // 0
      { address, abi: MARKET_ABI, functionName: "marketType" },          // 1
      { address, abi: MARKET_ABI, functionName: "priceYes" },            // 2
      { address, abi: MARKET_ABI, functionName: "priceNo" },             // 3
      { address, abi: MARKET_ABI, functionName: "poolYes" },             // 4
      { address, abi: MARKET_ABI, functionName: "poolNo" },              // 5
      { address, abi: MARKET_ABI, functionName: "resolved" },            // 6
      { address, abi: MARKET_ABI, functionName: "outcome" },             // 7
      { address, abi: MARKET_ABI, functionName: "resolutionTime" },      // 8
      { address, abi: MARKET_ABI, functionName: "totalCollateral" },     // 9
      { address, abi: MARKET_ABI, functionName: "redemptionFeeBps" },    // 10
      { address, abi: MARKET_ABI, functionName: "collateralToken" },     // 11
      { address, abi: MARKET_ABI, functionName: "totalPool" },           // 12
      { address, abi: MARKET_ABI, functionName: "withdrawalFeeBps" },    // 13
    ],
    query: { refetchInterval: 15_000 },
  });

  const market: MarketData | null = data && data[0].result !== undefined
    ? (() => {
        const collateralAddr = (data[11].result as string || CONTRACTS.usdc) as `0x${string}`;
        const info = getCollateralInfo(collateralAddr);
        return {
          address,
          question: data[0].result as string,
          marketType: Number(data[1].result),
          priceYes: data[2].result as bigint,
          priceNo: data[3].result as bigint,
          poolYes: data[4].result as bigint,
          poolNo: data[5].result as bigint,
          resolved: data[6].result as boolean,
          outcome: Number(data[7].result),
          resolutionTime: Number(data[8].result),
          totalCollateral: data[9].result as bigint,
          redemptionFeeBps: data[10].result as bigint,
          collateralToken: collateralAddr,
          totalPool: data[12].result as bigint,
          withdrawalFeeBps: data[13].result as bigint,
          collateralDecimals: info.decimals,
          collateralSymbol: info.symbol,
        };
      })()
    : null;

  return { market, isLoading, error, refetch };
}
