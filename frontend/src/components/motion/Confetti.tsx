"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  randomRotateExtra: number;
  randomDuration: number;
}

const COLORS = ["#00E5FF", "#D4FF00", "#1A56FF", "#10B981", "#ffffff", "#EF4444"];

/**
 * Confetti burst animation for claim ceremony.
 */
export function ConfettiBurst({
  active,
  origin = { x: 0.5, y: 0.5 },
  particleCount = 40,
  onComplete,
}: {
  active: boolean;
  origin?: { x: number; y: number };
  particleCount?: number;
  onComplete?: () => void;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]); // eslint-disable-line react-hooks/set-state-in-effect -- animation reset
      return;
    }

    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 5;
      return {
        id: i,
        x: 0,
        y: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 3,
        randomRotateExtra: Math.random() * 720,
        randomDuration: 1.2 + Math.random() * 0.5,
      };
    });
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [active, particleCount, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-50"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: `${origin.x * 100}%`,
            top: `${origin.y * 100}%`,
          }}
          initial={{
            x: 0,
            y: 0,
            rotate: 0,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: p.velocityX * 60,
            y: p.velocityY * 60 + 120,
            rotate: p.rotation + p.randomRotateExtra,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{
            duration: p.randomDuration,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}
    </div>
  );
}

/**
 * CoinMinting: digital coin animation for claim
 */
export function CoinMint({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-8 rounded-full border-2 border-[#10B981] bg-[#10B981]/20 flex items-center justify-center text-[#10B981] text-xs"
              initial={{ y: 0, opacity: 1, scale: 0.5 }}
              animate={{
                y: -60 - i * 25,
                opacity: 0,
                scale: 1.2,
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: "easeOut",
              }}
            >
              $
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
