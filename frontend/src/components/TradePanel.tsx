"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Zap, Award, ArrowRight } from "lucide-react";
import { MARKET_ABI, ERC20_ABI } from "@/lib/contracts";
import { MarketData } from "@/hooks/useMarkets";
import { useAgentData, type AgentMetrics } from "@/hooks/useAgentData";
import { OUTCOME_LABELS, calcPayoutMultiplier, formatMultiplier, formatUSDCNum } from "@/lib/utils";
import { ConnectButton } from "./ConnectButton";
import { AnimatedNumber, DecodeNumber } from "./motion/AnimatedNumber";
import { ConfettiBurst } from "./motion/Confetti";
import { AgentHexAvatar } from "./AgentHexAvatar";

interface Props {
  market: MarketData;
  onTradeComplete?: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const QUICK_LABELS = ["100", "500", "1K", "5K"];

export default function TradePanel({ market, onTradeComplete }: Props) {
  const { address: userAddress, isConnected } = useAccount();
  const [mode, setMode] = useState<"bet" | "withdraw">("bet");
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [showClaimConfetti, setShowClaimConfetti] = useState(false);

  const { agents } = useAgentData();

  // Resolve agent profiles from question text
  const agentProfiles = useMemo(() => {
    const found: AgentMetrics[] = [];
    const lowerQ = market.question.toLowerCase();
    for (const [, agent] of agents) {
      if (lowerQ.includes(agent.name.toLowerCase())) {
        found.push(agent);
      } else if (agent.tokenSymbol && lowerQ.includes(agent.tokenSymbol.toLowerCase())) {
        found.push(agent);
      }
    }
    return found;
  }, [market.question, agents]);

  const isHeadToHead = market.marketType === 2 && agentProfiles.length >= 2;
  const yesAgent = isHeadToHead ? agentProfiles[0] : undefined;
  const noAgent = isHeadToHead ? agentProfiles[1] : undefined;

  const sideIndex = outcome === "YES" ? 0 : 1;
  const decimals = market.collateralDecimals;
  const symbol = market.collateralSymbol;
  const collateralAddr = market.collateralToken as `0x${string}`;
  const amountBigInt = amount ? parseUnits(amount, decimals) : 0n;
  const amountNum = parseFloat(amount) || 0;

  // Read on-chain lock state — betting & withdrawals disabled when locked
  const { data: isLocked } = useReadContract({
    address: market.address,
    abi: MARKET_ABI,
    functionName: "isLocked",
    query: { refetchInterval: 10_000 },
  });

  const yesPrice = Number(market.priceYes) / 1e18;
  const noPrice = Number(market.priceNo) / 1e18;
  const outcomeColor = outcome === "YES" ? "#10B981" : "#EF4444";

  // Read collateral balance
  const { data: tokenBalance } = useReadContract({
    address: collateralAddr,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
  });

  // Read collateral allowance
  const { data: tokenAllowance } = useReadContract({
    address: collateralAddr,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, market.address] : undefined,
  });

  // Read outcome token addresses
  const { data: yesTokenAddr } = useReadContract({
    address: market.address,
    abi: MARKET_ABI,
    functionName: "yesToken",
  });
  const { data: noTokenAddr } = useReadContract({
    address: market.address,
    abi: MARKET_ABI,
    functionName: "noToken",
  });

  const outcomeTokenAddr = outcome === "YES" ? yesTokenAddr : noTokenAddr;

