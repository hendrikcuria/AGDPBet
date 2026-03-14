"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, Zap, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { parseUnits, formatUnits } from "viem";
import { useAppState } from "@/lib/appState";
import { useEpochInfo } from "@/hooks/useLeaderboard";
import { MARKET_ABI, ERC20_ABI } from "@/lib/contracts";
import { calcPayoutMultiplier, formatMultiplier, formatUSDCNum } from "@/lib/utils";
import { ConnectButton } from "./ConnectButton";
import { ConfettiBurst } from "./motion/Confetti";
import { DecodeNumber } from "./motion/AnimatedNumber";
import { DecryptionCounter } from "./motion/DecryptionCounter";

type ModalStep = "place" | "confirming" | "confirmed";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const QUICK_LABELS = ["100", "500", "1K", "5K"];

export default function BetModal() {
  const { depositModal, closeDepositModal, addToast, addDeposit } = useAppState();
  const { open, market, preselectedSide } = depositModal;
  const { isConnected, address: userAddress } = useAccount();
  const { data: epoch } = useEpochInfo();

  const [side, setSide] = useState<"YES" | "NO">(preselectedSide);
  const [stakeStr, setStakeStr] = useState("");
  const [step, setStep] = useState<ModalStep>("place");
  const [showConfetti, setShowConfetti] = useState(false);
  const [decryptionActive, setDecryptionActive] = useState(false);
  const [confirmedData, setConfirmedData] = useState<{
    question: string;
    stake: string;
    side: "YES" | "NO";
    payout: string;
    epoch: number;
    symbol: string;
    multiplier: number;
    txHash?: string;
  } | null>(null);

  // Collateral token info from market data
  const decimals = market?.collateralDecimals ?? 6;
  const symbol = market?.collateralSymbol ?? "USDC";
  const collateralAddr = (market?.collateralToken ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  // Reset on open
  useEffect(() => {
    if (open && market) {
      setSide(preselectedSide);
      setStakeStr("");
      setStep("place");
      setConfirmedData(null);
      setShowConfetti(false);
      setDecryptionActive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, market?.address, preselectedSide]);

  const stakeNum = parseFloat(stakeStr) || 0;
  const amountBigInt = stakeStr ? parseUnits(stakeStr, decimals) : 0n;

  // Read collateral balance
  const { data: tokenBalance } = useReadContract({
    address: collateralAddr,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!userAddress && open },
  });

  // Read collateral allowance
  const { data: tokenAllowance } = useReadContract({
    address: collateralAddr,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress && market ? [userAddress, market.address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!userAddress && !!market && open },
  });

  const sideIndex = side === "YES" ? 0 : 1;

  // Write contracts
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: buy, data: buyTxHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isBuying, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });

  const needsApproval = tokenAllowance !== undefined && amountBigInt > 0n && (tokenAllowance as bigint) < amountBigInt;
  const balance = tokenBalance ? parseFloat(formatUnits(tokenBalance as bigint, decimals)) : 0;

  // Parimutuel calculations
  const yesPrice = market ? Number(market.priceYes) / 1e18 : 0.5;
  const noPrice = market ? Number(market.priceNo) / 1e18 : 0.5;
  const price = side === "YES" ? yesPrice : noPrice;

  const poolForSide = market ? (side === "YES" ? market.poolYes : market.poolNo) : 0n;
  const totalPool = market ? market.totalPool : 0n;
  const multiplier = calcPayoutMultiplier(poolForSide, totalPool);

  // Payout accounting for own bet changing pool composition
  const potentialPayout = stakeNum > 0 && market
    ? stakeNum * (Number(totalPool) / (10 ** decimals) + stakeNum) / (Number(poolForSide) / (10 ** decimals) + stakeNum)
    : 0;

  const feePct = market ? Number(market.redemptionFeeBps) / 100 : 2;

  // Handle buy success — driven by real tx receipt
  useEffect(() => {
    if (buySuccess && step === "confirming" && market) {
      setConfirmedData({
        question: market.question,
        stake: stakeStr,
        side,
        payout: `~${formatUSDCNum(potentialPayout)}`,
        epoch: epoch?.epochNumber || 0,
        symbol,
        multiplier,
        txHash: buyTxHash,
      });

      // Track deposit
      if (buyTxHash && userAddress) {
        addDeposit({
          marketAddress: market.address,
          outcomeIndex: sideIndex,
          amount: amountBigInt,
          txHash: buyTxHash,
          timestamp: Date.now(),
        });
      }

      setStep("confirmed");
      setShowConfetti(true);
      setDecryptionActive(true);
      addToast("Deposit confirmed!", "success");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buySuccess]);

  // Auto-buy after approval
  useEffect(() => {
    if (approveSuccess && step === "place" && amountBigInt > 0n && market) {
      setStep("confirming");
      buy({
        address: market.address,
        abi: MARKET_ABI,
        functionName: "bet",
        args: [sideIndex, amountBigInt],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  // Side colors
  const sideColor = side === "YES" ? "#10B981" : "#EF4444";
  const sideBorder = side === "YES" ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";

  if (!open || !market) return null;

  const handleConfirm = () => {
    if (!isConnected) return;
    if (stakeNum <= 0) return;
    if (stakeNum > balance) {
      addToast(`Insufficient ${symbol} balance`, "error");
      return;
    }

    if (needsApproval) {
      approve({
        address: collateralAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [market.address, amountBigInt],
      });
      return;
    }

    setStep("confirming");
    buy({
      address: market.address,
      abi: MARKET_ABI,
      functionName: "bet",
      args: [sideIndex, amountBigInt],
    });
  };

  const handleClose = () => {
    closeDepositModal();
    setTimeout(() => {
      setStep("place");
      setStakeStr("");
      setConfirmedData(null);
      setShowConfetti(false);
      setDecryptionActive(false);
    }, 200);
  };

  const handleShareOnX = () => {
    const text = `I just backed ${side} on "${market.question}" with ${stakeNum.toLocaleString()} ${symbol}! Est. payout: ${formatUSDCNum(potentialPayout)} ${symbol} 🎯`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-[420px]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Confetti layer */}
            <ConfettiBurst
              active={showConfetti}
              origin={{ x: 0.5, y: 0.3 }}
              onComplete={() => setShowConfetti(false)}
            />

            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #0F172A 0%, #0B0F19 100%)",
                border: `1px solid ${step === "confirmed" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                boxShadow: step === "confirmed"
                  ? "0 0 60px rgba(16,185,129,0.15), 0 25px 50px rgba(0,0,0,0.5)"
                  : "0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* Top accent bar */}
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${sideColor}, transparent)` }} />

              <AnimatePresence mode="wait">
                {step === "confirmed" && confirmedData ? (
                  /* ─── CONFIRMED STATE ─── */
                  <motion.div
                    key="confirmed"
                    className="p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <button onClick={handleClose} className="absolute top-4 right-4 text-[#475569] hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>

                    {/* Success header */}
                    <div className="text-center mb-6">
                      <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                        style={{
                          background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(0,229,255,0.1))",
                          border: "1px solid rgba(16,185,129,0.3)",
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                      >
                        <motion.span
                          className="text-3xl"
                          animate={{ rotate: [0, -10, 10, -5, 0] }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        >
                          ✓
                        </motion.span>
                      </motion.div>

                      <h2 className="text-white text-xl font-aeonik-ext tracking-tight mb-1">
                        Deposit Confirmed
                      </h2>
                      <p className="text-[#64748B] text-sm">
                        You backed{" "}
                        <span style={{ color: sideColor }}>{confirmedData.side}</span>{" "}
                        with{" "}
                        <DecryptionCounter
                          value={`${parseFloat(confirmedData.stake).toLocaleString()} ${confirmedData.symbol}`}
                          active={decryptionActive}
                          className="text-white"
                          duration={1200}
                        />
                      </p>
                    </div>

                    {/* Summary Card */}
                    <div
                      className="rounded-xl p-4 space-y-3 mb-5"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">Market</span>
                        <span className="text-[#CBD5E1] font-mono text-xs text-right max-w-[200px] truncate">
                          {confirmedData.question}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">Outcome</span>
                        <span className="font-mono" style={{ color: sideColor }}>
                          {confirmedData.side}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">Deposited</span>
                        <span className="text-white font-mono">
                          {parseFloat(confirmedData.stake).toLocaleString()} {confirmedData.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">Est. Payout</span>
                        <span className="text-[#10B981] font-mono">
                          <DecodeNumber
                            value={confirmedData.payout}
                            suffix={` ${confirmedData.symbol}`}
                          />
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">Multiplier</span>
                        <span className="text-[#00E5FF] font-mono">
                          {formatMultiplier(confirmedData.multiplier)}
                        </span>
                      </div>
                      {confirmedData.epoch > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#64748B]">Epoch</span>
                          <span className="text-white font-mono">#{confirmedData.epoch}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <button
                      onClick={handleShareOnX}
                      className="w-full py-3.5 rounded-xl text-sm font-medium tracking-wider transition-all flex items-center justify-center gap-2 mb-3"
                      style={{
                        background: "rgba(26, 86, 255, 0.1)",
                        border: "1px solid rgba(26, 86, 255, 0.25)",
                        color: "#93B4FF",
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                      SHARE ON X
                    </button>

                    <button
                      onClick={handleClose}
                      className="w-full py-3 rounded-xl text-[#64748B] hover:text-white text-sm transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  /* ─── PLACE / CONFIRMING STATE ─── */
                  <motion.div
                    key="place"
                    className="p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-lg font-aeonik-ext leading-snug line-clamp-2">
                          {market.question}
                        </h3>
                        <p className="text-[#475569] text-[10px] mt-1 tracking-wider font-mono">
                          {market.address.slice(0, 10)}…{market.address.slice(-6)}
                        </p>
                      </div>
                      <button onClick={handleClose} className="text-[#475569] hover:text-white transition-colors p-1 ml-2">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Outcome Toggle */}
                    <div className="flex gap-2 mb-5">
                      {(["YES", "NO"] as const).map((s) => {
                        const active = side === s;
                        const color = s === "YES" ? "#10B981" : "#EF4444";
                        const pct = s === "YES" ? yesPrice : noPrice;
                        return (
                          <button
                            key={s}
                            onClick={() => setSide(s)}
                            className="flex-1 py-3 rounded-xl text-sm font-mono transition-all relative overflow-hidden"
                            style={{
                              background: active ? `${color}10` : "rgba(255,255,255,0.02)",
                              border: `1px solid ${active ? `${color}40` : "rgba(255,255,255,0.06)"}`,
                              color: active ? color : "#64748B",
                            }}
                          >
                            <span className="font-aeonik-ext text-sm">{s}</span>
                            <span className="ml-1.5 text-xs opacity-70">
                              {Math.round(pct * 100)}%
                            </span>
                            {active && (
                              <motion.div
                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ background: color }}
                                layoutId="bet-modal-tab"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Multiplier Display */}
                    <div
                      className="rounded-xl p-4 mb-5 flex items-end justify-between"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div>
                        <p className="text-[10px] tracking-widest text-[#64748B] uppercase mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Payout Multiplier
                        </p>
                        <p className="text-3xl font-mono" style={{ color: sideColor }}>
                          <DecodeNumber value={formatMultiplier(multiplier)} />
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] tracking-widest text-[#64748B] uppercase mb-1">Implied Prob</p>
                        <p className="text-lg text-[#94A3B8] font-mono">
                          {(price * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Stake Input */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] tracking-widest text-[#64748B] uppercase">
                          Deposit Amount
                        </p>
                        {isConnected && (
                          <button
                            onClick={() => setStakeStr(balance.toString())}
                            className="text-[10px] text-[#00E5FF] hover:text-[#00E5FF]/80 transition-colors font-mono"
                          >
                            BAL: {formatUSDCNum(balance)} {symbol}
                          </button>
                        )}
                      </div>
                      <div
                        className="flex rounded-xl overflow-hidden transition-colors"
                        style={{
                          border: `1px solid ${
                            stakeNum > balance && isConnected
                              ? "rgba(239,68,68,0.5)"
                              : stakeStr
                                ? sideBorder
                                : "rgba(255,255,255,0.08)"
                          }`,
                        }}
                      >
                        <input
                          type="number"
                          value={stakeStr}
                          onChange={(e) => setStakeStr(e.target.value)}
                          placeholder="0"
                          min={0}
                          className="flex-1 bg-transparent px-4 py-4 text-white font-mono text-lg placeholder-[#334155] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <div className="flex items-center px-4 bg-white/[0.03] border-l border-white/[0.06] text-[#64748B] text-sm font-mono">
                          {symbol}
                        </div>
                      </div>
                      {stakeNum > balance && isConnected && (
                        <motion.p
                          className="text-[#EF4444] text-xs mt-1.5"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          Insufficient balance ({formatUSDCNum(balance)} {symbol} available)
                        </motion.p>
                      )}
                    </div>

                    {/* Quick Amounts */}
                    <div className="flex gap-2 mb-5">
                      {QUICK_AMOUNTS.map((amt, i) => (
                        <button
                          key={amt}
                          onClick={() => setStakeStr(String(amt))}
                          className="flex-1 py-2 rounded-lg text-xs font-mono transition-all"
                          style={{
                            background: stakeNum === amt ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${stakeNum === amt ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                            color: stakeNum === amt ? "#fff" : "#64748B",
                          }}
                        >
                          {QUICK_LABELS[i]}
                        </button>
                      ))}
                    </div>

                    {/* Potential Payout Preview */}
                    <AnimatePresence>
                      {stakeNum > 0 && (
                        <motion.div
                          className="rounded-xl p-4 mb-5"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[10px] tracking-widest text-[#64748B] uppercase">
                                Tokens (1:1)
                              </p>
                              <p className="text-xs text-[#475569] mt-0.5 font-mono">
                                {stakeNum.toFixed(2)} tokens
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] tracking-widest text-[#64748B] uppercase mb-0.5 flex items-center gap-1 justify-end">
                                <Zap className="w-3 h-3 text-[#D4FF00]" />
                                Est. Payout
                              </p>
                              <p className="text-2xl font-mono text-[#10B981]">
                                ~{formatUSDCNum(potentialPayout)}
                              </p>
                              <p className="text-xs text-[#64748B] font-mono">{symbol}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Button */}
                    {!isConnected ? (
                      <div className="flex justify-center">
                        <ConnectButton />
                      </div>
                    ) : step === "confirming" || isApproving || isBuying ? (
                      <motion.button
                        disabled
                        className="w-full py-4 rounded-xl text-sm tracking-wider flex items-center justify-center gap-2 font-mono"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#94A3B8",
                        }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <motion.span
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        {isApproving ? "APPROVING…" : "CONFIRMING ON-CHAIN…"}
                      </motion.button>
                    ) : needsApproval ? (
                      <button
                        onClick={handleConfirm}
                        disabled={stakeNum <= 0}
                        className="w-full py-4 rounded-xl text-sm tracking-wider font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "linear-gradient(135deg, #B45309, #92400E)",
                          border: "1px solid rgba(180, 83, 9, 0.5)",
                          color: "#FDE68A",
                        }}
                      >
                        APPROVE {symbol}
                      </button>
                    ) : (
                      <button
                        onClick={handleConfirm}
                        disabled={stakeNum <= 0 || stakeNum > balance}
                        className="w-full py-4 rounded-xl text-sm tracking-wider font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group"
                        style={{
                          background: stakeNum <= 0 || stakeNum > balance
                            ? "rgba(255,255,255,0.05)"
                            : side === "YES"
                              ? "linear-gradient(135deg, #059669, #10B981)"
                              : "linear-gradient(135deg, #DC2626, #EF4444)",
                          border: `1px solid ${
                            stakeNum <= 0 || stakeNum > balance
                              ? "rgba(255,255,255,0.06)"
                              : side === "YES"
                                ? "rgba(16,185,129,0.4)"
                                : "rgba(239,68,68,0.4)"
                          }`,
                          color: stakeNum <= 0 || stakeNum > balance ? "#475569" : "#fff",
                        }}
                      >
                        {/* Shimmer on hover */}
                        <span
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                          }}
                        />
                        <span className="relative">CONFIRM DEPOSIT</span>
                      </button>
                    )}

                    {/* Protocol Info */}
                    <p className="text-center text-[10px] text-[#334155] mt-3 font-mono">
                      {feePct}% redemption fee · Parimutuel pool · On-chain settlement
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
