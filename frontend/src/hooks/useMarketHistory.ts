"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

interface HistoryResponse {
  snapshots: PoolSnapshot[];
  events: MarketEvent[];
  overview: MarketOverview;
}

const EMPTY_OVERVIEW: MarketOverview = {
  totalBets: 0, totalWithdrawals: 0, uniqueBettors: 0,
  largestBet: 0, largestBettor: "", totalVolumeYes: 0, totalVolumeNo: 0,
};

export function useMarketHistory(address: `0x${string}` | undefined) {
  const [snapshots, setSnapshots] = useState<PoolSnapshot[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [overview, setOverview] = useState<MarketOverview>(EMPTY_OVERVIEW);
  const [isLoading, setIsLoading] = useState(!!address);
  const [error, setError] = useState<string | null>(null);
  const addressRef = useRef(address);
  useEffect(() => { addressRef.current = address; }, [address]);

  const fetchHistory = useCallback(() => {
    const addr = addressRef.current;
    if (!addr) return;

    fetch(`/api/markets/${addr}/history`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: HistoryResponse | PoolSnapshot[]) => {
        if (addressRef.current !== addr) return;
        // Handle both old format (array) and new format (object)
        if (Array.isArray(data)) {
          setSnapshots(data);
        } else {
          setSnapshots(data.snapshots);
          setEvents(data.events);
          setOverview(data.overview);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (addressRef.current === addr) {
          setError(err.message);
          setIsLoading(false);
        }
      });
  }, []);

  const [prevAddress, setPrevAddress] = useState(address);
  if (address !== prevAddress) {
    setPrevAddress(address);
    if (address) {
      setIsLoading(true);
      setError(null);
    }
  }

  useEffect(() => {
    if (!address) return;
    fetchHistory();

    const interval = setInterval(fetchHistory, 15_000);
    return () => clearInterval(interval);
  }, [address, fetchHistory]);

  // Backwards-compatible: `data` = snapshots
  return { data: snapshots, snapshots, events, overview, isLoading, error, refetch: fetchHistory };
}
