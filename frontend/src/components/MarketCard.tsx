"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { type DisplayMarket, toDisplayMarket, getVelocityScore, getEstMultiplier, getSparklineData, isSparklineRising } from "@/lib/displayMarket";
import { formatUSDCNum } from "@/lib/utils";
import MarketTypeBadge from "./MarketTypeBadge";
import CountdownTimer from "./CountdownTimer";
import { VelocityGlow } from "./VelocityGlow";
import { TugOfWarBar } from "./TugOfWarBar";
import { MicroSparkline } from "./motion/MicroSparkline";
import { useAppState } from "@/lib/appState";
import { useAgentData, type AgentMetrics } from "@/hooks/useAgentData";
import type { MarketData } from "@/hooks/useMarkets";
import { AgentHexAvatar } from "./AgentHexAvatar";

interface MarketCardProps {
  market: MarketData | DisplayMarket;
}

function isDisplayMarket(m: MarketData | DisplayMarket): m is DisplayMarket {
  return "outcomes" in m && "status" in m;
}

export default function MarketCard({ market: rawOrDisplay }: MarketCardProps) {
  const { agents } = useAgentData();
  const market = useMemo(
    () => isDisplayMarket(rawOrDisplay) ? rawOrDisplay : toDisplayMarket(rawOrDisplay, agents),
    [rawOrDisplay, agents]
  );
  const { openDepositModal } = useAppState();
  const velocityScore = getVelocityScore(market);
  const isResolved = market.status === "resolved" || market.status === "resolved-invalid";
  const isSniping = market.status === "sniping";

  // Resolve agent profiles for this market
  const agentProfiles = useMemo(() => {
    return market.agentNames
      .map((name) => {
        for (const [, a] of agents) {
          if (a.name.toLowerCase() === name.toLowerCase()) return a;
        }
        return undefined;
      })
      .filter((a): a is AgentMetrics => !!a);
  }, [market.agentNames, agents]);

  const isHeadToHead = market.type === "head-to-head" && agentProfiles.length >= 2;

  // For head-to-head, use agent brand colors; otherwise standard green/red
  const yesAgent = isHeadToHead ? agentProfiles[0] : undefined;
  const noAgent = isHeadToHead ? agentProfiles[1] : undefined;

  let borderClass = "border-[#1E293B] hover:border-[#1A56FF]/30";
  if (isSniping) borderClass = "border-red-500/30 hover:border-red-500/50";
  else if (isResolved && market.winningOutcomeId === "yes") borderClass = "border-emerald-500/20";
  else if (isResolved && market.winningOutcomeId === "no") borderClass = "border-rose-500/20";

  const handleOutcomeClick = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.preventDefault();
    e.stopPropagation();
    openDepositModal(market.raw, side);
  };

  const yesMultiplier = getEstMultiplier(market, "yes");
  const noMultiplier = getEstMultiplier(market, "no");
  const yesSparkline = getSparklineData(market, "yes");
  const noSparkline = getSparklineData(market, "no");

  // Labels for outcome buttons
  const yesLabel = isHeadToHead && yesAgent?.tokenSymbol ? `$${yesAgent.tokenSymbol}` : "YES";
  const noLabel = isHeadToHead && noAgent?.tokenSymbol ? `$${noAgent.tokenSymbol}` : "NO";

  return (
    <Link href={`/markets/${market.address}`}>
      <motion.article
        className={`relative bg-[#131C2D] border ${borderClass} rounded-xl p-4 cursor-pointer transition-all duration-200 group overflow-hidden agdp-glow-card`}
        whileHover={{
          scale: 1.02,
          boxShadow: "0 0 0 1px rgba(26, 86, 255, 0.4), 0 0 35px rgba(26, 86, 255, 0.18)",
          y: -4,
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <VelocityGlow velocityScore={velocityScore} />

        {/* Top Row: Badge + Timer */}
        <div className="flex items-center justify-between mb-2.5 relative z-[1]">
          <MarketTypeBadge type={market.raw.marketType} />
          {isSniping ? (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
              Final Hour
            </span>
          ) : isResolved ? (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              market.winningOutcomeId === "yes" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              Resolved: {market.winningOutcomeId === "yes" ? "YES" : "NO"}
            </span>
          ) : (
            <CountdownTimer targetTimestamp={Math.floor(market.endTime / 1000)} compact showIcon={false} />
          )}
        </div>

        {/* Agent Ticker Pills (when agents detected) */}
        {agentProfiles.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 relative z-[1]">
            {agentProfiles.map((agent) => (
              <span
                key={agent.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#1A56FF]/10 text-[#93B4FF] border border-[#1A56FF]/20"
              >
                <AgentHexAvatar name={agent.name} size={12} src={agent.profilePic} />
                {agent.tokenSymbol ? `$${agent.tokenSymbol}` : agent.name}
              </span>
            ))}
          </div>
        )}

        {/* Question */}
        <p className="text-sm text-[#CBD5E1] group-hover:text-white transition-colors mb-3 line-clamp-2 min-h-[2.5rem] relative z-[1]">
          {market.question}
        </p>

        {/* Tug of war for head-to-head markets */}
        {market.type === "head-to-head" && (
          <div className="mb-3 relative z-[1]">
            <TugOfWarBar
              outcomes={isHeadToHead ? [
                { ...market.outcomes[0], label: yesLabel },
                { ...market.outcomes[1], label: noLabel },
              ] : market.outcomes}
              totalPool={market.totalPool}
              height={28}
            />
          </div>
        )}

        {/* Pool + Fee */}
        <div className="flex items-center justify-between mb-3 relative z-[1]">
          <div>
            <p className="text-[10px] text-[#475569] uppercase tracking-wider">Total Pool</p>
            <span className="text-lg text-white font-mono">{formatUSDCNum(market.totalPool)}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#475569] uppercase tracking-wider">Fee</p>
            <span className="text-xs text-[#64748B] font-mono">{market.protocolFeePct}%</span>
          </div>
        </div>

        {/* Outcome buttons with sparklines and multipliers */}
        <div className={`flex w-full gap-2 relative z-[1] ${isResolved ? "opacity-40 pointer-events-none" : ""}`}>
          <button
            onClick={(e) => handleOutcomeClick(e, "YES")}
            className="flex-1 min-w-0 py-2.5 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 overflow-hidden"
          >
            {isHeadToHead && yesAgent && <AgentHexAvatar name={yesAgent.name} size={14} src={yesAgent.profilePic} />}
            <span className="truncate min-w-0 flex-1">{yesLabel}</span>
            <MicroSparkline data={yesSparkline} rising={isSparklineRising(yesSparkline)} isHovered={false} width={28} height={12} />
            <span className="text-[10px] text-emerald-500/60 font-mono shrink-0">{yesMultiplier.toFixed(2)}x</span>
          </button>
          <button
            onClick={(e) => handleOutcomeClick(e, "NO")}
            className="flex-1 min-w-0 py-2.5 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 overflow-hidden"
          >
            {isHeadToHead && noAgent && <AgentHexAvatar name={noAgent.name} size={14} src={noAgent.profilePic} />}
            <span className="truncate min-w-0 flex-1">{noLabel}</span>
            <MicroSparkline data={noSparkline} rising={!isSparklineRising(noSparkline)} isHovered={false} width={28} height={12} />
            <span className="text-[10px] text-rose-500/60 font-mono shrink-0">{noMultiplier.toFixed(2)}x</span>
          </button>
        </div>
      </motion.article>
    </Link>
  );
}
