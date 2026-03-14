"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { useAccount, useReadContract } from "wagmi";
import { useMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import { MARKET_ABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { formatCollateral, shortenAddress, OUTCOME_LABELS, calcPayoutMultiplier, formatMultiplier } from "@/lib/utils";
import Link from "next/link";
import { Wallet, ArrowRight, TrendingUp, DollarSign, Activity, Layers } from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { formatUnits } from "viem";
import MarketTypeBadge from "@/components/MarketTypeBadge";
import CountdownTimer from "@/components/CountdownTimer";

type PortfolioTab = "active" | "claimable" | "history";

export default function PortfolioPage() {
  const { address: userAddress, isConnected } = useAccount();
  const { data: addresses, isLoading } = useMarketAddresses();
  const [activeTab, setActiveTab] = useState<PortfolioTab>("active");

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Track active deposit count from PositionRow callbacks
  const [activeCount, setActiveCount] = useState(0);
  const reportedRef = useState(() => new Set<string>())[0];

  const onHasPosition = useCallback((addr: string, hasPosition: boolean) => {
    const had = reportedRef.has(addr);
    if (hasPosition && !had) {
      reportedRef.add(addr);
      setActiveCount((c) => c + 1);
    } else if (!hasPosition && had) {
      reportedRef.delete(addr);
      setActiveCount((c) => Math.max(0, c - 1));
    }
  }, [reportedRef]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <motion.div
          className="rounded-2xl p-10 text-center max-w-md"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(26,86,255,0.08)", border: "1px solid rgba(26,86,255,0.2)" }}>
            <Wallet className="w-7 h-7 text-[#93B4FF]" />
          </div>
          <p className="text-white text-lg font-aeonik-ext mb-2">Connect Your Wallet</p>
          <p className="text-xs text-[#64748B] mb-6">Track your deposits, claimable payouts, and transaction history.</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-white text-2xl font-aeonik-ext">Your Portfolio</h1>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const usdcBal = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0;
  const marketAddrs = (addresses as `0x${string}`[] | undefined) || [];

  return (
    <div>
      <h1 className="text-white text-2xl font-aeonik-ext tracking-tight mb-6">Your Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={<DollarSign className="w-4 h-4 text-[#10B981]" />} label="USDC Balance" value={`$${usdcBal.toFixed(2)}`} color="#10B981" />
        <SummaryCard icon={<Layers className="w-4 h-4 text-[#00E5FF]" />} label="Markets Available" value={String(marketAddrs.length)} color="#00E5FF" />
        <SummaryCard icon={<Activity className="w-4 h-4 text-[#D4FF00]" />} label="Active Deposits" value={String(activeCount)} color="#D4FF00" />
        <SummaryCard icon={<TrendingUp className="w-4 h-4 text-[#93B4FF]" />} label="Wallet" value={shortenAddress(userAddress!)} color="#93B4FF" />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {(["active", "claimable", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative px-5 py-2.5 text-xs uppercase tracking-wider transition-colors"
            style={{ color: activeTab === tab ? "#fff" : "#64748B" }}
          >
            {tab === "active" ? "Active Deposits" : tab === "claimable" ? "Claimable" : "History"}
            {activeTab === tab && (
              <motion.div
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, #00E5FF, #D4FF00)" }}
                layoutId="portfolio-tab"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Positions */}
      {marketAddrs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#64748B] text-sm">No markets available yet.</p>
          <Link href="/" className="mt-3 inline-block text-sm text-[#00E5FF] hover:text-[#00E5FF]/80 transition-colors">
            Browse Markets
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {marketAddrs.map((addr) => (
            <PositionRow key={addr} marketAddress={addr as `0x${string}`} userAddress={userAddress!} tab={activeTab} onHasPosition={onHasPosition} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] text-[#64748B] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg text-white font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function PositionRow({ marketAddress, userAddress, tab, onHasPosition }: { marketAddress: `0x${string}`; userAddress: `0x${string}`; tab: PortfolioTab; onHasPosition?: (addr: string, has: boolean) => void }) {
  const { market, isLoading } = useMarketData(marketAddress);

  const { data: yesTokenAddr } = useReadContract({ address: marketAddress, abi: MARKET_ABI, functionName: "yesToken" });
  const { data: noTokenAddr } = useReadContract({ address: marketAddress, abi: MARKET_ABI, functionName: "noToken" });

  const { data: yesBalance } = useReadContract({
    address: yesTokenAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
    query: { enabled: !!yesTokenAddr },
  });

  const { data: noBalance } = useReadContract({
    address: noTokenAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
    query: { enabled: !!noTokenAddr },
  });

  // Report active (non-resolved) positions to parent for count
  const hasYes = yesBalance && yesBalance > 0n;
  const hasNo = noBalance && noBalance > 0n;
  const hasActivePosition = !!(hasYes || hasNo) && !!market && !market.resolved;

  useEffect(() => {
    onHasPosition?.(marketAddress, hasActivePosition);
  }, [marketAddress, hasActivePosition, onHasPosition]);

  if (isLoading || !market) return null;
  if (!hasYes && !hasNo) return null;

  // Tab filtering
  if (tab === "active" && market.resolved) return null;
  if (tab === "claimable" && !market.resolved) return null;

  const decimals = market.collateralDecimals;
  const symbol = market.collateralSymbol;
  const yesMulti = calcPayoutMultiplier(market.poolYes, market.totalPool);
  const noMulti = calcPayoutMultiplier(market.poolNo, market.totalPool);

  return (
    <Link href={`/markets/${marketAddress}`}>
      <motion.article
        className="rounded-xl p-5 cursor-pointer transition-all"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${market.resolved ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
        }}
        whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.04)" }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MarketTypeBadge type={market.marketType} />
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "#94A3B8" }}>
                {symbol}
              </span>
              {market.resolved ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{
                  background: market.outcome === 1 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  color: market.outcome === 1 ? "#10B981" : "#EF4444",
                  border: `1px solid ${market.outcome === 1 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                  {OUTCOME_LABELS[market.outcome]}
                </span>
              ) : (
                <CountdownTimer targetTimestamp={market.resolutionTime} compact showIcon={false} />
              )}
            </div>
            <h3 className="text-white text-sm mb-3">{market.question}</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {hasYes && (
                <div>
                  <p className="text-[#64748B] text-[10px] uppercase tracking-wider">YES Tokens</p>
                  <p className="text-[#10B981] font-mono mt-0.5">{formatCollateral(yesBalance!, decimals)}</p>
                  {!market.resolved && <p className="text-[#475569] text-[10px] mt-0.5">{formatMultiplier(yesMulti)}</p>}
                </div>
              )}
              {hasNo && (
                <div>
                  <p className="text-[#64748B] text-[10px] uppercase tracking-wider">NO Tokens</p>
                  <p className="text-[#EF4444] font-mono mt-0.5">{formatCollateral(noBalance!, decimals)}</p>
                  {!market.resolved && <p className="text-[#475569] text-[10px] mt-0.5">{formatMultiplier(noMulti)}</p>}
                </div>
              )}
              <div>
                <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Total Pool</p>
                <p className="text-white font-mono mt-0.5">{formatCollateral(market.totalPool, decimals)} {symbol}</p>
              </div>
            </div>

            {market.resolved && (hasYes || hasNo) && (
              <div className="mt-3">
                <span className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#10B981]/80 transition-colors">
                  Redeem Winnings <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
