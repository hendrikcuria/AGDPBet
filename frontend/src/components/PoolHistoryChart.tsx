"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface ChartDataPoint {
  timestamp: number;
  poolYes: number;
  poolNo: number;
  total: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} ${formatTime(ts)}`;
}

function formatUSDCAxis(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${v}`;
}

function formatUSDC(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Pad data with a final point at Date.now() so stepAfter extends to the right edge. */
function padToNow(data: ChartDataPoint[]): ChartDataPoint[] {
  if (data.length === 0) return data;
  const points = [...data];
  const last = points[points.length - 1];
  const nowTs = Math.floor(Date.now() / 1000);
  if (nowTs > last.timestamp) {
    points.push({ ...last, timestamp: nowTs });
  }
  return points;
}

/* ─── Custom Tooltip ─── */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: number }) {
  if (!active || !payload?.length) return null;

  const ts = Number(label);
  const yes = payload.find((p) => p.dataKey === "poolYes");
  const no = payload.find((p) => p.dataKey === "poolNo");

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 font-mono text-[11px] border backdrop-blur-md"
      style={{
        backgroundColor: "rgba(11, 15, 25, 0.92)",
        borderColor: "rgba(0, 229, 255, 0.15)",
        boxShadow: "0 0 20px rgba(0, 229, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.4)",
      }}
    >
      <p className="text-[#64748B] text-[10px] mb-1.5">{formatDate(ts)}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
          <span className="text-[#A5F3FC]">YES</span>
          <span className="text-white font-semibold">{yes ? `${formatUSDC(yes.value)} USDC` : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          <span className="text-[#FCA5A5]">NO</span>
          <span className="text-white font-semibold">{no ? `${formatUSDC(no.value)} USDC` : "—"}</span>
        </div>
      </div>
    </div>
  );
}

export default function PoolHistoryChart({
  data,
  width,
  height,
}: {
  data: ChartDataPoint[];
  width: number;
  height: number;
}) {
  const paddedData = useMemo(() => padToNow(data), [data]);

  // Decide label format based on time span
  const span = paddedData.length >= 2 ? paddedData[paddedData.length - 1].timestamp - paddedData[0].timestamp : 0;
  const fmt = span > 86400 ? formatDate : formatTime;

  return (
    <AreaChart data={paddedData} width={width} height={height} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
      <defs>
        <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
        </linearGradient>
      </defs>

      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />

      <XAxis
        dataKey="timestamp"
        type="number"
        domain={["dataMin", "dataMax"]}
        scale="time"
        tick={{ fontSize: 10, fill: "#475569" }}
        tickFormatter={fmt}
        axisLine={false}
        tickLine={false}
      />

      <YAxis
        tick={{ fontSize: 10, fill: "#475569" }}
        axisLine={false}
        tickLine={false}
        tickFormatter={formatUSDCAxis}
      />

      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,229,255,0.2)", strokeWidth: 1 }} />

      <Area
        type="stepAfter"
        dataKey="poolYes"
        stroke="#00E5FF"
        strokeWidth={2}
        fill="url(#yesGrad)"
        dot={false}
        activeDot={{ r: 6, strokeWidth: 0, fill: "#00E5FF" }}
        name="YES Pool"
      />
      <Area
        type="stepAfter"
        dataKey="poolNo"
        stroke="#EF4444"
        strokeWidth={1.5}
        fill="url(#noGrad)"
        dot={false}
        activeDot={{ r: 6, strokeWidth: 0, fill: "#EF4444" }}
        name="NO Pool"
      />
    </AreaChart>
  );
}
