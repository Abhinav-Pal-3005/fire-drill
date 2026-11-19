import type { StepStatus } from "@/types";

/** Motion tokens (Framer Motion). Animate only transform/opacity. */
export const spring = { type: "spring", stiffness: 350, damping: 28 } as const;
export const routeTransition = { duration: 0.22, ease: "easeOut" } as const;
export const press = { scale: 0.97 } as const;
export const hoverLift = { y: -1 } as const;

/** Raw colour values for places CSS variables cannot reach (SVG attributes, charts). */
export const colors = {
  accent: "#007AFF",
  accentPressed: "#0062CC",
  success: "#34C759",
  danger: "#FF3B30",
  warning: "#FF9500",
  indigo: "#5856D6",
  teal: "#30B0C7",
  label: "#1D1D1F",
  label2: "rgba(60,60,67,0.72)",
  separator: "rgba(60,60,67,0.10)",
  gray: "#8E8E93",
} as const;

/** Fitness-style ring colours for the four results metrics. */
export const ringColors = {
  score: colors.accent,
  order: colors.indigo,
  speed: colors.warning,
  redFlags: colors.success,
} as const;

/** Grade-status map: correct=success, wrong=danger, out_of_order=warning, missed=gray, critical=danger filled. */
export const statusTone: Record<StepStatus, { label: string; tone: "success" | "danger" | "warning" | "neutral" | "dangerFilled" }> = {
  correct: { label: "Correct", tone: "success" },
  wrong: { label: "Wrong action", tone: "danger" },
  out_of_order: { label: "Out of order", tone: "warning" },
  missed: { label: "Missed", tone: "neutral" },
  critical: { label: "Critical", tone: "dangerFilled" },
};

export const layout = {
  contentMax: 1120,
  sidebarWidth: 272,
  disclaimer: "Education, not personal advice · No real payments.",
} as const;
