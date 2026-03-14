import { useCallback, useRef, useState } from "react";

/**
 * useUISounds — Web Audio API procedural sound design.
 *
 * Generates 4 UI audio triggers using oscillators + gain envelopes:
 *  1. tick   — subtle muted click for card hover
 *  2. thud   — low bass thud for large deposit amounts
 *  3. chime  — sharp satisfying chime for deposit confirmation
 *  4. sweep  — ascending synth sweep for claim confetti ceremony
 *
 * All sounds are synthesized in realtime — no external audio files.
 * Call `enable()` once (on first user interaction) to unlock AudioContext.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume();
  }
  return sharedCtx;
}

/* ─── Individual sound generators ─── */

function playTick() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(3200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.03);

  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

function playThud() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  // Distortion for impact feel
  const dist = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 4) * x / (Math.PI + 4 * Math.abs(x));
  }
  dist.curve = curve;

  osc.connect(dist).connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

function playChime() {
  const ctx = getCtx();
  const freqs = [880, 1320, 1760];

  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = i * 0.04;

    osc.type = "sine";
    osc.frequency.setValueAtTime(f, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.3);
  });
}

function playSweep() {
  const ctx = getCtx();

  // Main ascending sweep
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(220, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.6);
  gain1.gain.setValueAtTime(0.03, ctx.currentTime);
  gain1.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.85);

  // Shimmering high-end
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.15);
  osc2.frequency.exponentialRampToValueAtTime(3520, ctx.currentTime + 0.6);
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.95);

  // Final sparkle ping
  setTimeout(() => {
    const ctx2 = getCtx();
    const osc3 = ctx2.createOscillator();
    const gain3 = ctx2.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(2637, ctx2.currentTime);
    gain3.gain.setValueAtTime(0.05, ctx2.currentTime);
    gain3.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.4);
    osc3.connect(gain3).connect(ctx2.destination);
    osc3.start(ctx2.currentTime);
    osc3.stop(ctx2.currentTime + 0.45);
  }, 500);
}

/* ─── Hook ─── */

export interface UISounds {
  /** Subtle muted tick — card hover */
  tick: () => void;
  /** Low bass thud — large deposit amount input */
  thud: () => void;
  /** Sharp satisfying chime — deposit button click */
  chime: () => void;
  /** Ascending synth sweep — claim confetti ceremony */
  sweep: () => void;
  /** Call once on first user gesture to unlock AudioContext */
  enable: () => void;
  /** Whether sounds are enabled */
  enabled: boolean;
  /** Toggle sounds on/off */
  toggle: () => void;
}

export function useUISounds(): UISounds {
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  const safePlay = useCallback((fn: () => void) => {
    if (!enabledRef.current) return;
    try {
      fn();
    } catch {
      // Silently fail if AudioContext is blocked
    }
  }, []);

  const tick = useCallback(() => safePlay(playTick), [safePlay]);
  const thud = useCallback(() => safePlay(playThud), [safePlay]);
  const chime = useCallback(() => safePlay(playChime), [safePlay]);
  const sweep = useCallback(() => safePlay(playSweep), [safePlay]);

  const enable = useCallback(() => {
    getCtx();
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
  }, []);

  return {
    tick,
    thud,
    chime,
    sweep,
    enable,
    enabled,
    toggle,
  };
}
