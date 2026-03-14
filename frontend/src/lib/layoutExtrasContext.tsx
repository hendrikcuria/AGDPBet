"use client";

import { createContext, useContext } from "react";
import type { UISounds } from "@/components/motion/useUISounds";

export interface ReceiptData {
  marketQuestion: string;
  outcomeLabel: string;
  amount: number;
  multiplier: number;
  symbol: string;
}

interface LayoutExtras {
  sounds: UISounds | null;
  openReceipt: (data: ReceiptData) => void;
  openProfile: () => void;
}

export const LayoutExtrasContext = createContext<LayoutExtras>({
  sounds: null,
  openReceipt: () => {},
  openProfile: () => {},
});

export function useLayoutExtras() {
  return useContext(LayoutExtrasContext);
}
