import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LiveAlertsStrip } from "@/components/library/LiveAlertsStrip";
import { computeStreak, getReadiness, getRecommendedDrill } from "@/features/adaptive/adaptiveEngine";
import { getConcept, listDrills } from "@/features/drills/drillLoader";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import { conceptIcons } from "@/theme/icons";
import { greeting } from "@/utils/formatters";

export default function Home() {
  const attempts = useDrillStore((s) => s.attempts);
  const displayName = useUserStore((s) => s.displayName);
  const drills = listDrills();
  const recommendation = useMemo(() => getRecommendedDrill(attempts), [attempts]);
  const readiness = useMemo(() => getReadiness(attempts), [attempts]);
  const streak = useMemo(() => computeStreak(attempts), [attempts]);
  const completed = new Set(attempts.filter((a) => a.grade.completed).map((a) => a.drillId)).size;
  const RecIcon = conceptIcons[recommendation.concept ?? recommendation.drill.concept];
  const progressPct = Math.round((completed / Math.max(1, drills.length)) * 100);

  const circumference = 2 * Math.PI * 50;
  const dashOffset = circumference * (1 - readiness / 100);

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 pb-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-1 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-st-secondary">
          Welcome back, {displayName.split(" ")[0] || "Learner"}
        </span>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-st-primary sm:text-[34px]">
          {greeting()}
        </h1>
        <p className="text-[15px] text-st-on-surface-variant">
          Ready for a money fire drill? Practise the right response before it is real.
        </p>
      </div>

      {/* Top Row: Hero Card + Readiness Gauge */}
      <div className="grid gap-4 lg:grid-cols-6">
        <section className="flex flex-col justify-between gap-6 rounded-[28px] bg-st-surface-container p-6 shadow-sm lg:col-span-4">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-st-secondary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-st-on-secondary-container">
              <ShieldCheck size={14} strokeWidth={2} aria-hidden />
              Practice sandbox · no real money
            </span>
            <h2 className="text-[24px] font-bold tracking-tight text-st-primary">Start a drill</h2>
            <p className="max-w-[52ch] text-[15px] leading-relaxed text-st-on-surface-variant">
              A timed money emergency, a simulated payment phone and a short quiz. You are graded on your steps and
              their order, then you see exactly why.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/drills/${recommendation.drill.id}/brief`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-st-primary-container px-6 text-[15px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
            >
              <Play size={17} strokeWidth={2} fill="currentColor" aria-hidden />
              <span>{attempts.length === 0 ? "Start your first drill" : "Start suggested drill"}</span>
            </Link>
            <Link
              to="/drills"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-st-surface px-5 text-[15px] font-semibold text-st-primary shadow-sm transition-colors hover:bg-st-surface-lowest"
            >
              Browse all drills
            </Link>
          </div>
        </section>

        <section className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] bg-st-surface-container p-6 text-center shadow-sm lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-st-secondary-container/35 blur-xl" />
          <span className="self-start text-[12px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
            Readiness
          </span>
          <div className="relative grid h-36 w-36 place-items-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e3e2e0" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="#006c48"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="tnum text-[34px] font-bold leading-none text-st-primary">{readiness}</span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-st-secondary">Ready</span>
            </div>
          </div>
          <p className="text-[13px] text-st-on-surface-variant">Average across all five concepts.</p>
        </section>
      </div>

      {/* Second Row: Recommended Next Drill + Streak & Progress */}
      <div className="grid gap-4 lg:grid-cols-6">
        <section className="flex flex-col justify-between gap-4 rounded-[28px] bg-st-surface-container p-5 shadow-sm lg:col-span-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-st-secondary">
              <Sparkles size={17} strokeWidth={2} aria-hidden />
              <h2 className="text-[13px] font-bold uppercase tracking-wider">Up next for you</h2>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-st-secondary-container text-st-on-secondary-container">
                <RecIcon size={22} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[18px] font-bold leading-snug text-st-primary">{recommendation.drill.title}</h3>
                <span className="mt-1 inline-block rounded-full bg-st-surface-lowest px-2.5 py-0.5 text-[11px] font-semibold text-st-on-surface-variant">
                  {getConcept(recommendation.concept ?? recommendation.drill.concept).title}
                </span>
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-st-on-surface-variant">{recommendation.reason}</p>
          </div>
          <Link
            to={`/drills/${recommendation.drill.id}/brief`}
            className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full bg-st-primary-container px-5 text-[14px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98]"
          >
            <span>Rehearse this next</span>
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </Link>
        </section>

        <section className="flex flex-col justify-between gap-4 rounded-[28px] bg-st-surface-container p-5 shadow-sm lg:col-span-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-st-primary">
              <Flame size={18} strokeWidth={2} aria-hidden />
              <h2 className="text-[13px] font-bold uppercase tracking-wider">Streak &amp; progress</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-st-surface-lowest p-4 shadow-sm">
                <p className="tnum text-[32px] font-bold leading-none text-st-primary">{streak}</p>
                <p className="mt-1 text-[12px] font-medium text-st-on-surface-variant">Day streak</p>
              </div>
              <div className="rounded-2xl bg-st-surface-lowest p-4 shadow-sm">
                <p className="tnum text-[32px] font-bold leading-none text-st-primary">{attempts.length}</p>
                <p className="mt-1 text-[12px] font-medium text-st-on-surface-variant">
                  {attempts.length === 1 ? "Attempt" : "Attempts"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-st-surface-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold text-st-on-surface">
                <CheckCircle2 size={15} className="text-st-secondary" aria-hidden />
                Drills completed
              </span>
              <span className="tnum font-bold text-st-primary">
                {completed} of {drills.length}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-st-surface-container">
              <div
                className="h-full rounded-full bg-st-secondary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Emergency SOS Guide Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-st-surface-high p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-st-error-container text-st-error">
            <ShieldAlert size={20} strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-[14px] font-bold text-st-on-surface">Scammed right now?</p>
            <p className="text-[12px] text-st-on-surface-variant">
              Open the Golden Hour response checklist, call 1930, and report on cybercrime.gov.in.
            </p>
          </div>
        </div>
        <Link
          to="/sos"
          className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-st-error px-4 text-[13px] font-semibold text-st-on-error shadow-sm transition-transform active:scale-[0.98]"
        >
          <span>Emergency SOS Guide</span>
          <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>

      {/* Live Alerts Strip */}
      <LiveAlertsStrip />
    </div>
  );
}
