import seedJson from "@/data/seed-analytics.json";
import type { Attempt, AnalyticsEvent, AttemptRecord, ConceptId, SeedAnalytics } from "@/types";
import { average, median } from "@/utils/formatters";
import { getDrill, listConcepts } from "@/features/drills/drillLoader";
import { masteryFromScores, readinessFromMastery } from "@/features/adaptive/adaptiveEngine";

const seed = seedJson as unknown as SeedAnalytics;

export const LOCAL_COHORT = "This device";
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 28;

export function getSeedRecords(): AttemptRecord[] {
  return seed.records;
}

/** Converts the current learner's real attempts into the same anonymised row shape. */
export function localToRecords(attempts: Attempt[], learnerId: string, now: number = Date.now()): AttemptRecord[] {
  return attempts.map((a) => ({
    learnerId,
    cohort: LOCAL_COHORT,
    drillId: a.drillId,
    concept: a.concept,
    daysAgo: Math.max(0, Math.floor((now - a.finishedAt) / DAY_MS)),
    score: a.grade.total,
    order: a.grade.orderScore,
    speed: a.grade.speedScore,
    redFlags: a.grade.redFlagScore,
    critical: a.grade.critical,
    completionSec: Math.round(a.grade.elapsedMs / 1000),
    quizPassed: a.quiz ? a.quiz.answers.filter((x) => x.correct).length >= 2 : false,
    missedStepIds: a.grade.results
      .filter((r) => r.kind === "step" && (r.status === "missed" || r.status === "out_of_order"))
      .map((r) => r.id),
  }));
}

function conceptsOf(record: AttemptRecord): ConceptId[] {
  const drill = getDrill(record.drillId);
  return drill ? [drill.concept, ...drill.relatedConcepts] : [record.concept];
}

function readinessOf(records: AttemptRecord[]): number {
  return readinessFromMastery(
    masteryFromScores(records.map((r) => ({ concepts: conceptsOf(r), score: r.score }))),
  );
}

export interface KpiValue {
  value: number;
  /** Change versus the previous 28 days. null when there is nothing to compare. */
  delta: number | null;
}

export interface WeakStep {
  drillId: string;
  drillTitle: string;
  stepId: string;
  label: string;
  misses: number;
  missRate: number;
}

export interface CohortRow {
  learnerId: string;
  cohort: string;
  attempts: number;
  avgScore: number;
  readiness: number;
  criticalCount: number;
  lastActiveDaysAgo: number;
  isYou: boolean;
}

export interface AdminData {
  records: AttemptRecord[];
  kpis: {
    learners: KpiValue;
    attempts: KpiValue;
    avgScore: KpiValue;
    medianCompletionSec: KpiValue;
    criticalRate: KpiValue;
    avgReadiness: KpiValue;
  };
  radar: Array<{ concept: string; value: number }>;
  funnel: Array<{ stage: string; value: number }>;
  trend: Array<{ label: string; attempts: number; avgScore: number }>;
  weakSteps: WeakStep[];
  cohort: CohortRow[];
}

interface Metrics {
  learners: number;
  attempts: number;
  avgScore: number;
  medianCompletionSec: number;
  criticalRate: number;
  avgReadiness: number;
}

function computeMetrics(records: AttemptRecord[]): Metrics {
  const byLearner = new Map<string, AttemptRecord[]>();
  for (const r of records) byLearner.set(r.learnerId, [...(byLearner.get(r.learnerId) ?? []), r]);
  return {
    learners: byLearner.size,
    attempts: records.length,
    avgScore: Math.round(average(records.map((r) => r.score)) * 10) / 10,
    medianCompletionSec: Math.round(median(records.map((r) => r.completionSec))),
    criticalRate: records.length === 0 ? 0 : Math.round((records.filter((r) => r.critical).length / records.length) * 1000) / 10,
    avgReadiness: Math.round(average(Array.from(byLearner.values()).map(readinessOf))),
  };
}

function kpi(current: number, previous: number | null): KpiValue {
  return { value: current, delta: previous === null ? null : Math.round((current - previous) * 10) / 10 };
}

