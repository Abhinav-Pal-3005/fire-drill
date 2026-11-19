import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface GlassSegmentedProps<T extends string> {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/** Segmented control with a sliding thumb. */
export function GlassSegmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: GlassSegmentedProps<T>) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("glass-thin relative inline-flex w-full rounded-full p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "t-subhead relative z-[2] flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-4 font-semibold transition-colors",
              active ? "text-label" : "text-label-2 hover:text-label",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 -z-[1] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(20,30,60,0.10)]"
              />
            )}
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
