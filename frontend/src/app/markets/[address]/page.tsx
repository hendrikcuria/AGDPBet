"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Copy, Check, Share2, Bookmark, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
const PoolHistoryChart = dynamic(() => import("@/components/PoolHistoryChart"), { ssr: false });
import { useMarketData } from "@/hooks/useMarkets";
import { useMarketHistory } from "@/hooks/useMarketHistory";
import { useAppState } from "@/lib/appState";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { MARKET_ABI } from "@/lib/contracts";
import { formatCollateral, shortenAddress, calcPayoutMultiplier, formatMultiplier } from "@/lib/utils";
import MarketTypeBadge from "@/components/MarketTypeBadge";
import CountdownTimer from "@/components/CountdownTimer";
import StatCard from "@/components/StatCard";
import TradePanel from "@/components/TradePanel";
import { MarketActivity } from "@/components/MarketActivity";
import { SafeChartContainer } from "@/components/SafeChartContainer";
import { UrgencyBanner } from "@/components/UrgencyBanner";
import { PoolDistributionBar } from "@/components/PoolDistributionBar";

const timeframes = ["1H", "6H", "1D", "1W", "ALL"];

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as `0x${string}`;
  const { market, isLoading, refetch } = useMarketData(address);
  const { data: historyData, events: marketEvents, overview: marketOverview, isLoading: historyLoading, refetch: refetchHistory } = useMarketHistory(address);
  const { bookmarkedMarkets, toggleBookmark, addToast } = useAppState();

  // Read on-chain lock period (defaults to 7200 = 2h in contract)
  const { data: lockPeriod } = useReadContract({
    address,
    abi: MARKET_ABI,
    functionName: "bettingLockPeriod",
  });

  const [activeTimeframe, setActiveTimeframe] = useState("ALL");
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-white/5 rounded w-2/3" />
        <div className="h-48 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-16">
        <p className="text-[#64748B]">Market not found.</p>
        <button onClick={() => router.push("/")} className="text-[#00E5FF] hover:text-[#00E5FF]/80 text-sm mt-2">
          Back to Markets
        </button>
      </div>
    );
  }

  const isBookmarked = bookmarkedMarkets.has(market.address);
  const decimals = market.collateralDecimals;
  const symbol = market.collateralSymbol;
  const yesMultiplier = calcPayoutMultiplier(market.poolYes, market.totalPool);
  const noMultiplier = calcPayoutMultiplier(market.poolNo, market.totalPool);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/markets/${address}`;
    navigator.clipboard.writeText(url);
    addToast("Market link copied!", "success");
  };

  const handleBookmark = () => {
    toggleBookmark(market.address);
    addToast(isBookmarked ? "Bookmark removed" : "Market bookmarked!", "info");
  };

  // Timeframe filter mapping (seconds)
  const timeframeSeconds: Record<string, number> = {
    "1H": 3600,
    "6H": 21600,
    "1D": 86400,
    "1W": 604800,
  };

  // Filter history by active timeframe, then format for chart
  const filteredHistory = activeTimeframe === "ALL"
    ? historyData
    : (() => {
        const cutoff = Date.now() / 1000 - (timeframeSeconds[activeTimeframe] ?? Infinity);
        return historyData.filter((snap) => snap.timestamp >= cutoff);
      })();

  const chartData = filteredHistory.map((snap) => ({
    timestamp: snap.timestamp,
    poolYes: snap.poolYes,
    poolNo: snap.poolNo,
    total: snap.totalPool,
  }));

  return (
    <div>
      {/* Urgency Banner — counts down to betting lock, not resolution */}
      {!market.resolved && (
        <UrgencyBanner endTime={(market.resolutionTime - Number(lockPeriod ?? 7200n)) * 1000} />
      )}

      {/* Back Link */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="p-2 text-[#64748B] hover:text-white rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={handleBookmark} className={`p-2 rounded-lg transition-colors ${isBookmarked ? "text-amber-400" : "text-[#64748B] hover:text-white"}`}>
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Market Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <MarketTypeBadge type={market.marketType} showIcon />
          {!market.resolved && <CountdownTimer targetTimestamp={market.resolutionTime} />}
          {market.resolved && (
            <span className="text-xs px-3 py-1 rounded-full font-mono" style={{
              background: market.outcome === 1 ? "rgba(16,185,129,0.1)" : market.outcome === 2 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${market.outcome === 1 ? "rgba(16,185,129,0.3)" : market.outcome === 2 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
              color: market.outcome === 1 ? "#10B981" : market.outcome === 2 ? "#EF4444" : "#F59E0B",
            }}>
              RESOLVED
            </span>
          )}
        </div>
        <h1 className="text-white text-2xl sm:text-3xl font-aeonik-ext tracking-tight mb-2">{market.question}</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#475569] font-mono">{shortenAddress(address)}</span>
          <button onClick={handleCopy} className="text-[#475569] hover:text-[#94A3B8] transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Pool Distribution Bar */}
      {!market.resolved && (
        <div className="mb-6">
          <PoolDistributionBar yesPool={parseFloat(formatUnits(market.poolYes, decimals))} noPool={parseFloat(formatUnits(market.poolNo, decimals))} />
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Pool History Chart */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-sm font-aeonik-ext flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00E5FF]" />
                Pool History
              </h3>
              <div className="flex gap-1">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className="px-2.5 py-1 rounded text-xs transition-colors relative"
                    style={{ color: activeTimeframe === tf ? "#fff" : "#64748B" }}
                  >
                    {tf}
                    {activeTimeframe === tf && (
                      <motion.div
                        className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full"
                        style={{ background: "#00E5FF" }}
                        layoutId="chart-timeframe"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="h-[240px] sm:h-[280px] flex items-center justify-center">
                <div className="animate-pulse text-[#334155] text-sm font-mono">Loading chart data...</div>
              </div>
            ) : chartData.length < 2 ? (
              <div className="h-[240px] sm:h-[280px] flex items-center justify-center">
                <p className="text-[#475569] text-sm">Not enough data for chart yet</p>
              </div>
            ) : (
              <SafeChartContainer className="h-[240px] sm:h-[280px]">
                {(width, height) => (
                  <PoolHistoryChart data={chartData} width={width} height={height} />
                )}
              </SafeChartContainer>
            )}
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Pool" value={`${formatCollateral(market.totalPool, decimals)} ${symbol}`} />
            <StatCard label="YES Pool" value={`${formatCollateral(market.poolYes, decimals)} ${symbol}`} />
            <StatCard label="NO Pool" value={`${formatCollateral(market.poolNo, decimals)} ${symbol}`} />
            <StatCard label="YES Multi" value={formatMultiplier(yesMultiplier)} />
            <StatCard label="NO Multi" value={formatMultiplier(noMultiplier)} />
          </div>

          {/* Betting Overview + Transaction History */}
          <MarketActivity events={marketEvents} overview={marketOverview} isLoading={historyLoading} />
        </div>

        {/* Right Column - Trade Panel (sticky) */}
        <div className="lg:sticky lg:top-20">
          <TradePanel market={market} onTradeComplete={() => { refetch(); refetchHistory(); }} />
        </div>
      </div>
    </div>
  );
}
