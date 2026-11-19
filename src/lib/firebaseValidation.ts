import type { AnalyticsEvent, Attempt, DrillGrade, QuizAnswer, StepResult, TimerMode } from "@/types";

/**
 * Shared boundary constraints synchronized verbatim with firebase-blueprint.json & firestore.rules.
 */
export const SCHEMA_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  shortIdMax: 64,
  idMax: 128,
  displayNameMax: 80,
  photoUrlMax: 500,
  checklistMaxItems: 30,
  checklistItemMaxLen: 40,
  bookmarksMaxItems: 100,
  bookmarksItemMaxLen: 64,
  resultsMaxItems: 30,
  mistakeConceptsMaxItems: 10,
  mistakesMaxItems: 30,
  quizAnswersMaxItems: 20,
} as const;

const VALID_TIMER_MODES = new Set<TimerMode>(["relaxed", "panicked", "none"]);

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number.isFinite(value) ? value : min);
  return Math.max(min, Math.min(max, n));
}

function clampNum(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

export function sanitizeId(raw: string, maxLen: number = SCHEMA_LIMITS.idMax): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : "id-0";
}

export function sanitizeDisplayName(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().slice(0, SCHEMA_LIMITS.displayNameMax);
  return trimmed.length > 0 ? trimmed : "Learner";
}

export function sanitizeTimerMode(mode: TimerMode | undefined): TimerMode {
  return mode && VALID_TIMER_MODES.has(mode) ? mode : "relaxed";
}

export function sanitizeStringArray(list: string[], maxItems: number, maxLen: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, maxLen);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeStepResult(r: StepResult): StepResult {
  const clean: StepResult = {
    id: String(r.id).slice(0, 64),
    label: String(r.label).slice(0, 160),
    status: r.status,
    timeMs: typeof r.timeMs === "number" && Number.isFinite(r.timeMs) ? Math.max(0, Math.round(r.timeMs)) : null,
    explanation: String(r.explanation ?? "").slice(0, 500),
    kind: r.kind,
  };
  if (typeof r.mistakeConcept === "string" && r.mistakeConcept.length > 0) {
    clean.mistakeConcept = r.mistakeConcept;
  }
  return clean;
}

export function sanitizeGrade(g: DrillGrade): DrillGrade {
  return {
    total: clampNum(g.total, 0, 100),
    stepScore: clampNum(g.stepScore, 0, 100),
    orderScore: clampNum(g.orderScore, 0, 100),
    redFlagScore: clampNum(g.redFlagScore, 0, 100),
    speedScore: clampNum(g.speedScore, 0, 100),
    hintsUsed: clampInt(g.hintsUsed, 0, 50),
    hintPenalty: clampNum(g.hintPenalty, 0, 100),
    critical: Boolean(g.critical),
    timedOut: Boolean(g.timedOut),
    completed: Boolean(g.completed),
    elapsedMs: clampInt(g.elapsedMs, 0, 86_400_000),
    flagsFound: clampInt(g.flagsFound, 0, 50),
    flagsTotal: clampInt(g.flagsTotal, 0, 50),
    wrongTaps: clampInt(g.wrongTaps, 0, 500),
    results: (g.results ?? []).slice(0, SCHEMA_LIMITS.resultsMaxItems).map(sanitizeStepResult),
    mistakeConcepts: sanitizeStringArray(
      g.mistakeConcepts ?? [],
      SCHEMA_LIMITS.mistakeConceptsMaxItems,
      SCHEMA_LIMITS.shortIdMax,
    ) as DrillGrade["mistakeConcepts"],
    mistakes: (g.mistakes ?? []).slice(0, SCHEMA_LIMITS.mistakesMaxItems).map((m) => ({
      concept: m.concept,
      kind: m.kind,
      label: String(m.label).slice(0, 160),
    })),
  };
}

export function sanitizeQuizRecord(quiz: NonNullable<Attempt["quiz"]>): NonNullable<Attempt["quiz"]> {
  const answers: QuizAnswer[] = (quiz.answers ?? []).slice(0, SCHEMA_LIMITS.quizAnswersMaxItems).map((a) => ({
    questionId: String(a.questionId).slice(0, 64),
    selectedIndex: clampInt(a.selectedIndex, 0, 20),
    correct: Boolean(a.correct),
  }));
  return {
    quizId: sanitizeId(quiz.quizId, SCHEMA_LIMITS.shortIdMax),
    concept: sanitizeId(quiz.concept, SCHEMA_LIMITS.shortIdMax) as Attempt["concept"],
    answers,
  };
}

export function sanitizeAttemptPayload(attempt: Attempt, userId: string) {
  const startedAt = clampInt(attempt.startedAt, 1, Number.MAX_SAFE_INTEGER);
  const finishedAt = Math.max(startedAt, clampInt(attempt.finishedAt, startedAt, Number.MAX_SAFE_INTEGER));
  const payload: Record<string, unknown> = {
    id: sanitizeId(attempt.id, SCHEMA_LIMITS.idMax),
    userId: sanitizeId(userId, SCHEMA_LIMITS.idMax),
    drillId: sanitizeId(attempt.drillId, SCHEMA_LIMITS.shortIdMax),
    concept: sanitizeId(attempt.concept, SCHEMA_LIMITS.shortIdMax),
    seed: clampInt(attempt.seed, 0, Number.MAX_SAFE_INTEGER),
    demoSeed: Boolean(attempt.demoSeed),
    timerMode: sanitizeTimerMode(attempt.timerMode),
    startedAt,
    finishedAt,
    grade: sanitizeGrade(attempt.grade),
  };
  if (attempt.quiz) {
    payload.quiz = sanitizeQuizRecord(attempt.quiz);
  }
  return payload;
}

export function sanitizeAnalyticsEventPayload(event: AnalyticsEvent, userId: string) {
  const payload: Record<string, unknown> = {
    id: sanitizeId(event.id, SCHEMA_LIMITS.idMax),
    userId: sanitizeId(userId, SCHEMA_LIMITS.idMax),
    ts: clampInt(event.ts, 1, Number.MAX_SAFE_INTEGER),
    type: event.type,
    drillId: sanitizeId(event.drillId, SCHEMA_LIMITS.shortIdMax),
    concept: sanitizeId(event.concept, SCHEMA_LIMITS.shortIdMax),
    timeMs: clampInt(event.timeMs, 0, Number.MAX_SAFE_INTEGER),
    seed: clampInt(event.seed, 0, Number.MAX_SAFE_INTEGER),
  };
  if (typeof event.stepId === "string" && event.stepId.length > 0) {
    payload.stepId = event.stepId.slice(0, SCHEMA_LIMITS.shortIdMax);
  }
  if (typeof event.correct === "boolean") {
    payload.correct = event.correct;
  }
  return payload;
}
