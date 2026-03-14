"use client";

import { motion, useTransform } from "motion/react";
import { useMousePosition } from "./useMousePosition";

/**
 * Mouse-reactive ambient background with parallax depth.
 *
 * Two radial gradients drift subtly following the cursor,
 * with different parallax depths (different transform ranges)
 * creating a layered, dimensional feel. The heavy spring
 * damping from useMousePosition ensures a slow, magnetic pull.
 */
export function AmbientBackground() {
  const { smoothX, smoothY } = useMousePosition();

  // Convert cursor position to small percentage shifts.
  // Front layer moves more, back layer moves less = parallax.
  const ww = typeof window !== "undefined" ? window.innerWidth : 1920;
  const wh = typeof window !== "undefined" ? window.innerHeight : 1080;

  // Layer 1: Core blue — larger radius, slower parallax
  const bg1X = useTransform(smoothX, [0, ww], [15, 35]);
  const bg1Y = useTransform(smoothY, [0, wh], [20, 45]);

  // Layer 2: Cyan accent — smaller radius, faster parallax (more depth)
  const bg2X = useTransform(smoothX, [0, ww], [65, 90]);
  const bg2Y = useTransform(smoothY, [0, wh], [55, 85]);

  // Layer 3: Faint lime — mid-depth, diagonal drift
  const bg3X = useTransform(smoothX, [0, ww], [40, 60]);
  const bg3Y = useTransform(smoothY, [0, wh], [70, 40]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden
    >
      {/* Layer 1: Deep blue nebula */}
      <motion.div
        className="absolute w-full h-full"
        style={{
          background: useTransform(
            [bg1X, bg1Y],
            ([x, y]: number[]) =>
              `radial-gradient(ellipse 700px 500px at ${x}% ${y}%, rgba(26, 86, 255, 0.045), transparent 70%)`
          ),
        }}
      />

      {/* Layer 2: Cyan accent */}
      <motion.div
        className="absolute w-full h-full"
        style={{
          background: useTransform(
            [bg2X, bg2Y],
            ([x, y]: number[]) =>
              `radial-gradient(ellipse 500px 450px at ${x}% ${y}%, rgba(0, 229, 255, 0.035), transparent 70%)`
          ),
        }}
      />

      {/* Layer 3: Lime whisper */}
      <motion.div
        className="absolute w-full h-full"
        style={{
          background: useTransform(
            [bg3X, bg3Y],
            ([x, y]: number[]) =>
              `radial-gradient(ellipse 400px 350px at ${x}% ${y}%, rgba(212, 255, 0, 0.018), transparent 65%)`
          ),
        }}
      />
    </div>
  );
}
