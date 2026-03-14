"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Lock } from "lucide-react";

const URGENCY_THRESHOLD_MS = 4 * 3600000;

interface UrgencyBannerProps {
  endTime: number; // ms timestamp
  onLocked?: () => void;
}

function formatDigitalTime(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
}

function useGlitchFragments(count: number) {
  // Deterministic pseudo-random values based on index (avoids Math.random in render)
  const hash = (idx: number, offset: number) => ((idx * 2654435761 + offset) >>> 0) / 4294967296;
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (hash(i, 1) - 0.5) * 400,
        y: (hash(i, 2) - 0.5) * 300,
        rotate: (hash(i, 3) - 0.5) * 90,
        scale: hash(i, 4) * 0.5,
        delay: hash(i, 5) * 0.15,
      })),
    [count],
  );
}

export function UrgencyBanner({ endTime, onLocked }: UrgencyBannerProps) {
  const [remaining, setRemaining] = useState(URGENCY_THRESHOLD_MS + 1);
  const [isLocked, setIsLocked] = useState(false);
  const [isShattering, setIsShattering] = useState(false);
  const hasLockedRef = useRef(false);
  const fragments = useGlitchFragments(8);

  const tick = useCallback(() => {
    const diff = endTime - Date.now();
    setRemaining(diff);
    if (diff <= 0 && !hasLockedRef.current) {
      hasLockedRef.current = true;
      setIsShattering(true);
      setTimeout(() => {
        setIsShattering(false);
        setIsLocked(true);
        onLocked?.();
      }, 600);
    }
  }, [endTime, onLocked]);

  useEffect(() => {
    tick(); // eslint-disable-line react-hooks/set-state-in-effect -- timer init
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [tick]);

  if (remaining > URGENCY_THRESHOLD_MS && !isLocked && !isShattering) return null;

  const intensity = Math.max(0, Math.min(1, 1 - remaining / URGENCY_THRESHOLD_MS));
  const pulseSpeed = 2.5 - intensity * 1.8;

  return (
    <AnimatePresence mode="wait">
      {isLocked ? (
        <motion.div
          key="locked"
          className="relative rounded-xl overflow-hidden mb-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <div className="bg-gradient-to-r from-[#1E293B] via-[#1E293B] to-[#1E293B] border border-[#475569]/30 rounded-xl px-4 py-3 flex items-center justify-center gap-3">
            <Lock className="w-4 h-4 text-[#64748B]" />
            <span className="text-sm text-[#94A3B8] font-mono">Pool Locked — Deposits Closed</span>
            <Lock className="w-4 h-4 text-[#64748B]" />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="urgency"
          className="relative rounded-xl overflow-hidden mb-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={isShattering ? { opacity: 0, scale: 1.05 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence>
            {isShattering && (
              <>
                {fragments.map((frag, i) => (
                  <motion.div
                    key={`shard-${i}`}
                    className="absolute inset-0 rounded-xl overflow-hidden"
                    style={{ clipPath: `polygon(${i * 12.5}% 0%, ${(i + 1) * 12.5}% 0%, ${(i + 1) * 12.5}% 100%, ${i * 12.5}% 100%)` }}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: frag.x, y: frag.y, rotate: frag.rotate, opacity: 0, scale: frag.scale }}
                    transition={{ duration: 0.5, delay: frag.delay, ease: [0.36, 0, 0.66, -0.56] }}
                  >
                    <div className="w-full h-full bg-gradient-to-r from-[#FF6B00] via-[#EF4444] to-[#DC2626]" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          {!isShattering && (
            <div
              className="relative border rounded-xl px-4 py-3"
              style={{
                background: `linear-gradient(135deg, rgba(255,107,0,${0.08 + intensity * 0.12}), rgba(239,68,68,${0.08 + intensity * 0.12}), rgba(220,38,38,${0.06 + intensity * 0.1}))`,
                borderColor: `rgba(239,68,68,${0.2 + intensity * 0.3})`,
                boxShadow: `0 0 ${15 + intensity * 25}px rgba(239,68,68,${0.05 + intensity * 0.15})`,
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                  boxShadow: [
                    `inset 0 0 20px rgba(239,68,68,0)`,
                    `inset 0 0 30px rgba(239,68,68,${0.08 + intensity * 0.12})`,
                    `inset 0 0 15px rgba(239,68,68,${0.02 + intensity * 0.04})`,
                    `inset 0 0 25px rgba(239,68,68,${0.06 + intensity * 0.1})`,
                    `inset 0 0 20px rgba(239,68,68,0)`,
                  ],
                }}
                transition={{ duration: pulseSpeed, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.3, 0.45, 1] }}
              />

              <div className="flex items-center justify-between gap-4 relative z-[1]">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1, 1.15, 1], opacity: [0.7, 1, 0.7, 1, 0.7] }}
                    transition={{ duration: pulseSpeed, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.3, 0.45, 1] }}
                  >
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  </motion.div>
                  <span className="text-xs text-[#FCA5A5]">Pool Closing Soon</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#F87171]/60 hidden sm:inline">Deposits lock in</span>
                  <motion.span
                    className="font-mono text-sm tracking-wider"
                    style={{
                      color: intensity > 0.85 ? "#EF4444" : intensity > 0.5 ? "#F87171" : "#FCA5A5",
                      textShadow: intensity > 0.7 ? `0 0 ${8 + intensity * 12}px rgba(239,68,68,${0.3 + intensity * 0.4})` : "none",
                    }}
                    animate={intensity > 0.9 ? { opacity: [1, 0.5, 1] } : {}}
                    transition={intensity > 0.9 ? { duration: 0.5, repeat: Infinity } : {}}
                  >
                    {formatDigitalTime(Math.max(0, remaining))}
                  </motion.span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
