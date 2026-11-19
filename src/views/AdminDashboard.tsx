import { useMemo } from "react";
import { Download } from "lucide-react";
import { ConceptRadarChart } from "@/components/admin/ConceptRadarChart";
import { CohortTable } from "@/components/admin/CohortTable";
import { DrillFunnelChart } from "@/components/admin/DrillFunnelChart";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { WeakStepTable } from "@/components/admin/WeakStepTable";
import { toast } from "@/components/glass/GlassToast";
import { buildAdminData, type KpiValue } from "@/features/analytics/adminSelectors";
import { downloadCsv, toCsv } from "@/features/analytics/csvExport";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import { formatSeconds } from "@/utils/formatters";

function trendChip(
  kpi: KpiValue,
  unit: string,
  lowerIsBetter = false,
): { text: string; tone: "success" | "danger" | "neutral"; direction: "up" | "down" | "flat" } {
  if (kpi.delta === null) return { text: "New", tone: "neutral", direction: "flat" };
  if (kpi.delta === 0) return { text: "No change", tone: "neutral", direction: "flat" };
  const up = kpi.delta > 0;
  const good = lowerIsBetter ? !up : up;
  return {
    text: `${up ? "+" : "−"}${Math.abs(kpi.delta)}${unit} vs prior 28d`,
    tone: good ? "success" : "danger",
    direction: up ? "up" : "down",
  };
}

export default function AdminDashboard() {
  const attempts = useDrillStore((s) => s.attempts);
  const learnerId = useUserStore((s) => s.learnerId);
  const data = useMemo(() => buildAdminData(attempts, learnerId), [attempts, learnerId]);
  const { kpis } = data;

  const exportCsv = () => {
    const headers = [
      "learner_id",
      "cohort",
      "drill_id",
      "concept",
      "days_ago",
      "score",
      "order",
      "speed",
      "red_flags",
      "critical",
      "completion_sec",
      "quiz_passed",
      "missed_steps",
    ];
    const rows = data.records.map((r) => [
      r.learnerId,
      r.cohort,
      r.drillId,
      r.concept,
      r.daysAgo,
      r.score,
      r.order,
      r.speed,
      r.redFlags,
      r.critical,
      r.completionSec,
      r.quizPassed,
      r.missedStepIds.join(" | "),
    ]);
    downloadCsv("money-fire-drill-analytics.csv", toCsv(headers, rows));
    toast(`Exported ${rows.length} anonymised rows.`);
  };

  return (
    <div className="mx-auto max-w-[920px] space-y-6 pb-8">
      <div className="space-y-1 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-st-secondary">
          Cohort &amp; Drill Telemetry
        </span>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-st-primary sm:text-[32px]">
          Admin dashboard
        </h1>
        <p className="text-[15px] text-st-on-surface-variant">
          Aggregated learning analytics. Learner IDs only, no personal data.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-st-tertiary-fixed px-3 py-1 text-[12px] font-semibold text-st-on-tertiary-fixed">
          Demo data · seed learners plus this device&apos;s attempts
        </span>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-st-primary-container px-4 text-[13px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-95"
        >
          <Download size={15} strokeWidth={2} aria-hidden />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total learners"
          value={String(kpis.learners.value)}
          caption={`${kpis.learners.delta ?? 0} active in 28 days`}
        />
        <StatCard
          label="Attempts"
          value={String(kpis.attempts.value)}
          caption={`${kpis.attempts.delta ?? 0} in 28 days`}
        />
        <StatCard
          label="Average score"
          value={`${Math.round(kpis.avgScore.value)}%`}
          chip={trendChip(kpis.avgScore, " pts")}
        />
        <StatCard
          label="Median completion time"
          value={formatSeconds(kpis.medianCompletionSec.value)}
          chip={trendChip(kpis.medianCompletionSec, "s", true)}
        />
        <StatCard
          label="Critical-failure rate"
          value={`${kpis.criticalRate.value}%`}
          chip={trendChip(kpis.criticalRate, " pts", true)}
        />
        <StatCard
          label="Average readiness"
          value={`${kpis.avgReadiness.value}%`}
          chip={trendChip(kpis.avgReadiness, " pts")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-[28px] bg-st-surface-container p-5 shadow-sm">
          <h2 className="text-[19px] font-bold text-st-primary">Concept mastery</h2>
          <p className="text-[13px] text-st-on-surface-variant">Average score by concept across all attempts.</p>
          <ConceptRadarChart data={data.radar} />
        </section>
        <section className="space-y-2 rounded-[28px] bg-st-surface-container p-5 shadow-sm">
          <h2 className="text-[19px] font-bold text-st-primary">Drill funnel</h2>
          <p className="text-[13px] text-st-on-surface-variant">
            Started, red flags found (60%+), correct order (80%+), quiz passed.
          </p>
          <DrillFunnelChart data={data.funnel} />
        </section>
        <section className="space-y-2 rounded-[28px] bg-st-surface-container p-5 shadow-sm lg:col-span-2">
          <h2 className="text-[19px] font-bold text-st-primary">Trend</h2>
          <p className="text-[13px] text-st-on-surface-variant">Weekly attempts and average score.</p>
          <TrendChart data={data.trend} />
        </section>
        <section className="space-y-3 rounded-[28px] bg-st-surface-container p-5 shadow-sm lg:col-span-2">
          <h2 className="text-[19px] font-bold text-st-primary">Most-missed steps</h2>
          <WeakStepTable rows={data.weakSteps} />
        </section>
        <section className="space-y-3 rounded-[28px] bg-st-surface-container p-5 shadow-sm lg:col-span-2">
          <h2 className="text-[19px] font-bold text-st-primary">Cohort (anonymised)</h2>
          <CohortTable rows={data.cohort} />
        </section>
      </div>
    </div>
  );
}
