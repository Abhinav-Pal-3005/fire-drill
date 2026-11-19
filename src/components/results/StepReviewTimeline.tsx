import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Minus, OctagonAlert, Shuffle, X, type LucideIcon } from "lucide-react";
import type { StepResult, StepStatus } from "@/types";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/formatters";

const icons: Record<StepStatus, LucideIcon> = {
  correct: Check,
  wrong: X,
  out_of_order: Shuffle,
  missed: Minus,
  critical: OctagonAlert,
};

const dotClass: Record<StepStatus, string> = {
  correct: "bg-st-secondary text-st-on-secondary",
  wrong: "bg-st-error text-st-on-error",
  out_of_order: "bg-st-tertiary-container text-white",
  missed: "bg-st-outline text-white",
  critical: "bg-st-error text-st-on-error ring-4 ring-st-error/25",
};

const pillMeta: Record<StepStatus, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "bg-st-secondary-container text-st-on-secondary-container" },
  wrong: { label: "Wrong action", cls: "bg-st-error-container text-st-on-error-container" },
  out_of_order: { label: "Wrong order", cls: "bg-st-tertiary-fixed text-st-on-tertiary-fixed" },
  missed: { label: "Missed", cls: "bg-st-surface-highest text-st-on-surface-variant" },
  critical: { label: "Critical mistake", cls: "bg-st-error text-st-on-error" },
};

/** Step-by-step review. Tap a row to read the explanation. */
export function StepReviewTimeline({ results }: { results: StepResult[] }) {
  const [open, setOpen] = useState<string | null>(results[0]?.id ?? null);

  return (
    <ol className="relative space-y-1">
      {results.map((r, i) => {
        const Icon = icons[r.status];
        const expanded = open === r.id;
        const badge = pillMeta[r.status];
        return (
          <li key={r.id} className="relative flex gap-3">
            <div className="relative flex w-9 shrink-0 flex-col items-center">
              <span className={cn("z-[1] mt-3 grid h-8 w-8 place-items-center rounded-full", dotClass[r.status])}>
                <Icon size={15} strokeWidth={2.25} aria-hidden />
              </span>
              {i < results.length - 1 && (
                <span className="absolute bottom-[-8px] top-11 w-px bg-st-outline-variant/60" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : r.id)}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-st-surface-lowest"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-st-on-surface">{r.label}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge.cls)}>
                      {badge.label}
                    </span>
                    {r.timeMs !== null && (
                      <span className="tnum text-[12px] text-st-on-surface-variant">{formatDuration(r.timeMs)}</span>
                    )}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  className={cn("shrink-0 text-st-on-surface-variant transition-transform", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="px-2.5 pb-3 text-[13px] leading-relaxed text-st-on-surface-variant"
                  >
                    {r.explanation}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
