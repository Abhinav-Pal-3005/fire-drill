import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Lightbulb,
  PhoneCall,
  Search,
  SearchX,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { CaseCard } from "@/components/library/CaseCard";
import { LiveAlertsStrip } from "@/components/library/LiveAlertsStrip";
import { getLibrary, listConcepts } from "@/features/drills/drillLoader";
import type { ConceptId, ScamType } from "@/types";
import { cn } from "@/utils/cn";

export default function FraudLibrary() {
  const library = getLibrary();
  const concepts = listConcepts();
  const [query, setQuery] = useState("");
  const [scamType, setScamType] = useState<ScamType | "all">("all");
  const [concept, setConcept] = useState<ConceptId | "all">("all");
  const [showConceptFilters, setShowConceptFilters] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.entries.filter((e) => {
      if (scamType !== "all" && e.scamType !== scamType) return false;
      if (concept !== "all" && e.concept !== concept) return false;
      if (!q) return true;
      return [
        e.title,
        e.location ?? "",
        e.amountLost ?? "",
        e.summary,
        ...e.redFlags,
        ...e.howItWorks,
        ...e.howToStop,
      ].some((t) => t.toLowerCase().includes(q));
    });
  }, [library.entries, query, scamType, concept]);

  const clear = () => {
    setQuery("");
    setScamType("all");
    setConcept("all");
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[820px] flex-col gap-5 pb-6">
      {/* Header Area */}
      <div className="flex min-w-0 flex-col gap-1 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 text-[24px] font-bold leading-tight tracking-tight text-st-primary sm:text-[32px]">
            Verified Scam Library
          </h1>
          <ShieldCheck size={24} strokeWidth={2} className="shrink-0 text-st-secondary sm:h-[26px] sm:w-[26px]" aria-hidden />
        </div>
        <p className="text-[14px] text-st-on-surface-variant sm:text-[15px]">
          Real fraud cases, verified recovery steps &amp; matching interactive drills.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative flex h-12 w-full min-w-0 items-center gap-1.5 rounded-full bg-st-surface-container px-3.5 shadow-sm sm:px-4">
        <Search size={18} strokeWidth={2} className="mr-1 shrink-0 text-st-on-surface-variant" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the fraud library"
          placeholder="Search case studies, keywords..."
          className="min-w-0 flex-1 bg-transparent text-[14px] text-st-on-surface outline-none placeholder:text-st-on-surface-variant/60 sm:text-[15px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-st-surface-highest text-st-on-surface-variant"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowConceptFilters((v) => !v)}
          aria-expanded={showConceptFilters}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
            showConceptFilters || concept !== "all"
              ? "bg-st-primary-container text-st-on-primary"
              : "bg-st-surface-highest text-st-on-surface-variant",
          )}
        >
          Concepts
        </button>
      </div>

      {/* Filter Pills */}
      <div className="w-full min-w-0 space-y-2.5">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by scam type"
        >
          <button
            type="button"
            onClick={() => setScamType("all")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all sm:px-4 sm:py-2 sm:text-[13px]",
              scamType === "all"
                ? "bg-st-primary-container text-st-on-primary shadow-sm"
                : "bg-st-surface-container text-st-on-surface-variant hover:bg-st-surface-high",
            )}
          >
            All Scams
          </button>
          {library.scamTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScamType(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all sm:px-4 sm:py-2 sm:text-[13px]",
                scamType === t.id
                  ? "bg-st-primary-container text-st-on-primary shadow-sm"
                  : "bg-st-surface-container text-st-on-surface-variant hover:bg-st-surface-high",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(showConceptFilters || concept !== "all") && (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by concept"
          >
            <button
              type="button"
              onClick={() => setConcept("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all sm:px-3.5",
                concept === "all"
                  ? "bg-st-secondary text-st-on-secondary"
                  : "bg-st-surface-low text-st-on-surface-variant hover:bg-st-surface-container",
              )}
            >
              All Concepts
            </button>
            {concepts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setConcept(c.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all sm:px-3.5",
                  concept === c.id
                    ? "bg-st-secondary text-st-on-secondary"
                    : "bg-st-surface-low text-st-on-surface-variant hover:bg-st-surface-container",
                )}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Official Data Source Banner */}
      <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-st-surface-low p-4 shadow-sm">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
          <ShieldCheck size={19} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-st-secondary">
              Official Compliance Repository
            </span>
            <span className="inline-flex items-center rounded-full bg-st-secondary-fixed px-2.5 py-0.5 text-[11px] font-semibold text-st-on-secondary-fixed">
              1930 Cybercell
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-st-on-surface-variant">
            Cross-referenced with RBI consumer protection standards, NPCI UPI dispute frameworks, and national
            cybercrime advisories.
          </p>
        </div>
      </div>

      {/* Surge Threat Alert Banner */}
      <div className="min-w-0 overflow-hidden rounded-[24px] bg-st-surface-container p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-st-tertiary-fixed px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-st-on-tertiary-fixed">
            <TrendingUp size={13} strokeWidth={2} className="text-st-tertiary-container" aria-hidden />
            High Scam Surge Alert
          </span>
          <span className="min-w-0 text-[12px] font-medium leading-snug text-st-on-surface-variant">
            {library.updateNote}
          </span>
        </div>
        <LiveAlertsStrip compact />
      </div>

      {/* Section Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[20px] font-bold tracking-tight text-st-primary">Active Case Studies</h2>
          <span className="rounded-full bg-st-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-st-on-surface-variant">
            {results.length} {results.length === 1 ? "Case" : "Cases"}
          </span>
        </div>
        {(query || scamType !== "all" || concept !== "all") && (
          <button
            type="button"
            onClick={clear}
            className="text-[13px] font-semibold text-st-secondary hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Case Studies Grid */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[28px] bg-st-surface-container p-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-st-surface text-st-on-surface-variant shadow-sm">
            <SearchX size={26} strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="text-[18px] font-bold text-st-primary">No matching patterns</h3>
          <p className="max-w-[36ch] text-[14px] text-st-on-surface-variant">
            Try a different keyword or clear your active scam-type and concept filters.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-1 rounded-full bg-st-primary-container px-5 py-2.5 text-[14px] font-semibold text-st-on-primary shadow-sm"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((entry) => (
            <CaseCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* "Did You Know?" Micro-Education Card */}
      <div className="min-w-0 rounded-[28px] bg-st-secondary-container/35 p-5 shadow-sm sm:p-6">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-secondary text-st-on-secondary">
            <Lightbulb size={17} strokeWidth={2} aria-hidden />
          </span>
          <h3 className="text-[19px] font-bold text-st-secondary">Did You Know?</h3>
        </div>
        <p className="mb-4 text-[14.5px] leading-relaxed text-st-on-surface sm:text-[15px]">
          Bank helplines will <strong>never</strong> ask for your UPI PIN, OTP, CVV, or ask you to install remote
          screen-sharing tools.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-st-secondary">
            <ShieldCheck size={15} strokeWidth={2} aria-hidden />
            RBI Consumer Protection Standard
          </span>
          <Link
            to="/drills"
            className="rounded-full bg-st-secondary px-4 py-2 text-[13px] font-semibold text-st-on-secondary shadow-sm transition-transform active:scale-95"
          >
            Test Yourself
          </Link>
        </div>
      </div>

      {/* Emergency Assistance Pill */}
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-st-surface-high p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-st-error-container text-st-error">
            <PhoneCall size={19} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-st-on-surface">Suspect You&apos;re Targeted Right Now?</p>
            <p className="text-[12px] text-st-on-surface-variant">
              Dial 1930 Cyber Fraud Helpline or open SOS Triage immediately
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Link
            to="/sos"
            className="rounded-full bg-st-surface-lowest px-3.5 py-2 text-[13px] font-semibold text-st-primary shadow-sm"
          >
            SOS Guide
          </Link>
          <a
            href="tel:1930"
            className="inline-flex items-center gap-1 rounded-full bg-st-error px-4 py-2 text-[13px] font-semibold text-st-on-error shadow-sm"
          >
            <span>Call 1930</span>
            <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
