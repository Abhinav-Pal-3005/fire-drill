import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { clamp } from "@/utils/formatters";

type Tone = "accent" | "success" | "warning" | "danger" | "indigo";

const toneClass: Record<Tone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  indigo: "bg-indigo",
};

interface GlassProgressProps {
  value: number;
  tone?: Tone;
  height?: "sm" | "md";
  label: string;
  className?: string;
}

/** Capsule progress bar. Animates scaleX on mount (transform only). */
export function GlassProgress({ value, tone = "accent", height = "md", label, className }: GlassProgressProps) {
  const pct = clamp(value, 0, 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(
        "w-full overflow-hidden rounded-full bg-[rgba(60,60,67,0.10)]",
        height === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <motion.div
        className={cn("h-full w-full origin-left rounded-full", toneClass[tone])}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ type: "spring", stiffness: 120, damping: 24 }}
      />
    </div>
  );
}
