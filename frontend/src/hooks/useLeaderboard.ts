"use client";

import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/contracts";

export interface LeaderboardAgent {
  rank: number;
  name: string;
  token_symbol: string | null;
  score: number | null;
  weekly_revenue: number | null;
  job_count: number | null;
  unique_users: number | null;
  success_rate: number | null;
  scraped_at: string;
}

export interface LeaderboardResponse {
  epoch: number;
  leaderboard: LeaderboardAgent[];
  updatedAt: string;
}

export function useLeaderboard() {
  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    refetchInterval: 30_000, // Refresh every 30s
  });
}

export interface EpochInfo {
  epochNumber: number;
  epochId: number;
  status: string;
  startsAt: string;
  endsAt: string;
  timeRemainingMs: number;
  isLastHour: boolean;
}

export function useEpochInfo() {
  return useQuery<EpochInfo>({
    queryKey: ["epochInfo"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/leaderboard/epoch/current`);
      if (!res.ok) throw new Error("Failed to fetch epoch info");
      return res.json();
    },
    refetchInterval: 10_000,
  });
}
