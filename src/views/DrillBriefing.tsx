import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Flame, ListOrdered, Play, ShieldCheck, Timer, TimerOff } from "lucide-react";
import { Skeleton } from "@/components/glass/Skeleton";
import { getTimerLimitMs } from "@/features/drills/drillEngine";
import { getConcept, getDrill, getLibraryEntry } from "@/features/drills/drillLoader";
import { createScenario } from "@/features/randomiser/scenarioRandomiser";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import type { TimerMode } from "@/types";
import { cn } from "@/utils/cn";
import { formatClock } from "@/utils/formatters";
import NotFound from "./NotFound";

export default function DrillBriefing() {
  const { id } = useParams();
  const drill = getDrill(id);
  const demoSeed = useUserStore((s) => s.demoSeed);
  const pending = useDrillStore((s) => (id ? s.pending[id] : undefined));
  const timerMode = useDrillStore((s) => s.timerMode);
  const setTimerMode = useDrillStore((s) => s.setTimerMode);
  const ensureSeed = useDrillStore((s) => s.ensureSeed);

  useEffect(() => {
    if (drill) ensureSeed(drill.id, demoSeed);
  }, [drill, demoSeed, ensureSeed]);

  const scenario = useMemo(
    () => (drill && pending ? createScenario(drill, pending.seed, { demo: pending.demo }) : null),
    [drill, pending],
  );

  if (!drill) return <NotFound />;

  const relaxedMs = getTimerLimitMs(drill.timeLimitSec, "relaxed");
  const panickedMs = getTimerLimitMs(drill.timeLimitSec, "panicked");

  const timerModes: Array<{
    id: TimerMode;
    label: string;
    detail: string;
    desc: string;
    icon: typeof Timer;
  }> = [
    {
      id: "relaxed",
      label: "Relaxed",
      detail: formatClock(relaxedMs),
      desc: "Extra time to inspect clues calmly",
      icon: Timer,
    },
    {
      id: "panicked",
      label: "Panicked",
      detail: formatClock(panickedMs),
      desc: "Fast urgent clock under pressure",
      icon: Flame,
    },
    {
      id: "none",
      label: "No timer",
      detail: "Unlimited",
      desc: "Practice at your own pace",
      icon: TimerOff,
    },
  ];

  const rules = [
    timerMode === "none"
      ? {
          icon: TimerOff,
          title: "No timer · Unlimited pace",
          text: "No countdown or timeout. Take as long as you need to verify each clue.",
        }
      : timerMode === "panicked"
        ? {
            icon: Flame,
            title: `Panicked mode · ${formatClock(panickedMs)} on the clock`,
            text: "A 3-2-1 countdown, then a tight high-pressure timer with no pause.",
          }
        : {
            icon: Timer,
            title: `Relaxed mode · ${formatClock(relaxedMs)} on the clock`,
            text: "A 3-2-1 countdown, then a generous timer with extra breathing room.",
          },
    {
      icon: ListOrdered,
      title: "Steps and order are graded",
      text: "Do the right things in the right order. Red flags and accuracy count too.",
    },
    {
      icon: ShieldCheck,
      title: "Sandbox, no real money",
      text: "Nothing is real and no PIN is stored. Hints are available but cost points.",
    },
  ];

  const related = drill.linkedLibraryIds
    .map((lid) => getLibraryEntry(lid))
    .filter((e) => e !== undefined);

  return (
    <div className="mx-auto max-w-[720px] space-y-6 pb-8">
      <Link
        to="/drills"
        className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-st-primary-container hover:underline"
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden /> All drills
      </Link>

      <div className="space-y-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-st-primary sm:text-[34px]">
          {drill.title}
        </h1>
        <p className="text-[16px] text-st-on-surface-variant">{drill.tagline}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center rounded-full bg-st-secondary-container px-3 py-1 text-[12px] font-semibold text-st-on-secondary-container">
            {getConcept(drill.concept).title}
          </span>
          {drill.relatedConcepts.map((c) => (
            <span
              key={c}
              className="inline-flex items-center rounded-full bg-st-surface-container px-3 py-1 text-[12px] font-semibold text-st-on-surface-variant"
            >
              {getConcept(c).title}
            </span>
          ))}
        </div>
      </div>

      {/* Scenario Brief Card */}
      <section className="space-y-4 rounded-[28px] bg-st-surface-container p-6 shadow-sm">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-st-secondary">The scenario</h2>
        {scenario ? (
          <p className="text-[16px] leading-relaxed text-st-on-surface">{scenario.drill.intro}</p>
        ) : (
          <div className="space-y-2" aria-busy>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        )}
        {scenario ? (
          <span className="tnum inline-flex items-center rounded-full bg-st-surface-lowest px-3 py-1 text-[12px] font-semibold text-st-on-surface-variant shadow-sm">
            Scenario seed #{scenario.seedCode} · details randomised{scenario.demo ? " · demo run" : ""}
          </span>
        ) : (
          <Skeleton className="h-7 w-64 rounded-full" />
        )}
      </section>

      {/* Timer Mode Selector */}
      <section className="space-y-3 rounded-[24px] bg-st-surface-container p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-st-secondary">Choose timer mode</h2>
          <span className="text-[12px] font-medium text-st-on-surface-variant">Applies to your run</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Drill timer mode">
          {timerModes.map((mode) => {
            const Icon = mode.icon;
            const selected = timerMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTimerMode(mode.id)}
                className={cn(
                  "flex min-h-[76px] cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
                  selected
                    ? "border-st-primary-container bg-st-secondary-container/75 text-st-primary shadow-sm ring-1 ring-st-primary-container"
                    : "border-st-outline-variant/50 bg-st-surface-lowest text-st-on-surface hover:bg-st-surface-high",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-bold">
                    <Icon size={15} strokeWidth={2.1} aria-hidden />
                    {mode.label}
                  </span>
                  <span
                    className={cn(
                      "tnum rounded-full px-2 py-0.5 text-[11px] font-bold",
                      selected
                        ? "bg-st-primary-container text-st-on-primary"
                        : "bg-st-surface-container text-st-on-surface-variant",
                    )}
                  >
                    {mode.detail}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-st-on-surface-variant">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Rules */}
      <section className="divide-y divide-st-outline-variant/40 overflow-hidden rounded-[24px] bg-st-surface-low shadow-sm">
        {rules.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.title} className="flex items-start gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-st-secondary-container text-st-on-secondary-container">
                <Icon size={21} strokeWidth={2} aria-hidden />
              </span>
              <div>
                <h3 className="text-[16px] font-bold text-st-primary">{r.title}</h3>
                <p className="mt-0.5 text-[14px] text-st-on-surface-variant">{r.text}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Start Drill CTA (routes to untouched /play sandbox) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          to={scenario ? `/drills/${drill.id}/play` : "#"}
          aria-disabled={!scenario}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-st-primary-container px-7 text-[16px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
        >
          <Play size={18} strokeWidth={2} fill="currentColor" aria-hidden />
          <span>Start drill</span>
        </Link>
        <p className="text-[13px] text-st-on-surface-variant">You will see a 3-2-1 countdown first.</p>
      </div>

      {related.length > 0 && (
        <section className="space-y-2.5 pt-2">
          <h2 className="text-[16px] font-bold text-st-primary">Related scam patterns</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((e) => (
              <Link
                key={e.id}
                to={`/library/${e.id}`}
                className="inline-flex min-h-[42px] items-center rounded-full bg-st-surface-container px-4 text-[13px] font-semibold text-st-primary-container shadow-sm transition-colors hover:bg-st-surface-high"
              >
                {e.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
