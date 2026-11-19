import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";

export type OptionState = "idle" | "correct" | "wrong" | "dim";

interface OptionRowProps {
  letter: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

const stateClass: Record<OptionState, string> = {
  idle: "bg-st-surface-lowest hover:bg-white shadow-sm active:scale-[0.99]",
  correct: "bg-st-secondary-container/45 ring-2 ring-st-secondary",
  wrong: "bg-st-error-container/55 ring-2 ring-st-error",
  dim: "bg-st-surface-lowest opacity-60",
};

/** One answer. Tints emerald or red the instant you choose. */
export function OptionRow({ letter, text, state, disabled, onClick }: OptionRowProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "correct" || state === "wrong"}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={spring}
      className={cn(
        "flex min-h-[60px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium text-st-on-surface transition-colors duration-200 disabled:cursor-default",
        stateClass[state],
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold",
          state === "correct" && "bg-st-secondary text-st-on-secondary",
          state === "wrong" && "bg-st-error text-st-on-error",
          (state === "idle" || state === "dim") && "bg-st-surface-container text-st-on-surface-variant",
        )}
        aria-hidden
      >
        {state === "correct" ? (
          <Check size={17} strokeWidth={2.5} />
        ) : state === "wrong" ? (
          <X size={17} strokeWidth={2.5} />
        ) : (
          letter
        )}
      </span>
      <span className="flex-1">{text}</span>
      {state === "correct" && <span className="sr-only">Correct answer</span>}
      {state === "wrong" && <span className="sr-only">Wrong answer</span>}
    </motion.button>
  );
}
