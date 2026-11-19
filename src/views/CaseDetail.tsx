import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, ChevronLeft, ExternalLink, Play } from "lucide-react";
import { VerificationBadge } from "@/components/library/CaseCard";
import { logEvent } from "@/features/analytics/analyticsLogger";
import { getConcept, getDrill, getLibraryEntry } from "@/features/drills/drillLoader";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/utils/cn";
import NotFound from "./NotFound";

function InsetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-2 text-[11px] font-bold uppercase tracking-wider text-st-on-surface-variant">{title}</h2>
      <div className="overflow-hidden rounded-[24px] bg-st-surface-container shadow-sm">{children}</div>
    </section>
  );
}

function ItemList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="divide-y divide-st-outline-variant/40">
      {items.map((item, i) => (
        <li key={item} className="flex min-w-0 gap-3 px-4 py-3.5 text-[15px] leading-relaxed text-st-on-surface">
          <span
            className="tnum mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-st-secondary-container text-[12px] font-bold text-st-on-secondary-container"
            aria-hidden
          >
            {ordered ? i + 1 : "•"}
          </span>
          <span className="min-w-0 flex-1 break-words">{item}</span>
        </li>
      ))}
    </Tag>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const entry = getLibraryEntry(id);
  const bookmarks = useUserStore((s) => s.bookmarks);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);

  useEffect(() => {
    if (entry) {
      logEvent({
        type: "library_opened",
        drillId: entry.linkedDrillId,
        concept: entry.concept,
        stepId: entry.id,
        timeMs: 0,
        seed: 0,
      });
    }
  }, [entry]);

  if (!entry) return <NotFound />;
  const drill = getDrill(entry.linkedDrillId);
  const bookmarked = bookmarks.includes(entry.id);

  return (
    <>
      <article className="mx-auto w-full min-w-0 max-w-[720px] space-y-6 pb-28 sm:pb-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/library"
            className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-st-primary-container hover:underline"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden /> Scam Library
          </Link>
          <button
            type="button"
            onClick={() => toggleBookmark(entry.id)}
            className={cn(
              "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
              bookmarked
                ? "bg-st-secondary-container text-st-on-secondary-container"
                : "bg-st-surface-container text-st-on-surface-variant hover:bg-st-surface-high",
            )}
          >
            <Bookmark size={15} strokeWidth={2} fill={bookmarked ? "currentColor" : "none"} aria-hidden />
            <span>{bookmarked ? "Saved" : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4 rounded-[24px] bg-st-surface-container p-5 shadow-sm sm:rounded-[28px] sm:p-6">
          <div className="min-w-0">
            {(entry.location || entry.source.date) && (
              <p className="mb-1 text-[12.5px] font-semibold text-st-secondary">
                {entry.location}
                {entry.location && entry.source.date ? " · " : ""}
                {entry.source.date}
              </p>
            )}
            <h1 className="break-words text-[24px] font-bold leading-tight tracking-tight text-st-primary sm:text-[30px]">
              {entry.title}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-st-on-surface-variant">{entry.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-st-surface-lowest px-3 py-1 text-[12px] font-semibold text-st-primary">
              {getConcept(entry.concept).title}
            </span>
            {entry.amountLost && (
              <span className="inline-flex items-center rounded-full bg-st-error-container px-3 py-1 text-[12px] font-semibold text-st-on-error-container">
                {entry.amountLost}
              </span>
            )}
            <VerificationBadge verified={entry.verified} />
          </div>
        </div>

        <InsetSection title="How it worked">
          <ItemList items={entry.howItWorks} ordered />
        </InsetSection>
        <InsetSection title="Warning signs">
          <ItemList items={entry.redFlags} />
        </InsetSection>
        <InsetSection title="Safety tips">
          <ItemList items={entry.howToStop} ordered />
        </InsetSection>

        <InsetSection title="Source">
          <div className="space-y-2 px-5 py-4">
            {entry.verified && entry.source.url ? (
              <>
                <p className="break-words text-[16px] font-bold text-st-primary">{entry.source.name}</p>
                <p className="text-[13px] text-st-on-surface-variant">
                  {entry.source.publisher} · {entry.source.date}
                </p>
                <a
                  href={entry.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-st-secondary hover:underline"
                >
                  Open official source <ExternalLink size={14} strokeWidth={2} aria-hidden />
                </a>
              </>
            ) : (
              <>
                <VerificationBadge verified={false} />
                <p className="text-[14px] leading-relaxed text-st-on-surface-variant">
                  This entry describes a general, well-known pattern. A named source, publisher, link and date will
                  appear here once verified. Treat it as education, not as a news report.
                </p>
              </>
            )}
          </div>
        </InsetSection>
      </article>

      {drill && (
        <div className="no-print fixed inset-x-3 bottom-[76px] z-40 lg:bottom-5 lg:left-[288px] lg:right-4">
          <div className="mx-auto flex min-w-0 max-w-[680px] items-center justify-between gap-2.5 rounded-full bg-st-surface-low/95 py-2 pl-4 pr-2 shadow-[0_6px_24px_rgba(20,38,30,0.12)] ring-1 ring-st-outline-variant/50 backdrop-blur-xl sm:pl-5">
            <p className="min-w-0 truncate text-[13.5px] font-semibold text-st-primary sm:text-[14px]">
              Drill: {drill.title}
            </p>
            <Link
              to={`/drills/${drill.id}/brief`}
              onClick={() =>
                logEvent({
                  type: "library_to_drill_clicked",
                  drillId: drill.id,
                  concept: entry.concept,
                  timeMs: 0,
                  seed: 0,
                })
              }
              className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-full bg-st-primary-container px-4 text-[13.5px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-95 sm:px-5 sm:text-[14px]"
            >
              <Play size={15} strokeWidth={2} fill="currentColor" aria-hidden />
              <span>Practice drill</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
