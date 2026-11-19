import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QuizCard } from "@/components/quiz/QuizCard";
import { logEvent } from "@/features/analytics/analyticsLogger";
import { getDrill, getQuiz } from "@/features/drills/drillLoader";
import { useDrillStore } from "@/store/useDrillStore";
import type { QuizAnswer } from "@/types";
import NotFound from "./NotFound";

export default function DrillQuiz() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const drill = getDrill(id);
  const attempts = useDrillStore((s) => s.attempts);
  const attachQuiz = useDrillStore((s) => s.attachQuiz);

  const attempt = useMemo(() => {
    const wanted = params.get("attempt");
    const forDrill = attempts.filter((a) => a.drillId === id);
    return (
      forDrill.find((a) => a.id === wanted) ??
      [...forDrill].sort((a, b) => b.finishedAt - a.finishedAt)[0]
    );
  }, [attempts, params, id]);

  // ?quiz=<id> lets Results offer a bonus concept quiz (e.g. phishing indicators).
  const quiz = getQuiz(params.get("quiz") ?? drill?.quizId);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  if (!drill || !quiz) return <NotFound />;
  if (!attempt) return <Navigate to={`/drills/${drill.id}/brief`} replace />;

  const question = quiz.questions[index];

  const onSelect = (optionIndex: number) => {
    if (selected !== null) return;
    const correct = optionIndex === question.correctIndex;
    setSelected(optionIndex);
    setAnswers((prev) => [...prev, { questionId: question.id, selectedIndex: optionIndex, correct }]);
    logEvent({
      type: "quiz_answered",
      drillId: drill.id,
      concept: quiz.concept,
      stepId: question.id,
      correct,
      timeMs: 0,
      seed: attempt.seed,
    });
  };

  const onNext = () => {
    if (index < quiz.questions.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    attachQuiz(attempt.id, { quizId: quiz.id, concept: quiz.concept, answers });
    navigate(`/drills/${drill.id}/results?attempt=${attempt.id}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[680px] space-y-5 pb-8">
      <div className="space-y-1 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-st-secondary">
          Post-Drill Concept Lock-In
        </span>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-st-primary sm:text-[32px]">
          Quick quiz
        </h1>
        <p className="text-[15px] text-st-on-surface-variant">
          {quiz.title}. Three questions to lock in the concept.
        </p>
      </div>
      <QuizCard
        key={question.id}
        question={question}
        index={index}
        total={quiz.questions.length}
        selected={selected}
        onSelect={onSelect}
        onNext={onNext}
      />
    </div>
  );
}
