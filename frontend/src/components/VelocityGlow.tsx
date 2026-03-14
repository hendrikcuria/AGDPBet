"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

interface VelocityGlowProps {
  velocityScore: number;
  className?: string;
}

export function VelocityGlow({ velocityScore, className = "" }: VelocityGlowProps) {
  const config = useMemo(() => {
    const score = Math.max(0, Math.min(100, velocityScore));

    if (score >= 70) {
      return {
        color1: `rgba(255, 100, 50, ${0.06 + (score - 70) * 0.003})`,
        color2: `rgba(200, 50, 180, ${0.04 + (score - 70) * 0.002})`,
        duration: 2.5,
        opacityRange: [0.4, 1] as [number, number],
      };
    } else if (score >= 40) {
      return {
        color1: `rgba(255, 180, 50, ${0.04 + (score - 40) * 0.001})`,
        color2: `rgba(0, 229, 255, ${0.03 + (score - 40) * 0.001})`,
        duration: 3.5,
        opacityRange: [0.3, 0.8] as [number, number],
      };
    } else {
      return {
        color1: `rgba(0, 229, 255, ${0.03 + score * 0.001})`,
        color2: `rgba(26, 86, 255, ${0.02 + score * 0.0005})`,
        duration: 5,
        opacityRange: [0.2, 0.6] as [number, number],
      };
    }
  }, [velocityScore]);

  if (velocityScore <= 5) return null;

  return (
    <motion.div
      className={`absolute inset-0 rounded-xl pointer-events-none z-0 ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${config.color1} 0%, ${config.color2} 40%, transparent 70%)`,
      }}
      animate={{
        opacity: config.opacityRange,
      }}
      transition={{
        duration: config.duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    />
  );
}
