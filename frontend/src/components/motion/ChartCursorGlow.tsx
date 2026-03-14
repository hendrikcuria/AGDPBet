"use client";

import { useRef, useState, useCallback, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "motion/react";

/* ────────────────────────────────────────────────
 * Color zone system — maps Y position to semantic
 * trading colors with smooth crossfade via useTransform.
 *
 * Zone layout (top→bottom of chart):
 *  0.00 – 0.35  →  Field / bearish  (electric red #EF4444)
 *  0.35 – 0.65  →  Neutral          (core blue  #1A56FF)
 *  0.65 – 1.00  →  Ethy / bullish   (neon green #10B981)
 * ──────────────────────────────────────────────── */

// Pre-computed RGBA tuples for performant interpolation
const COLORS = {
  green: { r: 16, g: 185, b: 129 },  // #10B981
  blue: { r: 26, g: 86, b: 255 },    // #1A56FF
  red: { r: 239, g: 68, b: 68 },     // #EF4444
  cyan: { r: 0, g: 229, b: 255 },    // #00E5FF
} as const;

function lerp3(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  const ct = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * ct),
    g: Math.round(a.g + (b.g - a.g) * ct),
    b: Math.round(a.b + (b.b - a.b) * ct),
  };
}

function useZoneColor(smoothY: MotionValue<number>) {
  // Map Y position to a zone color with smooth interpolation
  const dotBackground = useTransform(smoothY, (y) => {
    const c = y < 0.5
      ? lerp3(COLORS.red, COLORS.blue, y / 0.5)
      : lerp3(COLORS.blue, COLORS.green, (y - 0.5) / 0.5);
    const c2 = y < 0.5
      ? lerp3(COLORS.red, COLORS.cyan, y / 0.5)
      : lerp3(COLORS.cyan, COLORS.green, (y - 0.5) / 0.5);
    return `linear-gradient(135deg, rgb(${c.r},${c.g},${c.b}), rgb(${c2.r},${c2.g},${c2.b}))`;
  });

  const dotShadow = useTransform(smoothY, (y) => {
    const c = y < 0.5
      ? lerp3(COLORS.red, COLORS.blue, y / 0.5)
      : lerp3(COLORS.blue, COLORS.green, (y - 0.5) / 0.5);
    return `0 0 8px rgba(${c.r},${c.g},${c.b},0.6), 0 0 20px rgba(${c.r},${c.g},${c.b},0.3), 0 0 40px rgba(${c.r},${c.g},${c.b},0.15)`;
  });

  const haloGradient = useTransform(smoothY, (y) => {
    const c = y < 0.5
      ? lerp3(COLORS.red, COLORS.blue, y / 0.5)
      : lerp3(COLORS.blue, COLORS.green, (y - 0.5) / 0.5);
    return `radial-gradient(circle, rgba(${c.r},${c.g},${c.b},0.25) 0%, rgba(${c.r},${c.g},${c.b},0.08) 50%, transparent 70%)`;
  });

  const lineGradient = useTransform(smoothY, (y) => {
    const c = y < 0.5
      ? lerp3(COLORS.red, COLORS.blue, y / 0.5)
      : lerp3(COLORS.blue, COLORS.green, (y - 0.5) / 0.5);
    return `linear-gradient(to bottom, transparent 0%, rgba(${c.r},${c.g},${c.b},0.35) 20%, rgba(${c.r},${c.g},${c.b},0.35) 80%, transparent 100%)`;
  });

  const scanlineGradient = useTransform(smoothY, (y) => {
    const c = y < 0.5
      ? lerp3(COLORS.red, COLORS.blue, y / 0.5)
      : lerp3(COLORS.blue, COLORS.green, (y - 0.5) / 0.5);
    return `linear-gradient(to right, transparent 0%, rgba(${c.r},${c.g},${c.b},0.12) 30%, rgba(${c.r},${c.g},${c.b},0.12) 70%, transparent 100%)`;
  });

  const columnGradient = useTransform(smoothY, (y) => {
    const c = y < 0.5
      ? lerp3(COLORS.red, COLORS.blue, y / 0.5)
      : lerp3(COLORS.blue, COLORS.green, (y - 0.5) / 0.5);
    return `linear-gradient(to bottom, transparent, rgba(${c.r},${c.g},${c.b},0.04) 30%, rgba(${c.r},${c.g},${c.b},0.04) 70%, transparent)`;
  });

  return { dotBackground, dotShadow, haloGradient, lineGradient, scanlineGradient, columnGradient };
}

/* ──────────────────────────────────────────────── */

interface ChartCursorGlowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a chart container with a context-aware cursor-following glow.
 * The glow dot, crosshair, and halo dynamically morph between
 * green (ethy/bullish), blue (neutral), and red (field/bearish)
 * based on the cursor's vertical position within the chart.
 */
export function ChartCursorGlow({ children, className = "" }: ChartCursorGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Disable on touch devices — finger hover causes unwanted scrolling interference
  const isTouch = useSyncExternalStore(
    () => () => {},
    () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    () => false,
  );

  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);

  const springConfig = { stiffness: 280, damping: 28, mass: 0.5 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  const glowLeft = useTransform(smoothX, (v) => `${v * 100}%`);
  const glowTop = useTransform(smoothY, (v) => `${v * 100}%`);
  const lineLeft = useTransform(smoothX, (v) => `${v * 100}%`);

  // Context-aware zone coloring
  const {
    dotBackground,
    dotShadow,
    haloGradient,
    lineGradient,
    scanlineGradient,
    columnGradient,
  } = useZoneColor(smoothY);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      rawX.set(Math.max(0, Math.min(1, x)));
      rawY.set(Math.max(0, Math.min(1, y)));
    },
    [rawX, rawY]
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}

      <AnimatePresence>
        {isHovering && !isTouch && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Vertical crosshair line — color morphs with zone */}
            <motion.div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: lineLeft, background: lineGradient }}
            />

            {/* Horizontal scanline */}
            <motion.div
              className="absolute left-0 right-0 h-px"
              style={{ top: glowTop, background: scanlineGradient }}
            />

            {/* Glow dot at intersection */}
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: glowLeft, top: glowTop }}
            >
              {/* Outer halo — zone-colored */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{ background: haloGradient }}
              />
              {/* Core dot — zone-colored gradient + shadow */}
              <motion.div
                className="w-2.5 h-2.5 rounded-full relative"
                style={{ background: dotBackground, boxShadow: dotShadow }}
              />
            </motion.div>

            {/* Column highlight band */}
            <motion.div
              className="absolute top-0 bottom-0 -translate-x-1/2"
              style={{ left: lineLeft, width: "60px", background: columnGradient }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
