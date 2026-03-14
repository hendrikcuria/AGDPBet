"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, useTransform } from "motion/react";

/**
 * AnimatedNumber: numbers rapidly tick/scroll to new values
 * instead of instantly swapping.
 */
export function AnimatedNumber({
  value,
  format,
  className = "",
  duration = 0.8,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (latest) =>
    format ? format(latest) : latest.toFixed(2)
  );
  const [text, setText] = useState(format ? format(value) : value.toFixed(2));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return unsub;
  }, [display]);

  return <span className={className}>{text}</span>;
}

/**
 * TickingNumber: a simpler approach for multiplier-style values
 * with a brief scramble/decode effect.
 */
export function DecodeNumber({
  value,
  className = "",
  prefix = "",
  suffix = "",
}: {
  value: string;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;

    const chars = "0123456789.,";
    let ticks = 0;
    const maxTicks = 6;

    const scramble = () => {
      if (ticks >= maxTicks) {
        setDisplay(value);
        return;
      }
      ticks++;
      setDisplay(
        value
          .split("")
          .map((ch, i) => {
            if (i < ticks || !/[0-9.,]/.test(ch)) return ch;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      timerRef.current = setTimeout(scramble, 40);
    };
    scramble();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
