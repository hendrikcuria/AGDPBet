"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import MarketCard from "@/components/MarketCard";
import { MARKET_TYPE_LABELS } from "@/lib/utils";
import { LayoutGrid, X } from "lucide-react";

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-48" />}>
      <MarketsContent />
    </Suspense>
  );
}

function MarketsContent() {
  const { data: addresses, isLoading } = useMarketAddresses();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<number | null>(null);

  const agentParam = searchParams.get("agent");

  const clearAgentFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("agent");
    const qs = params.toString();
    router.replace(qs ? `/markets?${qs}` : "/markets");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-aeonik-ext text-white tracking-tight">Markets</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-aeonik-ext text-white tracking-tight">Markets</h1>
        <div className="text-center py-16">
          <LayoutGrid className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
          <p className="text-[#94A3B8] text-lg">No markets yet.</p>
          <p className="text-[#475569] text-sm mt-2">Deploy contracts and create markets to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-aeonik-ext text-white tracking-tight">Markets</h1>
        <span className="text-xs text-[#64748B] font-mono">{addresses.length} total</span>
      </div>

      {/* Active agent filter pill */}
      {agentParam && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wider">Showing markets for:</span>
          <button
            onClick={clearAgentFilter}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono hover:bg-[#1A56FF]/20 transition-colors"
            style={{ background: "rgba(26,86,255,0.1)", border: "1px solid rgba(26,86,255,0.3)", color: "#93B4FF" }}
          >
            ${agentParam}
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill label="All" active={filter === null} onClick={() => setFilter(null)} />
        {Object.entries(MARKET_TYPE_LABELS).map(([key, label]) => (
          <FilterPill key={key} label={label} active={filter === Number(key)} onClick={() => setFilter(Number(key))} />
        ))}
      </div>

      {/* Market grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addresses.map((addr) => (
          <MarketCardWrapper key={addr} address={addr as `0x${string}`} filter={filter} agentFilter={agentParam} />
        ))}
      </div>
    </div>
  );
}

function MarketCardWrapper({ address, filter, agentFilter }: { address: `0x${string}`; filter: number | null; agentFilter: string | null }) {
  const { market, isLoading } = useMarketData(address);
  if (isLoading) return <div className="h-48 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }} />;
  if (!market) return null;
  if (filter !== null && market.marketType !== filter) return null;

  // Agent filter: match question text for agent name or ticker symbol
  if (agentFilter) {
    const lowerQ = market.question.toLowerCase();
    const lowerFilter = agentFilter.toLowerCase();
    if (!lowerQ.includes(lowerFilter) && !lowerQ.includes(`$${lowerFilter}`)) return null;
  }

  return <MarketCard market={market} />;
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative px-3.5 py-1.5 rounded-full text-xs font-mono transition-all"
      style={{
        background: active ? "rgba(26,86,255,0.1)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "rgba(26,86,255,0.3)" : "rgba(255,255,255,0.06)"}`,
        color: active ? "#93B4FF" : "#64748B",
      }}
    >
      {label}
    </button>
  );
}
