"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useReadContracts } from "wagmi";
import { useMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import { MARKET_ABI } from "@/lib/contracts";
import { useEpochInfo } from "@/hooks/useLeaderboard";
import { useAppState } from "@/lib/appState";
import MarketCard from "@/components/MarketCard";
import dynamic from "next/dynamic";
const HeroMarket = dynamic(() => import("@/components/HeroMarket"), { ssr: false });
import { BreakingNews, HotTopics, TopicPills } from "@/components/Sidebar";
import { Search, SlidersHorizontal, Bookmark, Sparkles, X } from "lucide-react";
import { Suspense } from "react";

type FilterType = "all" | 0 | 1 | 2 | 3;

const filterTabs: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: 0, label: "Epoch Winners" },
  { value: 1, label: "Top 10" },
  { value: 2, label: "Head-to-Head" },
  { value: 3, label: "Long Tail" },
];

function getNavCategoryFilter(cat: string): { type?: number; special?: string } {
  switch (cat) {
    case "Epoch Winners": return { type: 0 };
    case "Top 10": return { type: 1 };
    case "Head-to-Head": return { type: 2 };
    case "Long Tail": return { type: 3 };
    case "Resolved": return { special: "resolved" };
    case "High Volume": return { special: "highVolume" };
    case "Ending Soon": return { special: "endingSoon" };
    case "New": return { special: "new" };
    default: return {};
  }
}

