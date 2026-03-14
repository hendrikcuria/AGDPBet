"use client";

import { useState } from "react";

/**
 * Agent avatar component.
 * Shows the real profile picture from Virtuals API if available,
 * with a deterministic hex fallback when no image exists or on error.
 */

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const hue = ((hash >>> 0) % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

interface AgentHexAvatarProps {
  name: string;
  size?: number;
  className?: string;
  src?: string | null;
}

function HexFallback({ name, size }: { name: string; size: number }) {
  const color = nameToColor(name);
  const initial = name.charAt(0).toUpperCase();
  const r = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <polygon
        points={`${r},${0} ${size},${r * 0.5} ${size},${r * 1.5} ${r},${size} ${0},${r * 1.5} ${0},${r * 0.5}`}
        fill={color}
        opacity="0.2"
        stroke={color}
        strokeWidth="1"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.45}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {initial}
      </text>
    </svg>
  );
}

export function AgentHexAvatar({ name, size = 20, className = "", src }: AgentHexAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <span className={`shrink-0 inline-flex ${className}`}>
        <HexFallback name={name} size={size} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}
