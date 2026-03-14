"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, decodeEventLog } from "viem";
import { baseSepolia } from "wagmi/chains";
import { motion, AnimatePresence } from "motion/react";
import { CONTRACTS, FACTORY_ABI, ERC20_ABI } from "@/lib/contracts";
import { ConnectButton } from "@/components/ConnectButton";
import { useAppState } from "@/lib/appState";
import { useAgentData, type AgentMetrics } from "@/hooks/useAgentData";
import { useEpochInfo } from "@/hooks/useLeaderboard";
import { AgentCombobox } from "@/components/AgentCombobox";
import { MarketCreatedModal } from "@/components/MarketCreatedModal";
import CountdownTimer from "@/components/CountdownTimer";
import { ArrowLeft, Zap, Lock, Clock, Swords } from "lucide-react";

const COLLATERAL = { address: CONTRACTS.usdc, symbol: "USDC", decimals: 6 };

const MARKET_TYPES = [
  { value: 0, label: "Epoch Winner", icon: "🏆", desc: "Will agent be #1?" },
  { value: 1, label: "Top 10", icon: "📊", desc: "Will agent finish Top 10?" },
  { value: 2, label: "Head-to-Head", icon: "⚔️", desc: "Agent A vs Agent B" },
  { value: 3, label: "Long Tail", icon: "🎯", desc: "Custom agent prediction" },
];

/* ─── Question Templates ─── */

function buildQuestion(
  marketType: number,
  agentA: AgentMetrics | null,
  agentB: AgentMetrics | null,
  epochNumber: number | null,
): string {
  const epoch = epochNumber ? `Epoch ${epochNumber}` : "this Epoch";
  const tickerA = agentA?.tokenSymbol ? `$${agentA.tokenSymbol}` : agentA?.name;
  const tickerB = agentB?.tokenSymbol ? `$${agentB.tokenSymbol}` : agentB?.name;

  switch (marketType) {
    case 0: // Epoch Winner
      if (!agentA) return "";
      return `Will ${agentA.name} (${tickerA}) be #1 on the aGDP leaderboard at the end of ${epoch}?`;
    case 1: // Top 10
      if (!agentA) return "";
      return `Will ${agentA.name} (${tickerA}) finish in the Top 10 for ${epoch}?`;
    case 2: // Head-to-Head
      if (!agentA || !agentB) return "";
      return `Will ${agentA.name} (${tickerA}) rank higher than ${agentB.name} (${tickerB}) in ${epoch}?`;
    case 3: // Long Tail
      if (!agentA) return "";
      return `Will ${agentA.name} (${tickerA}) achieve a top-50 aGDP score in ${epoch}?`;
    default:
      return "";
  }
}

/* ─── Resolution Lock Display ─── */

