import { useEffect } from "react";
import { useMotionValue, useSpring, type MotionValue } from "motion/react";

export interface MousePosition {
  /** Raw, unsmoothed X */
  mouseX: MotionValue<number>;
  /** Raw, unsmoothed Y */
  mouseY: MotionValue<number>;
  /** Spring-smoothed X — slow magnetic pull */
  smoothX: MotionValue<number>;
  /** Spring-smoothed Y — slow magnetic pull */
  smoothY: MotionValue<number>;
}

/**
 * Tracks global cursor coordinates with heavily damped spring smoothing.
 * The smoothed values create a "magnetic pull" parallax effect rather
 * than a 1:1 cursor lock.
 */
export function useMousePosition(): MousePosition {
  const mouseX = useMotionValue(
    typeof window !== "undefined" ? window.innerWidth / 2 : 0
  );
  const mouseY = useMotionValue(
    typeof window !== "undefined" ? window.innerHeight / 2 : 0
  );

  // Very heavy spring = slow, magnetic, premium feeling
  const springConfig = { stiffness: 18, damping: 45, mass: 2.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return { mouseX, mouseY, smoothX, smoothY };
}
