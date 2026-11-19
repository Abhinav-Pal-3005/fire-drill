import type { Action, ActionKind, Drill, Step } from "@/types";

export interface ActionHistoryItem {
  actionKey: string;
  kind: ActionKind;
  stepId?: string;
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
  const orders = drill.steps.map((s) => s.order);
  if (new Set(orders).size !== orders.length) issues.push(`${drill.id}: duplicate step order values`);
  for (const step of drill.steps) {
    if (!drill.hints[step.id]) issues.push(`${drill.id}: missing hint for step ${step.id}`);
  }
  if (drill.criticalActions.length === 0) issues.push(`${drill.id}: no critical actions`);
  if (!drill.distractors.some((d) => d.opensPin)) issues.push(`${drill.id}: no distractor opens the PIN pad`);
  return issues;
}
