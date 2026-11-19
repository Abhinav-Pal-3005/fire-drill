import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, OctagonAlert, RotateCcw } from "lucide-react";
import { ConcentricRings } from "@/components/results/ConcentricRings";
import { ReadinessChecklist, type ChecklistItem } from "@/components/results/ReadinessChecklist";
import { RecommendationCard } from "@/components/results/RecommendationCard";
import { StepReviewTimeline } from "@/components/results/StepReviewTimeline";
import { getRecommendedDrill } from "@/features/adaptive/adaptiveEngine";
import { redFlagGoal } from "@/features/drills/stepValidator";
import { getConcept, getDrill, getQuiz } from "@/features/drills/drillLoader";
import { useDrillStore } from "@/store/useDrillStore";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/formatters";
import { seedCode } from "@/utils/seedRandom";
import NotFound from "./NotFound";

export default function DrillResults() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const drill = getDrill(id);
  const attempts = useDrillStore((s) => s.attempts);

  const attempt = useMemo(() => {
    const wanted = params.get("attempt");
    const forDrill = attempts.filter((a) => a.drillId === id);
    return (
      forDrill.find((a) => a.id === wanted) ??
      [...forDrill].sort((a, b) => b.finishedAt - a.finishedAt)[0]
    );
  }, [attempts, params, id]);

  const recommendation = useMemo(() => getRecommendedDrill(attempts), [attempts]);

  if (!drill) return <NotFound />;
  if (!attempt) return <Navigate to={`/drills/${drill.id}/brief`} replace />;

  const { grade } = attempt;
  const quiz = attempt.quiz;
  const quizCorrect = quiz ? quiz.answers.filter((a) => a.correct).length : 0;
  const quizDef = quiz ? getQuiz(quiz.quizId) : undefined;

  const checklist: ChecklistItem[] = [
    { id: "flags", label: "Spotted the red flags", done: grade.flagsFound >= redFlagGoal(drill) },
    { id: "order", label: "Followed the steps in the right order", done: grade.orderScore >= 100 },
    { id: "finish", label: "Finished every step in time", done: grade.completed && !grade.timedOut },
    { id: "critical", label: "Avoided critical mistakes", done: !grade.critical },
    { id: "hints", label: "Did it without hints", done: grade.hintsUsed === 0 },
    { id: "quiz", label: "Passed the quiz (2 of 3)", done: quiz ? quizCorrect >= 2 : false },
  ];

  const showBonus = drill.relatedConcepts.includes("phishing-indicators") && quiz?.quizId !== "phishing-indicators";

  return (
    <div className="mx-auto max-w-[880px] space-y-6 pb-8">
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-st-secondary">
          Post-Drill Debrief
        </span>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-st-primary sm:text-[34px]">Results</h1>
        <p className="text-[16px] text-st-on-surface-variant">{drill.title}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="tnum inline-flex items-center rounded-full bg-st-surface-container px-3 py-1 text-[12px] font-semibold text-st-on-surface-variant">
          Scenario seed #{seedCode(attempt.seed)} · details randomised
        </span>
        {attempt.demoSeed && (
          <span className="inline-flex items-center rounded-full bg-st-secondary-container px-3 py-1 text-[12px] font-semibold text-st-on-secondary-container">
            Demo run
          </span>
        )}
        {grade.timedOut && (
          <span className="inline-flex items-center rounded-full bg-st-tertiary-fixed px-3 py-1 text-[12px] font-semibold text-st-on-tertiary-fixed">
            Time ran out
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-st-surface-container px-3 py-1 text-[12px] font-semibold text-st-primary">
          {getConcept(drill.concept).title}
        </span>
      </div>

      {grade.critical && (
        <div
          role="alert"
          className="flex gap-3 rounded-[24px] bg-st-error-container/70 p-5 ring-1 ring-st-error/35"
        >
          <OctagonAlert size={24} strokeWidth={2} className="mt-0.5 shrink-0 text-st-error" aria-hidden />
          <div className="space-y-1">
            <p className="text-[16px] font-bold text-st-error">Critical mistake · score capped at 20%</p>
            <p className="text-[14px] leading-relaxed text-st-on-error-container">{drill.critical.explanation}</p>
          </div>
        </div>
      )}

      {/* Concentric Rings Breakdown */}
      <section className="rounded-[28px] bg-st-surface-container p-6 shadow-sm">
        <ConcentricRings
          size={240}
          centerLabel="Score"
          centerValue={grade.total}
          rings={[
            { key: "score", label: "Score", value: grade.total, color: "#006c48" },
            { key: "order", label: "Order", value: grade.orderScore, color: "#1b4332" },
            { key: "speed", label: "Speed", value: grade.speedScore, color: "#3f6653" },
            { key: "flags", label: "Red flags", value: grade.redFlagScore, color: "#9c4221" },
          ]}
        />
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-st-outline-variant/40 pt-4 text-center">
          <div>
            <dt className="text-[12px] font-medium text-st-on-surface-variant">Time used</dt>
            <dd className="tnum mt-0.5 text-[17px] font-bold text-st-primary">{formatDuration(grade.elapsedMs)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-st-on-surface-variant">Hints</dt>
            <dd className="tnum mt-0.5 text-[17px] font-bold text-st-primary">
              {grade.hintsUsed}
              {grade.hintPenalty > 0 && (
                <span className="text-[12px] font-normal text-st-on-surface-variant"> (−{grade.hintPenalty})</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-st-on-surface-variant">Red flags</dt>
            <dd className="tnum mt-0.5 text-[17px] font-bold text-st-primary">
              {grade.flagsFound}/{grade.flagsTotal}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="space-y-3 rounded-[28px] bg-st-surface-container p-5 shadow-sm lg:col-span-3">
          <h2 className="text-[19px] font-bold text-st-primary">Step review</h2>
          <p className="text-[13px] text-st-on-surface-variant">Tap a step to read why it matters.</p>
          <StepReviewTimeline results={grade.results} />
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="space-y-3 rounded-[28px] bg-st-surface-container p-5 shadow-sm">
            <h2 className="text-[19px] font-bold text-st-primary">Quiz summary</h2>
            {quiz && quizDef ? (
              <>
                <p className="text-[15px] text-st-on-surface">
                  <strong className="tnum font-bold">{quizCorrect}</strong> of{" "}
                  <span className="tnum">{quiz.answers.length}</span> correct
                </p>
                <ul className="space-y-2">
                  {quiz.answers.map((a) => {
                    const q = quizDef.questions.find((x) => x.id === a.questionId);
                    return (
                      <li key={a.questionId} className="flex items-start gap-2 rounded-xl bg-st-surface-lowest p-2.5">
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            a.correct
                              ? "bg-st-secondary-container text-st-on-secondary-container"
                              : "bg-st-error-container text-st-on-error-container",
                          )}
                        >
                          {a.correct ? "Right" : "Missed"}
                        </span>
                        <span className="text-[12px] leading-snug text-st-on-surface-variant">{q?.prompt}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <p className="text-[14px] text-st-on-surface-variant">You have not taken the quiz for this attempt.</p>
                <Link
                  to={`/drills/${drill.id}/quiz?attempt=${attempt.id}`}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-st-primary-container px-5 text-[14px] font-semibold text-st-on-primary shadow-sm"
                >
                  Take the quiz
                </Link>
              </>
            )}
            {showBonus && (
              <Link
                to={`/drills/${drill.id}/quiz?attempt=${attempt.id}&quiz=phishing-indicators`}
                className="inline-flex min-h-[40px] items-center text-[13px] font-semibold text-st-secondary hover:underline"
              >
                Bonus: phishing indicators quiz
              </Link>
            )}
          </section>

          <section className="space-y-2 rounded-[28px] bg-st-surface-container p-5 shadow-sm">
            <h2 className="text-[19px] font-bold text-st-primary">Readiness checklist</h2>
            <ReadinessChecklist items={checklist} />
          </section>
        </div>
      </div>

      <RecommendationCard recommendation={recommendation} heading="Your suggested next drill" secondary />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to={`/drills/${drill.id}/brief`}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-st-primary-container px-6 text-[15px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
        >
          <RotateCcw size={17} strokeWidth={2} aria-hidden />
          <span>Practice this concept again</span>
        </Link>
        <Link
          to={`/drills/${recommendation.drill.id}/brief`}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-st-surface-container px-6 text-[15px] font-semibold text-st-primary shadow-sm transition-colors hover:bg-st-surface-high"
        >
          <span>Next suggested drill</span>
          <ArrowRight size={17} strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
