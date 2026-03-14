"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";

/**
 * A replacement for recharts' ResponsiveContainer that avoids the
 * "width(-1) and height(-1)" error by measuring via ResizeObserver
 * and only rendering children once positive dimensions are available.
 */
export function SafeChartContainer({
  children,
  className,
}: {
  children: (width: number, height: number) => ReactElement;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize((prev) =>
        prev.w !== Math.floor(width) || prev.h !== Math.floor(height)
          ? { w: Math.floor(width), h: Math.floor(height) }
          : prev,
      );
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: "100%" }}>
      {size.w > 0 && size.h > 0 ? children(size.w, size.h) : null}
    </div>
  );
}
