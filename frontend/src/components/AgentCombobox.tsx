"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { type AgentMetrics } from "@/hooks/useAgentData";
import { AgentHexAvatar } from "./AgentHexAvatar";

interface AgentComboboxProps {
  agents: AgentMetrics[];
  selected: AgentMetrics | null;
  onSelect: (agent: AgentMetrics | null) => void;
  placeholder?: string;
  label?: string;
  excludeId?: string;
}

export function AgentCombobox({
  agents,
  selected,
  onSelect,
  placeholder = "Select agent...",
  label,
  excludeId,
}: AgentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return agents
      .filter((a) => {
        if (excludeId && a.id === excludeId) return false;
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          (a.tokenSymbol && a.tokenSymbol.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [agents, query, excludeId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateQuery = useCallback((q: string) => {
    setQuery(q);
    setActiveIdx(0);
  }, []);

  const handleSelect = (agent: AgentMetrics) => {
    onSelect(agent);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((p) => (p + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((p) => (p <= 0 ? filtered.length - 1 : p - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) handleSelect(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-[10px] text-[#475569] mb-2 uppercase tracking-widest font-mono">
          {label}
        </label>
      )}

      {/* Trigger / selected display */}
      {selected ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
          style={{
            background: "rgba(26, 86, 255, 0.06)",
            border: "1px solid rgba(26, 86, 255, 0.2)",
          }}
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <AgentHexAvatar name={selected.name} size={24} src={selected.profilePic} />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white">{selected.name}</span>
            {selected.tokenSymbol && (
              <span className="text-xs text-[#64748B] font-mono ml-2">${selected.tokenSymbol}</span>
            )}
          </div>
          <span className="text-[10px] text-[#475569] font-mono">#{selected.rank}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
            className="p-1 text-[#64748B] hover:text-white transition-colors rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <span className="text-sm text-[#475569] flex-1">{placeholder}</span>
          <ChevronDown className="w-4 h-4 text-[#475569]" />
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-[60] rounded-xl overflow-hidden"
            style={{
              background: "rgba(11, 15, 25, 0.97)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(0, 229, 255, 0.12)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(26, 86, 255, 0.08)",
            }}
          >
            {/* Search input */}
            <div className="p-2 border-b border-white/[0.04]">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name or ticker..."
                className="w-full bg-white/[0.04] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none font-mono"
              />
            </div>

            {/* Results */}
            <div className="max-h-[280px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-[#475569]">No agents found</p>
                </div>
              ) : (
                filtered.map((agent, i) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelect(agent)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      activeIdx === i ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <AgentHexAvatar name={agent.name} size={28} src={agent.profilePic} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{agent.name}</p>
                      {agent.tokenSymbol && (
                        <p className="text-[10px] text-[#64748B] font-mono">${agent.tokenSymbol}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#93B4FF] font-mono">#{agent.rank}</p>
                      <p className="text-[10px] text-[#475569] font-mono">{agent.score.toLocaleString()}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
