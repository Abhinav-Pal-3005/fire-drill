import type { Attempt, ConceptId, Drill, Mistake } from "@/types";
import { average } from "@/utils/formatters";
import { drillsForConcept, getConcept, getDrill, listConcepts, listDrills } from "@/features/drills/drillLoader";

export const CONCEPT_IDS: ConceptId[] = listConcepts().map((c) => c.id);

const RECENT_ATTEMPTS = 3;
const RECENT_WEIGHT = 2;

export interface Recommendation {
  drill: Drill;
  concept: ConceptId | null;
  reason: string;
}

interface ScoredEntry {
  concepts: ConceptId[];
  score: number;
}

/** Mean score per concept (null if never practised). Used by Progress, Home and Admin. */
export function masteryFromScores(entries: ScoredEntry[]): Record<ConceptId, number | null> {
  const result = {} as Record<ConceptId, number | null>;
  for (const id of CONCEPT_IDS) {
    const scores = entries.filter((e) => e.concepts.includes(id)).map((e) => e.score);
    result[id] = scores.length === 0 ? null : Math.round(average(scores));
  }
  return result;
}

export function readinessFromMastery(mastery: Record<ConceptId, number | null>): number {
  return Math.round(average(CONCEPT_IDS.map((id) => mastery[id] ?? 0)));
}

function attemptConcepts(attempt: Attempt): ConceptId[] {
  const drill = getDrill(attempt.drillId);
  return drill ? [drill.concept, ...drill.relatedConcepts] : [attempt.concept];
}

export function getMastery(attempts: Attempt[]): Record<ConceptId, number | null> {
  return masteryFromScores(attempts.map((a) => ({ concepts: attemptConcepts(a), score: a.grade.total })));
}

export function getReadiness(attempts: Attempt[]): number {
  return readinessFromMastery(getMastery(attempts));
}

interface WeightedMistake extends Mistake {
  attempt: Attempt;
  weight: number;
}

function collectMistakes(attempts: Attempt[]): WeightedMistake[] {
  const sorted = [...attempts].sort((a, b) => a.finishedAt - b.finishedAt);
  const recentIds = new Set(sorted.slice(-RECENT_ATTEMPTS).map((a) => a.id));
  const out: WeightedMistake[] = [];
  for (const attempt of sorted) {
    const weight = recentIds.has(attempt.id) ? RECENT_WEIGHT : 1;
    for (const m of attempt.grade.mistakes) out.push({ ...m, attempt, weight });
    for (const answer of attempt.quiz?.answers ?? []) {
      if (!answer.correct) {
        out.push({
          concept: attempt.quiz?.concept ?? attempt.concept,
          kind: "quiz",
          label: "a quiz question",
          attempt,
          weight,
        });
      }
    }
  }
  return out;
}

/** Weakness score per concept. Recent mistakes count about twice as much. */
export function getConceptWeakness(attempts: Attempt[]): Record<ConceptId, number> {
  const result = {} as Record<ConceptId, number>;
  for (const id of CONCEPT_IDS) result[id] = 0;
  for (const m of collectMistakes(attempts)) result[m.concept] += m.weight;
  return result;
}

export function getWeakestConcept(attempts: Attempt[]): ConceptId | null {
  const weakness = getConceptWeakness(attempts);
  let best: ConceptId | null = null;
  for (const id of CONCEPT_IDS) {
    if (weakness[id] > 0 && (best === null || weakness[id] > weakness[best])) best = id;
  }
  return best;
}

const SEVERITY: Record<Mistake["kind"], number> = { critical: 4, wrong: 3, quiz: 2, missed: 1, out_of_order: 1 };

function reasonFor(concept: ConceptId, attempts: Attempt[]): string {
  const mine = collectMistakes(attempts)
    .filter((m) => m.concept === concept)
    .sort(
      (a, b) =>
        b.attempt.finishedAt - a.attempt.finishedAt || SEVERITY[b.kind] - SEVERITY[a.kind],
    );
  const latest = mine[0];
  const rawTitle = getConcept(concept).title;
  const conceptTitle = rawTitle.startsWith("UPI") ? rawTitle : rawTitle.toLowerCase();
  if (!latest) return `Rehearse ${conceptTitle} to keep it fresh.`;
  const drill = getDrill(latest.attempt.drillId);
  if (latest.kind === "critical" && drill) return drill.critical.reason;
  if (latest.kind === "quiz") return `You missed a ${conceptTitle} quiz question recently, so rehearse this next.`;
  if (latest.kind === "wrong") {
    return `You chose "${latest.label}" last time, so rehearse ${conceptTitle} next.`;
  }
  return `You ${latest.kind === "missed" ? "missed" : "did out of order"} "${latest.label}" recently, so rehearse ${conceptTitle} next.`;
}

/**
 * Picks the drill for the weakest concept. Avoids the same drill twice in a row
 * unless it is the only drill for that concept. Always returns a human-readable reason.
 */
export function getRecommendedDrill(attempts: Attempt[]): Recommendation {
  const all = listDrills();
  const sorted = [...attempts].sort((a, b) => b.finishedAt - a.finishedAt);
  const lastDrillId = sorted[0]?.drillId;

  if (sorted.length === 0) {
    const first = getDrill("collect-request") ?? all[0];
    return {
      drill: first,
      concept: first.concept,
      reason: "Start here: it is a quick first rehearsal of the most important UPI safety rule.",
    };
  }

  const weakest = getWeakestConcept(attempts);
  if (weakest) {
    const candidates = drillsForConcept(weakest);
    const primary = candidates.filter((d) => d.concept === weakest);
    const pool = primary.length > 0 ? primary : candidates;
    const fresh = pool.filter((d) => d.id !== lastDrillId);
    const drill = fresh[0] ?? pool[0];
    if (drill) return { drill, concept: weakest, reason: reasonFor(weakest, attempts) };
  }

  // No recorded mistakes: suggest a drill not yet completed, else the one practised longest ago.
  const completedIds = new Set(sorted.map((a) => a.drillId));
  const untouched = all.find((d) => !completedIds.has(d.id));
  if (untouched) {
    return {
      drill: untouched,
      concept: untouched.concept,
      reason: `Clean run so far. Try something new: ${untouched.title.toLowerCase()}.`,
    };
  }
  const lastSeen = new Map<string, number>();
  for (const a of sorted) if (!lastSeen.has(a.drillId)) lastSeen.set(a.drillId, a.finishedAt);
  const oldest = [...all]
    .filter((d) => d.id !== lastDrillId)
    .sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0))[0] ?? all[0];
  return {
    drill: oldest,
    concept: oldest.concept,
    reason: "No weak spots right now. Rehearse an older drill to keep the habit fresh.",
  };
}

/** Consecutive days (ending today or yesterday) with at least one attempt. */
export function computeStreak(attempts: Attempt[], now: number = Date.now()): number {
  const dayKey = (ts: number): string => new Date(ts).toDateString();
  const days = new Set(attempts.map((a) => dayKey(a.finishedAt)));
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function bestScoreFor(attempts: Attempt[], drillId: string): number | null {
  const scores = attempts.filter((a) => a.drillId === drillId).map((a) => a.grade.total);
  return scores.length === 0 ? null : Math.max(...scores);
}

export function lastAttemptFor(attempts: Attempt[], drillId: string): Attempt | undefined {
  return attempts
    .filter((a) => a.drillId === drillId)
    .sort((a, b) => b.finishedAt - a.finishedAt)[0];
}
