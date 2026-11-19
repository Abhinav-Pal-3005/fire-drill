import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Play,
  RotateCcw,
  ShieldCheck,
  Verified,
} from "lucide-react";
import { getReadiness, getRecommendedDrill, bestScoreFor } from "@/features/adaptive/adaptiveEngine";
import { getConcept, listDrills } from "@/features/drills/drillLoader";
import { useDrillStore } from "@/store/useDrillStore";
import { conceptIcons } from "@/theme/icons";
import type { Difficulty } from "@/types";
import { formatClock } from "@/utils/formatters";

const SEVERITY_LABEL: Record<Difficulty, { text: string; tone: string }> = {
  easy: { text: "Core Scenario", tone: "bg-st-surface-variant text-st-on-surface-variant" },
  medium: { text: "High Severity", tone: "bg-st-tertiary-fixed text-st-on-tertiary-fixed" },
  hard: { text: "Critical Risk", tone: "bg-st-error-container text-st-on-error-container" },
};

export default function DrillsCatalog() {
  const attempts = useDrillStore((s) => s.attempts);
  const drills = listDrills();
  const readiness = getReadiness(attempts);
  const recommendation = getRecommendedDrill(attempts);
  const completedCount = new Set(attempts.filter((a) => a.grade.completed).map((a) => a.drillId)).size;

  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference * (1 - readiness / 100);

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-5 pb-6">
      {/* 1. Top Safe Sandbox Banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-st-surface-container px-4 py-3 shadow-sm">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-primary-fixed text-st-primary">
          <ShieldCheck size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-st-secondary">
            Safe Sandbox Mode
          </span>
          <p className="truncate text-[13px] text-st-on-surface-variant">
            Education simulation only. No real money or bank accounts accessed.
          </p>
        </div>
      </div>

      {/* 2. Quick Readiness Stat Card */}
      <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[28px] bg-st-surface-container p-6 shadow-sm">
        <div className="z-10 flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-st-secondary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-st-on-secondary-container">
            <Verified size={13} strokeWidth={2} aria-hidden />
            Fraud Readiness
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum text-[32px] font-bold leading-none tracking-tight text-st-primary">{readiness}%</span>
            <span className="text-[19px] font-semibold text-st-secondary">
              {readiness >= 75 ? "Ready" : attempts.length === 0 ? "Start" : "In Progress"}
            </span>
          </div>
          <p className="text-[13px] text-st-on-surface-variant">
            {completedCount} of {drills.length} Core Drills completed · {attempts.length}{" "}
            {attempts.length === 1 ? "attempt" : "attempts"}
          </p>
        </div>

        <div className="relative z-10 grid h-20 w-20 shrink-0 place-items-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="36" r="30" fill="transparent" stroke="#e3e2e0" strokeWidth="7" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="transparent"
              stroke="#006c48"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="absolute grid place-items-center text-st-secondary">
            <Verified size={22} strokeWidth={2} aria-hidden />
          </span>
        </div>

        <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-st-secondary-container/25" />
      </div>

      {/* 3. Active Fire Drills Section */}
      <section className="space-y-3" aria-labelledby="active-drills-heading">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Flame size={20} strokeWidth={2} className="text-st-primary" aria-hidden />
            <h1 id="active-drills-heading" className="text-[20px] font-bold tracking-tight text-st-primary">
              Active Fire Drills
            </h1>
          </div>
          <span className="text-[13px] font-semibold text-st-secondary">{drills.length} Timed Scenarios</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {drills.map((drill, idx) => {
            const Icon = conceptIcons[drill.concept];
            const done = attempts.some((a) => a.drillId === drill.id && a.grade.completed);
            const best = bestScoreFor(attempts, drill.id);
            const severity = SEVERITY_LABEL[drill.difficulty];
            const featured = idx === 0 || (!done && recommendation.drill.id === drill.id);

            return (
              <div
                key={drill.id}
                className="flex flex-col justify-between gap-4 rounded-[28px] bg-st-surface-container p-5 shadow-sm transition-transform hover:-translate-y-px"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-st-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-st-on-secondary-container">
                        <Clock size={12} strokeWidth={2} aria-hidden />
                        Timed · {formatClock(drill.timeLimitSec * 1000)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${severity.tone}`}>
                        {severity.text}
                      </span>
                    </div>
                    {done ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-st-secondary">
                        <CheckCircle2 size={15} strokeWidth={2} aria-hidden />
                        {best !== null ? `${best}%` : "Done"}
                      </span>
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-surface text-st-primary-container shadow-sm">
                        <Icon size={17} strokeWidth={2} aria-hidden />
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-[19px] font-bold leading-snug text-st-primary">{drill.title}</h2>
                    <p className="mt-1 text-[14px] leading-relaxed text-st-on-surface-variant">{drill.tagline}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-st-surface p-3 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-error-container text-st-on-error-container">
                        <AlertTriangle size={15} strokeWidth={2} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-st-on-surface">
                          {getConcept(drill.concept).title}
                        </p>
                        <p className="truncate text-[12px] text-st-on-tertiary-fixed-variant">
                          {drill.steps.length} graded steps · {drill.redFlags.length} red flags
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-st-outline" aria-hidden />
                  </div>
                </div>

                <Link
                  to={`/drills/${drill.id}/brief`}
                  className={
                    featured
                      ? "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-st-primary-container px-5 text-[15px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
                      : "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-st-surface px-5 text-[15px] font-semibold text-st-primary shadow-sm transition-transform hover:bg-st-surface-lowest active:scale-[0.98]"
                  }
                >
                  {done ? <RotateCcw size={17} strokeWidth={2} aria-hidden /> : <Play size={17} strokeWidth={2} aria-hidden />}
                  <span>{done ? "Practice Again" : "Start Drill"}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Adaptive Recommendation Pill Box */}
      <Link
        to={`/drills/${recommendation.drill.id}/brief`}
        className="flex items-center gap-3.5 rounded-[24px] bg-st-surface-container p-4 shadow-sm transition-transform hover:-translate-y-px active:scale-[0.99]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
          <Brain size={22} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-st-secondary">
            Adaptive Recommendation
          </span>
          <h3 className="mt-0.5 truncate text-[15px] font-bold text-st-primary">{recommendation.drill.title}</h3>
          <p className="line-clamp-1 text-[13px] text-st-on-surface-variant">{recommendation.reason}</p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-st-outline" aria-hidden />
      </Link>
    </div>
  );
}

