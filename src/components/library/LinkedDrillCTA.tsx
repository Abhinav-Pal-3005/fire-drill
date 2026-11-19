import { Play } from "lucide-react";
import { GlassButton } from "@/components/glass/GlassButton";
import { getDrill } from "@/features/drills/drillLoader";
import { logEvent } from "@/features/analytics/analyticsLogger";
import type { ConceptId } from "@/types";

interface LinkedDrillCTAProps {
  drillId: string;
  concept: ConceptId;
  label?: string;
  size?: "md" | "lg";
}

/** "Practice this drill" button. Logs library_to_drill_clicked, then opens the briefing. */
export function LinkedDrillCTA({ drillId, concept, label = "Practice this drill", size = "lg" }: LinkedDrillCTAProps) {
  const drill = getDrill(drillId);
  if (!drill) return null;
  return (
    <GlassButton
      size={size}
      to={`/drills/${drill.id}/brief`}
      icon={<Play size={18} strokeWidth={1.75} fill="currentColor" />}
      onClick={() => logEvent({ type: "library_to_drill_clicked", drillId: drill.id, concept, timeMs: 0, seed: 0 })}
    >
      {label}
    </GlassButton>
  );
}
