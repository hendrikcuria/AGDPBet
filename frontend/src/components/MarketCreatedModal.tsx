"use client";

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { AgentHexAvatar } from "./AgentHexAvatar";
import type { AgentMetrics } from "@/hooks/useAgentData";
import { useState } from "react";

/* ─── X (Twitter) SVG Icon ─── */

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* ─── Types ─── */

interface MarketCreatedModalProps {
  open: boolean;
  question: string;
  seedAmount: string;
  marketAddress: `0x${string}` | null;
  agents: AgentMetrics[];
  onClose: () => void;
  onCreateAnother: () => void;
}

/* ─── 3D Tilt Card ─── */

function TiltCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  });
  const sheenX = useTransform(mouseX, [0, 1], [-100, 100]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        transformStyle: "preserve-3d",
      }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Metallic sheen overlay */}
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: useTransform(
            sheenX,
            (x) =>
              `linear-gradient(105deg, transparent ${x - 40}%, rgba(255,255,255,0.06) ${x - 10}%, rgba(255,255,255,0.12) ${x}%, rgba(255,255,255,0.06) ${x + 10}%, transparent ${x + 40}%)`,
          ),
        }}
      />

      {/* Animated border gradient */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-0"
        style={{
          padding: "1px",
          background: "linear-gradient(135deg, rgba(0,229,255,0.3), rgba(26,86,255,0.3), rgba(212,255,0,0.2), rgba(0,229,255,0.3))",
          backgroundSize: "300% 300%",
          animation: "gradient-rotate 4s linear infinite",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />

      {/* Card content */}
      <div
        className="relative z-[1] rounded-2xl p-6 sm:p-8"
        style={{
          background: "linear-gradient(145deg, rgba(19, 28, 45, 0.98), rgba(11, 15, 25, 0.98))",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ─── Modal ─── */

export function MarketCreatedModal({
  open,
  question,
  seedAmount,
  marketAddress,
  agents,
  onClose,
  onCreateAnother,
}: MarketCreatedModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const marketUrl = marketAddress
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/markets/${marketAddress}`
    : "";

  const tweetText = encodeURIComponent(
    `I just launched a new parimutuel pool on AGDP:\n\n"${question}"\n\n\u2696\uFE0F Back your agent here:`,
  );
  const tweetUrl = encodeURIComponent(marketUrl);
  const twitterIntent = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(marketUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewPool = () => {
    if (marketAddress) {
      router.push(`/markets/${marketAddress}`);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <TiltCard>
          {/* Success header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(0,229,255,0.15))",
                border: "1px solid rgba(16,185,129,0.3)",
                boxShadow: "0 0 30px rgba(16,185,129,0.15)",
              }}
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl"
              >
                ⚡
              </motion.span>
            </motion.div>
            <h2 className="text-white text-xl font-aeonik-ext">Pool Deployed!</h2>
            <p className="text-[#64748B] text-xs mt-1 font-mono">On-chain & ready for action</p>
          </div>

          {/* Agent avatars */}
          {agents.length > 0 && (
            <div className="flex items-center justify-center gap-3 mb-5">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <AgentHexAvatar name={agent.name} size={32} src={agent.profilePic} />
                  <div>
                    <p className="text-xs text-white">{agent.name}</p>
                    {agent.tokenSymbol && (
                      <p className="text-[10px] text-[#64748B] font-mono">${agent.tokenSymbol}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Question preview */}
          <div
            className="rounded-xl p-4 mb-5"
            style={{
              background: "rgba(0, 229, 255, 0.04)",
              border: "1px solid rgba(0, 229, 255, 0.1)",
            }}
          >
            <p className="text-sm text-[#00E5FF] font-mono leading-relaxed">&quot;{question}&quot;</p>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between px-1 mb-6">
            {seedAmount && parseFloat(seedAmount) > 0 && (
              <div>
                <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">Seed</p>
                <p className="text-sm text-white font-mono">{seedAmount} USDC</p>
              </div>
            )}
            {marketAddress && (
              <div className="text-right">
                <p className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">Contract</p>
                <button
                  onClick={handleCopyLink}
                  className="text-sm text-[#93B4FF] font-mono flex items-center gap-1 hover:text-white transition-colors"
                >
                  {marketAddress.slice(0, 6)}...{marketAddress.slice(-4)}
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            {/* View Pool — primary */}
            <button
              onClick={handleViewPool}
              disabled={!marketAddress}
              className="w-full py-3.5 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #1A56FF, #00E5FF)",
                color: "#fff",
              }}
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
              />
              <ExternalLink className="w-4 h-4 relative z-10" />
              <span className="relative z-10">VIEW YOUR POOL</span>
            </button>

            {/* Share on X */}
            <a
              href={twitterIntent}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#CBD5E1",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "#CBD5E1";
              }}
            >
              <XIcon className="w-4 h-4" />
              SHARE ON X
            </a>

            {/* Create Another */}
            <button
              onClick={() => {
                onCreateAnother();
                onClose();
              }}
              className="w-full py-2.5 text-xs text-[#64748B] hover:text-white transition-colors font-mono"
            >
              Create Another Pool
            </button>
          </div>
        </TiltCard>
      </motion.div>

      {/* CSS for gradient animation */}
      <style jsx global>{`
        @keyframes gradient-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.div>
  );
}
