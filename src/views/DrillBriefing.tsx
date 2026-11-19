import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ChevronLeft, ListOrdered, Play, ShieldCheck, Timer } from "lucide-react";
import { Skeleton } from "@/components/glass/Skeleton";
import { getConcept, getDrill, getLibraryEntry } from "@/features/drills/drillLoader";
import { createScenario } from "@/features/randomiser/scenarioRandomiser";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import { formatClock } from "@/utils/formatters";
import NotFound from "./NotFound";

export default function DrillBriefing() {
  const { id } = useParams();
  const drill = getDrill(id);
  const demoSeed = useUserStore((s) => s.demoSeed);
  const pending = useDrillStore((s) => (id ? s.pending[id] : undefined));
  const ensureSeed = useDrillStore((s) => s.ensureSeed);

  useEffect(() => {
    if (drill) ensureSeed(drill.id, demoSeed);
  }, [drill, demoSeed, ensureSeed]);

  const scenario = useMemo(
    () => (drill && pending ? createScenario(drill, pending.seed, { demo: pending.demo }) : null),
    [drill, pending],
  );

  if (!drill) return <NotFound />;

  const rules = [
    {
      icon: Timer,
      title: `${formatClock(drill.timeLimitSec * 1000)} on the clock`,
      text: "A 3-2-1 countdown, then the timer runs. There is no pause.",
    },
    {
      icon: ListOrdered,
      title: "Steps and order are graded",
      text: "Do the right things in the right order. Red flags and speed count too.",
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
