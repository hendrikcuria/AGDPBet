"use client";

export default function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-white font-mono text-sm">{value}</p>
      {sublabel && <p className="text-[10px] text-gray-600 mt-0.5">{sublabel}</p>}
    </div>
  );
}
