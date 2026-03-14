"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Bookmark, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { MarketData } from "@/hooks/useMarkets";
import MarketTypeBadge from "./MarketTypeBadge";
import CountdownTimer from "./CountdownTimer";
import { SafeChartContainer } from "./SafeChartContainer";
import { useAppState } from "@/lib/appState";
import { useAgentData, type AgentMetrics } from "@/hooks/useAgentData";
import { formatCollateral } from "@/lib/utils";
import { formatUnits } from "viem";
import { AgentHexAvatar } from "./AgentHexAvatar";

export default function HeroMarket({ market }: { market: MarketData }) {
  const { openDepositModal, bookmarkedMarkets, toggleBookmark, addToast } = useAppState();
  const { agents } = useAgentData();
  const isBookmarked = bookmarkedMarkets.has(market.address);

  // Resolve agent profiles from question text (word-boundary, capped by market type)
  const agentProfiles = useMemo(() => {
    const maxAgents = market.marketType === 2 ? 2 : 1; // H2H = 2, others = 1
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sorted = [...agents.values()].sort((a, b) => b.name.length - a.name.length);
    const found: AgentMetrics[] = [];
    for (const agent of sorted) {
      if (found.length >= maxAgents) break;
      if (new RegExp(`\\b${escape(agent.name)}\\b`, "i").test(market.question)) {
        found.push(agent);
      } else if (agent.tokenSymbol && new RegExp(`\\b${escape(agent.tokenSymbol)}\\b`, "i").test(market.question)) {
        found.push(agent);
      }
    }
    return found;
  }, [market.question, market.marketType, agents]);

  const isHeadToHead = market.marketType === 2 && agentProfiles.length >= 2;
  const yesAgent = isHeadToHead ? agentProfiles[0] : undefined;
  const noAgent = isHeadToHead ? agentProfiles[1] : undefined;

  const decimals = market.collateralDecimals;
  const symbol = market.collateralSymbol;
  const poolYesNum = parseFloat(formatUnits(market.poolYes, decimals));
  const poolNoNum = parseFloat(formatUnits(market.poolNo, decimals));
  const totalPoolNum = parseFloat(formatUnits(market.totalPool, decimals));
  const totalPoolFormatted = formatCollateral(market.totalPool, decimals);
  const feePct = (Number(market.redemptionFeeBps) / 100).toFixed(0);

  // Donut chart data
  const donutData = [
    { name: "YES", value: poolYesNum || 0.5, color: "#10B981" },
    { name: "NO", value: poolNoNum || 0.5, color: "#EF4444" },
  ];

  // Multipliers
  const yesMult = totalPoolNum > 0 && poolYesNum > 0 ? (totalPoolNum / poolYesNum) : 0;
  const noMult = totalPoolNum > 0 && poolNoNum > 0 ? (totalPoolNum / poolNoNum) : 0;
  const yesPct = totalPoolNum > 0 ? ((poolYesNum / totalPoolNum) * 100).toFixed(0) : "50";
  const noPct = totalPoolNum > 0 ? ((poolNoNum / totalPoolNum) * 100).toFixed(0) : "50";

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/markets/${market.address}`;
    navigator.clipboard.writeText(url);
    addToast("Market link copied to clipboard!", "success");
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(market.address);
    addToast(isBookmarked ? "Bookmark removed" : "Market bookmarked!", "info");
  };

  return (
    <Link href={`/markets/${market.address}`}>
      <motion.div
        className="bg-[#131C2D] rounded-2xl overflow-hidden cursor-pointer agdp-glow-card"
        whileHover={{
          boxShadow: "0 0 0 1px rgba(26, 86, 255, 0.4), 0 0 40px rgba(26, 86, 255, 0.2)",
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <MarketTypeBadge type={market.marketType} showIcon />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="p-1.5 text-[#64748B] hover:text-white transition-colors rounded-lg hover:bg-white/5">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={handleBookmark} className={`p-1.5 transition-colors rounded-lg hover:bg-white/5 ${isBookmarked ? "text-amber-400" : "text-[#64748B] hover:text-white"}`}>
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-400" : ""}`} />
              </button>
            </div>
          </div>

          <h2 className="text-white text-lg sm:text-xl mb-3">{market.question}</h2>

          {/* Agent ticker pills */}
          {agentProfiles.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              {agentProfiles.map((agent) => (
                <span
                  key={agent.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-[#1A56FF]/10 text-[#93B4FF] border border-[#1A56FF]/20"
                >
                  <AgentHexAvatar name={agent.name} size={16} src={agent.profilePic} />
                  {agent.tokenSymbol ? `$${agent.tokenSymbol}` : agent.name}
                  <span className="text-[10px] text-[#475569]">#{agent.rank}</span>
                </span>
              ))}
            </div>
          )}

          {/* Total Pool Hero Stat */}
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-[#0B0F19] rounded-xl px-5 py-3">
              <p className="text-[10px] tracking-widest text-[#475569] uppercase">Total Pool</p>
              <p className="text-2xl sm:text-3xl text-white font-mono">{totalPoolFormatted} {symbol}</p>
            </div>
            <div className="bg-[#0B0F19] rounded-xl px-4 py-3">
              <p className="text-[10px] tracking-widest text-[#475569] uppercase">Protocol Fee</p>
              <p className="text-lg text-[#64748B] font-mono">{feePct}%</p>
            </div>
          </div>

          {/* Donut Chart + Outcome Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-5 mb-5">
            {/* Donut */}
            <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] shrink-0 relative">
              <SafeChartContainer className="h-full">
                {(w, h) => (
                  <PieChart width={w} height={h}>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#131C2D",
                        border: "1px solid #1E293B",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        boxShadow: "0 0 20px rgba(26, 86, 255, 0.1)",
                      }}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Deposits"]}
                    />
                  </PieChart>
                )}
              </SafeChartContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-[#475569] uppercase">Pool</p>
                <p className="text-sm text-white font-mono">{totalPoolFormatted}</p>
              </div>
            </div>

            {/* Outcome Deposit Buttons */}
            <div className="flex-1 w-full space-y-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              {/* YES button */}
              <button
                onClick={() => openDepositModal(market, "YES")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F19] border border-transparent hover:bg-white/5 hover:border-[#1A56FF]/30 hover:shadow-[0_0_12px_rgba(26,86,255,0.15)] transition-all group/btn cursor-pointer"
              >
                {yesAgent ? (
                  <AgentHexAvatar name={yesAgent.name} size={20} src={yesAgent.profilePic} />
                ) : (
                  <span className="w-3 h-3 rounded-full shrink-0 bg-[#10B981]" />
                )}
                <span className="text-sm text-[#CBD5E1] group-hover/btn:text-white transition-colors flex-1 text-left truncate">
                  {isHeadToHead && yesAgent?.tokenSymbol ? `$${yesAgent.tokenSymbol}` : "YES"}
                </span>
                <span className="text-xs text-[#64748B] font-mono shrink-0">{yesPct}%</span>
                <span className="text-sm text-[#1A56FF] font-mono shrink-0">{yesMult.toFixed(2)}x</span>
              </button>
              {/* NO button */}
              <button
                onClick={() => openDepositModal(market, "NO")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F19] border border-transparent hover:bg-white/5 hover:border-[#1A56FF]/30 hover:shadow-[0_0_12px_rgba(26,86,255,0.15)] transition-all group/btn cursor-pointer"
              >
                {noAgent ? (
                  <AgentHexAvatar name={noAgent.name} size={20} src={noAgent.profilePic} />
                ) : (
                  <span className="w-3 h-3 rounded-full shrink-0 bg-[#EF4444]" />
                )}
                <span className="text-sm text-[#CBD5E1] group-hover/btn:text-white transition-colors flex-1 text-left truncate">
                  {isHeadToHead && noAgent?.tokenSymbol ? `$${noAgent.tokenSymbol}` : "NO"}
                </span>
                <span className="text-xs text-[#64748B] font-mono shrink-0">{noPct}%</span>
                <span className="text-sm text-[#1A56FF] font-mono shrink-0">{noMult.toFixed(2)}x</span>
              </button>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-mono">{totalPoolFormatted} {symbol} Vol</span>
            <CountdownTimer targetTimestamp={market.resolutionTime} compact />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
