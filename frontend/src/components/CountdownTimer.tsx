"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetTimestamp: number; // Unix seconds
  label?: string;
  compact?: boolean;
  showIcon?: boolean;
}

export default function CountdownTimer({
  targetTimestamp,
  label,
  compact = false,
  showIcon = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLastHour, setIsLastHour] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const diff = targetTimestamp - now;

      if (diff <= 0) {
        setTimeLeft("Resolving...");
        setIsLastHour(false);
        return;
      }

      setIsLastHour(diff < 3600);

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (compact) {
        if (days > 0) setTimeLeft(`${days}d ${hours}h`);
        else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
        else setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        if (days > 0) setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        else setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, compact]);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-mono ${
          isLastHour ? "text-red-400 animate-pulse" : "text-gray-400"
        }`}
      >
        {showIcon && <Clock className="w-3 h-3" />}
        {timeLeft}
        {isLastHour && (
          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
            FINAL HOUR
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 text-center ${
        isLastHour
          ? "bg-red-500/10 border border-red-500/20"
          : "bg-white/[0.02] border border-white/[0.06]"
      }`}
    >
      {label && (
        <p className={`text-xs mb-1 ${isLastHour ? "text-red-400" : "text-gray-500"}`}>
          {label}
        </p>
      )}
      <p
        className={`text-lg font-mono font-bold ${
          isLastHour ? "text-red-400 animate-pulse" : "text-white"
        }`}
      >
        {timeLeft}
      </p>
      {isLastHour && (
        <span className="inline-block mt-1 text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
          SNIPING WINDOW
        </span>
      )}
    </div>
  );
}
