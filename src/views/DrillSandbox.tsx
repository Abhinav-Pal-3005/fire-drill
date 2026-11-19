import { useCallback, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronUp, Flag, Lightbulb, OctagonAlert } from "lucide-react";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { useNavTitle } from "@/components/glass/GlassNavBar";
import { GlassToast } from "@/components/glass/GlassToast";
import { PhoneFrame } from "@/components/sandbox/PhoneFrame";
import { SandboxScene } from "@/components/sandbox/SandboxScene";
import { TimerCapsule } from "@/components/sandbox/TimerCapsule";
import { useDrillRunner, type RunnerResult } from "@/features/drills/useDrillRunner";
import { redFlagGoal, sortedSteps } from "@/features/drills/stepValidator";
import { getDrill } from "@/features/drills/drillLoader";
import { createScenario } from "@/features/randomiser/scenarioRandomiser";
import { useDrillStore, type PendingSeed } from "@/store/useDrillStore";
import { spring } from "@/theme/tokens";
import type { Attempt, Scenario } from "@/types";
import { cn } from "@/utils/cn";
import { createId } from "@/utils/id";
import NotFound from "./NotFound";

export default function DrillSandbox() {
  const { id } = useParams();
  const drill = getDrill(id);
  // Capture the seed once: finishing a run clears it from the store, and we must not redirect mid-navigation.
  const [initial] = useState<PendingSeed | undefined>(() => (id ? useDrillStore.getState().pending[id] : undefined));

  const scenario = useMemo(
    () => (drill && initial ? createScenario(drill, initial.seed, { demo: initial.demo }) : null),
    [drill, initial],
  );

  if (!drill) return <NotFound />;
  if (!scenario) return <Navigate to={`/drills/${drill.id}/brief`} replace />;
  return <SandboxRunner scenario={scenario} />;
}

