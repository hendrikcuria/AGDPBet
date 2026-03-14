"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, TrendingUp, BarChart3 } from "lucide-react";
import { useAgentData, type AgentMetrics } from "@/hooks/useAgentData";
import { useMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import { useAppState } from "@/lib/appState";
import { AgentHexAvatar } from "./AgentHexAvatar";
import { formatCollateral } from "@/lib/utils";

/* ─── Types ─── */

interface AgentResult {
  kind: "agent";
  agent: AgentMetrics;
}

interface MarketResult {
  kind: "market";
  address: `0x${string}`;
  question: string;
  totalPool: bigint;
  decimals: number;
  symbol: string;
  yesPrice: number;
}

type SearchResult = AgentResult | MarketResult;

/* ─── OmniSearch Component ─── */

interface OmniSearchProps {
  className?: string;
  autoFocus?: boolean;
  onRouteChange?: () => void;
}

export function OmniSearch({ className = "", autoFocus = false, onRouteChange }: OmniSearchProps) {
  const router = useRouter();
  const { ranked } = useAgentData();
  const { data: addresses } = useMarketAddresses();
  const { setAgentFilter, setSearchQuery } = useAppState();

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const marketAddrs = (addresses as `0x${string}`[] | undefined) || [];

  // Filter agents
  const agentResults = useMemo<AgentResult[]>(() => {
    if (input.length < 2) return [];
    const q = input.toLowerCase();
    return ranked
      .filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.tokenSymbol && a.tokenSymbol.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map((agent) => ({ kind: "agent" as const, agent }));
  }, [input, ranked]);

  // Build combined results (agents only for now — markets added via wrapper)
  const results = useMemo<SearchResult[]>(() => {
    return [...agentResults];
  }, [agentResults]);

  const totalCount = results.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = useCallback((result: SearchResult) => {
    setOpen(false);
    setInput("");
    if (result.kind === "agent") {
      setAgentFilter(result.agent.tokenSymbol || result.agent.name);
      router.push(`/?agent=${encodeURIComponent(result.agent.tokenSymbol || result.agent.name)}`);
    } else {
      router.push(`/markets/${result.address}`);
    }
    onRouteChange?.();
  }, [router, setAgentFilter, onRouteChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || totalCount === 0) {
      if (e.key === "Enter" && input.length >= 2) {
        // Fallback: text search on home page
        setSearchQuery(input);
        router.push("/");
        setOpen(false);
        onRouteChange?.();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % totalCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev <= 0 ? totalCount - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < totalCount) {
        navigate(results[activeIdx]);
      } else if (results.length > 0) {
        navigate(results[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && input.length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setActiveIdx(-1);
            setOpen(e.target.value.length >= 2);
          }}
          onFocus={() => {
            if (input.length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search pools, agents..."
          autoFocus={autoFocus}
          className="w-full bg-[#131C2D] border border-[#1E293B] rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#1A56FF]/50 focus:shadow-[0_0_15px_rgba(26,86,255,0.1)] transition-all"
        />
        {input && (
          <button
            onClick={() => { setInput(""); setActiveIdx(-1); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-[60] rounded-xl overflow-hidden"
            style={{
              background: "rgba(11, 15, 25, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(0, 229, 255, 0.12)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(26, 86, 255, 0.08)",
            }}
          >
            {/* Agent results */}
            {agentResults.length > 0 && (
              <div>
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" />
                    Agents
                  </p>
                </div>
                {agentResults.map((r, i) => (
                  <button
                    key={r.agent.id}
                    onClick={() => navigate(r)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      activeIdx === i ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <AgentHexAvatar name={r.agent.name} size={24} src={r.agent.profilePic} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white truncate block">{r.agent.name}</span>
                      {r.agent.tokenSymbol && (
                        <span className="text-[10px] text-[#64748B] font-mono">${r.agent.tokenSymbol}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-[#93B4FF] font-mono">#{r.agent.rank}</span>
                      <p className="text-[10px] text-[#475569] font-mono">{r.agent.score.toLocaleString()} pts</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Market results — inline via MarketRows */}
            <MarketRows
              addresses={marketAddrs}
              query={input}
              startIdx={agentResults.length}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              onNavigate={(addr) => {
                setOpen(false);
                setInput("");
                router.push(`/markets/${addr}`);
                onRouteChange?.();
              }}
            />

            {/* No results */}
            {agentResults.length === 0 && (
              <NoMarketResults
                addresses={marketAddrs}
                query={input}
                onFallback={() => {
                  setSearchQuery(input);
                  setInput("");
                  setOpen(false);
                  router.push("/");
                  onRouteChange?.();
                }}
              />
            )}

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-white/[0.04]">
              <p className="text-[10px] text-[#334155] font-mono">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-[#64748B]">↑↓</kbd> navigate
                {" "}<kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-[#64748B]">↵</kbd> select
                {" "}<kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-[#64748B]">esc</kbd> close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Market Rows (separate component to call hooks per-market) ─── */

function MarketRows({
  addresses,
  query,
  startIdx,
  activeIdx,
  setActiveIdx,
  onNavigate,
}: {
  addresses: `0x${string}`[];
  query: string;
  startIdx: number;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onNavigate: (addr: `0x${string}`) => void;
}) {
  // We render individual rows that each call useMarketData — max 5 shown
  const lowerQ = query.toLowerCase();
  const displayAddrs = addresses.slice(0, 20); // limit hook calls

  return (
    <MarketRowsInner
      addresses={displayAddrs}
      query={lowerQ}
      startIdx={startIdx}
      activeIdx={activeIdx}
      setActiveIdx={setActiveIdx}
      onNavigate={onNavigate}
    />
  );
}

function MarketRowsInner({
  addresses,
  query,
  startIdx,
  activeIdx,
  setActiveIdx,
  onNavigate,
}: {
  addresses: `0x${string}`[];
  query: string;
  startIdx: number;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onNavigate: (addr: `0x${string}`) => void;
}) {
  // Each MarketRowItem handles its own data fetching
  const [matchCount, setMatchCount] = useState(0);

  // Reset match count on query change (render-time pattern)
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setMatchCount(0);
  }

  return (
    <>
      {matchCount > 0 && (
        <div className="px-3 pt-3 pb-1.5 border-t border-white/[0.04]">
          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" />
            Pools
          </p>
        </div>
      )}
      {addresses.map((addr) => (
        <MarketRowItem
          key={addr}
          address={addr}
          query={query}
          startIdx={startIdx}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          onNavigate={onNavigate}
          onMatch={() => {
            setMatchCount((c) => c + 1);
          }}
        />
      ))}
    </>
  );
}

function MarketRowItem({
  address,
  query,
  startIdx,
  activeIdx,
  setActiveIdx,
  onNavigate,
  onMatch,
}: {
  address: `0x${string}`;
  query: string;
  startIdx: number;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onNavigate: (addr: `0x${string}`) => void;
  onMatch: () => void;
}) {
  const { market } = useMarketData(address);
  const [matched, setMatched] = useState(false);

  const isMatch = !!market && market.question.toLowerCase().includes(query);

  // Render-time state update for match detection
  if (isMatch && !matched) {
    setMatched(true);
  }

  // Side effect: notify parent of match
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (matched && !notifiedRef.current) {
      notifiedRef.current = true;
      onMatch();
    }
  }, [matched, onMatch]);

  const itemIdx = matched ? startIdx : -1;

  if (!market) return null;
  if (!isMatch) return null;

  const yesPct = Math.round((Number(market.priceYes) / 1e18) * 100);
  const totalFormatted = formatCollateral(market.totalPool, market.collateralDecimals);
  const isActive = activeIdx === itemIdx;

  return (
    <button
      onClick={() => onNavigate(address)}
      onMouseEnter={() => setActiveIdx(itemIdx)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className="w-6 h-6 rounded-lg bg-[#1A56FF]/10 flex items-center justify-center shrink-0">
        <BarChart3 className="w-3 h-3 text-[#1A56FF]" />
      </div>
      <p className="flex-1 text-sm text-[#CBD5E1] truncate min-w-0">
        {market.question}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${yesPct >= 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {yesPct}%
        </span>
        <span className="text-[10px] text-[#64748B] font-mono">{totalFormatted}</span>
      </div>
    </button>
  );
}

/* ─── No results fallback ─── */

function NoMarketResults({
  query,
}: {
  addresses: `0x${string}`[];
  query: string;
  onFallback: () => void;
}) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-xs text-[#475569]">
        Press <kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-[#64748B] text-[10px]">Enter</kbd> to search all markets for &quot;{query}&quot;
      </p>
    </div>
  );
}
