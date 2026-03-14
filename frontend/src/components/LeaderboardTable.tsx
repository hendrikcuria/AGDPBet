"use client";

// LeaderboardTable is no longer used as a separate component.
// The leaderboard page now handles everything directly.
// This file is kept as a redirect for backwards compatibility.

import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function LeaderboardTable() {
  const { data, isLoading, error } = useLeaderboard();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Unable to sync live agent data.</p>
        <p className="text-xs mt-1">Leaderboard data is temporarily unavailable.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Epoch {data.epoch} Leaderboard</h2>
        <span className="text-xs text-gray-500">
          Updated: {new Date(data.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/5">
              <th className="text-left py-3 px-4">Rank</th>
              <th className="text-left py-3 px-4">Agent</th>
              <th className="text-right py-3 px-4">Score</th>
              <th className="text-right py-3 px-4 hidden sm:table-cell">Revenue</th>
              <th className="text-right py-3 px-4 hidden md:table-cell">Jobs</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((agent) => (
              <tr
                key={agent.rank}
                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-4">
                  <span className={`font-bold ${
                    agent.rank <= 3
                      ? "text-yellow-400"
                      : agent.rank <= 10
                      ? "text-indigo-400"
                      : "text-gray-400"
                  }`}>
                    #{agent.rank}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-white">{agent.name}</span>
                  {agent.token_symbol && (
                    <span className="ml-2 text-xs text-gray-500">${agent.token_symbol}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-white">
                  {agent.score?.toLocaleString() ?? "—"}
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-300 hidden sm:table-cell">
                  ${agent.weekly_revenue?.toLocaleString() ?? "—"}
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-400 hidden md:table-cell">
                  {agent.job_count ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
