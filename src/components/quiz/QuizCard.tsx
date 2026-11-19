import { ArrowRight } from "lucide-react";
import type { QuizQuestion } from "@/types";
import { ExplanationPanel } from "./ExplanationPanel";
import { OptionRow, type OptionState } from "./OptionRow";

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  selected: number | null;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
}

const LETTERS = ["A", "B", "C", "D"];

/** One question per screen with instant feedback and an explanation panel. */
export function QuizCard({ question, index, total, selected, onSelect, onNext }: QuizCardProps) {
  const answered = selected !== null;
  const isLast = index === total - 1;
  const correct = answered && selected === question.correctIndex;
  const pct = Math.round(((index + (answered ? 1 : 0)) / total) * 100);

  const stateFor = (i: number): OptionState => {
    if (!answered) return "idle";
    if (i === question.correctIndex) return "correct";
    if (i === selected) return "wrong";
    return "dim";
  };

  return (
    <div className="space-y-5 rounded-[28px] bg-st-surface-container p-6 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-wider text-st-on-surface-variant">
            Question <span className="tnum">{index + 1}</span> of <span className="tnum">{total}</span>
          </p>
          <span className="tnum text-[12px] font-semibold text-st-secondary">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-st-surface-highest" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-st-secondary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h2 className="text-[20px] font-bold leading-snug text-st-primary">{question.prompt}</h2>

      <div className="space-y-2.5" role="group" aria-label="Answer options">
        {question.options.map((opt, i) => (
          <OptionRow
            key={opt.text}
            letter={LETTERS[i] ?? String(i + 1)}
            text={opt.text}
            state={stateFor(i)}
            disabled={answered}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>

      {answered && (
        <>
          <ExplanationPanel
            correct={correct}
            wrongText={!correct && selected !== null ? question.options[selected]?.explanationWrong : undefined}
            correctText={question.explanationCorrect}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-st-primary-container px-6 text-[15px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
            >
              <span>{isLast ? "See results" : "Next question"}</span>
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
