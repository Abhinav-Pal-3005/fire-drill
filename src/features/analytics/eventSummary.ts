import type { AnalyticsEvent } from "@/types";

/** Event summary for the learner's Progress & Readiness page. */
export function summariseEvents(events: AnalyticsEvent[]): {
  stepActions: number;
  stepAccuracy: number;
  flagTaps: number;
  flagAccuracy: number;
  criticalCount: number;
} {
  const steps = events.filter((e) => e.type === "step_action" && e.correct !== undefined);
  const flags = events.filter((e) => e.type === "red_flag_tapped");
  return {
    stepActions: steps.length,
    stepAccuracy: steps.length === 0 ? 0 : Math.round((steps.filter((e) => e.correct).length / steps.length) * 100),
    flagTaps: flags.length,
    flagAccuracy: flags.length === 0 ? 0 : Math.round((flags.filter((e) => e.correct).length / flags.length) * 100),
    criticalCount: events.filter((e) => e.type === "critical_mistake").length,
  };
}
