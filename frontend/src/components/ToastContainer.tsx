"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppState } from "@/lib/appState";

const colorMap = {
  success: "border-l-[#10B981] bg-[#10B981]/10",
  error: "border-l-[#EF4444] bg-[#EF4444]/10",
  info: "border-l-[#1A56FF] bg-[#1A56FF]/10",
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useAppState();

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`border border-[#1E293B] border-l-4 ${colorMap[toast.type]} rounded-lg px-4 py-3 backdrop-blur-sm flex items-start gap-3`}
          >
            <p className="text-sm text-white flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[#64748B] hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
