import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

/** Readiness checklist with animated checkmarks. */
export function ReadinessChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={item.id} className="flex min-h-[44px] items-center gap-3 py-1.5">
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
              item.done ? "border-st-secondary bg-st-secondary text-st-on-secondary" : "border-st-outline-variant bg-transparent",
            )}
            aria-hidden
          >
            {item.done && (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.12 + i * 0.08 }}
                className="grid place-items-center"
              >
                <Check size={14} strokeWidth={2.75} />
              </motion.span>
            )}
          </span>
          <span className={cn("text-[14px]", item.done ? "text-st-on-surface" : "text-st-on-surface-variant")}>
            {item.label}
            <span className="sr-only">{item.done ? " (done)" : " (not yet)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
