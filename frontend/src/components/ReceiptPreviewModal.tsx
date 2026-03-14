"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { X, Download } from "lucide-react";
import { ShareIcon } from "./icons/IconMap";

export interface ReceiptData {
  marketQuestion: string;
  outcomeLabel: string;
  amount: number;
  multiplier: number;
  symbol: string;
}

interface ReceiptPreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ReceiptPreviewModal({ open, onClose, data }: ReceiptPreviewModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const transformStyle = useTransform(
    [rotateX, rotateY],
    ([rx, ry]: number[]) => `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`
  );

  const handleCardMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 12);
    rotateX.set(-y * 8);
  }, [rotateX, rotateY]);

  const handleCardMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const handleShareOnX = () => {
    if (!data) return;
    const estReturn = Math.round(data.amount * data.multiplier);
    const text = `I just deposited ${data.amount.toLocaleString()} ${data.symbol} into the ${data.outcomeLabel} pool on @AGDPBet!\n\nEst. return: ~${estReturn.toLocaleString()} ${data.symbol} (${data.multiplier.toFixed(2)}x)\n\n#AGDPBet #PredictionMarkets`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (!data) return null;

  const estReturn = data.amount * data.multiplier;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-[1] w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
          >
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-[#131C2D] border border-[#1E293B] flex items-center justify-center text-[#64748B] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              ref={cardRef}
              className="receipt-card relative rounded-2xl overflow-hidden"
              style={{ transform: transformStyle }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0B0F19 0%, #0D1525 30%, #101B30 60%, #0B0F19 100%)" }} />
              <div className="receipt-sheen absolute inset-0 pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: "inset 0 0 0 1px rgba(0,229,255,0.15), inset 0 0 30px rgba(26,86,255,0.05), 0 0 40px rgba(26,86,255,0.1), 0 0 80px rgba(0,229,255,0.05)" }} />

              <div className="relative z-[1] p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A56FF] to-[#00E5FF] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <div>
                      <span className="text-white text-sm">AGDP</span>
                      <span className="text-[#1A56FF] text-sm">Bet</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B0F19]/60 border border-[#1E293B]/50 rounded-xl px-4 py-3 mb-6 backdrop-blur-sm">
                  <p className="text-xs text-[#94A3B8] text-center line-clamp-2">{data.marketQuestion}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#0B0F19]/40 rounded-xl p-3 border border-[#1E293B]/30">
                    <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Pool Selection</p>
                    <p className="text-white text-sm font-mono truncate">{data.outcomeLabel}</p>
                  </div>
                  <div className="bg-[#0B0F19]/40 rounded-xl p-3 border border-[#1E293B]/30">
                    <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Deposited</p>
                    <p className="text-[#10B981] text-sm font-mono">{data.amount.toLocaleString()} {data.symbol}</p>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="inline-block rounded-2xl px-8 py-4" style={{ background: "linear-gradient(135deg, rgba(26,86,255,0.1), rgba(0,229,255,0.05))", border: "1px solid rgba(26,86,255,0.2)", boxShadow: "0 0 20px rgba(26,86,255,0.08), inset 0 0 20px rgba(26,86,255,0.03)" }}>
                    <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Est. Multiplier</p>
                    <span className="text-3xl sm:text-4xl font-mono text-[#1A56FF]">{data.multiplier.toFixed(2)}x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#10B981]/[0.08] border border-[#10B981]/15 rounded-xl px-4 py-3 mb-6">
                  <span className="text-xs text-[#64748B]">Est. Return</span>
                  <span className="font-mono text-[#10B981]" style={{ textShadow: "0 0 8px rgba(16,185,129,0.3)" }}>
                    ~{Math.round(estReturn).toLocaleString()} {data.symbol}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#1E293B]/30">
                  <span className="text-[9px] text-[#475569] font-mono uppercase tracking-[0.15em]">Parimutuel Pool &middot; On-Chain</span>
                </div>
              </div>
            </motion.div>

            <div className="mt-4 flex gap-3">
              <motion.button
                onClick={handleShareOnX}
                className="flex-1 py-3 rounded-xl bg-[#131C2D] border border-[#1E293B] text-white text-sm hover:border-[#1A56FF]/30 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(26,86,255,0.15)" }}
                whileTap={{ scale: 0.98 }}
              >
                <ShareIcon size={16} /> Share on X
              </motion.button>
              <motion.button
                className="py-3 px-4 rounded-xl bg-[#131C2D] border border-[#1E293B] text-[#64748B] hover:text-white hover:border-[#1A56FF]/30 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Download card (coming soon)"
              >
                <Download className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
