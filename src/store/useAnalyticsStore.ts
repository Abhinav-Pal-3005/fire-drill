import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistEventToFirestore } from "@/lib/firestoreSync";
import { getActiveUid } from "@/lib/syncBridge";
import type { AnalyticsEvent, LogEventInput } from "@/types";
import { createId } from "@/utils/id";

const MAX_EVENTS = 1500;

interface AnalyticsState {
  events: AnalyticsEvent[];
  add: (input: LogEventInput) => void;
  clear: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      events: [],
      add: (input) => {
        const event: AnalyticsEvent = { ...input, id: createId("ev"), ts: Date.now() };
        set((s) => {
          const next = [...s.events, event];
          return { events: next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next };
        });
        const uid = getActiveUid();
        if (uid) {
          void persistEventToFirestore(uid, event).catch((err) => console.error(err));
        }
      },
      clear: () => set({ events: [] }),
    }),
    { name: "mfd-analytics" },
  ),
);
