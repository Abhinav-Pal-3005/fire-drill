import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Radio, RefreshCw, X } from "lucide-react";
import { toast } from "@/components/glass/GlassToast";
import { useCombinedLibrary } from "@/features/library/useLibrary";
import { scamIcons } from "@/theme/icons";
import { cn } from "@/utils/cn";

let autoCheckedThisSession = false;

/** Snap-scrolling "Live scam alerts" strip. Supports automatic & manual weekly refresh of real-life case studies. */
export function LiveAlertsStrip({ compact = false }: { compact?: boolean }) {
  const {
    entries,
    liveEntries,
    refreshAgeLabel,
    nextRefreshAt,
    refreshing,
    error,
    refreshAlerts,
    clearError,
  } = useCombinedLibrary();

  const autoTriedRef = useRef(false);

  useEffect(() => {
    if (autoCheckedThisSession || autoTriedRef.current) return;
    autoCheckedThisSession = true;
    autoTriedRef.current = true;
    void refreshAlerts(false);
  }, [refreshAlerts]);

  const handleManualRefresh = async () => {
    const res = await refreshAlerts(true);
    if (res.ok) {
      toast(`Loaded ${res.addedCount} live real-life scam case ${res.addedCount === 1 ? "study" : "studies"} into alerts & library.`);
    }
  };

  const nextDateLabel = nextRefreshAt
    ? new Date(nextRefreshAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <section aria-labelledby={compact ? undefined : "alerts-heading"} className="w-full min-w-0 space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="min-w-0 space-y-0.5">
            <h2 id="alerts-heading" className="flex items-center gap-2 text-[19px] font-bold text-st-primary">
              <Radio size={19} strokeWidth={2} className="text-st-secondary" aria-hidden />
              Live scam alerts
              {liveEntries.length > 0 && (
                <span className="rounded-full bg-st-secondary-fixed px-2.5 py-0.5 text-[11px] font-semibold text-st-on-secondary-fixed">
                  {liveEntries.length} Weekly Live
                </span>
              )}
            </h2>
            <p className="text-[12px] text-st-on-surface-variant">
              {refreshAgeLabel}
              {nextDateLabel ? ` · Next weekly refresh ${nextDateLabel}` : " · Auto-refreshes every 7 days"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={refreshing}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-st-surface-container px-3.5 py-1.5 text-[12px] font-semibold text-st-primary shadow-sm transition-colors hover:bg-st-surface-high disabled:opacity-60"
          >
            <RefreshCw size={13} strokeWidth={2.2} className={cn(refreshing && "animate-spin")} aria-hidden />
            <span>{refreshing ? "Refreshing..." : "Refresh alerts"}</span>
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-2xl bg-st-error-container/70 px-3.5 py-2.5 text-[12.5px] text-st-on-error-container"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss alert refresh error"
            className="shrink-0 rounded-full p-1 hover:bg-black/5"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      )}

      <ul className="no-scrollbar flex w-full max-w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {entries.map((entry) => {
          const Icon = scamIcons[entry.scamType];
          const isLive = Boolean(entry.isLiveAlert);
          return (
            <li key={entry.id} className="w-[min(256px,74vw)] shrink-0 snap-start sm:w-[290px]">
              <Link
                to={`/library/${entry.id}`}
                className="flex h-full min-h-[132px] flex-col justify-between gap-2 rounded-2xl bg-st-surface-lowest p-4 shadow-sm transition-transform hover:-translate-y-px active:scale-[0.99]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex items-center gap-1.5",
                        isLive ? "text-st-secondary" : "text-st-tertiary-container",
                      )}
                    >
                      <Icon size={16} strokeWidth={2} aria-hidden />
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {isLive ? "Weekly Live Case" : "Active Pattern"}
                      </span>
                    </span>
                    {entry.amountLost && (
                      <span className="truncate text-[11px] font-bold text-st-error">{entry.amountLost}</span>
                    )}
                  </div>
                  <span className="line-clamp-1 block text-[15px] font-bold text-st-primary">{entry.title}</span>
                  <span className="line-clamp-2 block text-[12px] leading-snug text-st-on-surface-variant">
                    {entry.summary}
                  </span>
                </div>
                {(entry.location || entry.source.date) && (
                  <span className="truncate text-[11px] font-medium text-st-on-surface-variant/85">
                    {entry.location}
                    {entry.location && entry.source.date ? " · " : ""}
                    {entry.source.date}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
