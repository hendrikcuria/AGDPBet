"use client";

/**
 * DecryptionCounter — Matrix-style payout reveal for high-value claims.
 *
 * When triggered, the payout text rapidly scrambles with random characters
 * for ~1.5 seconds, progressively "locking in" correct digits from left
 * to right. Finishes with a satisfying scale flash.
 *
 * Usage:
 *   <DecryptionCounter
 *     value="$592.00"
 *     active={isCelebrating}
 *     onComplete={() => setDone(true)}
 *   />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DecryptionCounterProps {
  /** The final revealed value string (e.g. "$1,234.56") */
  value: string;
  /** Set true to trigger the decryption animation */
  active: boolean;
  /** Called when the decryption finishes */
  onComplete?: () => void;
  className?: string;
  /** Total duration of the scramble in ms */
  duration?: number;
}

const SCRAMBLE_CHARS = "0123456789$,.ABCDEFGHIJKLMNOPQRSTUVWXYZ@#%&*!?";

export function DecryptionCounter({
  value,
  active,
  onComplete,
  className = "",
  duration = 1500,
}: DecryptionCounterProps) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<"idle" | "scrambling" | "done">("idle");
  const [flash, setFlash] = useState(false);
  const frameRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const startRef = useRef(0);
  const scrambleFnRef = useRef<() => void>(undefined);

  const scramble = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const progress = Math.min(elapsed / duration, 1);

    // Number of characters locked in from the left
    const lockedCount = Math.floor(progress * value.length);

    const result = value
      .split("")
      .map((ch, i) => {
        // Already locked
        if (i < lockedCount) return ch;
        // Non-numeric characters pass through immediately
        if (!/[0-9]/.test(ch)) return ch;
        // Scramble with random chars
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      })
      .join("");

    setDisplay(result);

    if (progress >= 1) {
      // Fully decrypted
      setDisplay(value);
      setPhase("done");
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      onComplete?.();
      return;
    }

    // Run at ~30fps for that rapid scramble feel
    frameRef.current = setTimeout(() => scrambleFnRef.current?.(), 33);
  }, [value, duration, onComplete]);

  // Keep ref in sync for recursive setTimeout
  useEffect(() => { scrambleFnRef.current = scramble; }, [scramble]);

  useEffect(() => {
    if (active && phase === "idle") {
      setPhase("scrambling"); // eslint-disable-line react-hooks/set-state-in-effect -- animation init
      startRef.current = Date.now();
      // Start with fully scrambled
      setDisplay(
        value
          .split("")
          .map((ch) =>
            /[0-9]/.test(ch)
              ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
              : ch,
          )
          .join(""),
      );
      frameRef.current = setTimeout(() => scrambleFnRef.current?.(), 33);
    }

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, [active, phase, scramble, value]);

  // Reset when active goes false
  useEffect(() => {
    if (!active) {
      setPhase("idle"); // eslint-disable-line react-hooks/set-state-in-effect -- animation reset
      setDisplay(value);
      setFlash(false);
    }
  }, [active, value]);

  return (
    <span className={`relative inline-block ${className}`}>
      <motion.span
        className="font-aeonik-mono inline-block"
        animate={
          flash
            ? {
                scale: [1, 1.15, 1],
                textShadow: [
                  "0 0 0px transparent",
                  "0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(0, 229, 255, 0.4)",
                  "0 0 0px transparent",
                ],
              }
            : phase === "scrambling"
              ? { opacity: [0.85, 1, 0.85] }
              : {}
        }
        transition={
          flash
            ? { duration: 0.5, ease: "easeOut" }
            : { duration: 0.15, repeat: Infinity }
        }
      >
        {display.split("").map((ch, i) => {
          const isLocked = phase === "scrambling" && display[i] === value[i];
          return (
            <span
              key={i}
              style={{
                color: phase === "done" ? "#10B981" : isLocked ? "#10B981" : undefined,
                textShadow: isLocked ? "0 0 6px rgba(16,185,129,0.4)" : undefined,
              }}
            >
              {ch}
            </span>
          );
        })}
      </motion.span>

      {/* Flash ring on completion */}
      <AnimatePresence>
        {flash && (
          <motion.span
            className="absolute inset-0 rounded-lg pointer-events-none"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              boxShadow:
                "0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(0, 229, 255, 0.25)",
            }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}
