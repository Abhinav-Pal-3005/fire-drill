import type {
  Action,
  ActionKind,
  ComposableDrillStep,
  DefensiveIntent,
  Drill,
  SemanticIntent,
  Step,
  TrapIntent,
} from "@/types";

export interface ActionHistoryItem {
  actionKey: string;
  kind: ActionKind;
  stepId?: string;
}

export function isComposableDrill(drill: Drill): boolean {
  return Array.isArray(drill.composableSteps) && drill.composableSteps.length > 0;
}

export function getComposableSteps(drill: Drill): ComposableDrillStep[] {
  return drill.composableSteps ?? [];
}

export function findComposableStep(drill: Drill, stepId: string): ComposableDrillStep | undefined {
  return getComposableSteps(drill).find((s) => s.stepId === stepId);
}

export interface ComposableIntentEvaluation {
  valid: boolean;
  isTrap: boolean;
  isCritical: boolean;
  explanation?: string;
  finish: boolean;
  nextStepId: string | null;
}

function collectTrapOnlyStepIds(steps: ComposableDrillStep[]): Set<string> {
  const validTargets = new Set<string>();
  const trapTargets = new Set<string>();

  for (const step of steps) {
    if (step.props?.isTrapBranch === true) {
      trapTargets.add(step.stepId);
    }
    if (!step.nextStepMap) continue;
    for (const [intent, targetId] of Object.entries(step.nextStepMap)) {
      if (!targetId || targetId === "__FINISH__") continue;
      if (step.validIntents.includes(intent as DefensiveIntent)) {
        validTargets.add(targetId);
      } else if (intent in step.trapIntents) {
        trapTargets.add(targetId);
      }
    }
  }

  const trapOnly = new Set<string>();
  for (const id of trapTargets) {
    if (!validTargets.has(id)) trapOnly.add(id);
  }
  return trapOnly;
}

/**
 * Pure schema-driven evaluator for composable drill steps.
 * Contains zero drill-ID branches; progression and traps come strictly from step definitions.
 */
export function evaluateComposableIntent(
  drill: Drill,
  currentStep: ComposableDrillStep,
  intent: SemanticIntent,
): ComposableIntentEvaluation {
  const steps = getComposableSteps(drill);

  if (currentStep.validIntents.includes(intent as DefensiveIntent)) {
    const mapped = currentStep.nextStepMap?.[intent];
    if (mapped === "__FINISH__") {
      return { valid: true, isTrap: false, isCritical: false, finish: true, nextStepId: null };
    }
    if (mapped && findComposableStep(drill, mapped)) {
      return { valid: true, isTrap: false, isCritical: false, finish: false, nextStepId: mapped };
    }

    const trapOnlyIds = collectTrapOnlyStepIds(steps);
    const idx = steps.findIndex((s) => s.stepId === currentStep.stepId);
    const nextMandatory = steps.slice(idx + 1).find((s) => !trapOnlyIds.has(s.stepId));
    if (nextMandatory) {
      return {
        valid: true,
        isTrap: false,
        isCritical: false,
        finish: false,
        nextStepId: nextMandatory.stepId,
      };
    }

    return { valid: true, isTrap: false, isCritical: false, finish: true, nextStepId: null };
  }

  const trapExplanation = currentStep.trapIntents[intent as TrapIntent];
  if (typeof trapExplanation === "string") {
    const isCritical = drill.criticalActions.includes(intent);
    const mapped = currentStep.nextStepMap?.[intent];
    const nextStepId = mapped && mapped !== "__FINISH__" && findComposableStep(drill, mapped) ? mapped : null;
    return {
      valid: false,
      isTrap: true,
      isCritical,
      explanation: trapExplanation,
      finish: false,
      nextStepId,
    };
  }

  return { valid: false, isTrap: false, isCritical: false, finish: false, nextStepId: null };
}

export function sortedSteps(drill: Drill): Step[] {
  return [...drill.steps].sort((a, b) => a.order - b.order);
}

