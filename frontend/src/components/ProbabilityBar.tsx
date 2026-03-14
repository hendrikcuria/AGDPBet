"use client";

export default function ProbabilityBar({
  side,
  probability,
}: {
  side: "YES" | "NO";
  probability: number;
}) {
  const pct = Math.max(2, Math.min(98, probability * 100));
  const colorClass = side === "YES" ? "bg-emerald-500" : "bg-rose-500";
  const textClass = side === "YES" ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium w-6 ${textClass}`}>{side === "YES" ? "Yes" : "No"}</span>
      <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden relative">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {Math.round(probability * 100)}%
        </span>
      </div>
    </div>
  );
}
