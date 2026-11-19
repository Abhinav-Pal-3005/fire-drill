"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposableDrillStep, Drill, DrillGrade, RunState, SemanticIntent, TimerMode } from "@/types";
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
  findComposableStep,
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

export interface TrapFeedback {
  stepId: string;
  intent: SemanticIntent;
  label: string;
  explanation: string;
  timestamp: number;
}

interface Options {
  drill: Drill;
  seed: number;
  timerMode?: TimerMode;
  onFinish: (result: RunnerResult) => void;
}

const COUNTDOWN_STEP_MS = 850;
const FINISH_DELAY_MS = 1100;

const INTENT_LABELS: Record<SemanticIntent, string> = {
  DECLINE_REQUEST: "Declined collect request",
  HANG_UP_CALL: "Hung up suspicious call",
  BLOCK_SENDER: "Blocked & reported sender",
  VERIFY_LENDER: "Checked lender registration",
  CHECK_HISTORY: "Checked transaction history",
  CHECK_BALANCE: "Verified account balance",
  FILE_1930_REPORT: "Filed 1930 cybercrime report",
  FREEZE_UPI: "Froze outbound UPI",
  IGNORE_MESSAGE: "Ignored suspicious message",
  OPEN_UPI_APP: "Opened official UPI app directly",
  ACCEPT_COLLECT: "Approved collect request",
  ENTER_UPI_PIN: "Entered UPI PIN",
  ANSWER_CALL: "Engaged with scam caller",
  CLICK_EXTERNAL_LINK: "Clicked external phishing link",
  SHARE_OTP: "Shared OTP with unknown party",
  INSTALL_APK: "Installed unknown .apk file",
  APPROVE_LOAN: "Approved unchecked loan offer",
};

