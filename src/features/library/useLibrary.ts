import { useMemo } from "react";
import { getLibrary, getLibraryEntry } from "@/features/drills/drillLoader";
import { WEEKLY_REFRESH_MS, useAlertsStore } from "@/store/useAlertsStore";
import type { LibraryEntry } from "@/types";

export function formatAlertRefreshDate(ts: number | null): string {
  if (!ts) return "Not yet refreshed this week";
  const formatted = new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Updated ${formatted}`;
}

export function useCombinedLibrary() {
  const staticLib = useMemo(() => getLibrary(), []);
  const liveEntries = useAlertsStore((s) => s.entries);
  const lastRefreshedAt = useAlertsStore((s) => s.lastRefreshedAt);
  const weekKey = useAlertsStore((s) => s.weekKey);
  const refreshing = useAlertsStore((s) => s.refreshing);
  const error = useAlertsStore((s) => s.error);
  const refreshAlerts = useAlertsStore((s) => s.refreshAlerts);
  const clearError = useAlertsStore((s) => s.clearError);

  const entries = useMemo(() => {
    const seen = new Set<string>();
    const combined: LibraryEntry[] = [];
    for (const item of [...liveEntries, ...staticLib.entries]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push(item);
    }
    return combined;
  }, [liveEntries, staticLib.entries]);

  const nextRefreshAt = lastRefreshedAt ? lastRefreshedAt + WEEKLY_REFRESH_MS : null;
  const refreshAgeLabel = useMemo(() => formatAlertRefreshDate(lastRefreshedAt), [lastRefreshedAt]);

  return {
    entries,
    liveEntries,
    staticEntries: staticLib.entries,
    scamTypes: staticLib.scamTypes,
    updateNote:
      liveEntries.length > 0
        ? `${liveEntries.length} live weekly case ${liveEntries.length === 1 ? "study" : "studies"} + ${staticLib.entries.length} reported archive cases`
        : staticLib.updateNote,
    lastRefreshedAt,
    refreshAgeLabel,
    weekKey,
    nextRefreshAt,
    refreshing,
    error,
    refreshAlerts,
    clearError,
  };
}

export function useLibraryEntry(id: string | undefined): LibraryEntry | undefined {
  const liveEntries = useAlertsStore((s) => s.entries);
  return useMemo(() => {
    if (!id) return undefined;
    return liveEntries.find((e) => e.id === id) ?? getLibraryEntry(id);
  }, [id, liveEntries]);
}
