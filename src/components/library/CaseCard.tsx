import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BookOpen,
  Bookmark,
  ChevronRight,
  Hourglass,
} from "lucide-react";
import { getConcept } from "@/features/drills/drillLoader";
import { useUserStore } from "@/store/useUserStore";
import { conceptIcons } from "@/theme/icons";
import type { LibraryEntry } from "@/types";
import { cn } from "@/utils/cn";

/** Verification badge shared by library cards and detail pages. */
export function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-st-secondary-fixed px-2.5 py-1 text-[11px] font-semibold text-st-on-secondary-fixed">
      <BadgeCheck size={13} strokeWidth={2} aria-hidden />
      Verified Official Source
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-st-tertiary-fixed px-2.5 py-1 text-[11px] font-semibold text-st-on-tertiary-fixed">
      <Hourglass size={13} strokeWidth={2} aria-hidden />
      Educational Pattern
    </span>
  );
}

export function CaseCard({ entry }: { entry: LibraryEntry }) {
  const ConceptIcon = conceptIcons[entry.concept];
  const bookmarks = useUserStore((s) => s.bookmarks);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);
  const bookmarked = bookmarks.includes(entry.id);

  return (
    <article className="flex h-full min-w-0 flex-col justify-between gap-4 rounded-[24px] bg-st-surface-container p-4 shadow-sm transition-transform hover:-translate-y-px sm:rounded-[28px] sm:p-5">
      <div className="min-w-0 space-y-3">
        {/* Card Header Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VerificationBadge verified={entry.verified} />
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-st-surface-highest px-2.5 py-1 text-[11px] font-semibold text-st-on-surface-variant">
            <ConceptIcon size={12} strokeWidth={2} className="shrink-0" aria-hidden />
            <span className="truncate">{getConcept(entry.concept).title}</span>
          </span>
        </div>

        {/* Origin, Location & Title */}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-st-primary">
            {entry.source.publisher || "Consumer Protection Advisory"}
            {entry.source.date ? ` · ${entry.source.date}` : ""}
          </p>
          {(entry.location || entry.amountLost) && (
            <p className="mt-0.5 text-[11.5px] font-medium text-st-on-surface-variant">
              {entry.location}
              {entry.location && entry.amountLost ? " · " : ""}
              {entry.amountLost && <span className="font-semibold text-st-error">{entry.amountLost}</span>}
            </p>
          )}
          <Link to={`/library/${entry.id}`} className="group mt-1.5 flex min-w-0 items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-[18px] font-bold leading-snug tracking-tight text-st-on-surface group-hover:text-st-primary-container sm:text-[19px]">
              {entry.title}
            </h3>
            <ChevronRight
              size={18}
              className="mt-1 shrink-0 text-st-outline transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <p className="line-clamp-3 text-[13.5px] leading-relaxed text-st-on-surface-variant">
          {entry.summary}
        </p>
      </div>

      {/* CTA Row */}
      <div className="flex min-w-0 items-center gap-2 pt-1">
        <Link
          to={`/library/${entry.id}`}
          className="flex min-h-[46px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-st-primary-container px-4 text-[14px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98]"
        >
          <BookOpen size={17} strokeWidth={2} className="shrink-0" aria-hidden />
          <span className="truncate">Read Case Study</span>
        </Link>
        <button
          type="button"
          onClick={() => toggleBookmark(entry.id)}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark case"}
          aria-pressed={bookmarked}
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-sm transition-colors",
            bookmarked
              ? "bg-st-secondary-container text-st-on-secondary-container"
              : "bg-st-surface text-st-on-surface-variant hover:bg-st-surface-high",
          )}
        >
          <Bookmark size={18} strokeWidth={2} fill={bookmarked ? "currentColor" : "none"} aria-hidden />
        </button>
      </div>
    </article>
  );
}
