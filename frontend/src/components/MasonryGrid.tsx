"use client";

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

interface MasonryGridProps {
  items: { id: string; element: ReactNode }[];
  mobilePageSize?: number;
  className?: string;
}

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

function useBreakpoint(): Breakpoint {
  const getBreakpoint = (): Breakpoint => {
    if (typeof window === "undefined") return "lg";
    const w = window.innerWidth;
    if (w >= 1280) return "xl";
    if (w >= 1024) return "lg";
    if (w >= 768) return "md";
    if (w >= 640) return "sm";
    return "xs";
  };

  const [bp, setBp] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    let rafId: number;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setBp(getBreakpoint()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return bp;
}

const COLUMN_MAP: Record<Breakpoint, number> = {
  xs: 1, sm: 1, md: 2, lg: 3, xl: 4,
};

function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => {
    columns[i % columnCount].push(item);
  });
  return columns;
}

export function MasonryGrid({
  items,
  mobilePageSize = 10,
  className = "",
}: MasonryGridProps) {
  const bp = useBreakpoint();
  const colCount = COLUMN_MAP[bp];
  const isMobile = colCount === 1;

  const [mobileVisibleCount, setMobileVisibleCount] = useState(mobilePageSize);
  const [prevItemsLen, setPrevItemsLen] = useState(items.length);
  if (items.length !== prevItemsLen) {
    setPrevItemsLen(items.length);
    setMobileVisibleCount(mobilePageSize);
  }

  const visibleItems = isMobile ? items.slice(0, mobileVisibleCount) : items;
  const hasMore = isMobile && mobileVisibleCount < items.length;
  const remaining = items.length - mobileVisibleCount;

  const loadMore = useCallback(() => {
    setMobileVisibleCount((prev) => Math.min(prev + mobilePageSize, items.length));
  }, [mobilePageSize, items.length]);

  const columns = useMemo(
    () => distributeToColumns(visibleItems, colCount),
    [visibleItems, colCount]
  );

  return (
    <div className={className}>
      <div className="flex gap-4">
        {columns.map((col, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className={`flex flex-col gap-4 ${isMobile ? "w-full" : "flex-1 min-w-0"}`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {col.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92, y: -10 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 30 },
                    opacity: { duration: 0.25 },
                    y: { duration: 0.3 },
                    scale: { duration: 0.25 },
                  }}
                >
                  {item.element}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {hasMore && (
          <motion.div
            className="mt-6 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="w-full h-12 -mt-18 relative z-[2] pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(11,15,25,1) 0%, rgba(11,15,25,0) 100%)" }}
            />
            <motion.button
              onClick={loadMore}
              className="relative z-[3] flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-[#94A3B8] bg-[#131C2D] border border-[#1E293B] hover:border-[#1A56FF]/40 hover:text-white transition-all"
              whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(26,86,255,0.12), 0 0 40px rgba(0,229,255,0.06)" }}
              whileTap={{ scale: 0.97 }}
            >
              <span>
                Load More{" "}
                <span className="text-[#475569] font-mono text-xs">({remaining} remaining)</span>
              </span>
              <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
