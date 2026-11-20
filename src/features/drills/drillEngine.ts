import type {
  ConceptId,
  Drill,
  DrillGrade,
  LoggedAction,
  Mistake,
  RunState,
  StepResult,
  TimerMode,
  TrapIntent,
  TrapMistake,
} from "@/types";
import { clamp } from "@/utils/formatters";
import {
  classifyAction,
  findDistractor,
  findStep,
  redFlagGoal,
  sortedSteps,
} from "./stepValidator";

const TRAP_INTENT_LABELS: Record<TrapIntent, string> = {
  ACCEPT_COLLECT: "Approved UPI collect request",
  ENTER_UPI_PIN: "Entered UPI PIN on unsafe prompt",
  ANSWER_CALL: "Stayed on suspicious scam call",
  CLICK_EXTERNAL_LINK: "Opened suspicious external link",
  SHARE_OTP: "Shared OTP with unverified caller/page",
  INSTALL_APK: "Installed unverified APK file",
  APPROVE_LOAN: "Approved unverified loan offer",
};

/* ----------------------------- Runner state ----------------------------- */

export function createRunState(): RunState {
  return { actions: [], flagsFound: [], wrongTaps: 0, hintsUsed: [], critical: false, trapMistakes: [] };
}

export interface ActionOutcome {
  kind: LoggedAction["kind"];
  stepId?: string;
}

/** Records one tap on a mock screen. Pure: returns a new state. */
export function applyAction(
  drill: Drill,
  state: RunState,
  actionKey: string,
  label: string | undefined,
  tMs: number,
  stepIdOverride?: string,
  kindOverride?: LoggedAction["kind"],
  explanation?: string,
): { state: RunState; outcome: ActionOutcome } {
  const outcome = kindOverride
    ? { kind: kindOverride, stepId: stepIdOverride }
    : classifyAction(drill, state.actions, actionKey);
  const resolvedLabel =
    label ?? findStep(drill, actionKey)?.label ?? findDistractor(drill, actionKey)?.label ?? actionKey;
  const logged: LoggedAction = {
    actionKey,
    label: resolvedLabel,
    tMs,
    kind: outcome.kind,
    stepId: stepIdOverride ?? outcome.stepId,
    explanation,
  };
  return {
    state: {
      ...state,
      actions: [...state.actions, logged],
      critical: state.critical || outcome.kind === "critical",
    },
    outcome,
  };
}

/** Records a trap mistake emitted by a composable OS widget. Pure: returns a new state. */
export function applyTrapMistake(state: RunState, mistake: TrapMistake): RunState {
  const existing = state.trapMistakes ?? [];
  const label = TRAP_INTENT_LABELS[mistake.intent] ?? mistake.intent;
  const logged: LoggedAction = {
    actionKey: mistake.intent,
    label,
    tMs: mistake.tMs,
    kind: mistake.isCritical ? "critical" : "distractor",
    stepId: mistake.stepId,
    explanation: mistake.explanation,
  };
  return {
    ...state,
    actions: [...state.actions, logged],
    trapMistakes: [...existing, mistake],
    critical: state.critical || mistake.isCritical,
  };
}

/** flagId = null means the learner tapped plain text (a wrong tap). */
export function applyFlagTap(
  state: RunState,
  flagId: string | null,
): { state: RunState; correct: boolean; isNew: boolean } {
  if (flagId === null) {
    return { state: { ...state, wrongTaps: state.wrongTaps + 1 }, correct: false, isNew: false };
  }
  if (state.flagsFound.includes(flagId)) return { state, correct: true, isNew: false };
  return { state: { ...state, flagsFound: [...state.flagsFound, flagId] }, correct: true, isNew: true };
}

export function applyHint(state: RunState, stepId: string): RunState {
  if (state.hintsUsed.includes(stepId)) return state;
  return { ...state, hintsUsed: [...state.hintsUsed, stepId] };
}

/* -------------------------------- Grader -------------------------------- */

const WEIGHTS = { steps: 0.4, order: 0.25, redFlags: 0.2, speed: 0.15 } as const;
const HINT_PENALTY = 5;
const WRONG_ACTION_PENALTY = 8;
const WRONG_TAP_PENALTY = 10;
const CRITICAL_CAP = 20;

export function getTimerLimitMs(baseTimeLimitSec: number, timerMode: TimerMode = "relaxed"): number {
  if (timerMode === "none") return 0;
  const multiplier = timerMode === "panicked" ? 0.5 : 1.5;
  return Math.max(30, Math.round(baseTimeLimitSec * multiplier)) * 1000;
}

