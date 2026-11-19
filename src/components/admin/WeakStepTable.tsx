import type { WeakStep } from "@/features/analytics/adminSelectors";

export function WeakStepTable({ rows }: { rows: WeakStep[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">Most-missed steps across all drills</caption>
        <thead>
          <tr className="text-[12px] text-st-on-surface-variant">
            <th scope="col" className="pb-2 pr-3 font-semibold">Step</th>
            <th scope="col" className="pb-2 pr-3 font-semibold">Drill</th>
            <th scope="col" className="pb-2 pr-3 text-right font-semibold">Misses</th>
            <th scope="col" className="w-[130px] pb-2 font-semibold">Miss rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.drillId}-${r.stepId}`} className="text-[14px]">
              <td className="border-t border-st-outline-variant/40 py-3 pr-3 font-semibold text-st-on-surface">
                {r.label}
              </td>
              <td className="border-t border-st-outline-variant/40 py-3 pr-3 text-st-on-surface-variant">
                {r.drillTitle}
              </td>
              <td className="tnum border-t border-st-outline-variant/40 py-3 pr-3 text-right font-bold text-st-primary">
                {r.misses}
              </td>
              <td className="border-t border-st-outline-variant/40 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-st-surface-highest">
                    <div
                      className="h-full rounded-full bg-st-tertiary-container"
                      style={{ width: `${Math.min(100, r.missRate)}%` }}
                    />
                  </div>
                  <span className="tnum w-9 text-right text-[12px] font-medium text-st-on-surface-variant">
                    {r.missRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
