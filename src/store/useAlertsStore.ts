import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistLiveAlertsToFirestore } from "@/lib/firestoreSync";
import { getActiveUid } from "@/lib/syncBridge";
import type { LibraryEntry } from "@/types";

export const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORED_LIVE_CASES = 18;

interface RefreshResult {
  ok: boolean;
  addedCount: number;
  error?: string;
}

interface AlertsState {
  entries: LibraryEntry[];
  lastRefreshedAt: number | null;
  weekKey: string | null;
  refreshing: boolean;
  error: string | null;
  refreshAlerts: (force?: boolean) => Promise<RefreshResult>;
  mergeSyncedAlerts: (cloudAlerts: LibraryEntry[]) => void;
  clearError: () => void;
}

function mergeCaseLists(incoming: LibraryEntry[], existing: LibraryEntry[]): LibraryEntry[] {
  const byId = new Map<string, LibraryEntry>();
  const seenTitles = new Set<string>();

  for (const item of [...incoming, ...existing]) {
    const normalizedTitle = item.title.trim().toLowerCase();
    if (byId.has(item.id) || (normalizedTitle && seenTitles.has(normalizedTitle))) continue;
    byId.set(item.id, { ...item, isLiveAlert: true });
    if (normalizedTitle) seenTitles.add(normalizedTitle);
  }

  return Array.from(byId.values())
    .sort((a, b) => (b.refreshedAt ?? 0) - (a.refreshedAt ?? 0))
    .slice(0, MAX_STORED_LIVE_CASES);
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      entries: [],
      lastRefreshedAt: null,
      weekKey: null,
      refreshing: false,
      error: null,

      clearError: () => set({ error: null }),

      mergeSyncedAlerts: (cloudAlerts) => {
        if (cloudAlerts.length === 0) return;
        const merged = mergeCaseLists(cloudAlerts, get().entries);
        const newest = merged[0];
        const latestTs = Math.max(get().lastRefreshedAt ?? 0, newest?.refreshedAt ?? 0) || null;
        const weekKey = newest?.weekKey ?? get().weekKey;
        set({
          entries: merged,
          lastRefreshedAt: latestTs,
          weekKey,
        });
      },

      refreshAlerts: async (force = false): Promise<RefreshResult> => {
        const state = get();
        if (state.refreshing) {
          return { ok: false, addedCount: 0, error: "Refresh already in progress." };
        }

        const isDue =
          force ||
          state.lastRefreshedAt === null ||
          state.entries.length === 0 ||
          Date.now() - state.lastRefreshedAt >= WEEKLY_REFRESH_MS;

        if (!isDue) {
          return { ok: true, addedCount: 0 };
        }

        set({ refreshing: true, error: null });

        try {
          const response = await fetch("/api/alerts/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          const rawText = await response.text();
          let data: { weekKey?: string; refreshedAt?: number; entries?: LibraryEntry[]; error?: string } = {};
          try {
            data = JSON.parse(rawText) as typeof data;
          } catch {
            data = {};
          }

          if (!response.ok || !Array.isArray(data.entries)) {
            const msg =
              data.error ||
              (response.status === 404
                ? "Live alert refresh service is unavailable in offline build mode."
                : `Could not refresh live scam alerts (${response.status}).`);
            set({ refreshing: false, error: msg });
            return { ok: false, addedCount: 0, error: msg };
          }

          const refreshedAt = typeof data.refreshedAt === "number" ? data.refreshedAt : Date.now();
          const weekKey = data.weekKey ?? null;
          const incoming = data.entries.map((entry) => ({
            ...entry,
            isLiveAlert: true,
            weekKey: entry.weekKey ?? weekKey ?? undefined,
            refreshedAt: entry.refreshedAt ?? refreshedAt,
          }));

          const prevCount = get().entries.length;
          const merged = mergeCaseLists(incoming, get().entries);
          const addedCount = Math.max(incoming.length, merged.length - prevCount);

          set({
            entries: merged,
            lastRefreshedAt: refreshedAt,
            weekKey,
            refreshing: false,
            error: null,
          });

          const uid = getActiveUid();
          if (uid) {
            void persistLiveAlertsToFirestore(uid, merged).catch((err) => console.error(err));
          }

          return { ok: true, addedCount };
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Network error while refreshing weekly live scam alerts.";
          set({ refreshing: false, error: msg });
          return { ok: false, addedCount: 0, error: msg };
        }
      },
    }),
    {
      name: "mfd-live-alerts",
      partialize: (state) => ({
        entries: state.entries,
        lastRefreshedAt: state.lastRefreshedAt,
        weekKey: state.weekKey,
      }),
    },
  ),
);
