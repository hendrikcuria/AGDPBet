"use client";

import { useState, useMemo, useId } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, TrendingUp, ExternalLink, ChevronRight } from "lucide-react";
import { useAgentData, type AgentMetrics } from "@/hooks/useAgentData";
import { useEpochInfo } from "@/hooks/useLeaderboard";
import CountdownTimer from "@/components/CountdownTimer";
import { AgentHexAvatar } from "@/components/AgentHexAvatar";
import { useAppState } from "@/lib/appState";

type SortKey = "rank" | "score" | "weeklyRevenue" | "jobCount" | "uniqueUsers" | "successRate";

/* ─── Agent bios (static for now) ─── */

const agentBios: Record<string, string> = {
  ETHY: "Ethereum-native autonomous trading agent specializing in DeFi yield optimization and MEV strategies.",
  CL: "Multi-chain liquidity provider with advanced cross-protocol arbitrage capabilities.",
  AFI: "Decentralized finance aggregator agent built for institutional-grade portfolio management.",
  TBOT: "High-frequency prediction market specialist with sub-second execution latency.",
  YMAX: "Yield maximization engine that continuously rebalances across 40+ DeFi protocols.",
  DORC: "On-chain data analytics oracle providing real-time sentiment signals to prediction pools.",
  NNET: "Deep learning agent trained on 3 years of on-chain behavioral data for market forecasting.",
  SYNTH: "Synthetic asset creation and management agent with automated hedging strategies.",
  META: "Meta-learning agent that adapts strategies based on evolving market microstructure.",
  QBOT: "Quantum-inspired optimization agent for complex multi-outcome prediction markets.",
};

function generateSparkData(seed: number): number[] {
  const points: number[] = [];
  let val = 50 + seed * 3;
  for (let i = 0; i < 12; i++) {
    val += (Math.sin(seed * 7 + i * 1.3) * 8) + (Math.cos(seed * 3 + i) * 4);
    points.push(Math.max(10, Math.min(95, val)));
  }
  return points;
}

/* ─── Agent Sparkline (mini chart for expansion panels) ─── */

function AgentSparkline({ data, rising }: { data: number[]; rising: boolean }) {
  const uid = useId();
  const color = rising ? "#10B981" : "#EF4444";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`sp-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${h} ${points} ${w - pad},${h}`}
        fill={`url(#sp-fill-${uid})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={w - pad}
        cy={parseFloat(points.split(" ").pop()!.split(",")[1])}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

/* ─── Stat Block ─── */

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#0B0F19]/60 rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">
        {label}
      </p>
      <p className={`mt-0.5 font-mono ${accent ? "text-[#1A56FF]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

/* ─── Expansion Panel ─── */

function ExpansionPanel({
  agent,
  onViewPools,
}: {
  agent: AgentMetrics;
  onViewPools: (symbol: string, e: React.MouseEvent) => void;
}) {
  const sparkData = useMemo(() => generateSparkData(agent.rank), [agent.rank]);
  const rising = sparkData[sparkData.length - 1] > sparkData[0];
  const bio = (agent.tokenSymbol && agentBios[agent.tokenSymbol]) || "Autonomous AI agent participating in AGDP prediction markets.";

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        height: { type: "spring", stiffness: 320, damping: 32, mass: 0.8 },
        opacity: { duration: 0.2, delay: 0.05 },
      }}
      className="overflow-hidden"
    >
      <div className="relative bg-white/[0.02] border-b border-[#1E293B]/50">
        {/* Neon left accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{
            background: "linear-gradient(180deg, #1A56FF, #00E5FF, #1A56FF)",
            boxShadow: "0 0 8px rgba(0,229,255,0.3), 0 0 20px rgba(26,86,255,0.15)",
          }}
        />

        <div className="pl-6 pr-5 py-5">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            {/* Stats grid */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatBlock label="Weekly Revenue" value={`$${agent.weeklyRevenue.toLocaleString()}`} accent />
              <StatBlock label="Job Count" value={agent.jobCount.toLocaleString()} />
              <StatBlock label="Unique Users" value={agent.uniqueUsers.toLocaleString()} />
              <StatBlock label="Success Rate" value={`${agent.successRate.toFixed(1)}%`} />
              <StatBlock label="Score" value={agent.score.toLocaleString()} />
            </div>

            {/* Sparkline + Bio */}
            <div className="lg:w-[280px] shrink-0 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono mb-1">
                    Weekly Trend
                  </p>
                  <AgentSparkline data={sparkData} rising={rising} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono ${rising ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {rising ? "▲" : "▼"}{" "}
                    {Math.abs(sparkData[sparkData.length - 1] - sparkData[0]).toFixed(1)} pts
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">{bio}</p>
            </div>
          </div>

          {/* View Pools link — always rendered regardless of tokenSymbol */}
          <motion.button
            onClick={(e) => onViewPools(agent.tokenSymbol || agent.name, e)}
            className="mt-4 flex items-center gap-1.5 text-xs text-[#1A56FF] hover:text-[#00E5FF] transition-colors group/link"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View {agent.name}&apos;s Pools</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Rank Badge (SVG star for top 3) ─── */

function RankBadge({ rank, size = 20 }: { rank: number; size?: number }) {
  if (rank === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#FFD700" stroke="#FFD700" strokeWidth="0.5" />
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#C0C0C0" stroke="#C0C0C0" strokeWidth="0.5" />
      </svg>
    );
  }
  if (rank === 3) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#CD7F32" stroke="#CD7F32" strokeWidth="0.5" />
      </svg>
    );
  }
  return <span className="font-mono text-[#64748B] text-sm">#{rank}</span>;
}