function ResolutionLock({ endsAt, epochNumber }: { endsAt: string; epochNumber: number }) {
  const endDate = new Date(endsAt);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(0, 229, 255, 0.04)",
        border: "1px solid rgba(0, 229, 255, 0.12)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-[#00E5FF]" />
        <span className="text-xs text-[#00E5FF] font-mono uppercase tracking-wider">Resolution Lock</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-mono">
            Epoch {epochNumber} End
          </p>
          <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
            {endDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" "}
            {endDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#475569]" />
          <CountdownTimer targetTimestamp={endTimestamp} compact />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function CreateMarketPage() {
  const router = useRouter();
  const { isConnected, address: userAddress } = useAccount();
  const { addToast } = useAppState();
  const { ranked, epoch: agentEpoch } = useAgentData();
  const { data: epochInfo } = useEpochInfo();

  const [marketType, setMarketType] = useState(0);
  const [agentA, setAgentA] = useState<AgentMetrics | null>(null);
  const [agentB, setAgentB] = useState<AgentMetrics | null>(null);
  const [liquidityStr, setLiquidityStr] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [createdAddress, setCreatedAddress] = useState<`0x${string}` | null>(null);
  const [createdQuestion, setCreatedQuestion] = useState("");
  const [createdSeed, setCreatedSeed] = useState("");
  const [createdAgents, setCreatedAgents] = useState<AgentMetrics[]>([]);

  const epochNumber = epochInfo?.epochNumber ?? agentEpoch;
  const epochEndsAt = epochInfo?.endsAt ?? null;
  const isH2H = marketType === 2;

  // Clear agentB when switching away from head-to-head
  useEffect(() => {
    if (!isH2H) setAgentB(null);
  }, [isH2H]);

  // Auto-generated question
  const question = useMemo(
    () => buildQuestion(marketType, agentA, agentB, epochNumber),
    [marketType, agentA, agentB, epochNumber],
  );

  // Resolution timestamp from epoch end
  const resolutionTimestamp = epochEndsAt
    ? Math.floor(new Date(epochEndsAt).getTime() / 1000)
    : 0;

  const liquidityNum = parseFloat(liquidityStr) || 0;
  const liquidityBigInt = liquidityStr ? parseUnits(liquidityStr, COLLATERAL.decimals) : 0n;

  // Read collateral balance
  const { data: tokenBalance } = useReadContract({
    address: COLLATERAL.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!userAddress },
  });

  // Read allowance for factory
  const { data: tokenAllowance } = useReadContract({
    address: COLLATERAL.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, CONTRACTS.factory] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!userAddress },
  });

  // Check if collateral is allowed
  const { data: isCollateralAllowed } = useReadContract({
    address: CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "allowedCollateral",
    args: [COLLATERAL.address],
    chainId: baseSepolia.id,
  });

  // Write contracts
  const { writeContract: approveWrite, data: approveTxHash } = useWriteContract();
  const { writeContract: createMarket, data: createTxHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { data: createReceipt, isLoading: isCreating, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createTxHash });

  // Auto-create after approval
  useEffect(() => {
    if (approveSuccess && question && resolutionTimestamp > 0 && liquidityBigInt > 0n) {
      createMarket({
        address: CONTRACTS.factory,
        abi: FACTORY_ABI,
        functionName: "createMarketPublic",
        args: [question, marketType, COLLATERAL.address, BigInt(resolutionTimestamp), liquidityBigInt],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  const balance = tokenBalance ? parseFloat(formatUnits(tokenBalance as bigint, COLLATERAL.decimals)) : 0;
  const needsApproval = tokenAllowance !== undefined && liquidityBigInt > 0n && (tokenAllowance as bigint) < liquidityBigInt;

  const now = Math.floor(Date.now() / 1000);
  const isResolutionValid = resolutionTimestamp > now + 3600;

  const isValid =
    question.length >= 10 &&
    isResolutionValid &&
    (liquidityNum === 0 || liquidityNum <= balance) &&
    isCollateralAllowed === true &&
    agentA !== null &&
    (isH2H ? agentB !== null : true);

  const handleApprove = () => {
    approveWrite({
      address: COLLATERAL.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.factory, liquidityBigInt],
    });
  };

  const handleCreate = () => {
    if (!isValid) return;
    createMarket({
      address: CONTRACTS.factory,
      abi: FACTORY_ABI,
      functionName: "createMarketPublic",
      args: [question, marketType, COLLATERAL.address, BigInt(resolutionTimestamp), liquidityBigInt],
    });
  };

  // Parse MarketCreated event from receipt and show modal
  useEffect(() => {
    if (!createSuccess || !createReceipt || showModal) return;

    let marketAddr: `0x${string}` | null = null;
    for (const log of createReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "MarketCreated") {
          marketAddr = (decoded.args as { market: `0x${string}` }).market;
          break;
        }
      } catch {
        // Not a MarketCreated event, skip
      }
    }

    setCreatedAddress(marketAddr);
    setCreatedQuestion(question);
    setCreatedSeed(liquidityStr);
    setCreatedAgents([agentA, agentB].filter((a): a is AgentMetrics => a !== null));
    setShowModal(true);
    addToast("Pool deployed on-chain!", "success");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSuccess, createReceipt]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </button>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-6 h-6 text-[#00E5FF]" />
          <h1 className="text-white text-2xl font-aeonik-ext">Create Pool</h1>
        </div>

        <div className="space-y-6">
          {/* ─── Market Type ─── */}
          <div>
            <label className="block text-[10px] text-[#475569] mb-2 uppercase tracking-widest font-mono">
              Pool Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MARKET_TYPES.map((mt) => {
                const active = marketType === mt.value;
                return (
                  <button
                    key={mt.value}
                    onClick={() => setMarketType(mt.value)}
                    className="py-3.5 px-3 rounded-xl text-sm transition-all text-left relative"
                    style={{
                      background: active ? "rgba(26, 86, 255, 0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(26, 86, 255, 0.3)" : "rgba(255,255,255,0.06)"}`,
                      color: active ? "#93B4FF" : "#64748B",
                    }}
                  >
                    <span className="text-lg mr-1.5">{mt.icon}</span>
                    <span className="font-mono text-xs">{mt.label}</span>
                    <p className="text-[10px] text-[#475569] mt-0.5 ml-7">{mt.desc}</p>
                    {active && (
                      <motion.div
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                        style={{ background: "linear-gradient(90deg, #00E5FF, #D4FF00)" }}
                        layoutId="create-type-indicator"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Agent Selection ─── */}
          <div className="space-y-3">
            <AgentCombobox
              agents={ranked}
              selected={agentA}
              onSelect={setAgentA}
              label={isH2H ? "Agent A" : "Select Agent"}
              placeholder={isH2H ? "Choose first agent..." : "Choose an agent for this pool..."}
            />

            {isH2H && (
              <>
                <div className="flex items-center justify-center gap-3 py-1">
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <Swords className="w-4 h-4 text-[#475569]" />
                  <span className="text-[10px] text-[#475569] font-mono uppercase">vs</span>
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
                <AgentCombobox
                  agents={ranked}
                  selected={agentB}
                  onSelect={setAgentB}
                  label="Agent B"
                  placeholder="Choose second agent..."
                  excludeId={agentA?.id}
                />
              </>
            )}
          </div>

          {/* ─── Auto-Generated Question Preview ─── */}
          <div>
            <label className="block text-[10px] text-[#475569] mb-2 uppercase tracking-widest font-mono">
              Market Question (auto-generated)
            </label>
            <div
              className="rounded-xl p-4 min-h-[60px] flex items-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {question ? (
                <p className="text-sm text-[#00E5FF] font-mono leading-relaxed">{question}</p>
              ) : (
                <p className="text-sm text-[#334155] italic">
                  Select {isH2H ? "both agents" : "an agent"} to generate the market question...
                </p>
              )}
            </div>
          </div>

          {/* ─── Resolution Time Lock ─── */}
          <div>
            <label className="block text-[10px] text-[#475569] mb-2 uppercase tracking-widest font-mono">
              Resolution Time
            </label>
            {epochInfo && epochNumber ? (
              <ResolutionLock endsAt={epochInfo.endsAt} epochNumber={epochNumber} />
            ) : (
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  background: "rgba(245, 158, 11, 0.04)",
                  border: "1px solid rgba(245, 158, 11, 0.12)",
                }}
              >
                <Clock className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <p className="text-xs text-[#F59E0B]">
                  Unable to fetch epoch data. Make sure the API is running to auto-lock resolution time.
                </p>
              </div>
            )}
          </div>

          {/* ─── Seed Amount ─── */}
          <div>
            <label className="block text-[10px] text-[#475569] mb-2 uppercase tracking-widest font-mono">
              Seed Amount (optional)
            </label>
            <div className="relative">
              <input
                type="number"
                value={liquidityStr}
                onChange={(e) => setLiquidityStr(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#475569] font-mono">
                USDC
              </span>
            </div>
            <div className="flex justify-between text-[10px] mt-1.5 px-0.5">
              <span className="text-[#475569]">Seeds initial 50/50 odds</span>
              <span className="text-[#475569] font-mono">
                Balance: {isConnected ? `${balance.toFixed(2)} USDC` : "—"}
              </span>
            </div>
            {liquidityNum > balance && isConnected && (
              <p className="text-red-400 text-[10px] mt-1">Insufficient balance</p>
            )}
          </div>

          {/* ─── Action Button ─── */}
          {!isConnected ? (
            <div className="flex justify-center pt-2">
              <ConnectButton />
            </div>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isApproving || !isValid}
              className="w-full py-4 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #B45309, #92400E)",
                border: "1px solid rgba(180, 83, 9, 0.4)",
                color: "#FDE68A",
              }}
            >
              {isApproving ? (
                <>
                  <motion.span
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  APPROVING...
                </>
              ) : (
                "APPROVE USDC"
              )}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating || !isValid}
              className="w-full py-4 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: isValid
                  ? "linear-gradient(135deg, #1A56FF, #00E5FF)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${isValid ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.06)"}`,
                color: isValid ? "#fff" : "#475569",
              }}
            >
              {isValid && (
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
                />
              )}
              {isCreating ? (
                <>
                  <motion.span
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full relative z-10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="relative z-10">CREATING POOL...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">CREATE POOL</span>
                </>
              )}
            </button>
          )}

          {/* ─── Validation hints ─── */}
          {!isValid && isConnected && (
            <div className="text-[10px] text-[#475569] space-y-0.5 px-0.5">
              {!agentA && <p>Select {isH2H ? "both agents" : "an agent"} to continue</p>}
              {isH2H && agentA && !agentB && <p>Select a second agent for head-to-head</p>}
              {!isResolutionValid && epochEndsAt && <p>Epoch resolution time must be at least 1 hour from now</p>}
              {isCollateralAllowed === false && <p>USDC not whitelisted as collateral on this factory</p>}
            </div>
          )}

          <p className="text-center text-[10px] text-[#334155]">
            Parimutuel pool · Winners split the pot · On-chain settlement
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showModal && (
          <MarketCreatedModal
            open={showModal}
            question={createdQuestion}
            seedAmount={createdSeed}
            marketAddress={createdAddress}
            agents={createdAgents}
            onClose={() => setShowModal(false)}
            onCreateAnother={() => {
              setShowModal(false);
              setCreatedAddress(null);
              setAgentA(null);
              setAgentB(null);
              setLiquidityStr("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
