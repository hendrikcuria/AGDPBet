"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "motion/react";
import type { DisplayOutcome } from "@/lib/displayMarket";

interface TugOfWarBarProps {
  outcomes: DisplayOutcome[];
  totalPool: number;
  simulateDeposits?: boolean;
  height?: number;
  className?: string;
}

interface FlashEvent {
  id: number;
  side: "left" | "right";
  color: string;
}

export function TugOfWarBar({
  outcomes,
  totalPool,
  simulateDeposits = false,
  height = 36,
  className = "",
}: TugOfWarBarProps) {
  const left = outcomes[0];
  const right = outcomes[1];
  const hasData = !!left && !!right && totalPool > 0;

  const [simLeftExtra, setSimLeftExtra] = useState(0);
  const [simRightExtra, setSimRightExtra] = useState(0);
  const leftDeposits = (left?.totalDeposits ?? 0) + simLeftExtra;
  const rightDeposits = (right?.totalDeposits ?? 0) + simRightExtra;
  const currentTotal = leftDeposits + rightDeposits;
  const leftPct = currentTotal > 0 ? (leftDeposits / currentTotal) * 100 : 50;

  const springPct = useSpring(leftPct, { stiffness: 180, damping: 22, mass: 0.8 });

  useEffect(() => {
    springPct.set(leftPct);
  }, [leftPct, springPct]);

  const dividerLeft = useTransform(springPct, (v) => `${v}%`);

  const [flashes, setFlashes] = useState<FlashEvent[]>([]);
  const flashCounter = useRef(0);

  const triggerFlash = useCallback(
    (side: "left" | "right") => {
      const id = ++flashCounter.current;
      const color = side === "left" ? (left?.color ?? "#10B981") : (right?.color ?? "#EF4444");
      setFlashes((prev) => [...prev, { id, side, color }]);
      setTimeout(() => {
        setFlashes((prev) => prev.filter((f) => f.id !== id));
      }, 600);
    },
    [left?.color, right?.color],
  );

  // Mock deposit simulator (disabled by default for live markets)
  useEffect(() => {
    if (!simulateDeposits) return;
    const fire = () => {
      const isLeft = Math.random() > 0.45;
      const amount = Math.floor(80 + Math.random() * 600);
      if (isLeft) setSimLeftExtra((d) => d + amount);
      else setSimRightExtra((d) => d + amount);
      triggerFlash(isLeft ? "left" : "right");
    };
    const interval = setInterval(fire, 2800 + Math.random() * 2200);
    return () => clearInterval(interval);
  }, [simulateDeposits, triggerFlash]);

  if (!hasData) return null;

  const leftDisplay = currentTotal > 0 ? ((leftDeposits / currentTotal) * 100).toFixed(1) : "50.0";
  const rightDisplay = currentTotal > 0 ? ((rightDeposits / currentTotal) * 100).toFixed(1) : "50.0";

  return (
    <div className={`relative select-none ${className}`}>
      {/* Labels */}
      <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: left.color }} />
          <span className="text-[#CBD5E1] truncate max-w-[100px]">{left.label}</span>
          <span style={{ color: left.color }}>{leftDisplay}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: right.color }}>{rightDisplay}%</span>
          <span className="text-[#CBD5E1] truncate max-w-[100px]">{right.label}</span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: right.color }} />
        </div>
      </div>

      {/* Bar container */}
      <div className="relative rounded-lg overflow-hidden" style={{ height }}>
        <motion.div className="absolute inset-y-0 left-0 rounded-l-lg" style={{ width: dividerLeft, backgroundColor: left.color, opacity: 0.2 }} />
        <motion.div className="absolute inset-y-0 right-0 rounded-r-lg" style={{ left: dividerLeft, right: 0, backgroundColor: right.color, opacity: 0.2 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)" }} />

        {/* Center divider — neon glow */}
        <motion.div className="absolute top-0 bottom-0 z-10" style={{ left: dividerLeft, width: 3, x: "-50%" }}>
          <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(180deg, #00E5FF, #D4FF00)", boxShadow: "0 0 8px rgba(0,229,255,0.6), 0 0 16px rgba(0,229,255,0.3), 0 0 32px rgba(212,255,0,0.15)" }} />
          <div className="absolute -inset-x-2 inset-y-1 rounded-full pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,229,255,0.15), rgba(212,255,0,0.1))", filter: "blur(4px)" }} />
        </motion.div>

        {/* Flash overlays */}
        <AnimatePresence>
          {flashes.map((flash) => (
            <motion.div
              key={flash.id}
              className="absolute inset-y-0 pointer-events-none z-[5]"
              style={{ left: flash.side === "left" ? 0 : undefined, right: flash.side === "right" ? 0 : undefined, width: "50%" }}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <div
                className="w-full h-full"
                style={{
                  background: flash.side === "left"
                    ? `radial-gradient(ellipse at 70% 50%, ${flash.color}40, transparent 70%)`
                    : `radial-gradient(ellipse at 30% 50%, ${flash.color}40, transparent 70%)`,
                  boxShadow: `inset 0 0 30px ${flash.color}30`,
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Momentum arrows */}
        <motion.div
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none z-10"
          style={{ color: left.color }}
          animate={{ x: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {left.label.slice(0, 3)}
        </motion.div>
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none z-10"
          style={{ color: right.color }}
          animate={{ x: [0, 3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {right.label.slice(0, 3)}
        </motion.div>
      </div>
    </div>
  );
}
