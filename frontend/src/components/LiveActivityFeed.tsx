"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { AgdpIcon, WhaleIcon } from "./icons/IconMap";
import { useGlobalEvents } from "@/hooks/useGlobalEvents";

export interface LiveDeposit {
  id: string;
  address: string;
  outcomeLabel: string;
  amount: number;
  timestamp: number;
  agentSymbol?: string;
  marketAddress?: string;
}

const WHALE_THRESHOLD = 5000;
const MAX_VISIBLE = 6;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function LiveActivityFeed() {
  const { deposits, isLoading } = useGlobalEvents();
  const [isVisible, setIsVisible] = useState(true);
  const isMobile = useIsMobile();
  const router = useRouter();

  if (!isVisible) {
    return (
      <motion.button
        onClick={() => setIsVisible(true)}
        className={`fixed z-40 w-10 h-10 rounded-full bg-[#131C2D] border border-[#1E293B] flex items-center justify-center text-[#64748B] hover:text-white hover:border-[#1A56FF]/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] ${
          isMobile ? "bottom-16 right-3" : "bottom-6 right-6"
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        title="Show live feed"
      >
        <AgdpIcon name="signal-broadcast" size={16} />
      </motion.button>
    );
  }

  if (isMobile) {
    const latest = deposits[0];
    if (!latest && !isLoading) return null;
    if (!latest) {
      return (
        <motion.div
          className="fixed bottom-14 left-0 right-0 z-40 pointer-events-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mx-2 flex items-center gap-2 bg-[#0B0F19]/90 backdrop-blur-xl border border-[#1E293B]/60 rounded-lg px-3 py-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#1A56FF]"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <p className="text-[10px] text-[#475569] font-mono">Waiting for activity...</p>
            <button onClick={() => setIsVisible(false)} className="text-[#475569] active:text-white shrink-0">
              <span className="text-[9px]">&times;</span>
            </button>
          </div>
        </motion.div>
      );
    }

    const isWhale = latest.amount >= WHALE_THRESHOLD;
    return (
      <motion.div
        className="fixed bottom-14 left-0 right-0 z-40 pointer-events-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-2 flex items-center gap-2 bg-[#0B0F19]/90 backdrop-blur-xl border border-[#1E293B]/60 rounded-lg px-3 py-2">
          <motion.div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWhale ? "bg-[#10B981]" : "bg-[#1A56FF]"}`}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={latest.id}
              className="flex-1 min-w-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {latest.marketAddress ? (
                <Link href={`/markets/${latest.marketAddress}`} className="block text-[10px] text-[#94A3B8] font-mono truncate active:opacity-70">
                  <span className="text-[#1A56FF]">{shortenAddress(latest.address)}</span>
                  {" \u2192 "}
                  <span className={isWhale ? "text-[#10B981]" : "text-white"}>
                    {latest.amount >= 1000 ? `${(latest.amount / 1000).toFixed(1)}K` : latest.amount.toLocaleString()}
                  </span>
                  {" USDC on "}
                  <span className="text-[#CBD5E1]">{latest.outcomeLabel}</span>
                </Link>
              ) : (
                <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                  <span className="text-[#1A56FF]">{shortenAddress(latest.address)}</span>
                  {" \u2192 "}
                  <span className={isWhale ? "text-[#10B981]" : "text-white"}>
                    {latest.amount >= 1000 ? `${(latest.amount / 1000).toFixed(1)}K` : latest.amount.toLocaleString()}
                  </span>
                  {" USDC on "}
                  <span className="text-[#CBD5E1]">{latest.outcomeLabel}</span>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
          <button onClick={() => setIsVisible(false)} className="text-[#475569] active:text-white shrink-0">
            <span className="text-[9px]">&times;</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 pointer-events-none">
      <div className="flex items-center justify-between mb-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-[#10B981]"
            animate={{ opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] text-[#64748B] uppercase tracking-widest font-mono">Live Feed</span>
        </div>
        <button onClick={() => setIsVisible(false)} className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors">
          Hide
        </button>
      </div>

      <div className="space-y-2 overflow-hidden rounded-xl border border-cyan-500/20 bg-[#0B0F19]/70 backdrop-blur-md p-2 shadow-[0_0_20px_rgba(0,229,255,0.06)] pointer-events-auto">
        {deposits.length === 0 && (
          <motion.div className="px-3 py-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.p
              className="text-[10px] text-[#475569] font-mono tracking-wider"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {isLoading ? "loading live transactions..." : "no activity yet \u2014 place the first bet!"}
            </motion.p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {deposits.slice(0, MAX_VISIBLE).map((item, i) => {
            const isWhale = item.amount >= WHALE_THRESHOLD;
            const opacity = 1 - i * 0.12;
            const hasLink = !!item.marketAddress;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: Math.max(0.3, opacity), y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.92, filter: "blur(4px)" }}
                transition={{
                  type: "spring", stiffness: 400, damping: 28, mass: 0.8,
                  layout: { type: "spring", stiffness: 350, damping: 30 },
                }}
                onClick={hasLink ? () => router.push(`/markets/${item.marketAddress}`) : undefined}
                className={`pointer-events-auto rounded-lg px-3 py-2.5 backdrop-blur-xl border transition-colors duration-200 group ${
                  hasLink ? "cursor-pointer hover:bg-white/[0.04] hover:border-white/10" : ""
                } ${
                  isWhale
                    ? "bg-[#0B0F19]/90 border-[#10B981]/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                    : "bg-[#0B0F19]/80 border-[#1E293B]/50"
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] leading-relaxed">
                  <motion.div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWhale ? "bg-[#10B981]" : "bg-[#1A56FF]"}`}
                    animate={isWhale ? { scale: [1, 1.4, 1] } : {}}
                    transition={isWhale ? { duration: 0.8, repeat: 2 } : {}}
                  />
                  <div className="flex-1 min-w-0 truncate">
                    {isWhale && <WhaleIcon size={13} className="inline-block mr-1 text-[#10B981] align-middle" glowColor="rgba(16,185,129,0.5)" />}
                    <span className="text-[#1A56FF] font-mono">{shortenAddress(item.address)}</span>
                    <span className="text-[#64748B]"> dropped </span>
                    <span
                      className={`font-mono ${isWhale ? "text-[#10B981]" : item.amount >= 2000 ? "text-[#00E5FF]" : "text-white"}`}
                      style={isWhale ? { textShadow: "0 0 6px rgba(16,185,129,0.5), 0 0 12px rgba(16,185,129,0.2)" } : undefined}
                    >
                      {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}K` : item.amount.toLocaleString()}
                    </span>
                    <span className="text-[#64748B]"> USDC on </span>
                    <span className="text-[#CBD5E1]">{item.outcomeLabel}</span>
                  </div>
                  {hasLink && (
                    <ChevronRight className="w-3 h-3 shrink-0 text-[#475569] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 ml-3.5">
                  <motion.div className="w-1 h-1 rounded-full bg-[#475569]" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: (item.id.charCodeAt(0) % 10) / 10 }} />
                  <span className="text-[9px] text-[#475569] font-mono">{timeAgo(item.timestamp)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
