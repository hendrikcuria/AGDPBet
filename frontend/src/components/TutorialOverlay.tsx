"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useSpring } from "motion/react";
import { useOnboarding } from "@/lib/onboardingState";
import { ChevronRight } from "lucide-react";
import { useIsMounted } from "@/hooks/useIsMounted";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 12;
const BORDER_RADIUS = 12;
const TOOLTIP_W = 340;
const TOOLTIP_GAP = 16;

function getTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
}

function getTooltipPosition(rect: SpotlightRect): { top: number; left: number } {
  const estTooltipH = 200;
  let top = rect.top + rect.height + TOOLTIP_GAP;
  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  left = Math.max(16, Math.min(left, vw - TOOLTIP_W - 16));
  top = Math.max(16, Math.min(top, vh - estTooltipH - 16));

  return { top, left };
}

function buildHoleClipPath(r: SpotlightRect): string {
  const L = r.left;
  const T = r.top;
  const R = r.left + r.width;
  const B = r.top + r.height;
  return `polygon(0% 0%, 0% 100%, ${L}px 100%, ${L}px ${T}px, ${R}px ${T}px, ${R}px ${B}px, ${L}px ${B}px, ${L}px 100%, 100% 100%, 100% 0%)`;
}

export function TutorialOverlay() {
  const mounted = useIsMounted();
  const { tutorialActive, currentStep, step, nextStep, skipTutorial } = useOnboarding();
  const totalSteps = 4;

  const [rawRect, setRawRect] = useState<SpotlightRect | null>(null);
  const [ready, setReady] = useState(false);
  const animFrameRef = useRef(0);

  const springConfig = { stiffness: 220, damping: 26, mass: 0.9 };
  const sTop = useSpring(0, springConfig);
  const sLeft = useSpring(0, springConfig);
  const sWidth = useSpring(0, springConfig);
  const sHeight = useSpring(0, springConfig);

  const tipSpring = { stiffness: 200, damping: 28 };
  const tTop = useSpring(0, tipSpring);
  const tLeft = useSpring(0, tipSpring);

  const measure = useCallback(() => {
    if (!step) return;
    const rect = getTargetRect(step.targetSelector);
    if (!rect) return;

    setRawRect(rect);
    sTop.set(rect.top);
    sLeft.set(rect.left);
    sWidth.set(rect.width);
    sHeight.set(rect.height);

    const tip = getTooltipPosition(rect);
    tTop.set(tip.top);
    tLeft.set(tip.left);

    if (!ready) setReady(true);
  }, [step, ready, sTop, sLeft, sWidth, sHeight, tTop, tLeft]);

  useEffect(() => {
    if (!tutorialActive || !step) {
      setReady(false);
      return;
    }

    const timer = setTimeout(measure, 60);
    const handleLayout = () => measure();
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);

    let polls = 0;
    const poll = () => {
      polls++;
      if (polls < 36) {
        measure();
        animFrameRef.current = requestAnimationFrame(poll);
      }
    };
    animFrameRef.current = requestAnimationFrame(poll);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
  }, [tutorialActive, step, currentStep, measure]);

  useEffect(() => {
    if (!tutorialActive) setReady(false);
  }, [tutorialActive]);

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {tutorialActive && step && ready && rawRect && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden"
          style={{ pointerEvents: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="absolute inset-0"
            style={{ pointerEvents: "auto", clipPath: buildHoleClipPath(rawRect) }}
            onClick={skipTutorial}
          />

          <motion.div
            style={{
              position: "absolute", top: sTop, left: sLeft, width: sWidth, height: sHeight,
              borderRadius: BORDER_RADIUS, boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)", pointerEvents: "none",
            }}
          />

          <motion.div
            style={{
              position: "absolute", top: sTop, left: sLeft, width: sWidth, height: sHeight,
              borderRadius: BORDER_RADIUS, pointerEvents: "none", border: "1px solid rgba(26,86,255,0.35)",
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ borderRadius: BORDER_RADIUS }}
              animate={{
                boxShadow: [
                  "0 0 15px 2px rgba(26,86,255,0.12), inset 0 0 15px rgba(26,86,255,0.06)",
                  "0 0 25px 4px rgba(0,229,255,0.15), inset 0 0 20px rgba(0,229,255,0.08)",
                  "0 0 15px 2px rgba(26,86,255,0.12), inset 0 0 15px rgba(26,86,255,0.06)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div
            className="absolute w-[min(340px,calc(100vw-32px))]"
            style={{ top: tTop, left: tLeft, pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                className="relative rounded-xl overflow-hidden"
                style={{ boxShadow: "0 0 60px 10px rgba(0,0,0,0.7), 0 0 30px rgba(0,229,255,0.12), 0 25px 50px rgba(0,0,0,0.5)" }}
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                <div className="h-[2px]" style={{ background: "linear-gradient(90deg, #1A56FF, #00E5FF, #D4FF00)" }} />
                <div className="bg-[#0B0F19]/95 backdrop-blur-xl border border-cyan-500/30 border-t-0 rounded-b-xl p-5 ring-1 ring-cyan-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={`h-1 rounded-full ${i === currentStep ? "w-5 bg-[#1A56FF]" : i < currentStep ? "w-2 bg-[#1A56FF]/40" : "w-2 bg-[#1E293B]"}`}
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] text-[#475569] font-mono uppercase tracking-widest">{currentStep + 1}/{totalSteps}</span>
                  </div>

                  <h3 className="text-white text-sm mb-2">{step.title}</h3>
                  <p className="text-[#94A3B8] text-xs leading-relaxed mb-5">{step.body}</p>

                  <div className="flex items-center justify-between">
                    <button onClick={skipTutorial} className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors uppercase tracking-widest font-mono">
                      Skip Tour
                    </button>
                    <motion.button
                      onClick={nextStep}
                      className="flex items-center gap-1.5 bg-[#1A56FF] text-white text-xs px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(26,86,255,0.3)] transition-all"
                      whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(26,86,255,0.4), 0 0 60px rgba(0,229,255,0.15)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {currentStep === totalSteps - 1 ? "Start Depositing" : "Next"}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
