"use client";

import { AgdpIcon, type IconName } from "./icons/IconMap";

const TYPE_CONFIG: Record<number, { label: string; icon: IconName; classes: string }> = {
  0: { label: "Epoch Winner", icon: "trophy", classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  1: { label: "Top 10", icon: "grid-hash", classes: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  2: { label: "Head-to-Head", icon: "swords", classes: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  3: { label: "Long Tail", icon: "sprout", classes: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export default function MarketTypeBadge({
  type,
  showIcon = true,
}: {
  type: number;
  showIcon?: boolean;
}) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG[0];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${config.classes}`}>
      {showIcon && <AgdpIcon name={config.icon} size={12} />}
      {config.label}
    </span>
  );
}