/* ─── Main Component ─── */

export default function LeaderboardPage() {
  const router = useRouter();
  const { setAgentFilter } = useAppState();
  const { ranked, isLoading, error, epoch } = useAgentData();
  const { data: epochInfo } = useEpochInfo();
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...ranked].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "rank") return (a.rank - b.rank) * dir;
    return (b[sortKey] - a[sortKey]) * dir;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "rank"); }
  };

  const sortIcon = (col: SortKey) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const rankColor = (rank: number) => {
    if (rank <= 3) return "agdp-gradient-text";
    if (rank <= 10) return "text-[#1A56FF]";
    return "text-[#64748B]";
  };

  const leaderHaloClass = (rank: number) => {
    if (rank === 1) return "agdp-leader-halo-1";
    if (rank === 2) return "agdp-leader-halo-2";
    if (rank === 3) return "agdp-leader-halo-3";
    return "";
  };

  const handleViewPools = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAgentFilter(symbol);
    router.push(`/?agent=${encodeURIComponent(symbol)}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/5 rounded w-1/3 animate-pulse" />
        <div className="bg-[#131C2D] rounded-2xl overflow-hidden agdp-glow-card">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || ranked.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#94A3B8]">Unable to sync live agent data.</p>
        <p className="text-xs mt-1 text-[#475569]">Leaderboard data is temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-white text-2xl font-aeonik-ext tracking-tight">
            Epoch {epoch} Leaderboard
          </h1>
          <p className="text-xs text-[#64748B] mt-1 font-mono">
            {ranked.length} agents tracked &middot; Live data from Virtuals Protocol
          </p>
        </motion.div>
        {epochInfo && (
          <div className="mt-2 sm:mt-0 flex items-center gap-2">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider">Ends in</span>
            <CountdownTimer targetTimestamp={Math.floor(new Date(epochInfo.endsAt).getTime() / 1000)} />
          </div>
        )}
      </div>

      {/* Div-based leaderboard for inline expansion */}
      <motion.div
        className="bg-[#131C2D] rounded-2xl overflow-hidden agdp-glow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Column Headers */}
        <div className="border-b border-[#1E293B] px-4 py-3 grid grid-cols-[40px_1fr_64px] md:grid-cols-[40px_1fr_64px_80px_60px] lg:grid-cols-[40px_1fr_64px_80px_60px_60px] xl:grid-cols-[40px_1fr_64px_80px_60px_60px_72px] gap-2 items-center">
          <button onClick={() => handleSort("rank")} className="text-left text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8] transition-colors">
            Rank {sortIcon("rank")}
          </button>
          <span className="text-left text-xs text-[#64748B]">Agent</span>
          <button onClick={() => handleSort("score")} className="text-right text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8] transition-colors">
            Score {sortIcon("score")}
          </button>
          <button onClick={() => handleSort("weeklyRevenue")} className="text-right text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8] transition-colors hidden md:block">
            Revenue {sortIcon("weeklyRevenue")}
          </button>
          <button onClick={() => handleSort("jobCount")} className="text-right text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8] transition-colors hidden md:block">
            Jobs {sortIcon("jobCount")}
          </button>
          <button onClick={() => handleSort("uniqueUsers")} className="text-right text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8] transition-colors hidden lg:block">
            Users {sortIcon("uniqueUsers")}
          </button>
          <button onClick={() => handleSort("successRate")} className="text-right text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8] transition-colors hidden xl:block">
            Success% {sortIcon("successRate")}
          </button>
        </div>

        {/* Rows */}
        <div>
          {sorted.map((agent) => {
            const isExpanded = expandedId === agent.id;
            return (
              <motion.div
                key={agent.id}
                layout
                transition={{
                  layout: { type: "spring", stiffness: 350, damping: 35, mass: 0.8 },
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Row */}
                <motion.div
                  onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                  className={`grid grid-cols-[40px_1fr_64px] md:grid-cols-[40px_1fr_64px_80px_60px] lg:grid-cols-[40px_1fr_64px_80px_60px_60px] xl:grid-cols-[40px_1fr_64px_80px_60px_60px_72px] gap-2 items-center px-4 py-3 cursor-pointer transition-colors border-b border-[#1E293B]/50 ${leaderHaloClass(agent.rank)} ${isExpanded ? "bg-white/[0.03]" : ""}`}
                  whileHover={{
                    backgroundColor: isExpanded ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className={`text-sm ${rankColor(agent.rank)}`}>
                    <RankBadge rank={agent.rank} size={agent.rank <= 3 ? 28 : 20} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <AgentHexAvatar name={agent.name} size={24} src={agent.profilePic} />
                    <span className="text-sm text-white truncate">{agent.name}</span>
                    {agent.tokenSymbol && (
                      <span className="text-xs text-[#64748B] font-mono shrink-0">${agent.tokenSymbol}</span>
                    )}
                    {agent.isMock && <span className="text-[9px] text-[#334155] font-mono italic shrink-0">est.</span>}
                    <motion.span
                      className="ml-auto text-[#475569] shrink-0"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </motion.span>
                  </div>
                  <span className="text-right text-sm text-white font-mono">{agent.score.toLocaleString()}</span>
                  <span className="text-right text-sm text-[#CBD5E1] font-mono hidden md:block">${agent.weeklyRevenue.toLocaleString()}</span>
                  <span className="text-right text-sm text-[#CBD5E1] font-mono hidden md:block">{agent.jobCount.toLocaleString()}</span>
                  <span className="text-right text-sm text-[#CBD5E1] font-mono hidden lg:block">{agent.uniqueUsers.toLocaleString()}</span>
                  <span className="text-right text-sm text-[#CBD5E1] font-mono hidden xl:block">{agent.successRate}%</span>
                </motion.div>

                {/* Inline Expansion */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <ExpansionPanel
                      key={`panel-${agent.id}`}
                      agent={agent}
                      onViewPools={handleViewPools}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Insight Banner */}
      {ranked.length > 0 && (
        <motion.div
          className="mt-6 agdp-gradient-badge rounded-2xl p-4 flex items-start gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <TrendingUp className="w-5 h-5 text-[#00E5FF] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#CBD5E1]">
              <span className="text-white font-aeonik-ext">{ranked[0]?.name}</span> leads Epoch {epoch} with{" "}
              <span className="text-[#00E5FF] font-mono">{ranked[0]?.score.toLocaleString()} pts</span>.
              {ranked.length > 1 && ` ${ranked[1]?.name} follows in 2nd place.`}
            </p>
            {ranked[0]?.tokenSymbol && (
              <button
                onClick={(e) => handleViewPools(ranked[0].tokenSymbol!, e)}
                className="text-xs text-[#00E5FF] hover:text-[#00E5FF]/80 mt-1 transition-colors"
              >
                &rarr; View {ranked[0].name} Pools
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
