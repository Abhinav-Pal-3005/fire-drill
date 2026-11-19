import type { ComposableDrillStep, Drill, RedFlag, SemanticIntent } from "@/types";

/** Unified semantic action callback emitted by every composable PracticeOS widget. */
export type WidgetActionHandler = (intent: SemanticIntent, payload?: Record<string, unknown>) => void;

/** Standardized props passed to every registered PracticeOS ScreenWidgetType renderer. */
export interface WidgetRenderProps {
  drill: Drill;
  step: ComposableDrillStep;
  vars: Record<string, string>;
  redFlags: RedFlag[];
  flagsFound: string[];
  doneKeys: ReadonlySet<string>;
  onAction: WidgetActionHandler;
  onFlag: (flagId: string) => void;
  onMiss: () => void;
  onBack?: () => void;
}

/** Everything a legacy sandbox scene needs. Scenes read dynamic stepProps/vars with safe defaults. */
export interface SceneProps {
  /** Rendered drill (all {{placeholders}} substituted). */
  drill: Drill;
  vars: Record<string, string>;
  /** Optional dynamic step overrides so legacy scenes never rely on hardcoded values. */
  stepProps?: Record<string, unknown>;
  emit: (actionKey: string, label?: string) => void;
  /** Optional semantic intent callback when mounted inside the Composable Widget Registry. */
  onAction?: WidgetActionHandler;
  /** flagId, or null when plain text was tapped. */
  tapFlag: (flagId: string | null) => void;
  flagsFound: string[];
  doneKeys: ReadonlySet<string>;
}
