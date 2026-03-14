"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { MarketData } from "@/hooks/useMarkets";

// --- Types ---

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface DepositModalState {
  open: boolean;
  market: MarketData | null;
  preselectedSide: "YES" | "NO";
}

/** Tracked deposit for portfolio display */
export interface PlacedDeposit {
  marketAddress: `0x${string}`;
  outcomeIndex: number;
  amount: bigint;
  txHash: string;
  timestamp: number;
}

interface AppStateContextType {
  // Search & Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  navCategory: string;
  setNavCategory: (c: string) => void;
  agentFilter: string | null;
  setAgentFilter: (f: string | null) => void;

  // Bookmarks
  bookmarkedMarkets: Set<string>;
  toggleBookmark: (id: string) => void;

  // Deposit Modal (parimutuel terminology)
  depositModal: DepositModalState;
  openDepositModal: (market: MarketData, side: "YES" | "NO") => void;
  closeDepositModal: () => void;

  // Deposits tracking
  deposits: PlacedDeposit[];
  addDeposit: (deposit: PlacedDeposit) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [navCategory, setNavCategory] = useState("Trending");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  // Bookmarks (persisted in localStorage)
  const [bookmarkedMarkets, setBookmarkedMarkets] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agdpbet-bookmarks");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init from localStorage on mount
      if (saved) setBookmarkedMarkets(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarkedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("agdpbet-bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Deposit Modal
  const [depositModal, setDepositModal] = useState<DepositModalState>({
    open: false,
    market: null,
    preselectedSide: "YES",
  });

  const openDepositModal = useCallback((market: MarketData, side: "YES" | "NO") => {
    setDepositModal({ open: true, market, preselectedSide: side });
  }, []);

  const closeDepositModal = useCallback(() => {
    setDepositModal((prev) => ({ ...prev, open: false }));
  }, []);

  // Deposits tracking
  const [deposits, setDeposits] = useState<PlacedDeposit[]>([]);

  const addDeposit = useCallback((deposit: PlacedDeposit) => {
    setDeposits((prev) => [deposit, ...prev]);
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        navCategory,
        setNavCategory,
        agentFilter,
        setAgentFilter,
        bookmarkedMarkets,
        toggleBookmark,
        depositModal,
        openDepositModal,
        closeDepositModal,
        deposits,
        addDeposit,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
