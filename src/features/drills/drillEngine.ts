import type { ConceptId, Drill, DrillGrade, LoggedAction, Mistake, RunState, StepResult } from "@/types";
import { clamp } from "@/utils/formatters";
import {
  classifyAction,
  findDistractor,
  findStep,
  redFlagGoal,
  sortedSteps,
} from "./stepValidator";

/* ----------------------------- Runner state ----------------------------- */

export function createRunState(): RunState {
  return { actions: [], flagsFound: [], wrongTaps: 0, hintsUsed: [], critical: false };
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
): { state: RunState; outcome: ActionOutcome } {
  const outcome = classifyAction(drill, state.actions, actionKey);
  const resolvedLabel =
    label ?? findStep(drill, actionKey)?.label ?? findDistractor(drill, actionKey)?.label ?? actionKey;
  const logged: LoggedAction = { actionKey, label: resolvedLabel, tMs, kind: outcome.kind, stepId: outcome.stepId };
  return {
    state: {
      ...state,
      actions: [...state.actions, logged],
      critical: state.critical || outcome.kind === "critical",
    },
    outcome,
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

export function gradeRun(drill: Drill, run: RunState, elapsedMs: number, timedOut: boolean): DrillGrade {
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

  // Extra (wrong) actions: distinct distractors, plus the critical mistake if any.
  const seen = new Set<string>();
  for (const action of run.actions) {
    if (action.kind === "distractor" && !seen.has(action.actionKey)) {
      seen.add(action.actionKey);
      const d = findDistractor(drill, action.actionKey);
      if (!d) continue;
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
  if (run.critical) {
    const crit = run.actions.find((a) => a.kind === "critical");
    results.push({
      id: "extra-critical",
      label: drill.critical.title,
      status: "critical",
      timeMs: crit ? timeFor(crit) : null,
      explanation: drill.critical.explanation,
      kind: "extra",
      mistakeConcept: drill.critical.concept,
    });
    mistakes.push({ concept: drill.critical.concept, kind: "critical", label: drill.critical.title });
  }

  const wrongActions = seen.size;
  const stepScore = weightTotal === 0 ? 0 : clamp((credit / weightTotal) * 100 - wrongActions * WRONG_ACTION_PENALTY, 0, 100);
  const orderScore = weightTotal === 0 ? 0 : clamp((orderCredit / weightTotal) * 100, 0, 100);

  const goal = redFlagGoal(drill);
  const redFlagScore =
    goal === 0 ? 100 : clamp((run.flagsFound.length / goal) * 100 - run.wrongTaps * WRONG_TAP_PENALTY, 0, 100);

  const limitMs = drill.timeLimitSec * 1000;
  const timeFactor = clamp((1 - elapsedMs / limitMs) / 0.5, 0, 1);
  const doneFraction = counted === 0 ? 0 : done / counted;
  const speedScore = clamp(doneFraction * timeFactor * 100, 0, 100);

  const hintPenalty = run.hintsUsed.length * HINT_PENALTY;
  let total =
    WEIGHTS.steps * stepScore + WEIGHTS.order * orderScore + WEIGHTS.redFlags * redFlagScore + WEIGHTS.speed * speedScore;
  total = clamp(Math.round(total - hintPenalty), 0, 100);
  if (run.critical) total = Math.min(total, CRITICAL_CAP);

  const mistakeConcepts: ConceptId[] = Array.from(new Set(mistakes.map((m) => m.concept)));

  return {
    total,
    stepScore: Math.round(stepScore),
    orderScore: Math.round(orderScore),
    redFlagScore: Math.round(redFlagScore),
    speedScore: Math.round(speedScore),
    hintsUsed: run.hintsUsed.length,
    hintPenalty,
    critical: run.critical,
    timedOut,
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
