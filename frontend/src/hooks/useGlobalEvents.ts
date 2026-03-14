"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LiveDeposit } from "@/components/LiveActivityFeed";

interface GlobalEvent {
  type: "bet" | "withdraw";
  bettor: string;
  outcomeIndex: number;
  amount: number;
  timestamp: number;
  txHash: string;
  marketAddress: string;
  marketQuestion: string;
}

function truncateQuestion(q: string, max = 30): string {
  if (q.length <= max) return q;
  return q.slice(0, max - 1) + "\u2026";
}

export function useGlobalEvents() {
  const [deposits, setDeposits] = useState<LiveDeposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seenTxs = useRef(new Set<string>());

  const fetchEvents = useCallback(() => {
    fetch("/api/events/recent", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { events: GlobalEvent[] }) => {
        if (!data.events || data.events.length === 0) {
          setIsLoading(false);
          return;
        }

        const newDeposits: LiveDeposit[] = [];
        for (const evt of data.events) {
          const key = `${evt.txHash}-${evt.type}`;
          if (seenTxs.current.has(key)) continue;
          seenTxs.current.add(key);

          const outcomeLabel =
            evt.type === "bet"
              ? `${evt.outcomeIndex === 0 ? "YES" : "NO"} on ${truncateQuestion(evt.marketQuestion)}`
              : `withdrew from ${truncateQuestion(evt.marketQuestion)}`;

          newDeposits.push({
            id: key,
            address: evt.bettor,
            outcomeLabel,
            amount: evt.amount,
            timestamp: evt.timestamp * 1000, // convert to ms
            marketAddress: evt.marketAddress,
          });
        }

        if (newDeposits.length > 0) {
          setDeposits((prev) => [...newDeposits, ...prev].slice(0, 20));
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[useGlobalEvents]", err.message);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 20_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return { deposits, isLoading };
}
