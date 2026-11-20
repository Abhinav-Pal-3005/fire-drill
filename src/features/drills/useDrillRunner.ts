"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Drill,
  DrillGrade,
  RunState,
  SemanticIntent,
  TimerMode,
  TrapIntent,
  TrapMistake,
} from "@/types";
import { logEvent } from "@/features/analytics/analyticsLogger";
import {
  applyAction,
  applyFlagTap,
  applyHint,
  applyTrapMistake,
  createRunState,
  getTimerLimitMs,
  gradeRun,
} from "./drillEngine";
import {
  completedStepIds,
  evaluateComposableIntent,
  findDistractor,
  findStep,
  getComposableSteps,
  isComposableDrill,
  isMandatoryComplete,
  nextIncompleteStep,
  redFlagGoal,
  sortedSteps,
} from "./stepValidator";

export type RunnerPhase = "countdown" | "running" | "critical" | "finished";

export interface RunnerResult {
  grade: DrillGrade;
  startedAt: number;
}

interface Options {
  drill: Drill;
  seed: number;
  timerMode?: TimerMode;
  onFinish: (result: RunnerResult) => void;
}

const COUNTDOWN_STEP_MS = 850;
const FINISH_DELAY_MS = 1100;

/** Runs a drill: 3-2-1 countdown, configurable timer mode (relaxed/panicked/none), action logging, hints and grading. */
export function useDrillRunner({ drill, seed, timerMode = "relaxed", onFinish }: Options) {
  const limitMs = getTimerLimitMs(drill.timeLimitSec, timerMode);
  const isComposable = useMemo(() => isComposableDrill(drill), [drill]);
  const composableSteps = useMemo(() => getComposableSteps(drill), [drill]);

  const [phase, setPhaseState] = useState<RunnerPhase>("countdown");
  const [count, setCount] = useState(3);
  const [run, setRun] = useState<RunState>(createRunState);
  const [remainingMs, setRemainingMs] = useState(limitMs);
  const [pinMode, setPinMode] = useState<"pin" | "otp" | null>(null);
  const [composableStepId, setComposableStepId] = useState<string | null>(
    () => composableSteps[0]?.stepId ?? null,
  );
  const [trapFeedback, setTrapFeedback] = useState<TrapMistake | null>(null);
  const [hint, setHint] = useState<{
    stepId: string;
    stepNumber: number;
    stepLabel: string;
    text: string;
    alreadyUnlocked: boolean;
  } | null>(null);
  const [result, setResult] = useState<RunnerResult | null>(null);

  const phaseRef = useRef<RunnerPhase>("countdown");
  const runRef = useRef<RunState>(run);
  const startRef = useRef(0);
  const frozenRef = useRef<number | null>(null);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const setPhase = useCallback((next: RunnerPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const activeComposableStepIndex = useMemo(() => {
    if (!isComposable || composableSteps.length === 0) return -1;
    if (!composableStepId) return 0;
    const idx = composableSteps.findIndex((s) => s.stepId === composableStepId);
    return idx >= 0 ? idx : 0;
  }, [isComposable, composableSteps, composableStepId]);

  const activeComposableStep = useMemo(() => {
    if (!isComposable || activeComposableStepIndex < 0) return null;
    return composableSteps[activeComposableStepIndex] ?? null;
  }, [isComposable, composableSteps, activeComposableStepIndex]);

  const finalize = useCallback(
    (timedOut: boolean) => {
      if (phaseRef.current === "finished") return;
      const rawElapsed = frozenRef.current ?? Date.now() - startRef.current;
      const elapsed = timerMode === "none" ? rawElapsed : Math.min(limitMs, rawElapsed);
      const grade = gradeRun(drill, runRef.current, elapsed, timedOut, timerMode);
      setPhase("finished");
      setPinMode(null);
      logEvent({
        type: "drill_completed",
        drillId: drill.id,
        concept: drill.concept,
        correct: grade.completed,
        timeMs: Math.round(elapsed),
        seed,
      });
      setResult({ grade, startedAt: startRef.current });
    },
    [drill, limitMs, seed, setPhase, timerMode],
  );

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = window.setTimeout(() => {
      if (count > 1) {
        setCount(count - 1);
      } else {
        startRef.current = Date.now();
        setPhase("running");
        logEvent({ type: "drill_started", drillId: drill.id, concept: drill.concept, timeMs: 0, seed });
      }
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(id);
  }, [phase, count, drill, seed, setPhase]);

  // Timer: no pause in relaxed/panicked modes; unlimited time in no-timer mode.
  useEffect(() => {
    if (phase !== "running" || timerMode === "none") return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, limitMs - (Date.now() - startRef.current));
      setRemainingMs(remaining);
      if (remaining === 0) finalize(true);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, limitMs, timerMode, finalize]);

  // Hand the result to the page after a short "done" moment.
  useEffect(() => {
    if (!result) return;
    const id = window.setTimeout(() => onFinishRef.current(result), FINISH_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [result]);

  const emit = useCallback(
    (actionKey: string, label?: string) => {
      if (phaseRef.current !== "running") return;
      const tMs = Date.now() - startRef.current;
      const { state, outcome } = applyAction(drill, runRef.current, actionKey, label, tMs);
      runRef.current = state;
      setRun(state);
      logEvent({
        type: "step_action",
        drillId: drill.id,
        concept: drill.concept,
        stepId: outcome.stepId ?? actionKey,
        correct: outcome.kind === "neutral" || outcome.kind === "duplicate" ? undefined : outcome.kind === "step",
        timeMs: tMs,
        seed,
      });
      const opener = findDistractor(drill, actionKey);
      if (opener?.opensPin) {
        setPinMode(opener.opensPin);
        return;
      }
      if (isMandatoryComplete(drill, state.actions)) {
        frozenRef.current = tMs;
        finalize(false);
      }
    },
    [drill, finalize, seed],
  );

  const goToComposableStep = useCallback(
    (stepId: string) => {
      if (composableSteps.some((s) => s.stepId === stepId)) {
        setComposableStepId(stepId);
      }
    },
    [composableSteps],
  );

  const dismissTrapFeedback = useCallback(() => setTrapFeedback(null), []);

  const emitIntent = useCallback(
    (intent: SemanticIntent, payload?: Record<string, unknown>) => {
      if (phaseRef.current !== "running" || !activeComposableStep) return;
      const tMs = Date.now() - startRef.current;
      const evaluation = evaluateComposableIntent(drill, activeComposableStep, intent);

      if (evaluation.isTrap) {
        const mistake: TrapMistake = {
          stepId: activeComposableStep.stepId,
          intent: intent as TrapIntent,
          explanation: evaluation.explanation ?? drill.critical.explanation,
          tMs,
          isCritical: evaluation.isCritical,
        };
        const nextState = applyTrapMistake(runRef.current, mistake);
        runRef.current = nextState;
        setRun(nextState);
        setTrapFeedback(mistake);

        logEvent({
          type: evaluation.isCritical ? "critical_mistake" : "step_action",
          drillId: drill.id,
          concept: evaluation.isCritical ? drill.critical.concept : drill.concept,
          stepId: activeComposableStep.stepId,
          correct: false,
          timeMs: tMs,
          seed,
        });

        if (evaluation.isCritical) {
          frozenRef.current = tMs;
          setPhase("critical");
        } else if (evaluation.nextStepId) {
          setComposableStepId(evaluation.nextStepId);
        }
        return;
      }

      if (evaluation.valid) {
        setTrapFeedback(null);
        const matchedStep =
          drill.steps.find((s) => s.id === activeComposableStep.stepId) ??
          drill.steps.find((s) => s.actionKey === intent);
        const alreadyDone =
          matchedStep !== undefined && completedStepIds(runRef.current.actions).includes(matchedStep.id);
        const resolvedLabel =
          matchedStep?.label ?? (typeof payload?.label === "string" ? payload.label : intent);
        const { state } = applyAction(
          drill,
          runRef.current,
          intent,
          resolvedLabel,
          tMs,
          matchedStep?.id ?? activeComposableStep.stepId,
          alreadyDone ? "duplicate" : "step",
        );
        runRef.current = state;
        setRun(state);

        logEvent({
          type: "step_action",
          drillId: drill.id,
          concept: drill.concept,
          stepId: matchedStep?.id ?? activeComposableStep.stepId,
          correct: true,
          timeMs: tMs,
          seed,
        });

        if (evaluation.finish || isMandatoryComplete(drill, state.actions)) {
          frozenRef.current = tMs;
          finalize(false);
        } else if (evaluation.nextStepId) {
          setComposableStepId(evaluation.nextStepId);
        }
      }
    },
    [activeComposableStep, drill, finalize, seed, setPhase],
  );

  /** Called when the fake PIN/OTP pad fills up. The digits themselves are never kept. */
  const completePin = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const key = drill.criticalActions[0];
    const tMs = Date.now() - startRef.current;
    const { state } = applyAction(drill, runRef.current, key, drill.critical.title, tMs);
    runRef.current = state;
    setRun(state);
    frozenRef.current = tMs;
    setPinMode(null);
    logEvent({ type: "critical_mistake", drillId: drill.id, concept: drill.critical.concept, stepId: key, correct: false, timeMs: tMs, seed });
    setPhase("critical");
  }, [drill, seed, setPhase]);

  const cancelPin = useCallback(() => setPinMode(null), []);

  /** Ends the drill after the learner has read the critical-mistake explanation. */
  const endAfterCritical = useCallback(() => finalize(false), [finalize]);

  const tapFlag = useCallback(
    (flagId: string | null) => {
      if (phaseRef.current !== "running") return;
      const tMs = Date.now() - startRef.current;
      const { state, correct, isNew } = applyFlagTap(runRef.current, flagId);
      runRef.current = state;
      setRun(state);
      logEvent({
        type: "red_flag_tapped",
        drillId: drill.id,
        concept: drill.concept,
        stepId: flagId ?? "plain-text",
        correct,
        timeMs: tMs,
        seed,
      });
      const flagStep = drill.steps.find((s) => s.actionKey === "spot_red_flags");
      if (isNew && flagStep && state.flagsFound.length >= redFlagGoal(drill)) {
        emit(flagStep.actionKey);
      }
    },
    [drill, emit, seed],
  );

  const requestHint = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const done = completedStepIds(runRef.current.actions);
    const activeStepMatch =
      isComposable && activeComposableStep
        ? drill.steps.find((s) => s.id === activeComposableStep.stepId && !done.includes(s.id))
        : undefined;
    const step = activeStepMatch ?? nextIncompleteStep(drill, runRef.current.actions);
    if (!step) return;
    const stepIndex = sortedSteps(drill).findIndex((s) => s.id === step.id);
    const stepNumber = stepIndex >= 0 ? stepIndex + 1 : step.order;
    const alreadyUnlocked = runRef.current.hintsUsed.includes(step.id);
    const next = applyHint(runRef.current, step.id);
    runRef.current = next;
    setRun(next);
    setHint({
      stepId: step.id,
      stepNumber,
      stepLabel: step.label,
      text: drill.hints[step.id] ?? "Think about what keeps your money and secrets safe.",
      alreadyUnlocked,
    });
  }, [activeComposableStep, drill, isComposable]);

  const dismissHint = useCallback(() => setHint(null), []);

  const doneStepIds = useMemo(() => completedStepIds(run.actions), [run.actions]);
  const doneKeys = useMemo(() => new Set(run.actions.map((a) => a.actionKey)), [run.actions]);
  const flagStepActive = Boolean(findStep(drill, "spot_red_flags"));
  const nextStepMeta = useMemo(() => {
    const activeStepMatch =
      isComposable && activeComposableStep
        ? drill.steps.find((s) => s.id === activeComposableStep.stepId && !doneStepIds.includes(s.id))
        : undefined;
    const step = activeStepMatch ?? nextIncompleteStep(drill, run.actions);
    if (!step) return null;
    const idx = sortedSteps(drill).findIndex((s) => s.id === step.id);
    return {
      stepNumber: idx >= 0 ? idx + 1 : step.order,
      alreadyUnlocked: run.hintsUsed.includes(step.id),
    };
  }, [activeComposableStep, drill, doneStepIds, isComposable, run.actions, run.hintsUsed]);

  // Auto-dismiss stale hint as soon as the learner completes that step.
  const activeHint = hint && !doneStepIds.includes(hint.stepId) ? hint : null;

  return {
    phase,
    count,
    remainingMs,
    limitMs,
    run,
    pinMode,
    hint: activeHint,
    nextStepMeta,
    doneStepIds,
    doneKeys,
    flagStepActive,
    isComposable,
    activeComposableStep,
    activeComposableStepIndex,
    trapFeedback,
    emit,
    emitIntent,
    goToComposableStep,
    dismissTrapFeedback,
    completePin,
    cancelPin,
    endAfterCritical,
    tapFlag,
    requestHint,
    dismissHint,
  };
}

export type DrillRunner = ReturnType<typeof useDrillRunner>;
