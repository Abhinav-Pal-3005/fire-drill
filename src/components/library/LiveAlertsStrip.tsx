import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { getLibrary } from "@/features/drills/drillLoader";
import { scamIcons } from "@/theme/icons";

/** Snap-scrolling "Live alerts" strip. Uses the same static JSON as the library. Updated manually. */
export function LiveAlertsStrip({ compact = false }: { compact?: boolean }) {
  const library = getLibrary();
  return (
    <section aria-labelledby={compact ? undefined : "alerts-heading"} className="w-full min-w-0 space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 id="alerts-heading" className="flex items-center gap-2 text-[19px] font-bold text-st-primary">
            <Radio size={19} strokeWidth={2} className="text-st-secondary" aria-hidden />
            Live scam alerts
          </h2>
          <p className="text-[12px] text-st-on-surface-variant">{library.updateNote}</p>
        </div>
      )}
      <ul className="no-scrollbar flex w-full max-w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {library.entries.map((entry) => {
          const Icon = scamIcons[entry.scamType];
          return (
            <li key={entry.id} className="w-[min(256px,74vw)] shrink-0 snap-start sm:w-[290px]">
              <Link
                to={`/library/${entry.id}`}
                className="flex h-full min-h-[118px] flex-col gap-2 rounded-2xl bg-st-surface-lowest p-4 shadow-sm transition-transform hover:-translate-y-px active:scale-[0.99]"
              >
                <span className="flex items-center gap-2 text-st-tertiary-container">
                  <Icon size={17} strokeWidth={2} aria-hidden />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Active Pattern</span>
                </span>
                <span className="line-clamp-1 text-[15px] font-bold text-st-primary">{entry.title}</span>
                <span className="line-clamp-2 text-[12px] leading-snug text-st-on-surface-variant">
                  {entry.summary}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
