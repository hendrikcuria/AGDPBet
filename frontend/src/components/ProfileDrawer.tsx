"use client";

import { useRef, useCallback, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { X, Copy, Check, Volume2, VolumeX } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { AgdpIcon, type IconName } from "./icons/IconMap";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { shortenAddress } from "@/lib/utils";
import { useIsMounted } from "@/hooks/useIsMounted";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  unlocked: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const ALL_BADGES: Badge[] = [
  { id: "early-adopter", name: "Early Adopter", description: "Deposited in the first 5 epochs", icon: "sunrise", unlocked: false, rarity: "rare" },
  { id: "whale", name: "Whale", description: "Single deposit over 10,000 USDC", icon: "diamond-stack", unlocked: false, rarity: "epic" },
  { id: "streak-3", name: "3-Epoch Streak", description: "Won in 3 consecutive epochs", icon: "flame", unlocked: false, rarity: "rare" },
  { id: "diamond-hands", name: "Diamond Hands", description: "Held position through a 50%+ swing", icon: "gem-faceted", unlocked: false, rarity: "legendary" },
  { id: "diversifier", name: "Diversifier", description: "Deposited into 5+ markets in one epoch", icon: "globe-nodes", unlocked: false, rarity: "common" },
  { id: "sharpshooter", name: "Sharpshooter", description: "Win rate above 75% over 10+ markets", icon: "crosshair", unlocked: false, rarity: "epic" },
  { id: "volume-king", name: "Volume King", description: "Total volume exceeds 100,000 USDC", icon: "crown", unlocked: false, rarity: "legendary" },
  { id: "speed-demon", name: "Speed Demon", description: "Deposited within 60s of market opening", icon: "bolt", unlocked: false, rarity: "rare" },
  { id: "social-butterfly", name: "Social Butterfly", description: "Shared 10+ receipts on X", icon: "wings", unlocked: false, rarity: "common" },
];

const RARITY_COLORS: Record<Badge["rarity"], string> = {
  common: "#64748B", rare: "#1A56FF", epic: "#A855F7", legendary: "#D4FF00",
};

const RARITY_GLOW: Record<Badge["rarity"], string> = {
  common: "rgba(100,116,139,0.15)", rare: "rgba(26,86,255,0.2)", epic: "rgba(168,85,247,0.2)", legendary: "rgba(212,255,0,0.25)",
};

function BadgeCard({ badge }: { badge: Badge }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const transform = useTransform(
    [rotateX, rotateY],
    ([rx, ry]: number[]) => `perspective(400px) rotateX(${rx}deg) rotateY(${ry}deg)`
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!badge.unlocked) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 20);
    rotateX.set(-y * 15);
  }, [rotateX, rotateY, badge.unlocked]);

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  }, [rotateX, rotateY]);

  const rarityColor = RARITY_COLORS[badge.rarity];
  const rarityGlow = RARITY_GLOW[badge.rarity];

  return (
    <motion.div
      ref={cardRef}
      className={`relative rounded-xl p-3 cursor-default transition-all ${badge.unlocked ? "border cursor-pointer" : "border border-[#1E293B]/50"}`}
      style={badge.unlocked ? { transform, borderColor: `${rarityColor}30`, background: `linear-gradient(135deg, rgba(11,15,25,0.8), rgba(19,28,45,0.6))`, boxShadow: isHovered ? `0 0 20px ${rarityGlow}, 0 0 40px ${rarityGlow}` : `0 0 10px ${rarityGlow}` } : { background: "rgba(11,15,25,0.4)", backdropFilter: "blur(8px)" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileHover={badge.unlocked ? { scale: 1.05 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="text-center mb-1.5">
        <AgdpIcon name={badge.icon} className={`text-2xl ${badge.unlocked ? "" : "grayscale opacity-30"}`} style={badge.unlocked ? { filter: `drop-shadow(0 0 4px ${rarityGlow})` } : undefined} />
      </div>
      <p className={`text-[10px] text-center truncate ${badge.unlocked ? "text-white" : "text-[#475569]"}`}>{badge.name}</p>
      <div className="flex justify-center mt-1">
        <span className="text-[8px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-full" style={badge.unlocked ? { color: rarityColor, backgroundColor: `${rarityColor}15` } : { color: "#475569" }}>
          {badge.rarity}
        </span>
      </div>
      {!badge.unlocked && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center">
          <AgdpIcon name="lock" size={18} className="text-[#475569]" />
        </div>
      )}
    </motion.div>
  );
}

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function ProfileDrawer({ open, onClose, soundEnabled, onToggleSound }: ProfileDrawerProps) {
  const { address } = useAccount();
  const mounted = useIsMounted();
  const [copied, setCopied] = useState(false);

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!address },
  });

  const balance = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0;
  const badges = ALL_BADGES; // All locked until backend exists
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddr = address ? shortenAddress(address) : "---";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="fixed top-0 right-0 bottom-0 z-[95] w-full sm:max-w-sm bg-[#0B0F19] border-l border-[#1E293B] overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100 || info.velocity.x > 300) onClose();
            }}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#1E293B]" />
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-lg">Degen Profile</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#131C2D] border border-[#1E293B] text-[#64748B] hover:text-white active:scale-95 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #00E5FF, #D4FF00)", boxShadow: "0 0 20px rgba(0,229,255,0.2)" }}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <AgdpIcon name="avatar-hex" size={24} className="text-[#0B0F19]" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[#64748B] text-xs font-mono">{mounted ? shortAddr : "---"}</span>
                    <button onClick={handleCopy} className="text-[#475569] hover:text-white transition-colors">
                      {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <motion.div className="bg-[#131C2D] rounded-xl p-4 mb-5 border border-[#1E293B]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Wallet Balance</p>
                <p className="text-2xl text-white font-mono">
                  {mounted ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}{" "}
                  <span className="text-[#64748B] text-sm">USDC</span>
                </p>
              </motion.div>

              <motion.div className="grid grid-cols-2 gap-3 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <StatBlock label="Win Rate" value="---" color="#475569" />
                <StatBlock label="Total Volume" value="$0" color="#475569" />
                <StatBlock label="P/L" value="$0" color="#475569" />
                <StatBlock label="Best Mult." value="---" color="#475569" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-sm">Achievements</h3>
                  <span className="text-[10px] text-[#64748B] font-mono">{unlockedCount}/{badges.length} unlocked</span>
                </div>
                <div className="h-1 bg-[#1E293B] rounded-full mb-4 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #00E5FF, #D4FF00)" }} initial={{ width: 0 }} animate={{ width: `${(unlockedCount / badges.length) * 100}%` }} transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {badges.map((badge, i) => (
                    <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.04 }}>
                      <BadgeCard badge={badge} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div className="mt-6 pt-5 border-t border-[#1E293B]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <button onClick={onToggleSound} className="flex items-center gap-3 text-sm text-[#64748B] hover:text-white transition-colors w-full">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>UI Sounds {soundEnabled ? "On" : "Off"}</span>
                  <div className={`ml-auto w-8 h-[18px] rounded-full relative transition-colors ${soundEnabled ? "bg-[#1A56FF]" : "bg-[#1E293B]"}`}>
                    <motion.div className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white" animate={{ left: soundEnabled ? 16 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  </div>
                </button>
              </motion.div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-3 border border-white/5 backdrop-blur-sm relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 30% 0%, ${color}08 0%, transparent 70%), linear-gradient(135deg, rgba(19,28,45,0.8) 0%, rgba(11,15,25,0.6) 100%)` }}
    >
      <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-mono" style={{ color }}>{value}</p>
    </div>
  );
}