  // Read outcome token balance for withdraw mode
  const { data: outcomeBalance } = useReadContract({
    address: outcomeTokenAddr as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!outcomeTokenAddr && !!userAddress },
  });

  // Read on-chain withdrawal preview
  const { data: calcWithdrawalResult } = useReadContract({
    address: market.address,
    abi: MARKET_ABI,
    functionName: "calcWithdrawal",
    args: amountBigInt > 0n ? [amountBigInt] : undefined,
    query: { enabled: mode === "withdraw" && amountBigInt > 0n },
  });

  // Write contracts — reset() clears stale tx hash so subsequent txs work
  const { writeContract: approveWrite, data: approveTxHash, reset: resetApprove } = useWriteContract();
  const { writeContract: trade, data: tradeTxHash, reset: resetTrade } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isTrading, isSuccess: tradeSuccess } = useWaitForTransactionReceipt({ hash: tradeTxHash });

  // Handle trade success — reset state so next tx can fire
  useEffect(() => {
    if (tradeSuccess) {
      onTradeComplete?.();
      setAmount("");
      resetTrade();
    }
  }, [tradeSuccess, onTradeComplete, resetTrade]);

  // Auto-bet after approval, then reset approval state
  useEffect(() => {
    if (approveSuccess && mode === "bet" && amountBigInt > 0n) {
      resetApprove();
      trade({
        address: market.address,
        abi: MARKET_ABI,
        functionName: "bet",
        args: [sideIndex, amountBigInt],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  const needsApproval = mode === "bet" && tokenAllowance !== undefined && amountBigInt > 0n && (tokenAllowance as bigint) < amountBigInt;
  const balance = tokenBalance ? parseFloat(formatUnits(tokenBalance as bigint, decimals)) : 0;
  const outcomeTokenBal = outcomeBalance ? parseFloat(formatUnits(outcomeBalance as bigint, decimals)) : 0;

  // Parimutuel calculations
  const poolForSide = outcome === "YES" ? market.poolYes : market.poolNo;
  const multiplier = calcPayoutMultiplier(poolForSide, market.totalPool);
  const withdrawalPenaltyPct = Number(market.withdrawalFeeBps) / 100;
  const redemptionFeePct = Number(market.redemptionFeeBps) / 100;

  // Est payout using simple current multiplier
  const maxPayout = mode === "bet" ? amountNum * multiplier : 0;

  // Withdrawal refund from on-chain calc or estimate
  const withdrawRefund = useMemo(() => {
    if (mode !== "withdraw" || amountNum <= 0) return 0;
    if (calcWithdrawalResult) {
      const [netRefund] = calcWithdrawalResult as [bigint, bigint];
      return parseFloat(formatUnits(netRefund, decimals));
    }
    return amountNum * (1 - Number(market.withdrawalFeeBps) / 10000);
  }, [mode, amountNum, calcWithdrawalResult, decimals, market.withdrawalFeeBps]);

  const withdrawPenalty = useMemo(() => {
    if (mode !== "withdraw" || amountNum <= 0) return 0;
    if (calcWithdrawalResult) {
      const [, penalty] = calcWithdrawalResult as [bigint, bigint];
      return parseFloat(formatUnits(penalty, decimals));
    }
    return amountNum * (Number(market.withdrawalFeeBps) / 10000);
  }, [mode, amountNum, calcWithdrawalResult, decimals, market.withdrawalFeeBps]);

  function handleApprove() {
    approveWrite({
      address: collateralAddr,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [market.address, amountBigInt],
    });
  }

  function handleTrade() {
    if (mode === "bet") {
      if (needsApproval) {
        handleApprove();
        return;
      }
      trade({
        address: market.address,
        abi: MARKET_ABI,
        functionName: "bet",
        args: [sideIndex, amountBigInt],
      });
    } else {
      trade({
        address: market.address,
        abi: MARKET_ABI,
        functionName: "withdraw",
        args: [sideIndex, amountBigInt],
      });
    }
  }

  function handleRedeem() {
    trade({
      address: market.address,
      abi: MARKET_ABI,
      functionName: "redeem",
    });
  }

  function handleRedeemZeroWinner() {
    trade({
      address: market.address,
      abi: MARKET_ABI,
      functionName: "redeemZeroWinnerFallback",
    });
  }

  const handleMax = () => {
    if (!isConnected) return;
    if (mode === "bet" && tokenBalance) {
      setAmount(formatUnits(tokenBalance as bigint, decimals));
    } else if (mode === "withdraw" && outcomeBalance) {
      setAmount(formatUnits(outcomeBalance as bigint, decimals));
    }
  };

  // ─── Resolved State ───
  if (market.resolved) {
    const outcomeVal = market.outcome;
    const isYesWin = outcomeVal === 1;
    const isNoWin = outcomeVal === 2;
    const isInvalid = outcomeVal === 3;
    // Zero-winner: market resolved to YES/NO but winning pool has zero bets
    const winningPool = isYesWin ? market.poolYes : isNoWin ? market.poolNo : 1n;
    const isZeroWinner = (isYesWin || isNoWin) && winningPool === 0n;
    const winColor = isYesWin ? "#10B981" : isNoWin ? "#EF4444" : "#F59E0B";

    return (
      <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <ConfettiBurst active={showClaimConfetti} onComplete={() => setShowClaimConfetti(false)} />

        <div className="p-5 space-y-4">
          {/* Resolved header */}
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D4FF00]" />
            <h3 className="text-white font-aeonik-ext text-lg">Market Resolved</h3>
          </div>

          {/* Outcome badge */}
          <motion.div
            className="text-center py-6 rounded-xl"
            style={{
              background: `${winColor}10`,
              border: `1px solid ${winColor}30`,
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <p className="text-3xl font-mono font-bold" style={{ color: winColor }}>
              {OUTCOME_LABELS[outcomeVal]}
            </p>
            {isInvalid && (
              <p className="text-[#64748B] text-xs mt-1 flex items-center gap-1 justify-center">
                <AlertTriangle className="w-3 h-3" />
                Market invalidated — deposits refundable
              </p>
            )}
          </motion.div>

          {/* Redeem button */}
          {isConnected && (
            <>
              {isZeroWinner ? (
                <button
                  onClick={handleRedeemZeroWinner}
                  disabled={isTrading}
                  className="w-full py-3.5 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #B45309, #92400E)",
                    border: "1px solid rgba(180, 83, 9, 0.4)",
                    color: "#FDE68A",
                  }}
                >
                  {isTrading ? (
                    <motion.span
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isTrading ? "REDEEMING…" : "REDEEM (FALLBACK)"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleRedeem();
                    setShowClaimConfetti(true);
                  }}
                  disabled={isTrading}
                  className="w-full py-3.5 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #059669, #10B981)",
                    border: "1px solid rgba(16,185,129,0.4)",
                    color: "#fff",
                  }}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }} />
                  {isTrading ? (
                    <motion.span
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full relative z-10"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <Award className="w-4 h-4 relative z-10" />
                  )}
                  <span className="relative z-10">{isTrading ? "REDEEMING…" : "REDEEM WINNINGS"}</span>
                </button>
              )}
            </>
          )}

          {!isConnected && (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          )}
        </div>
      </div>
    );
  }

  const locked = isLocked === true;

  // ─── Active Market State ───
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-5 space-y-4">
        {/* Lock Banner */}
        {locked && (
          <motion.div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "#FCA5A5",
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#EF4444]" />
            <span>Pool is locked. Deposits and withdrawals are disabled until resolution.</span>
          </motion.div>
        )}

        {/* Bet / Withdraw Tabs */}
        <div className="flex rounded-xl p-0.5" style={{ background: "rgba(255,255,255,0.04)" }}>
          {(["bet", "withdraw"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setAmount(""); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-mono transition-all relative flex items-center justify-center gap-1.5"
              style={{
                background: mode === m ? "rgba(255,255,255,0.08)" : "transparent",
                color: mode === m ? "#fff" : "#64748B",
              }}
            >
              {m === "bet" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {m === "bet" ? "Deposit" : "Withdraw"}
              {mode === m && (
                <motion.div
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #00E5FF, #D4FF00)" }}
                  layoutId="trade-tab-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Outcome Selection */}
        <div>
          <p className="text-[10px] tracking-widest text-[#64748B] uppercase mb-2">Select Outcome</p>
          <div className="grid grid-cols-2 gap-2">
            {(["YES", "NO"] as const).map((o) => {
              const active = outcome === o;
              const color = o === "YES" ? "#10B981" : "#EF4444";
              const pct = o === "YES" ? yesPrice : noPrice;
              const multi = calcPayoutMultiplier(
                o === "YES" ? market.poolYes : market.poolNo,
                market.totalPool
              );
              const agent = o === "YES" ? yesAgent : noAgent;
              const label = isHeadToHead && agent?.tokenSymbol ? `$${agent.tokenSymbol}` : o;
              return (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className="py-3.5 rounded-xl text-sm font-mono transition-all relative"
                  style={{
                    background: active ? `${color}10` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? `${color}40` : "rgba(255,255,255,0.06)"}`,
                    color: active ? color : "#64748B",
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5 font-aeonik-ext text-sm">
                    {isHeadToHead && agent && <AgentHexAvatar name={agent.name} size={16} src={agent.profilePic} />}
                    {label}
                  </div>
                  <div className="text-lg mt-0.5">
                    <AnimatedNumber
                      value={Math.round(pct * 100)}
                      format={(n) => `${Math.round(n)}%`}
                      duration={0.5}
                    />
                  </div>
                  {mode === "bet" && (
                    <div className="text-[10px] mt-1 opacity-60">
                      {formatMultiplier(multi)}
                    </div>
                  )}
                  {active && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
                      style={{ background: color }}
                      layoutId="outcome-indicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] tracking-widest text-[#64748B] uppercase">
              {mode === "bet" ? `Amount (${symbol})` : `${outcome} Tokens`}
            </p>
            <button
              onClick={handleMax}
              className="text-[10px] text-[#00E5FF] hover:text-[#00E5FF]/80 transition-colors font-mono"
            >
              {mode === "bet"
                ? `BAL: ${isConnected ? formatUSDCNum(balance) : "—"} ${symbol}`
                : `BAL: ${isConnected ? formatUSDCNum(outcomeTokenBal) : "—"} ${outcome}`
              }
            </button>
          </div>
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={locked ? "LOCKED" : "0.00"}
              disabled={locked}
              className="w-full bg-transparent px-4 py-3.5 text-white font-mono text-base placeholder-[#334155] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleMax}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-2 py-1 rounded-md transition-colors"
              style={{
                background: "rgba(0,229,255,0.08)",
                border: "1px solid rgba(0,229,255,0.2)",
                color: "#00E5FF",
              }}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Quick amounts (bet mode only) */}
        {mode === "bet" && (
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amt, i) => (
              <button
                key={amt}
                onClick={() => setAmount(String(amt))}
                className="flex-1 py-2 rounded-lg text-xs font-mono transition-all"
                style={{
                  background: amountNum === amt ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${amountNum === amt ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                  color: amountNum === amt ? "#fff" : "#64748B",
                }}
              >
                {QUICK_LABELS[i]}
              </button>
            ))}
          </div>
        )}

        {/* Trade Preview */}
        <AnimatePresence>
          {amountNum > 0 && (
            <motion.div
              className="rounded-xl p-3.5 space-y-2.5 text-xs"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {mode === "bet" ? (
                <>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Tokens (1:1)</span>
                    <span className="text-white font-mono">{amountNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Payout multiplier
                    </span>
                    <span className="font-mono" style={{ color: outcomeColor }}>
                      <DecodeNumber value={formatMultiplier(multiplier)} />
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#D4FF00]" />
                      Est. payout (if wins)
                    </span>
                    <span className="text-[#10B981] font-mono">{formatUSDCNum(maxPayout)} {symbol}</span>
                  </div>
                  <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex justify-between text-[#64748B]">
                    <span>Redemption fee</span>
                    <span className="text-white font-mono">{redemptionFeePct}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                      Withdrawal penalty
                    </span>
                    <span className="text-[#F59E0B] font-mono">{withdrawalPenaltyPct}% ({formatUSDCNum(withdrawPenalty)} {symbol})</span>
                  </div>
                  <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex justify-between text-[#64748B]">
                    <span>You receive</span>
                    <span className="text-white font-mono">{formatUSDCNum(withdrawRefund)} {symbol}</span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Withdrawal warning */}
        {mode === "withdraw" && amountNum > 0 && (
          <motion.div
            className="flex items-start gap-2 p-3 rounded-lg text-xs"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.15)",
              color: "#FBBF24",
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Early withdrawal incurs a {withdrawalPenaltyPct}% penalty. Consider holding until resolution for full payout.</span>
          </motion.div>
        )}

        {/* Action Button */}
        {!isConnected ? (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        ) : needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isApproving || amountBigInt === 0n || locked}
            className="w-full py-3.5 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: locked ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #B45309, #92400E)",
              border: locked ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(180, 83, 9, 0.4)",
              color: locked ? "#475569" : "#FDE68A",
            }}
          >
            {locked ? (
              "POOL LOCKED"
            ) : isApproving ? (
              <>
                <motion.span
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                APPROVING…
              </>
            ) : (
              `APPROVE ${symbol}`
            )}
          </button>
        ) : (
          <button
            onClick={handleTrade}
            disabled={isTrading || amountBigInt === 0n || locked}
            className="w-full py-3.5 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group"
            style={{
              background: amountBigInt === 0n
                ? "rgba(255,255,255,0.04)"
                : mode === "withdraw"
                  ? "linear-gradient(135deg, #B45309, #92400E)"
                  : outcome === "YES"
                    ? "linear-gradient(135deg, #059669, #10B981)"
                    : "linear-gradient(135deg, #DC2626, #EF4444)",
              border: `1px solid ${
                amountBigInt === 0n
                  ? "rgba(255,255,255,0.06)"
                  : mode === "withdraw"
                    ? "rgba(180,83,9,0.4)"
                    : outcome === "YES"
                      ? "rgba(16,185,129,0.4)"
                      : "rgba(239,68,68,0.4)"
              }`,
              color: amountBigInt === 0n
                ? "#475569"
                : mode === "withdraw"
                  ? "#FDE68A"
                  : "#fff",
            }}
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }} />
            {locked ? (
              <span className="relative z-10">POOL LOCKED</span>
            ) : isTrading ? (
              <>
                <motion.span
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full relative z-10"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative z-10">CONFIRMING…</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 relative z-10" />
                <span className="relative z-10">
                  {mode === "bet"
                    ? `DEPOSIT ${isHeadToHead && (outcome === "YES" ? yesAgent?.tokenSymbol : noAgent?.tokenSymbol) ? `$${outcome === "YES" ? yesAgent!.tokenSymbol : noAgent!.tokenSymbol}` : outcome}`
                    : `WITHDRAW ${isHeadToHead && (outcome === "YES" ? yesAgent?.tokenSymbol : noAgent?.tokenSymbol) ? `$${outcome === "YES" ? yesAgent!.tokenSymbol : noAgent!.tokenSymbol}` : outcome}`
                  }
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
