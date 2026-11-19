import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

const FILLS = ["#1b4332", "#006c48", "#3f6653", "#75daa8"];

export function DrillFunnelChart({ data }: { data: Array<{ stage: string; value: number }> }) {
  return (
    <div
      className="h-[260px] w-full"
      role="img"
      aria-label={`Drill funnel: ${data.map((d) => `${d.stage} ${d.value}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="stage"
            width={112}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#414844", fontSize: 13 }}
          />
          <Tooltip cursor={{ fill: "rgba(27,67,50,0.06)" }} content={<ChartTooltip />} />
          <Bar
            dataKey="value"
            name="Attempts"
            radius={[0, 14, 14, 0]}
            barSize={26}
            label={{ position: "right", fill: "#1a1c1a", fontSize: 13 }}
          >
            {data.map((d, i) => (
              <Cell key={d.stage} fill={FILLS[i % FILLS.length]} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
