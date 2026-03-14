"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { motion } from "motion/react";
import { LogOut, ChevronDown, Wallet } from "lucide-react";
import { useState, useRef, useEffect } from "react";

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getUserLabel(user: ReturnType<typeof usePrivy>["user"]): string {
  if (!user) return "";
  // Prefer social accounts
  if (user.twitter) return `@${user.twitter.username}`;
  if (user.google) return user.google.email;
  if (user.email) return user.email.address;
  if (user.phone) return user.phone.number;
  if (user.wallet) return shortenAddr(user.wallet.address);
  return "Connected";
}

/**
 * Drop-in replacement for RainbowKit's ConnectButton.
 * Uses Privy for auth — supports social login + embedded wallets.
 */
export function ConnectButton({ showBalance = false }: { showBalance?: boolean }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (!ready) {
    return (
      <div className="h-9 w-24 rounded-lg bg-white/5 animate-pulse" />
    );
  }

  if (!authenticated) {
    return (
      <motion.button
        onClick={login}
        className="relative px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(26,86,255,0.15))",
          border: "1px solid rgba(0,229,255,0.3)",
          boxShadow: "0 0 15px rgba(0,229,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        whileHover={{
          boxShadow: "0 0 25px rgba(0,229,255,0.25), 0 0 50px rgba(0,229,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
          borderColor: "rgba(0,229,255,0.5)",
        }}
        whileTap={{ scale: 0.97 }}
      >
        Sign In
      </motion.button>
    );
  }

  const label = getUserLabel(user);
  const activeWallet = wallets[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-[#1E293B] hover:border-[#00E5FF]/30 transition-all"
        style={{
          background: "rgba(11, 15, 25, 0.8)",
          backdropFilter: "blur(12px)",
        }}
        whileHover={{ boxShadow: "0 0 12px rgba(0,229,255,0.1)" }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="w-2 h-2 rounded-full bg-[#10B981]" />
        <span className="text-[#CBD5E1] font-mono text-xs max-w-[120px] truncate">
          {label}
        </span>
        {showBalance && activeWallet && (
          <span className="text-[#64748B] text-[10px] font-mono">
            {shortenAddr(activeWallet.address)}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-[#475569]" />
      </motion.button>

      {dropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-[#1E293B] overflow-hidden z-50"
          style={{
            background: "rgba(11, 15, 25, 0.95)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0,229,255,0.05)",
          }}
        >
          {activeWallet && (
            <div className="px-3 py-2.5 border-b border-[#1E293B]/50">
              <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">Wallet</p>
              <p className="text-xs text-[#CBD5E1] font-mono">{shortenAddr(activeWallet.address)}</p>
            </div>
          )}
          <button
            onClick={() => {
              setDropdownOpen(false);
              if (activeWallet) {
                navigator.clipboard.writeText(activeWallet.address);
              }
            }}
            className="w-full px-3 py-2 text-left text-xs text-[#94A3B8] hover:bg-white/[0.04] hover:text-white transition-colors flex items-center gap-2"
          >
            <Wallet className="w-3.5 h-3.5" />
            Copy Address
          </button>
          <button
            onClick={() => {
              setDropdownOpen(false);
              logout();
            }}
            className="w-full px-3 py-2 text-left text-xs text-[#EF4444]/80 hover:bg-[#EF4444]/5 hover:text-[#EF4444] transition-colors flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </motion.div>
      )}
    </div>
  );
}
