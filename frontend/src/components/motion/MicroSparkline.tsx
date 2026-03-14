"use client";

import { useMemo, useId } from "react";
import { motion } from "motion/react";

interface MicroSparklineProps {
  /** Array of 12 multiplier data points */
  data: number[];
  /** Is the trend rising? Controls green vs red color */
  rising: boolean;
  /** Is the parent button currently hovered? */
  isHovered: boolean;
  /** Width of the sparkline SVG */
  width?: number;
  /** Height of the sparkline SVG */
  height?: number;
}

/**
 * Tiny inline sparkline for outcome buttons.
 * On hover, a glowing dot traces the path from left to right,
 * leaving a colored trail. Uses unique IDs to prevent SVG filter
 * collisions when multiple sparklines render in the same DOM.
 */
export function MicroSparkline({
  data,
  rising,
  isHovered,
  width = 44,
  height = 16,
}: MicroSparklineProps) {
  const uid = useId();
  const safeId = uid.replace(/:/g, "_");

  const color = rising ? "#10B981" : "#EF4444";

  // Build SVG path from data
  const { pathD, points } = useMemo(() => {
    if (data.length < 2) return { pathD: "", points: [] as { x: number; y: number }[] };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 1.5; // vertical padding

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: pad + (1 - (v - min) / range) * (height - pad * 2),
    }));

    // Smooth path using catmull-rom to cubic bezier conversion
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return { pathD: d, points: pts };
  }, [data, width, height]);

  if (!pathD) return null;

  // Total path length for stroke-dasharray animation
  const pathLength = points.reduce((acc, pt, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return acc + Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
  }, 0);

  // Last point for the resting glow dot
  const lastPt = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block shrink-0"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Glow filter — scoped with unique ID */}
        <filter id={`glow-${safeId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
        {/* Trail gradient for the trace animation */}
        <linearGradient id={`trail-${safeId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="60%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Base sparkline path — always visible, dim */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        opacity={isHovered ? 0.5 : 0.3}
        style={{ transition: "opacity 0.2s" }}
      />

      {/* Animated trace trail — reveals on hover */}
      {isHovered && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#trail-${safeId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ strokeDasharray: pathLength, strokeDashoffset: pathLength }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      )}

      {/* Glow layer for the trace */}
      {isHovered && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`url(#glow-${safeId})`}
          opacity={0.4}
          initial={{ strokeDasharray: pathLength, strokeDashoffset: pathLength }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      )}

      {/* Animated tracing dot — follows the path on hover */}
      {isHovered && (
        <motion.circle
          r="2"
          fill={color}
          filter={`url(#glow-${safeId})`}
          initial={{ cx: points[0]?.x ?? 0, cy: points[0]?.y ?? 0, opacity: 0 }}
          animate={{
            cx: points.map((p) => p.x),
            cy: points.map((p) => p.y),
            opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            times: points.map((_, i) => i / (points.length - 1)),
          }}
        />
      )}

      {/* Static endpoint glow dot — visible when not hovered */}
      {!isHovered && lastPt && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="1.5"
          fill={color}
          opacity={0.5}
        />
      )}
    </svg>
  );
}
