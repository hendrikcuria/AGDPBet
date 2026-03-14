"use client";

/**
 * IconMap — Central SVG icon system for AGDPBet.
 *
 * Every icon uses `currentColor` for stroke/fill so Tailwind text-color
 * utilities control them. Stroke width is consistent at 1.5px or 2px.
 *
 * Usage:
 *   <AgdpIcon name="whale" className="w-4 h-4 text-[#10B981]" />
 *   <AgdpIcon name="trophy" size={20} />
 */

import { type SVGProps, type ReactNode } from "react";
import { motion } from "motion/react";

/* ─── Types ─── */

export type IconName =
  | "trophy" | "grid-hash" | "swords" | "sprout"
  | "whale-diamond" | "signal-broadcast"
  | "sunrise" | "diamond-stack" | "flame" | "gem-faceted"
  | "globe-nodes" | "crosshair" | "crown" | "bolt" | "wings" | "lock"
  | "check-confirmed" | "share-x" | "avatar-hex" | "claim-burst";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
}

/* ─── Path definitions — all designed on a 24×24 viewBox ─── */

const iconPaths: Record<IconName, ReactNode> = {
  trophy: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" /><path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 7H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" />
      <path d="M17 7h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
      <path d="M12 4v2" />
    </g>
  ),
  "grid-hash": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
      <path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
    </g>
  ),
  swords: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" />
      <path d="M9.5 17.5 21 6V3h-3L6.5 14.5" /><path d="M11 19l-6-6" /><path d="M8 16l-4 4" />
    </g>
  ),
  sprout: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" /><path d="M6 12c0-4.4 2.7-8 6-8" /><path d="M18 12c0-4.4-2.7-8-6-8" />
      <path d="M3 12c2.5 0 4.5-1.3 6-3.5" /><path d="M21 12c-2.5 0-4.5-1.3-6-3.5" />
    </g>
  ),
  "whale-diamond": (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L20 10 L12 22 L4 10 Z" /><path d="M4 10h16" />
      <path d="M12 2l4 8" /><path d="M12 2l-4 8" /><path d="M8 10l4 12" /><path d="M16 10l-4 12" />
    </g>
  ),
  "signal-broadcast": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" /><path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
    </g>
  ),
  sunrise: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" /><path d="M4.93 7.93l2.83 2.83" /><path d="M19.07 7.93l-2.83 2.83" />
      <path d="M2 16h20" /><path d="M6 16a6 6 0 0 1 12 0" /><path d="M2 20h20" />
    </g>
  ),
  "diamond-stack": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L18 8L12 16L6 8Z" /><path d="M6 8h12" /><path d="M9 19l3-3 3 3" /><path d="M8 22l4-3 4 3" />
    </g>
  ),
  flame: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c-4-2-8-6-8-11a8.2 8.2 0 0 1 8-8c1.5 0 2.5.5 4 2 1.5-1.5 2.5-2 4-2a8.2 8.2 0 0 1 0 4c0 5-4 9-8 11z" />
      <path d="M12 22c-1.5-2-3-5-3-8a3 3 0 0 1 6 0c0 3-1.5 6-3 8z" />
    </g>
  ),
  "gem-faceted": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" /><path d="M2 9h20" />
      <path d="M12 22l4-13" /><path d="M12 22l-4-13" /><path d="M6 3l4 6" /><path d="M18 3l-4 6" />
    </g>
  ),
  "globe-nodes": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
      <circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="19" cy="8" r="1" fill="currentColor" />
      <circle cx="7" cy="18" r="1" fill="currentColor" />
    </g>
  ),
  crosshair: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" /><path d="M12 18v4" /><path d="M2 12h4" /><path d="M18 12h4" />
    </g>
  ),
  crown: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17l3-10 5 6 2-10 2 10 5-6 3 10z" /><path d="M2 17h20v3H2z" />
    </g>
  ),
  bolt: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </g>
  ),
  wings: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12C8 8 2 6 2 10s4 6 10 8" /><path d="M12 12c4-4 10-6 10-2s-4 6-10 8" />
      <path d="M12 12v8" /><path d="M10 22h4" />
    </g>
  ),
  lock: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </g>
  ),
  "check-confirmed": (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
    </g>
  ),
  "share-x": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l8-8v5c8 0 8 4 8 11-2-4-4-5.5-8-5.5V20z" />
    </g>
  ),
  "avatar-hex": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" /><circle cx="12" cy="10" r="3" />
      <path d="M7 19.5a6 6 0 0 1 10 0" />
    </g>
  ),
  "claim-burst": (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4" /><path d="M12 18v4" /><path d="M2 12h4" /><path d="M18 12h4" />
      <path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" />
      <path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
    </g>
  ),
};

/* ─── Static Icon Component ─── */

export function AgdpIcon({ name, size = 16, className = "", ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      {iconPaths[name]}
    </svg>
  );
}

/* ─── Animated Icon Wrappers ─── */

export function ShareIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <motion.span className={`inline-flex items-center justify-center ${className}`}
      whileHover={{ rotate: 15, scale: 1.1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
      <AgdpIcon name="share-x" size={size} />
    </motion.span>
  );
}

export function ClaimIcon({ size = 16, className = "", active = false }: { size?: number; className?: string; active?: boolean }) {
  return (
    <motion.span className={`inline-flex items-center justify-center relative ${className}`}
      animate={active ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.5, ease: "easeOut" }}>
      <AgdpIcon name="claim-burst" size={size} />
      {active && (
        <motion.span className="absolute inset-0 rounded-full"
          initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ boxShadow: "0 0 12px currentColor, 0 0 24px currentColor" }} />
      )}
    </motion.span>
  );
}

export function WhaleIcon({ size = 16, className = "", glowColor = "rgba(16,185,129,0.5)" }: { size?: number; className?: string; glowColor?: string }) {
  return (
    <motion.span className={`inline-flex items-center justify-center ${className}`}
      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      style={{ filter: `drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 0 8px ${glowColor})` }}>
      <AgdpIcon name="whale-diamond" size={size} />
    </motion.span>
  );
}
