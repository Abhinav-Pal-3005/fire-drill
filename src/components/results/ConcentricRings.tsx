import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { clamp } from "@/utils/formatters";

export interface RingSpec {
  key: string;
  label: string;
  /** 0-100 */
  value: number;
  color: string;
}

interface ConcentricRingsProps {
  rings: RingSpec[];
  size?: number;
  /** Large number shown in the centre (defaults to the first ring). */
  centerLabel?: string;
  centerValue?: number;
  showLegend?: boolean;
}

/** Count-up from 0 to target (instant under reduced motion). */
export function useCountUp(target: number, durationMs = 1100): number {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduce]);

  return reduce ? target : animated;
}

function LegendItem({ ring }: { ring: RingSpec }) {
  const value = useCountUp(Math.round(ring.value));
  return (
    <li className="flex items-center gap-2.5">
      <span className="h-3 w-3 rounded-full" style={{ background: ring.color }} aria-hidden />
      <span className="t-subhead flex-1 text-label-2">{ring.label}</span>
      <span className="t-headline tnum">{value}%</span>
    </li>
  );
}

/** Apple-Fitness style concentric rings with animated fill and count-up. */
export function ConcentricRings({ rings, size = 240, centerLabel, centerValue, showLegend = true }: ConcentricRingsProps) {
  const stroke = Math.max(10, Math.round(size / (rings.length * 2 + 5)));
  const gap = Math.max(4, Math.round(stroke / 3));
  const main = useCountUp(Math.round(centerValue ?? rings[0]?.value ?? 0));
  const summary = rings.map((r) => `${r.label} ${Math.round(r.value)} percent`).join(", ");

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={summary}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {rings.map((ring, i) => {
            const radius = size / 2 - stroke / 2 - i * (stroke + gap);
            const pct = clamp(ring.value, 0, 100) / 100;
            return (
              <g key={ring.key}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ring.color} strokeOpacity={0.16} strokeWidth={stroke} />
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: Math.max(pct, 0.001), opacity: pct === 0 ? 0 : 1 }}
                  transition={{ duration: 1.1, delay: 0.1 + i * 0.12, ease: "easeOut" }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="tnum text-[44px] font-bold leading-none tracking-tight">{main}</span>
          <span className="t-caption mt-1 text-label-2">{centerLabel ?? rings[0]?.label}</span>
        </div>
      </div>
      {showLegend && (
        <ul className="w-full max-w-[280px] space-y-3">
          {rings.map((ring) => (
            <LegendItem key={ring.key} ring={ring} />
          ))}
        </ul>
      )}
    </div>
  );
}
