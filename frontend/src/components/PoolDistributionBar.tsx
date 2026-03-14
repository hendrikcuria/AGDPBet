"use client";

import { motion } from "motion/react";

interface PoolDistributionBarProps {
  yesPool: number;
  noPool: number;
  className?: string;
}

/**
 * Simple horizontal bar showing YES/NO pool distribution.
 * Replaces the old ProbabilityBar.
 */
export function PoolDistributionBar({ yesPool, noPool, className = "" }: PoolDistributionBarProps) {
  const total = yesPool + noPool;
  if (total <= 0) {
    return (
      <div className={`h-2 rounded-full bg-[#1E293B] ${className}`} />
    );
  }

  const yesPct = (yesPool / total) * 100;

  return (
    <div className={`relative h-2 rounded-full overflow-hidden bg-[#1E293B] ${className}`}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: "linear-gradient(90deg, #10B981, #10B981)",
        }}
        initial={{ width: "50%" }}
        animate={{ width: `${yesPct}%` }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 rounded-full"
        style={{
          background: "#EF4444",
          opacity: 0.6,
        }}
        initial={{ width: "50%" }}
        animate={{ width: `${100 - yesPct}%` }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      />
    </div>
  );
}
