import { motion } from "framer-motion";
import { Lightbulb, Square, Volume2 } from "lucide-react";
import { useSpeech } from "@/features/speech/useSpeech";
import { spring } from "@/theme/tokens";
import { cn } from "@/utils/cn";

interface ExplanationPanelProps {
  correct: boolean;
  /** Why the picked option was wrong (only for wrong answers). */
  wrongText?: string;
  correctText: string;
}

/** Slides up after an answer. Includes optional Read aloud (hidden when unsupported). */
export function ExplanationPanel({ correct, wrongText, correctText }: ExplanationPanelProps) {
  const { supported, speaking, speak, stop } = useSpeech();
  const spoken = [wrongText, correctText].filter(Boolean).join(" ");

  return (
    <motion.section
      aria-live="polite"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cn(
        "space-y-3 rounded-2xl p-5 shadow-sm",
        correct
          ? "bg-st-secondary-container/35 ring-1 ring-st-secondary/35"
          : "bg-st-tertiary-fixed/50 ring-1 ring-st-tertiary-container/30",
      )}
    >
      <div className="flex items-center gap-2">
        <Lightbulb
          size={19}
          strokeWidth={2}
          className={correct ? "text-st-secondary" : "text-st-tertiary-container"}
          aria-hidden
        />
        <h3 className="text-[16px] font-bold text-st-primary">{correct ? "That's right" : "Not quite"}</h3>
      </div>
      {wrongText && <p className="text-[14px] leading-relaxed text-st-on-surface">{wrongText}</p>}
      <p className="text-[14px] leading-relaxed text-st-on-surface">
        {wrongText && <strong className="font-semibold">The right answer: </strong>}
        {correctText}
      </p>
      {supported && (
        <button
          type="button"
          onClick={() => (speaking ? stop() : speak(spoken))}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-st-surface-lowest px-3.5 text-[13px] font-semibold text-st-primary shadow-sm"
        >
          {speaking ? <Square size={14} strokeWidth={2} /> : <Volume2 size={15} strokeWidth={2} />}
          <span>{speaking ? "Stop" : "Read aloud"}</span>
        </button>
      )}
    </motion.section>
  );
}
