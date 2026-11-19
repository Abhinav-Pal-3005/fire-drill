import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  chip?: { text: string; tone: "success" | "danger" | "neutral"; direction?: "up" | "down" | "flat" };
  caption?: ReactNode;
}

const CHIP_CLASS = {
  success: "bg-st-secondary-container text-st-on-secondary-container",
  danger: "bg-st-error-container text-st-on-error-container",
  neutral: "bg-st-surface-highest text-st-on-surface-variant",
};

/** KPI card with big tabular numerals and a trend chip. */
export function StatCard({ label, value, chip, caption }: StatCardProps) {
  const Arrow = chip?.direction === "up" ? ArrowUpRight : chip?.direction === "down" ? ArrowDownRight : Minus;
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-[24px] bg-st-surface-container p-5 shadow-sm">
      <p className="text-[13px] font-semibold text-st-on-surface-variant">{label}</p>
      <p className="tnum text-[34px] font-bold leading-none tracking-tight text-st-primary sm:text-[38px]">{value}</p>
      <div className="flex flex-wrap items-center gap-2">
        {chip && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              CHIP_CLASS[chip.tone],
            )}
          >
            <Arrow size={12} strokeWidth={2.25} aria-hidden />
            {chip.text}
          </span>
        )}
        {caption && <span className="text-[12px] text-st-on-surface-variant">{caption}</span>}
      </div>
    </div>
  );
}