/** Runs a drill: 3-2-1 countdown, configurable timer mode, legacy actions & composable SemanticIntents, hints and grading. */
export function useDrillRunner({ drill, seed, timerMode = "relaxed", onFinish }: Options) {
  const limitMs = getTimerLimitMs(drill.timeLimitSec, timerMode);
  const composable = isComposableDrill(drill);
  const composableSteps = useMemo(() => getComposableSteps(drill), [drill]);

  const [phase, setPhaseState] = useState<RunnerPhase>("countdown");
  const [count, setCount] = useState(3);
  const [run, setRun] = useState<RunState>(createRunState);
  const [remainingMs, setRemainingMs] = useState(limitMs);
  const [pinMode, setPinMode] = useState<"pin" | "otp" | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(() => composableSteps[0]?.stepId ?? null);
  const [trapFeedback, setTrapFeedback] = useState<TrapFeedback | null>(null);
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
  const activeStepIdRef = useRef<string | null>(activeStepId);
  const startRef = useRef(0);
  const frozenRef = useRef<number | null>(null);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    activeStepIdRef.current = activeStepId;
  }, [activeStepId]);

  const setPhase = useCallback((next: RunnerPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

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

  /** Legacy action emitter (used by the 6 classic PracticeOS drills). */
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

  /** Schema-driven SemanticIntent emitter (used by Composable PracticeOS Widget Registry). */
  const emitIntent = useCallback(
    (intent: SemanticIntent, payload?: Record<string, unknown>) => {
      if (phaseRef.current !== "running") return;
      const step = findComposableStep(drill, activeStepIdRef.current);
      if (!step) return;

      const tMs = Date.now() - startRef.current;
      const evaluation = evaluateComposableIntent(drill, step, intent);
      const customLabel = typeof payload?.label === "string" ? payload.label : INTENT_LABELS[intent];

      if (evaluation.kind === "valid") {
        // Record completion of the graded Step mapped to this composable stepId (if it's a graded step).
        const matchingGradedStep = drill.steps.find((s) => s.id === step.stepId || s.actionKey === intent);
        if (matchingGradedStep) {
          const { state } = applyAction(drill, runRef.current, matchingGradedStep.actionKey, matchingGradedStep.label, tMs);
          runRef.current = state;
          setRun(state);
        }

        setTrapFeedback(null);
        logEvent({
          type: "step_action",
          drillId: drill.id,
          concept: drill.concept,
          stepId: step.stepId,
          correct: true,
          timeMs: tMs,
          seed,
        });

        if (evaluation.nextStepId) {
          activeStepIdRef.current = evaluation.nextStepId;
          setActiveStepId(evaluation.nextStepId);
        }

        if (evaluation.isTerminal || isMandatoryComplete(drill, runRef.current.actions)) {
          frozenRef.current = tMs;
          finalize(false);
        }
        return;
      }

      if (evaluation.kind === "trap") {
        const nextState = applyTrapMistake(
          drill,
          runRef.current,
          step.stepId,
          intent,
          customLabel,
          evaluation.explanation,
          evaluation.isCritical,
          tMs,
        );
        runRef.current = nextState;
        setRun(nextState);

        setTrapFeedback({
          stepId: step.stepId,
          intent,
          label: customLabel,
          explanation: evaluation.explanation,
          timestamp: Date.now(),
        });

        logEvent({
          type: evaluation.isCritical ? "critical_mistake" : "step_action",
          drillId: drill.id,
          concept: evaluation.isCritical ? drill.critical.concept : drill.concept,
          stepId: `${step.stepId}:${intent}`,
          correct: false,
          timeMs: tMs,
          seed,
        });

        if (evaluation.isCritical) {
          frozenRef.current = tMs;
          setPinMode(null);
          setPhase("critical");
          return;
        }

        if (evaluation.nextStepId) {
          activeStepIdRef.current = evaluation.nextStepId;
          setActiveStepId(evaluation.nextStepId);
        }
        return;
      }

      // Neutral intent: log without deducting score.
      logEvent({
        type: "step_action",
        drillId: drill.id,
        concept: drill.concept,
        stepId: `${step.stepId}:${intent}`,
        timeMs: tMs,
        seed,
      });
    },
    [drill, finalize, seed, setPhase],
  );

  const goToComposableStep = useCallback(
    (stepId: string) => {
      if (!findComposableStep(drill, stepId)) return;
      activeStepIdRef.current = stepId;
      setActiveStepId(stepId);
    },
    [drill],
  );

  const dismissTrapFeedback = useCallback(() => setTrapFeedback(null), []);

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
    logEvent({
      type: "critical_mistake",
      drillId: drill.id,
      concept: drill.critical.concept,
      stepId: key,
      correct: false,
      timeMs: tMs,
      seed,
    });
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
    const activeGraded = composable
      ? drill.steps.find((s) => s.id === activeStepIdRef.current) ?? nextIncompleteStep(drill, runRef.current.actions)
      : nextIncompleteStep(drill, runRef.current.actions);
    const step = activeGraded;
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
  }, [composable, drill]);

  const dismissHint = useCallback(() => setHint(null), []);

  const doneStepIds = useMemo(() => completedStepIds(run.actions), [run.actions]);
  const doneKeys = useMemo(() => new Set(run.actions.map((a) => a.actionKey)), [run.actions]);
  const flagStepActive = Boolean(findStep(drill, "spot_red_flags"));

  const activeComposableStep: ComposableDrillStep | null = useMemo(
    () => (composable ? findComposableStep(drill, activeStepId) ?? composableSteps[0] ?? null : null),
    [composable, drill, activeStepId, composableSteps],
  );

  const activeComposableStepIndex = useMemo(() => {
    if (!activeComposableStep) return 0;
    const idx = sortedSteps(drill).findIndex((s) => s.id === activeComposableStep.stepId);
    if (idx >= 0) return idx;
    return Math.max(0, composableSteps.findIndex((s) => s.stepId === activeComposableStep.stepId));
  }, [activeComposableStep, composableSteps, drill]);

  const nextStepMeta = useMemo(() => {
    const step = composable
      ? drill.steps.find((s) => s.id === activeStepId) ?? nextIncompleteStep(drill, run.actions)
      : nextIncompleteStep(drill, run.actions);
    if (!step) return null;
    const idx = sortedSteps(drill).findIndex((s) => s.id === step.id);
    return {
      stepNumber: idx >= 0 ? idx + 1 : step.order,
      alreadyUnlocked: run.hintsUsed.includes(step.id),
    };
  }, [composable, activeStepId, drill, run.actions, run.hintsUsed]);

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
    isComposable: composable,
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