export function findStep(drill: Drill, actionKey: string): Step | undefined {
  return drill.steps.find((s) => s.actionKey === actionKey);
}

export function findDistractor(drill: Drill, actionKey: string): Action | undefined {
  return drill.distractors.find((d) => d.actionKey === actionKey);
}

export function isCriticalAction(drill: Drill, actionKey: string): boolean {
  return drill.criticalActions.includes(actionKey);
}

/** How many red flags the learner must find to complete a "spot the red flags" step. */
export function redFlagGoal(drill: Drill): number {
  return Math.min(3, drill.redFlags.length);
}

function matchedStepIds(history: ReadonlyArray<ActionHistoryItem>): Set<string> {
  const ids = new Set<string>();
  for (const h of history) {
    if ((h.kind === "step" || h.kind === "out_of_order") && h.stepId) ids.add(h.stepId);
  }
  return ids;
}

/** Classify an action against the drill and what has already happened. */
export function classifyAction(
  drill: Drill,
  history: ReadonlyArray<ActionHistoryItem>,
  actionKey: string,
): { kind: ActionKind; stepId?: string } {
  if (isCriticalAction(drill, actionKey)) return { kind: "critical" };

  const step = findStep(drill, actionKey);
  if (step) {
    const done = matchedStepIds(history);
    if (done.has(step.id)) return { kind: "duplicate", stepId: step.id };
    // Out of order only if a LATER step has already been done. Skipping an earlier step is "missed", not "out of order".
    const laterDone = drill.steps.some((s) => s.order > step.order && done.has(s.id));
    return { kind: laterDone ? "out_of_order" : "step", stepId: step.id };
  }

  if (findDistractor(drill, actionKey)) return { kind: "distractor" };
  return { kind: "neutral" };
}

export function isMandatoryComplete(drill: Drill, history: ReadonlyArray<ActionHistoryItem>): boolean {
  const done = matchedStepIds(history);
  return drill.steps.filter((s) => s.mandatory).every((s) => done.has(s.id));
}

export function completedStepIds(history: ReadonlyArray<ActionHistoryItem>): string[] {
  return Array.from(matchedStepIds(history));
}

/** Next step (by order) that has not been done yet. */
export function nextIncompleteStep(drill: Drill, history: ReadonlyArray<ActionHistoryItem>): Step | undefined {
  const done = matchedStepIds(history);
  return sortedSteps(drill).find((s) => !done.has(s.id));
}

/** Developer-time sanity check for drill JSON. Returns a list of problems (empty = fine). */
export function validateDrillDefinition(drill: Drill): string[] {
  const issues: string[] = [];
  if (!drill.id) issues.push("missing drill id");
  if (!drill.title) issues.push(`${drill.id}: missing title`);
  if (!drill.quizId) issues.push(`${drill.id}: missing quizId`);
  const orders = drill.steps.map((s) => s.order);
  if (new Set(orders).size !== orders.length) issues.push(`${drill.id}: duplicate step order values`);
  for (const step of drill.steps) {
    if (!drill.hints[step.id]) issues.push(`${drill.id}: missing hint for step ${step.id}`);
  }
  if (drill.criticalActions.length === 0) issues.push(`${drill.id}: no critical actions`);
  if (isComposableDrill(drill)) {
    const cSteps = getComposableSteps(drill);
    const stepIds = new Set(cSteps.map((s) => s.stepId));
    if (stepIds.size !== cSteps.length) issues.push(`${drill.id}: duplicate composable stepId`);
    for (const cs of cSteps) {
      if (cs.validIntents.length === 0) issues.push(`${drill.id}: composable step ${cs.stepId} has no validIntents`);
      if (cs.nextStepMap) {
        for (const target of Object.values(cs.nextStepMap)) {
          if (target && target !== "__FINISH__" && !stepIds.has(target)) {
            issues.push(`${drill.id}: nextStepMap references unknown step ${target}`);
          }
        }
      }
    }
  } else {
    if (!drill.distractors.some((d) => d.opensPin)) issues.push(`${drill.id}: no distractor opens the PIN pad`);
  }
  return issues;
}
