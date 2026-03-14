"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ArrowDownLeft, Users, TrendingUp, Award, BarChart3 } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import type { MarketEvent, MarketOverview } from "@/hooks/useMarketHistory";

/* ─── Overview Cards ─── */

function OverviewCards({ overview }: { overview: MarketOverview }) {
  const totalVolume = overview.totalVolumeYes + overview.totalVolumeNo;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div className="bg-[#0B0F19]/60 rounded-xl px-3 py-2.5 border border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-1">
          <BarChart3 className="w-3 h-3 text-[#1A56FF]" />
          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">Total Volume</p>
        </div>
        <p className="text-sm text-white font-mono">${totalVolume.toLocaleString()}</p>
      </div>
      <div className="bg-[#0B0F19]/60 rounded-xl px-3 py-2.5 border border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3 h-3 text-[#10B981]" />
          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">Total Bets</p>
        </div>
        <p className="text-sm text-white font-mono">{overview.totalBets}</p>
      </div>
      <div className="bg-[#0B0F19]/60 rounded-xl px-3 py-2.5 border border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="w-3 h-3 text-[#00E5FF]" />
          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">Unique Bettors</p>
        </div>
        <p className="text-sm text-white font-mono">{overview.uniqueBettors}</p>
      </div>
      <div className="bg-[#0B0F19]/60 rounded-xl px-3 py-2.5 border border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-1">
          <Award className="w-3 h-3 text-[#D4FF00]" />
          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">Largest Bet</p>
        </div>
        <p className="text-sm text-white font-mono">${overview.largestBet.toLocaleString()}</p>
        {overview.largestBettor && (
          <p className="text-[9px] text-[#475569] font-mono">{shortenAddress(overview.largestBettor)}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Time Formatter ─── */

function formatEventTime(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ─── Single Event Row ─── */

function EventRow({ event, index }: { event: MarketEvent; index: number }) {
  const isBet = event.type === "bet";
  const outcomeLabel = event.outcomeIndex === 0 ? "YES" : "NO";
  const outcomeColor = event.outcomeIndex === 0 ? "#10B981" : "#EF4444";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors"
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: isBet ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}
      >
        {isBet ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-[#10B981]" />
        ) : (
          <ArrowDownLeft className="w-3.5 h-3.5 text-[#EF4444]" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#1A56FF] font-mono">{shortenAddress(event.bettor)}</span>
          <span className="text-[10px] text-[#475569]">{isBet ? "bet" : "withdrew"}</span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: `${outcomeColor}15`, color: outcomeColor }}
          >
            {outcomeLabel}
          </span>
        </div>
      </div>

      {/* Amount + Time */}
      <div className="text-right shrink-0">
        <p className={`text-xs font-mono ${isBet ? "text-[#10B981]" : "text-[#EF4444]"}`}>
          {isBet ? "+" : "-"}${event.amount.toLocaleString()}
        </p>
        <p className="text-[9px] text-[#475569] font-mono">{formatEventTime(event.timestamp)}</p>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */

const PAGE_SIZE = 10;

export function MarketActivity({
  events,
  overview,
  isLoading,
}: {
  events: MarketEvent[];
  overview: MarketOverview;
  isLoading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayEvents = showAll ? events : events.slice(0, PAGE_SIZE);
  const hasMore = events.length > PAGE_SIZE;

  if (isLoading) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/5 rounded w-1/3" />
          <div className="h-20 bg-white/5 rounded" />
          <div className="h-8 bg-white/5 rounded" />
          <div className="h-8 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-white text-sm font-aeonik-ext flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#00E5FF]" />
          Betting Overview
        </h3>
      </div>

      {/* Overview Stats */}
      <div className="px-4">
        <OverviewCards overview={overview} />
      </div>

      {/* Transaction Ledger */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">
            Transaction History
          </p>
          <p className="text-[10px] text-[#475569] font-mono">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="px-4 pb-5 text-center">
          <p className="text-xs text-[#475569]">No transactions yet</p>
        </div>
      ) : (
        <>
          <div className="max-h-[400px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {displayEvents.map((evt, i) => (
                <EventRow key={`${evt.txHash}-${evt.type}`} event={evt} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Show More / Less */}
          {hasMore && (
            <div className="px-4 py-3 border-t border-white/[0.04]">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-xs text-[#1A56FF] hover:text-[#00E5FF] font-mono transition-colors"
              >
                {showAll ? "Show less" : `Show all ${events.length} transactions`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
