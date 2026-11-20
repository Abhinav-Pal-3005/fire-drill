import type { ComposableDrillStep, Drill, SemanticIntent } from "@/types";

export type WidgetActionHandler = (intent: SemanticIntent, payload?: Record<string, unknown>) => void;

export interface WidgetRenderProps {
  step: ComposableDrillStep;
  drill: Drill;
  vars: Record<string, string>;
  onAction: WidgetActionHandler;
  tapFlag: (flagId: string | null) => void;
  flagsFound: string[];
  doneKeys: ReadonlySet<string>;
  onBack?: () => void;
}

/** Everything a sandbox scene needs. Scenes only render and call `emit` / `onAction`; the runner grades. */
export interface SceneProps {
  /** Rendered drill (all {{placeholders}} substituted). */
  drill: Drill;
  vars: Record<string, string>;
  emit: (actionKey: string, label?: string) => void;
  /** flagId, or null when plain text was tapped. */
  tapFlag: (flagId: string | null) => void;
  flagsFound: string[];
  doneKeys: ReadonlySet<string>;
  stepProps?: Record<string, unknown>;
  onAction?: WidgetActionHandler;
}
