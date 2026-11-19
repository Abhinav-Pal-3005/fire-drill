import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

interface TrendChartProps {
  data: Array<{ label: string; attempts: number; avgScore: number }>;
}

/** Attempts (soft area) and average score (line) over the last eight weeks. */
export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-[280px] w-full" role="img" aria-label="Attempts and average score per week">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: -12, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="attemptsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006c48" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#006c48" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(27,67,50,0.08)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#414844", fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#414844", fontSize: 12 }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#414844", fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="attempts"
            name="Attempts"
            stroke="#006c48"
            strokeWidth={2}
            fill="url(#attemptsFill)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgScore"
            name="Avg score"
            stroke="#1b4332"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#1b4332" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