function SandboxRunner({ scenario }: { scenario: Scenario }) {
  const { drill } = scenario;
  const navigate = useNavigate();
  const addAttempt = useDrillStore((s) => s.addAttempt);
  const clearPending = useDrillStore((s) => s.clearPending);
  useNavTitle(drill.title);

  const handleFinish = useCallback(
    ({ grade, startedAt }: RunnerResult) => {
      const attempt: Attempt = {
        id: createId("att"),
        drillId: drill.id,
        concept: drill.concept,
        seed: scenario.seed,
        demoSeed: scenario.demo,
        startedAt,
        finishedAt: Date.now(),
        grade,
      };
      addAttempt(attempt);
      clearPending(drill.id);
      navigate(`/drills/${drill.id}/quiz?attempt=${attempt.id}`, { replace: true });
    },
    [drill, scenario, addAttempt, clearPending, navigate],
  );

  const runner = useDrillRunner({ drill, seed: scenario.seed, onFinish: handleFinish });
  const [stepsOpen, setStepsOpen] = useState(false);
  const steps = sortedSteps(drill);
  const goal = redFlagGoal(drill);
  const hasFlags = drill.redFlags.length > 0;
  const nextStepId = steps.find((s) => !runner.doneStepIds.includes(s.id))?.id;

  const renderStepsList = () => (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const done = runner.doneStepIds.includes(s.id);
        const isNext = !done && s.id === nextStepId;
        return (
          <li key={s.id} className="flex items-start gap-3">
            <span
              className={cn(
                "t-footnote mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-semibold",
                done
                  ? "bg-success text-white"
                  : isNext
                    ? "bg-accent/15 text-accent-text ring-1 ring-accent/30"
                    : "bg-[rgba(60,60,67,0.10)] text-label-2",
              )}
              aria-hidden
            >
              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("t-subhead font-semibold", done ? "text-label" : isNext ? "text-accent-text" : "text-label-2")}>
                {done ? s.label : isNext ? `Next · Step ${i + 1}` : `Step ${i + 1}`}
                <span className="sr-only">{done ? " (done)" : " (not done yet)"}</span>
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-label-2">
                {done ? s.explanation : s.cue ?? "Act safely inside the phone."}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  const hintLabel = runner.nextStepMeta
    ? runner.nextStepMeta.alreadyUnlocked
      ? `Show Step ${runner.nextStepMeta.stepNumber} hint (free)`
      : `Hint · Step ${runner.nextStepMeta.stepNumber} (−5 pts)`
    : "Hint";

  const hintCard = runner.hint && (
    <GlassToast icon={<Lightbulb size={20} strokeWidth={1.75} />} onClose={runner.dismissHint}>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-label">Hint · Step {runner.hint.stepNumber}</span>
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[11px] font-semibold text-accent-text">
            {runner.hint.alreadyUnlocked ? "Unlocked" : "−5 pts"}
          </span>
        </div>
        <p className="text-[13px] font-semibold leading-snug text-label">{runner.hint.stepLabel}</p>
        <p className="text-[13px] leading-snug text-label-2">{runner.hint.text}</p>
        <button
          type="button"
          onClick={runner.dismissHint}
          className="mt-1 inline-flex text-[12px] font-semibold text-accent-text hover:underline"
        >
          Got it
        </button>
      </div>
    </GlassToast>
  );

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
        {/* Phone */}
        <div className="w-full lg:w-auto">
          <PhoneFrame timer={{ remainingMs: runner.remainingMs, totalMs: runner.limitMs }}>
            <SandboxScene drill={drill} vars={scenario.vars} runner={runner} />

            <AnimatePresence>
              {runner.phase === "countdown" && (
                <motion.div
                  key="countdown"
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/95"
                  exit={{ opacity: 0 }}
                  role="status"
                  aria-live="assertive"
                >
                  <p className="t-subhead font-semibold text-label-2">Get ready</p>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={runner.count}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.4, opacity: 0 }}
                      transition={spring}
                      className="tnum text-[96px] font-bold leading-none text-accent-text"
                    >
                      {runner.count}
                    </motion.span>
                  </AnimatePresence>
                  <p className="t-footnote tnum px-6 text-center text-label-2">
                    Scenario seed #{scenario.seedCode} · details randomised
                  </p>
                </motion.div>
              )}
              {runner.phase === "finished" && (
                <motion.div
                  key="finished"
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/95"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  role="status"
                >
                  <CheckCircle2 size={56} strokeWidth={1.5} className="text-success" aria-hidden />
                  <p className="t-title3">Drill over</p>
                  <p className="t-subhead text-label-2">Scoring your response…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </PhoneFrame>
        </div>

        {/* Desktop side column */}
        <aside className="hidden w-[340px] shrink-0 flex-col gap-4 lg:flex" aria-label="Drill controls">
          <div className="flex justify-center">
            <TimerCapsule remainingMs={runner.remainingMs} totalMs={runner.limitMs} />
          </div>

          <div className="glass-regular relative space-y-3 rounded-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="t-headline">Your steps</h2>
              <span className="t-footnote tnum font-semibold text-label-2">
                {runner.doneStepIds.length}/{steps.length} done
              </span>
            </div>
            {renderStepsList()}
            <p className="t-footnote text-label-2">
              Follow the safest order inside the phone. Each completed step unlocks its full explanation.
            </p>
          </div>

          {hasFlags && (
            <div className="surface flex items-start gap-3 rounded-card p-4">
              <Flag size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
              <div>
                <p className="t-subhead font-semibold">Spot the red flags</p>
                <p className="t-footnote text-label-2">
                  Tap suspicious words in messages. Right taps turn green; wrong taps shake red.
                </p>
                <p className="t-footnote tnum mt-1 font-semibold">
                  Found {runner.run.flagsFound.length} of {drill.redFlags.length} (need {goal})
                </p>
              </div>
            </div>
          )}

          <GlassButton
            variant="glass"
            onClick={runner.requestHint}
            disabled={runner.phase !== "running"}
            icon={<Lightbulb size={18} strokeWidth={1.75} />}
            fullWidth
          >
            {hintLabel}
          </GlassButton>
          {hintCard}
          <GlassBadge tone="neutral" className="tnum self-center">
            Scenario seed #{scenario.seedCode} · details randomised
          </GlassBadge>
        </aside>
      </div>

      {/* Mobile floating controls */}
      <span className="sr-only" role="timer" aria-label="Time remaining on mobile">
        {Math.ceil(runner.remainingMs / 1000)} seconds
      </span>
      <div className="fixed inset-x-4 bottom-4 z-40 space-y-2 lg:hidden">
        {hintCard}
        <div className="flex items-center justify-between gap-3">
          <GlassButton variant="glass" size="sm" onClick={runner.requestHint} disabled={runner.phase !== "running"} icon={<Lightbulb size={16} strokeWidth={1.75} />}>
            {runner.nextStepMeta?.alreadyUnlocked ? `Step ${runner.nextStepMeta.stepNumber} hint` : "Hint (−5)"}
          </GlassButton>
          <button
            type="button"
            onClick={() => setStepsOpen(true)}
            aria-label="View drill steps and explanations"
            className="glass-regular t-subhead tnum relative inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 py-2 font-semibold transition-transform active:scale-95"
          >
            <span>
              {runner.doneStepIds.length}/{steps.length} steps
              {hasFlags && (
                <span className="text-label-2"> · {runner.run.flagsFound.length}/{drill.redFlags.length} flags</span>
              )}
            </span>
            <ChevronUp size={15} strokeWidth={2} className="text-label-2" aria-hidden />
          </button>
        </div>
      </div>

      <GlassSheet open={stepsOpen} onClose={() => setStepsOpen(false)} title="Drill steps">
        <div className="space-y-4">
          {renderStepsList()}
          <p className="t-footnote text-label-2">
            Follow the safest order inside the phone. Each completed step unlocks its full explanation.
          </p>
        </div>
      </GlassSheet>

      <GlassSheet
        open={runner.phase === "critical"}
        onClose={runner.endAfterCritical}
        title="Critical mistake"
        hideClose
        footer={
          <GlassButton size="lg" fullWidth onClick={runner.endAfterCritical}>
            See what happened
          </GlassButton>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-danger-text">
            <OctagonAlert size={24} strokeWidth={1.75} aria-hidden />
            <p className="t-headline">{drill.critical.title}</p>
          </div>
          <p className="t-body">{drill.critical.explanation}</p>
          <GlassBadge tone="dangerFilled">Score capped at 20%</GlassBadge>
          <p className="t-footnote text-label-2">This was only a practice. Nothing real was lost.</p>
        </div>
      </GlassSheet>
    </div>
  );
}
