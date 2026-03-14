"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, TrendingUp, Flame, ArrowUpRight } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAppState } from "@/lib/appState";
import { useMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import { formatCollateral } from "@/lib/utils";

// Lightweight wrapper that reads a single market and feeds it to BreakingNews
function BreakingNewsMarketRow({ address, index }: { address: `0x${string}`; index: number }) {
  const { market } = useMarketData(address);
  if (!market) return null;

  return (
    <Link href={`/markets/${address}`}>
      <div className="flex items-start gap-3 cursor-pointer group">
        <span className="text-xs text-[#475569] font-mono w-4 shrink-0 mt-0.5">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#CBD5E1] group-hover:text-white transition-colors line-clamp-2">
            {market.question}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm text-white font-mono">{formatCollateral(market.totalPool, market.collateralDecimals)}</p>
          <p className="text-[10px] font-mono text-[#64748B]">TVL</p>
        </div>
      </div>
    </Link>
  );
}

export function BreakingNews() {
  const { data: addresses } = useMarketAddresses();
  const marketAddrs = (addresses as `0x${string}`[] | undefined) || [];

  // Show up to 5 markets
  const displayAddrs = marketAddrs.slice(0, 5);

  return (
    <div className="bg-[#131C2D] rounded-2xl p-5 agdp-glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-sm flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Top Pools by TVL
        </h3>
        <Link
          href="/"
          className="text-xs text-[#64748B] hover:text-white flex items-center gap-0.5 transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {displayAddrs.length === 0 ? (
          <p className="text-xs text-[#64748B]">No markets yet</p>
        ) : (
          displayAddrs.map((addr, i) => (
            <BreakingNewsMarketRow key={addr} address={addr} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

export function HotTopics() {
  const router = useRouter();
  const { data } = useLeaderboard();
  const { setAgentFilter } = useAppState();

  const topAgents = data?.leaderboard?.slice(0, 5) || [];

  const handleAgentClick = (symbol: string | null) => {
    if (symbol) {
      setAgentFilter(symbol);
      router.push(`/?agent=${encodeURIComponent(symbol)}`);
    }
  };

  return (
    <div className="bg-[#131C2D] rounded-2xl p-5 agdp-glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#1A56FF]" />
          Hot Agents
        </h3>
        <Link
          href="/leaderboard"
          className="text-xs text-[#64748B] hover:text-white flex items-center gap-0.5 transition-colors"
        >
          Explore all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {topAgents.length === 0 ? (
          <p className="text-xs text-[#64748B]">Loading agents...</p>
        ) : (
          topAgents.map((agent) => (
            <div
              key={agent.name}
              onClick={() => handleAgentClick(agent.token_symbol)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <span className={`text-xs font-mono w-4 shrink-0 ${
                agent.rank <= 3 ? "agdp-gradient-text" : "text-[#475569]"
              }`}>{agent.rank}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-[#CBD5E1] group-hover:text-white transition-colors">
                  {agent.name}
                </span>
              </div>
              <span className="text-xs text-[#64748B] font-mono">
                {agent.score ? `${agent.score.toLocaleString()} pts` : "\u2014"}
              </span>
              <ArrowUpRight className="w-3 h-3 text-[#10B981] shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TopicPills() {
  const { data } = useLeaderboard();
  const { agentFilter, setAgentFilter } = useAppState();

  // Get top agent names from leaderboard for pills
  const topAgentNames = data?.leaderboard?.slice(0, 8).map((a) => ({
    name: a.name,
    symbol: a.token_symbol,
  })) || [];

  const handleClick = (symbol: string | null) => {
    if (agentFilter === symbol) {
      setAgentFilter(null);
    } else {
      setAgentFilter(symbol);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
      <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 rotate-180" />
      {/* All pill */}
      <button
        onClick={() => setAgentFilter(null)}
        className={`px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap shrink-0 ${
          !agentFilter
            ? "bg-[#1A56FF]/15 text-[#1A56FF] shadow-[0_0_12px_rgba(26,86,255,0.15)]"
            : "bg-[#131C2D] text-[#64748B] hover:text-white hover:shadow-[0_0_12px_rgba(26,86,255,0.08)]"
        }`}
      >
        All Agents
      </button>
      {topAgentNames.map((agent) => {
        const isActive = agentFilter === agent.symbol;
        return (
          <button
            key={agent.symbol || agent.name}
            onClick={() => handleClick(agent.symbol)}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap shrink-0 ${
              isActive
                ? "bg-[#1A56FF]/15 text-[#1A56FF] shadow-[0_0_12px_rgba(26,86,255,0.15)]"
                : "bg-[#131C2D] text-[#64748B] hover:text-white hover:shadow-[0_0_12px_rgba(26,86,255,0.08)]"
            }`}
          >
            {agent.name}
          </button>
        );
      })}
      <ChevronRight className="w-4 h-4 text-[#475569] shrink-0" />
    </div>
  );
}
