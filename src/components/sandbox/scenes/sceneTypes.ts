import type { Drill } from "@/types";

/** Everything a sandbox scene needs. Scenes only render and call `emit`; the runner grades. */
export interface SceneProps {
  /** Rendered drill (all {{placeholders}} substituted). */
  drill: Drill;
  vars: Record<string, string>;
  emit: (actionKey: string, label?: string) => void;
  /** flagId, or null when plain text was tapped. */
  tapFlag: (flagId: string | null) => void;
  flagsFound: string[];
  doneKeys: ReadonlySet<string>;
}
