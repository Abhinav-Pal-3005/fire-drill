interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
  suffix?: string;
}

/** Glass tooltip shared by every admin chart. Recharts injects active/payload/label. */
export function ChartTooltip({ active, payload, label, suffix = "" }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-thick relative rounded-[16px] px-3.5 py-2.5">
      {label !== undefined && <p className="t-caption mb-1 text-label-2">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={`${p.name ?? i}`} className="t-subhead flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
            <span className="text-label-2">{p.name}</span>
            <span className="tnum font-semibold text-label">
              {p.value}
              {suffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
