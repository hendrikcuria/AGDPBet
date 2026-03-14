"use client";

import { useState, useId, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff } from "lucide-react";

/* Shared toggle state via context */
const WhaleShadowContext = createContext<{
  enabled: boolean;
  toggle: () => void;
}>({ enabled: false, toggle: () => {} });

export function WhaleShadowProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <WhaleShadowContext.Provider value={{ enabled, toggle: () => setEnabled((e) => !e) }}>
      {children}
    </WhaleShadowContext.Provider>
  );
}

export function useWhaleShadow() {
  return useContext(WhaleShadowContext);
}

export function WhaleShadowToggle() {
  const { enabled, toggle } = useWhaleShadow();
  return (
    <motion.button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
        enabled ? "bg-[#8B5CF6]/15 text-[#8B5CF6]" : "text-[#64748B] hover:text-[#94A3B8]"
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      Whale Shadow
    </motion.button>
  );
}

interface WhaleShadowLineProps {
  poolData: { poolYes: number; poolNo: number }[];
  width: number;
  height: number;
  margin?: { top: number; right: number; left: number; bottom: number };
}

function generateWhaleData(poolData: { poolYes: number; poolNo: number }[]): number[] {
  if (poolData.length === 0) return [];
  return poolData.map((d, i) => {
    const total = d.poolYes + d.poolNo;
    const whaleFactor = 0.15 + (i / poolData.length) * 0.12;
    return total * whaleFactor;
  });
}

export function WhaleShadowLine({
  poolData,
  width,
  height,
  margin = { top: 5, right: 5, left: 20, bottom: 20 },
}: WhaleShadowLineProps) {
  const { enabled } = useWhaleShadow();
  const uid = useId();
  const filterId = `whale-glow-${uid.replace(/:/g, "")}`;

  const whaleValues = generateWhaleData(poolData);

  const chartLeft = margin.left;
  const chartRight = width - margin.right;
  const chartTop = margin.top;
  const chartBottom = height - margin.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const maxVal = Math.max(...whaleValues, 1);
  const points = whaleValues.map((val, i) => {
    const x = chartLeft + (i / Math.max(whaleValues.length - 1, 1)) * chartWidth;
    const y = chartBottom - (val / maxVal) * chartHeight * 0.85;
    return { x, y };
  });
  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  if (width <= 0 || height <= 0) return null;

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute top-0 left-0">
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feFlood floodColor="#8B5CF6" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <motion.path
              d={pathD}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="8 4"
              strokeLinecap="round"
              filter={`url(#${filterId})`}
              initial={{ strokeDashoffset: 0, pathLength: 0 }}
              animate={{ strokeDashoffset: [-24, 0], pathLength: 1 }}
              transition={{
                strokeDashoffset: { duration: 2, repeat: Infinity, ease: "linear" },
                pathLength: { duration: 1.2, ease: "easeOut" },
              }}
            />

            {points.length > 0 && (
              <motion.circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r={4}
                fill="#8B5CF6"
                filter={`url(#${filterId})`}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </svg>

          <motion.div
            className="absolute top-2 right-2 flex items-center gap-1.5 bg-[#0B0F19]/80 backdrop-blur-sm px-2 py-1 rounded-md border border-[#8B5CF6]/20"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="w-3 h-0.5 rounded-full" style={{ background: "#8B5CF6", boxShadow: "0 0 6px #8B5CF6" }} />
            <span className="text-[10px] text-[#8B5CF6] font-mono">Top 5 Wallets</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
