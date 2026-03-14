"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Trophy, Briefcase, User, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useAccount } from "wagmi";


const tabs = [
  { href: "/", label: "Markets", icon: LayoutGrid, end: true },
  { href: "/create", label: "Create", icon: Plus, accent: true },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

interface MobileTabBarProps {
  onOpenProfile?: () => void;
}

export function MobileTabBar({ onOpenProfile }: MobileTabBarProps) {
  const pathname = usePathname();
  const { isConnected } = useAccount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0B0F19]/95 backdrop-blur-xl border-t border-[#1E293B] safe-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const isActive = tab.end ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          const accentColor = tab.accent ? "#00E5FF" : "#1A56FF";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative"
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? (tab.accent ? "text-[#00E5FF]" : "text-[#1A56FF]") : "text-[#475569]"}`} />
              <span className={`text-[9px] tracking-wider transition-colors ${isActive ? (tab.accent ? "text-[#00E5FF]" : "text-[#1A56FF]") : "text-[#475569]"}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  className="absolute -top-px left-3 right-3 h-0.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                  layoutId="mobile-tab-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        <button
          onClick={() => {
            if (isConnected && onOpenProfile) onOpenProfile();
          }}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
          data-tutorial="profile"
        >
          {isConnected ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00E5FF, #D4FF00)" }}>
              <User className="w-3 h-3 text-[#0B0F19]" />
            </div>
          ) : (
            <User className="w-5 h-5 text-[#475569]" />
          )}
          <span className="text-[9px] tracking-wider text-[#475569]">
            {isConnected ? "Profile" : "Connect"}
          </span>
        </button>
      </div>
    </nav>
  );
}
