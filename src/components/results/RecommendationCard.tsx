import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { getConcept } from "@/features/drills/drillLoader";
import type { Recommendation } from "@/features/adaptive/adaptiveEngine";
import { conceptIcons } from "@/theme/icons";

interface RecommendationCardProps {
  recommendation: Recommendation;
  heading?: string;
  secondary?: boolean;
}

/** Adaptive suggestion with its human-readable reason. */
export function RecommendationCard({
  recommendation,
  heading = "Up next for you",
  secondary = false,
}: RecommendationCardProps) {
  const { drill, reason, concept } = recommendation;
  const Icon = conceptIcons[concept ?? drill.concept];
  return (
    <section className="flex h-full flex-col gap-4 rounded-[28px] bg-st-surface-container p-5 shadow-sm">
      <div className="flex items-center gap-2 text-st-secondary">
        <Sparkles size={17} strokeWidth={2} aria-hidden />
        <h2 className="text-[13px] font-bold uppercase tracking-wider">{heading}</h2>
      </div>
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-st-secondary-container text-st-on-secondary-container">
          <Icon size={22} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold leading-snug text-st-primary">{drill.title}</h3>
          <span className="mt-1 inline-block rounded-full bg-st-surface-lowest px-2.5 py-0.5 text-[11px] font-semibold text-st-on-surface-variant">
            {getConcept(concept ?? drill.concept).title}
          </span>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-st-on-surface-variant">{reason}</p>
      <Link
        to={`/drills/${drill.id}/brief`}
        className={
          secondary
            ? "mt-auto inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full bg-st-surface px-5 text-[14px] font-semibold text-st-primary shadow-sm transition-colors hover:bg-st-surface-lowest"
            : "mt-auto inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full bg-st-primary-container px-5 text-[14px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98]"
        }
      >
        <span>Rehearse this next</span>
        <ArrowRight size={16} strokeWidth={2} aria-hidden />
      </Link>
    </section>
  );
}
