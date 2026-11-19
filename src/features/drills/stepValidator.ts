import type { Action, ActionKind, ComposableDrillStep, Drill, SemanticIntent, Step } from "@/types";

export interface ActionHistoryItem {
  actionKey: string;
  kind: ActionKind;
  stepId?: string;
}

export type ComposableIntentEvaluation =
  | {
      kind: "valid";
      intent: SemanticIntent;
      stepId: string;
      nextStepId: string | null;
      isTerminal: boolean;
    }
  | {
      kind: "trap";
      intent: SemanticIntent;
      stepId: string;
      explanation: string;
      isCritical: boolean;
      nextStepId: string | null;
    }
  | {
      kind: "neutral";
      intent: SemanticIntent;
      stepId: string;
    };

export function isComposableDrill(drill: Drill): boolean {
  return Array.isArray(drill.composableSteps) && drill.composableSteps.length > 0;
}

export function getComposableSteps(drill: Drill): ComposableDrillStep[] {
  return drill.composableSteps ?? [];
}

export function findComposableStep(drill: Drill, stepId: string | null | undefined): ComposableDrillStep | undefined {
  if (!stepId || !drill.composableSteps) return undefined;
  return drill.composableSteps.find((s) => s.stepId === stepId);
}

/**
 * 100% schema-driven evaluation of a SemanticIntent against the active ComposableDrillStep.
 * Zero drill-specific branching: behavior is driven purely by validIntents, trapIntents, and nextStepMap.
 */
export function evaluateComposableIntent(
  drill: Drill,
  step: ComposableDrillStep,
  intent: SemanticIntent,
): ComposableIntentEvaluation {
  const allSteps = getComposableSteps(drill);
  const currentIndex = allSteps.findIndex((s) => s.stepId === step.stepId);

  if (step.validIntents.includes(intent)) {
    const mappedNext = step.nextStepMap?.[intent];
    let nextStepId: string | null = null;
    if (mappedNext !== undefined) {
      nextStepId = mappedNext === "__FINISH__" ? null : mappedNext;
    } else if (currentIndex >= 0 && currentIndex + 1 < allSteps.length) {
      // Advance sequentially to the next step in the drill's steps list (skipping pure trap-only branches).
      const mandatoryIds = new Set(drill.steps.map((s) => s.id));
      const nextSeq = allSteps.slice(currentIndex + 1).find((s) => mandatoryIds.size === 0 || mandatoryIds.has(s.stepId));
      nextStepId = nextSeq?.stepId ?? null;
    }

    return {
      kind: "valid",
      intent,
      stepId: step.stepId,
      nextStepId,
      isTerminal: nextStepId === null,
    };
  }

  const trapExplanation = step.trapIntents[intent];
  if (typeof trapExplanation === "string" && trapExplanation.length > 0) {
    const mappedTrapBranch = step.nextStepMap?.[intent] ?? null;
    const isCritical = drill.criticalActions.includes(intent);
    return {
      kind: "trap",
      intent,
      stepId: step.stepId,
      explanation: trapExplanation,
      isCritical,
      nextStepId: mappedTrapBranch && mappedTrapBranch !== "__FINISH__" ? mappedTrapBranch : null,
    };
  }

  return { kind: "neutral", intent, stepId: step.stepId };
}

export function sortedSteps(drill: Drill): Step[] {
  return [...drill.steps].sort((a, b) => a.order - b.order);
}

export function findStep(drill: Drill, actionKey: string): Step | undefined {
  return drill.steps.find((s) => s.actionKey === actionKey || s.id === actionKey);
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

/** Classify an action against the drill and what has already happened (schema-driven). */
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

/** Developer-time sanity check for both composable and legacy drill JSON definitions. */
export function validateDrillDefinition(drill: Drill): string[] {
  const issues: string[] = [];
  const orders = drill.steps.map((s) => s.order);
  if (new Set(orders).size !== orders.length) issues.push(`${drill.id}: duplicate step order values`);
  for (const step of drill.steps) {
    if (!drill.hints[step.id]) issues.push(`${drill.id}: missing hint for step ${step.id}`);
  }
  if (drill.criticalActions.length === 0) issues.push(`${drill.id}: no critical actions`);

  if (isComposableDrill(drill)) {
    const stepIds = new Set(getComposableSteps(drill).map((s) => s.stepId));
    for (const cStep of getComposableSteps(drill)) {
      if (cStep.validIntents.length === 0) {
        issues.push(`${drill.id}: composable step ${cStep.stepId} has no validIntents`);
      }
      if (cStep.nextStepMap) {
        for (const [intent, targetId] of Object.entries(cStep.nextStepMap)) {
          if (targetId && targetId !== "__FINISH__" && !stepIds.has(targetId)) {
            issues.push(`${drill.id}: nextStepMap[${intent}] points to unknown step "${targetId}"`);
          }
        }
      }
    }
  } else if (!drill.distractors.some((d) => d.opensPin)) {
    issues.push(`${drill.id}: no distractor opens the PIN pad`);
  }

  return issues;
}
