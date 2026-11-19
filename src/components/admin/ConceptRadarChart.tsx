import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export function ConceptRadarChart({ data }: { data: Array<{ concept: string; value: number }> }) {
  return (
    <div
      className="h-[300px] w-full"
      role="img"
      aria-label={`Concept mastery radar: ${data.map((d) => `${d.concept} ${d.value}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006c48" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#1b4332" stopOpacity={0.18} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="#c1c8c2" />
          <PolarAngleAxis dataKey="concept" tick={{ fill: "#414844", fontSize: 12 }} />
          <Radar name="Average score" dataKey="value" stroke="#006c48" strokeWidth={2.25} fill="url(#radarFill)" />
          <Tooltip content={<ChartTooltip suffix="%" />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
