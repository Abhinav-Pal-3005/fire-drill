import { useState } from "react";
import type { CohortRow } from "@/features/analytics/adminSelectors";

const PREVIEW = 10;

/** Anonymised cohort table: learner IDs only, no personal data. */
export function CohortTable({ rows }: { rows: CohortRow[] }) {
  const [all, setAll] = useState(false);
  const visible = all ? rows : rows.slice(0, PREVIEW);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
          <caption className="sr-only">Anonymised learner cohort</caption>
          <thead>
            <tr className="text-[12px] text-st-on-surface-variant">
              <th scope="col" className="pb-2 pr-3 font-semibold">Learner ID</th>
              <th scope="col" className="pb-2 pr-3 font-semibold">Cohort</th>
              <th scope="col" className="pb-2 pr-3 text-right font-semibold">Attempts</th>
              <th scope="col" className="pb-2 pr-3 text-right font-semibold">Avg score</th>
              <th scope="col" className="pb-2 pr-3 text-right font-semibold">Readiness</th>
              <th scope="col" className="pb-2 pr-3 text-right font-semibold">Critical</th>
              <th scope="col" className="pb-2 text-right font-semibold">Last active</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={`${r.cohort}-${r.learnerId}`} className="text-[14px]">
                <td className="tnum border-t border-st-outline-variant/40 py-2.5 pr-3 font-semibold text-st-on-surface">
                  {r.learnerId}{" "}
                  {r.isYou && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-st-secondary-container px-2 py-0.5 text-[11px] font-semibold text-st-on-secondary-container">
                      You
                    </span>
                  )}
                </td>
                <td className="border-t border-st-outline-variant/40 py-2.5 pr-3 text-st-on-surface-variant">
                  {r.cohort}
                </td>
                <td className="tnum border-t border-st-outline-variant/40 py-2.5 pr-3 text-right">{r.attempts}</td>
                <td className="tnum border-t border-st-outline-variant/40 py-2.5 pr-3 text-right">{r.avgScore}%</td>
                <td className="tnum border-t border-st-outline-variant/40 py-2.5 pr-3 text-right">{r.readiness}%</td>
                <td className="tnum border-t border-st-outline-variant/40 py-2.5 pr-3 text-right">{r.criticalCount}</td>
                <td className="tnum border-t border-st-outline-variant/40 py-2.5 text-right text-st-on-surface-variant">
                  {r.lastActiveDaysAgo === 0 ? "Today" : `${r.lastActiveDaysAgo}d ago`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="rounded-full bg-st-surface-lowest px-4 py-1.5 text-[13px] font-semibold text-st-primary shadow-sm"
        >
          {all ? "Show fewer" : `Show all ${rows.length} learners`}
        </button>
      )}
    </div>
  );
}
