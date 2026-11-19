import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "indigo"
  | "teal"
  | "dangerFilled";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-[rgba(60,60,67,0.08)] text-label-2",
  accent: "bg-accent-tint text-accent-text",
  success: "bg-success/15 text-success-text",
  danger: "bg-danger/12 text-danger-text",
  warning: "bg-warning/15 text-warning-text",
  indigo: "bg-indigo/12 text-[#4745B8]",
  teal: "bg-teal/15 text-[#0B6272]",
  dangerFilled: "bg-danger text-white",
};

interface GlassBadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  glass?: boolean;
  className?: string;
  children: ReactNode;
}

/** Capsule badge. Use `glass` only on top of imagery or tinted heroes. */
export function GlassBadge({ tone = "neutral", icon, glass = false, className, children }: GlassBadgeProps) {
  return (
    <span
      className={cn(
        "t-caption relative inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-semibold",
        glass ? "glass-thin text-label" : toneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

interface GlassChipProps {
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Selectable filter chip (button). */
export function GlassChip({ selected = false, onClick, icon, className, children }: GlassChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "t-subhead inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 font-medium transition-colors duration-200 active:scale-[0.97]",
        selected
          ? "bg-accent text-white shadow-[0_6px_16px_rgba(0,98,204,0.25)]"
          : "surface text-label hover:bg-white",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