export default function Home() {
  return (
    <Suspense fallback={<div className="animate-pulse h-48" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { data: addresses, isLoading: loadingAddresses } = useMarketAddresses();
  const { data: epoch } = useEpochInfo();
  const { searchQuery, navCategory, agentFilter, setAgentFilter, bookmarkedMarkets } = useAppState();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");

  // Sync ?agent= URL param → appState on mount
  useEffect(() => {
    const urlAgent = searchParams.get("agent");
    if (urlAgent && urlAgent !== agentFilter) {
      setAgentFilter(urlAgent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setAgentFilter]);

  const marketAddrs = (addresses as `0x${string}`[] | undefined) || [];

  // Read totalPool for all markets to find highest TVL for hero
  const poolContracts = marketAddrs.map((addr) => ({
    address: addr,
    abi: MARKET_ABI,
    functionName: "totalPool" as const,
  }));
  const { data: poolData } = useReadContracts({
    contracts: poolContracts,
    query: { enabled: marketAddrs.length > 0, refetchInterval: 15_000 },
  });

  // Determine hero address (highest TVL) and remaining addresses
  const { heroAddr, gridAddrs } = (() => {
    if (marketAddrs.length === 0) return { heroAddr: undefined, gridAddrs: [] as `0x${string}`[] };
    if (!poolData) return { heroAddr: marketAddrs[0], gridAddrs: marketAddrs.slice(1) };

    let maxIdx = 0;
    let maxPool = 0n;
    for (let i = 0; i < marketAddrs.length; i++) {
      const pool = (poolData[i]?.result as bigint) ?? 0n;
      if (pool > maxPool) {
        maxPool = pool;
        maxIdx = i;
      }
    }
    const hero = marketAddrs[maxIdx];
    const rest = marketAddrs.filter((_, i) => i !== maxIdx);
    return { heroAddr: hero, gridAddrs: rest };
  })();

  return (
    <div>
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8">
        {heroAddr ? (
          <HeroMarketWrapper address={heroAddr} />
        ) : (
          <div className="rounded-2xl p-8 flex items-center justify-center min-h-[300px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {loadingAddresses ? (
              <div className="animate-pulse space-y-4 w-full">
                <div className="h-6 bg-white/5 rounded w-2/3" />
                <div className="h-[200px] bg-white/5 rounded-xl" />
              </div>
            ) : (
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
                <p className="text-[#94A3B8] text-lg mb-2 font-aeonik-ext">No markets yet</p>
                <p className="text-[#475569] text-sm">Markets will appear here once deployed.</p>
              </div>
            )}
          </div>
        )}
        <div className="space-y-5 hidden lg:block">
          <BreakingNews />
          <HotTopics />
        </div>
      </section>

      {/* ═══════════ TOPIC PILLS ═══════════ */}
      <section className="mb-8 flex items-center justify-center">
        <TopicPills />
      </section>

      {/* ═══════════ MOBILE SIDEBAR ═══════════ */}
      <section className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <BreakingNews />
        <HotTopics />
      </section>

      {/* ═══════════ ACTIVE FILTERS ═══════════ */}
      {(searchQuery || agentFilter || navCategory !== "Trending") && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wider">Filters:</span>
          {searchQuery && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(26,86,255,0.1)", border: "1px solid rgba(26,86,255,0.2)", color: "#93B4FF" }}>
              &quot;{searchQuery}&quot;
            </span>
          )}
          {agentFilter && (
            <button
              onClick={() => setAgentFilter(null)}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full hover:bg-[#1A56FF]/20 transition-colors"
              style={{ background: "rgba(26,86,255,0.1)", border: "1px solid rgba(26,86,255,0.2)", color: "#93B4FF" }}
            >
              Agent: ${agentFilter}
              <X className="w-3 h-3" />
            </button>
          )}
          {navCategory !== "Trending" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(26,86,255,0.1)", border: "1px solid rgba(26,86,255,0.2)", color: "#93B4FF" }}>
              {navCategory}
            </span>
          )}
        </div>
      )}

      {/* ═══════════ ALL MARKETS ═══════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-aeonik-ext tracking-tight">All Markets</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInlineSearch(!showInlineSearch)}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: showInlineSearch ? "rgba(26,86,255,0.1)" : "transparent",
                color: showInlineSearch ? "#93B4FF" : "#64748B",
              }}
            >
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 text-[#64748B] rounded-lg hover:text-white transition-colors">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: showBookmarkedOnly ? "#FBBF24" : "#64748B" }}
            >
              <Bookmark className={`w-4 h-4 ${showBookmarkedOnly ? "fill-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {showInlineSearch && (
          <motion.div className="mb-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <input
              type="text"
              value={inlineSearch}
              onChange={(e) => setInlineSearch(e.target.value)}
              placeholder="Filter markets..."
              autoFocus
              className="w-full sm:max-w-sm rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-[#334155] focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {filterTabs.map((tab) => {
            const isActive = filter === tab.value;
            return (
              <button
                key={String(tab.value)}
                onClick={() => setFilter(tab.value)}
                className="relative px-4 py-2.5 text-xs whitespace-nowrap transition-colors"
                style={{ color: isActive ? "#fff" : "#64748B" }}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, #00E5FF, #D4FF00)" }}
                    layoutId="home-filter-tab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
          <span className="flex-1" />
          <span className="text-[10px] text-[#334155] px-2 shrink-0 font-mono">
            {epoch ? `Epoch ${epoch.epochNumber}` : ""} · {marketAddrs.length} markets
          </span>
        </div>

        {/* Cards */}
        {loadingAddresses ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl p-4 h-[200px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-4 bg-white/5 rounded w-2/3 mb-2" />
                <div className="h-4 bg-white/5 rounded w-1/2 mb-6" />
                <div className="flex gap-2"><div className="h-8 bg-white/5 rounded flex-1" /><div className="h-8 bg-white/5 rounded flex-1" /></div>
              </div>
            ))}
          </div>
        ) : marketAddrs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#64748B] text-sm">No markets available yet.</p>
            <p className="text-[#475569] text-xs mt-1">Markets will appear once deployed on-chain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {gridAddrs.map((addr) => (
              <MarketCardWrapper
                key={addr}
                address={addr}
                filter={filter}
                searchQuery={searchQuery || inlineSearch}
                navCategory={navCategory}
                agentFilter={agentFilter}
                showBookmarkedOnly={showBookmarkedOnly}
                bookmarkedMarkets={bookmarkedMarkets}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroMarketWrapper({ address }: { address: `0x${string}` }) {
  const { market, isLoading } = useMarketData(address);
  if (isLoading || !market) {
    return (
      <div className="animate-pulse rounded-2xl p-6 min-h-[400px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
        <div className="h-6 bg-white/5 rounded w-2/3 mb-4" />
        <div className="h-[200px] bg-white/5 rounded-xl" />
      </div>
    );
  }
  return <HeroMarket market={market} />;
}

function MarketCardWrapper({
  address, filter, searchQuery, navCategory, agentFilter, showBookmarkedOnly, bookmarkedMarkets,
}: {
  address: `0x${string}`; filter: FilterType; searchQuery: string; navCategory: string;
  agentFilter: string | null; showBookmarkedOnly: boolean; bookmarkedMarkets: Set<string>;
}) {
  const { market } = useMarketData(address);
  if (!market) return null;

  const query = searchQuery.toLowerCase().trim();
  if (query && !market.question.toLowerCase().includes(query)) return null;
  if (filter !== "all" && market.marketType !== filter) return null;

  const navFilter = getNavCategoryFilter(navCategory);
  if (navFilter.type !== undefined && market.marketType !== navFilter.type) return null;
  if (navFilter.special === "resolved" && !market.resolved) return null;
  if (navFilter.special === "endingSoon") {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = market.resolutionTime - now;
    // Strictly <= 4 hours and not already past resolution
    if (timeLeft > 14400 || timeLeft < 0) return null;
  }
  if (navFilter.special === "highVolume") {
    // Filter out zero-pool markets; sorting happens in parent grid
    if (market.totalPool === 0n) return null;
  }
  if (navFilter.special === "new") {
    // Show all non-resolved markets (newest are at end of factory array, reversed below)
    if (market.resolved) return null;
  }
  if (showBookmarkedOnly && !bookmarkedMarkets.has(market.address)) return null;

  // Agent filter: match question text for agent name or ticker symbol
  if (agentFilter) {
    const lowerQ = market.question.toLowerCase();
    const lowerFilter = agentFilter.toLowerCase();
    if (!lowerQ.includes(lowerFilter) && !lowerQ.includes(`$${lowerFilter}`)) return null;
  }

  return <MarketCard market={market} />;
}