export function buildAdminData(local: Attempt[], learnerId: string): AdminData {
  const records = [...getSeedRecords(), ...localToRecords(local, learnerId)];
  const all = computeMetrics(records);
  const currentWindow = records.filter((r) => r.daysAgo < WINDOW_DAYS);
  const previousWindow = records.filter((r) => r.daysAgo >= WINDOW_DAYS && r.daysAgo < WINDOW_DAYS * 2);
  const cur = computeMetrics(currentWindow);
  const prev = previousWindow.length > 0 ? computeMetrics(previousWindow) : null;

  // Totals show "active in the last 28 days" as their delta; quality metrics compare with the 28 days before.
  const kpis: AdminData["kpis"] = {
    learners: { value: all.learners, delta: cur.learners },
    attempts: { value: all.attempts, delta: cur.attempts },
    avgScore: kpi(all.avgScore, prev ? prev.avgScore : null),
    medianCompletionSec: kpi(all.medianCompletionSec, prev ? prev.medianCompletionSec : null),
    criticalRate: kpi(all.criticalRate, prev ? prev.criticalRate : null),
    avgReadiness: kpi(all.avgReadiness, prev ? prev.avgReadiness : null),
  };

  const radar = listConcepts().map((c) => ({
    concept: c.title,
    value: Math.round(
      average(records.filter((r) => conceptsOf(r).includes(c.id)).map((r) => r.score)),
    ),
  }));

  const funnel = [
    { stage: "Started", value: records.length },
    { stage: "Red flags found", value: records.filter((r) => r.redFlags >= 60).length },
    { stage: "Correct order", value: records.filter((r) => r.order >= 80).length },
    { stage: "Quiz passed", value: records.filter((r) => r.quizPassed).length },
  ];

  const trend: AdminData["trend"] = [];
  const WEEKS = 8;
  for (let w = WEEKS - 1; w >= 0; w -= 1) {
    const inWeek = records.filter((r) => Math.floor(r.daysAgo / 7) === w);
    trend.push({
      label: w === 0 ? "This wk" : `-${w}w`,
      attempts: inWeek.length,
      avgScore: inWeek.length === 0 ? 0 : Math.round(average(inWeek.map((r) => r.score))),
    });
  }

  const missCounts = new Map<string, number>();
  const drillAttempts = new Map<string, number>();
  for (const r of records) {
    drillAttempts.set(r.drillId, (drillAttempts.get(r.drillId) ?? 0) + 1);
    for (const stepId of r.missedStepIds) {
      const key = `${r.drillId}::${stepId}`;
      missCounts.set(key, (missCounts.get(key) ?? 0) + 1);
    }
  }
  const weakSteps: WeakStep[] = Array.from(missCounts.entries())
    .map(([key, misses]) => {
      const [drillId, stepId] = key.split("::");
      const drill = getDrill(drillId);
      const step = drill?.steps.find((s) => s.id === stepId);
      return {
        drillId,
        drillTitle: drill?.title ?? drillId,
        stepId,
        label: step?.label ?? stepId,
        misses,
        missRate: Math.round((misses / (drillAttempts.get(drillId) ?? 1)) * 100),
      };
    })
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 6);

  const byLearner = new Map<string, AttemptRecord[]>();
  for (const r of records) byLearner.set(r.learnerId, [...(byLearner.get(r.learnerId) ?? []), r]);
  const cohort: CohortRow[] = Array.from(byLearner.entries())
    .map(([id, rows]) => ({
      learnerId: id,
      cohort: rows[0].cohort,
      attempts: rows.length,
      avgScore: Math.round(average(rows.map((r) => r.score))),
      readiness: readinessOf(rows),
      criticalCount: rows.filter((r) => r.critical).length,
      lastActiveDaysAgo: Math.min(...rows.map((r) => r.daysAgo)),
      isYou: id === learnerId && rows[0].cohort === LOCAL_COHORT,
    }))
    .sort((a, b) => Number(b.isYou) - Number(a.isYou) || b.readiness - a.readiness);

  return { records, kpis, radar, funnel, trend, weakSteps, cohort };
}

/** Event summary for the learner's Progress page. */
export function summariseEvents(events: AnalyticsEvent[]): {
  stepActions: number;
  stepAccuracy: number;
  flagTaps: number;
  flagAccuracy: number;
  criticalCount: number;
} {
  const steps = events.filter((e) => e.type === "step_action" && e.correct !== undefined);
  const flags = events.filter((e) => e.type === "red_flag_tapped");
  return {
    stepActions: steps.length,
    stepAccuracy: steps.length === 0 ? 0 : Math.round((steps.filter((e) => e.correct).length / steps.length) * 100),
    flagTaps: flags.length,
    flagAccuracy: flags.length === 0 ? 0 : Math.round((flags.filter((e) => e.correct).length / flags.length) * 100),
    criticalCount: events.filter((e) => e.type === "critical_mistake").length,
  };
}