export function gradeRun(
  drill: Drill,
  run: RunState,
  elapsedMs: number,
  timedOut: boolean,
  timerMode: TimerMode = "relaxed",
): DrillGrade {
  const steps = sortedSteps(drill);
  const results: StepResult[] = [];
  const mistakes: Mistake[] = [];

  const timeFor = (action: LoggedAction): number => {
    const idx = run.actions.indexOf(action);
    const prev = idx > 0 ? run.actions[idx - 1].tMs : 0;
    return Math.max(0, action.tMs - prev);
  };

  let weightTotal = 0;
  let credit = 0;
  let orderCredit = 0;
  let counted = 0;
  let done = 0;
  let mandatoryDone = true;

  for (const step of steps) {
    const action = run.actions.find(
      (a) => a.stepId === step.id && (a.kind === "step" || a.kind === "out_of_order"),
    );
    if (!action && !step.mandatory) continue;
    weightTotal += step.weight;
    counted += 1;

    if (!action) {
      results.push({
        id: step.id,
        label: step.label,
        status: "missed",
        timeMs: null,
        explanation: step.explanation,
        kind: "step",
        mistakeConcept: step.mistakeConcept,
      });
      mistakes.push({ concept: step.mistakeConcept, kind: "missed", label: step.label });
      if (step.mandatory) mandatoryDone = false;
      continue;
    }

    done += 1;
    if (action.kind === "step") {
      credit += step.weight;
      orderCredit += step.weight;
    } else {
      credit += step.weight * 0.5;
      mistakes.push({ concept: step.mistakeConcept, kind: "out_of_order", label: step.label });
    }
    results.push({
      id: step.id,
      label: step.label,
      status: action.kind === "step" ? "correct" : "out_of_order",
      timeMs: timeFor(action),
      explanation: step.explanation,
      kind: "step",
      mistakeConcept: action.kind === "step" ? undefined : step.mistakeConcept,
    });
  }

  // Extra (wrong) actions: distinct distractors, composable trap mistakes, plus the critical mistake if any.
  const seen = new Set<string>();
  for (const action of run.actions) {
    if (action.kind === "distractor" && !seen.has(action.actionKey)) {
      const d = findDistractor(drill, action.actionKey);
      if (!d) continue;
      seen.add(action.actionKey);
      results.push({
        id: `extra-${d.id}`,
        label: d.label,
        status: "wrong",
        timeMs: timeFor(action),
        explanation: d.explanation,
        kind: "extra",
        mistakeConcept: d.mistakeConcept,
      });
      mistakes.push({ concept: d.mistakeConcept, kind: "wrong", label: d.label });
    }
  }

  const seenTraps = new Set<string>();
  let nonCriticalTrapCount = 0;
  let criticalTrapLogged: TrapMistake | undefined;
  for (const tm of run.trapMistakes ?? []) {
    const key = `${tm.stepId}:${tm.intent}`;
    if (seenTraps.has(key)) continue;
    seenTraps.add(key);

    if (tm.isCritical) {
      if (!criticalTrapLogged) criticalTrapLogged = tm;
      continue;
    }

    nonCriticalTrapCount += 1;
    const label = TRAP_INTENT_LABELS[tm.intent] ?? tm.intent;
    results.push({
      id: `trap-${tm.stepId}-${tm.intent}`,
      label,
      status: "wrong",
      timeMs: tm.tMs,
      explanation: tm.explanation,
      kind: "extra",
      mistakeConcept: drill.concept,
    });
    mistakes.push({ concept: drill.concept, kind: "wrong", label });
  }

  if (run.critical) {
    const crit = run.actions.find((a) => a.kind === "critical");
    results.push({
      id: "extra-critical",
      label: criticalTrapLogged
        ? TRAP_INTENT_LABELS[criticalTrapLogged.intent] ?? drill.critical.title
        : drill.critical.title,
      status: "critical",
      timeMs: criticalTrapLogged ? criticalTrapLogged.tMs : crit ? timeFor(crit) : null,
      explanation: criticalTrapLogged?.explanation ?? crit?.explanation ?? drill.critical.explanation,
      kind: "extra",
      mistakeConcept: drill.critical.concept,
    });
    mistakes.push({ concept: drill.critical.concept, kind: "critical", label: drill.critical.title });
  }

  const wrongActions = seen.size + nonCriticalTrapCount;
  const stepScore = weightTotal === 0 ? 0 : clamp((credit / weightTotal) * 100 - wrongActions * WRONG_ACTION_PENALTY, 0, 100);
  const orderScore = weightTotal === 0 ? 0 : clamp((orderCredit / weightTotal) * 100, 0, 100);

  const goal = redFlagGoal(drill);
  const redFlagScore =
    goal === 0 ? 100 : clamp((run.flagsFound.length / goal) * 100 - run.wrongTaps * WRONG_TAP_PENALTY, 0, 100);

  const limitMs = getTimerLimitMs(drill.timeLimitSec, timerMode);
  const doneFraction = counted === 0 ? 0 : done / counted;
  const speedScore =
    timerMode === "none" || limitMs === 0
      ? clamp(doneFraction * 100, 0, 100)
      : clamp(doneFraction * clamp((1 - elapsedMs / limitMs) / 0.5, 0, 1) * 100, 0, 100);

  const hintPenalty = run.hintsUsed.length * HINT_PENALTY;
  let total =
    WEIGHTS.steps * stepScore + WEIGHTS.order * orderScore + WEIGHTS.redFlags * redFlagScore + WEIGHTS.speed * speedScore;
  total = clamp(Math.round(total - hintPenalty), 0, 100);
  if (run.critical) total = Math.min(total, CRITICAL_CAP);

  const mistakeConcepts: ConceptId[] = Array.from(new Set(mistakes.map((m) => m.concept)));
  const effectiveTimedOut = timerMode === "none" ? false : timedOut;

  return {
    total,
    stepScore: Math.round(stepScore),
    orderScore: Math.round(orderScore),
    redFlagScore: Math.round(redFlagScore),
    speedScore: Math.round(speedScore),
    hintsUsed: run.hintsUsed.length,
    hintPenalty,
    critical: run.critical,
    timedOut: effectiveTimedOut,
    completed: mandatoryDone && !run.critical,
    elapsedMs: Math.round(elapsedMs),
    flagsFound: run.flagsFound.length,
    flagsTotal: drill.redFlags.length,
    wrongTaps: run.wrongTaps,
    results,
    mistakeConcepts,
    mistakes,
  };
}
