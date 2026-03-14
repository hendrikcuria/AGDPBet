"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "./ConnectButton";
import { X, User, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CountdownTimer from "./CountdownTimer";
import { OmniSearch } from "./OmniSearch";
import { useEpochInfo } from "@/hooks/useLeaderboard";
import { useAppState } from "@/lib/appState";
import { useIsMounted } from "@/hooks/useIsMounted";

const categories = [
  "Trending", "New", "Epoch Winners", "Top 10",
  "Head-to-Head", "Long Tail", "High Volume", "Ending Soon", "Resolved",
];

const navLinks = [
  { href: "/", label: "Markets", end: true },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/portfolio", label: "Portfolio" },
];

interface NavbarProps {
  onOpenProfile?: () => void;
}

export default function Navbar({ onOpenProfile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated: isConnected } = usePrivy();
  const { data: epoch } = useEpochInfo();
  const { navCategory, setNavCategory } = useAppState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useIsMounted();

  // Sliding tab indicator
  const catRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [catIndicator, setCatIndicator] = useState({ left: 0, width: 0 });
  const catContainerRef = useRef<HTMLDivElement>(null);

  const updateCatIndicator = useCallback(() => {
    const idx = categories.indexOf(navCategory);
    const el = catRefs.current[idx];
    const container = catContainerRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setCatIndicator({
        left: elRect.left - containerRect.left + container.scrollLeft,
        width: elRect.width,
      });
    }
  }, [navCategory]);

  useEffect(() => {
    updateCatIndicator();
  }, [navCategory, updateCatIndicator]);

  const handleCategoryClick = (cat: string) => {
    setNavCategory(cat);
    if (pathname !== "/") router.push("/");
  };

  const linkClass = (href: string) => {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `px-3 py-1.5 rounded-lg text-sm transition-all agdp-ripple ${
      isActive ? "text-[#1A56FF] bg-[#1A56FF]/10" : "text-[#64748B] hover:text-white"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0F19]/85 border-b border-[#1E293B]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5 shrink-0">
            <span className="text-white text-lg tracking-tight">AGDP</span>
            <span className="text-[#1A56FF] text-lg tracking-tight">Bet</span>
          </Link>

          {/* Search Bar — OmniSearch with autocomplete */}
          <OmniSearch className="hidden md:block flex-1 max-w-md mx-4" />

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`${linkClass(link.href)} relative`} data-tutorial={link.href === "/leaderboard" ? "leaderboard" : undefined}>
                {link.label}
                {link.href === "/portfolio" && mounted && isConnected && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#1A56FF] rounded-full" />
                )}
              </Link>
            ))}
            <Link
              href="/create"
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/10 hover:border-[#00E5FF]/50 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Pool
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            {epoch && (
              <div className="hidden lg:block">
                <CountdownTimer targetTimestamp={Math.floor(new Date(epoch.endsAt).getTime() / 1000)} compact />
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2">
              <ConnectButton showBalance={false} />
              {mounted && isConnected && onOpenProfile && (
                <motion.button
                  data-tutorial="profile"
                  onClick={onOpenProfile}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-[#1E293B] hover:border-[#00E5FF]/30 transition-all"
                  style={{ background: "linear-gradient(135deg, #00E5FF, #D4FF00)", boxShadow: "0 0 12px rgba(0,229,255,0.15)" }}
                  whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(0,229,255,0.3)" }}
                  whileTap={{ scale: 0.92 }}
                  title="Degen Profile"
                >
                  <User className="w-3.5 h-3.5 text-[#0B0F19]" />
                </motion.button>
              )}
            </div>

            <div className="flex items-center gap-1 md:hidden">
              <button className="p-2 text-[#64748B] active:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs with Sliding Indicator */}
      <div className="border-t border-[#1E293B]/50" data-tutorial="market-grid">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={catContainerRef} className="flex items-center gap-0 overflow-x-auto scrollbar-hide -mb-px relative">
            {categories.map((cat, i) => (
              <button
                key={cat}
                ref={(el) => { catRefs.current[i] = el; }}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-2.5 text-xs whitespace-nowrap border-b-2 border-transparent transition-colors ${navCategory === cat ? "text-white" : "text-[#64748B] hover:text-[#94A3B8]"}`}
              >
                {cat}
              </button>
            ))}
            {mounted && (
              <motion.div className="agdp-nav-indicator" animate={{ left: catIndicator.left, width: catIndicator.width }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-t border-[#1E293B] bg-[#0B0F19]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3">
              <OmniSearch autoFocus onRouteChange={() => setMobileOpen(false)} />
              <div className="flex items-center justify-between">
                {epoch && <CountdownTimer targetTimestamp={Math.floor(new Date(epoch.endsAt).getTime() / 1000)} compact />}
                <ConnectButton showBalance={false} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
