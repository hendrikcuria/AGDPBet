"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * SSR hydration guard.
 * Next.js SSR doesn't know wallet state — components that display
 * wallet balances, connected address, or betting terminal must
 * return a skeleton loader until mounted === true.
 */
export function useIsMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
