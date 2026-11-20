import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  listCustomDrills,
  registerCustomDrill,
  removeCustomDrill,
} from "@/features/drills/drillLoader";
import {
  clearUserFirestoreData,
  persistAttemptToFirestore,
  persistQuizToFirestore,
  syncUserProfileFields,
} from "@/lib/firestoreSync";
import { getActiveUid } from "@/lib/syncBridge";
import type { Attempt, Drill, TimerMode } from "@/types";
import { DEMO_SEED, newSeed } from "@/utils/seedRandom";

export interface PendingSeed {
  seed: number;
  demo: boolean;
}

interface DrillState {
  attempts: Attempt[];
  /** Selected drill timer mode: relaxed, panicked, or none (no timer). */
  timerMode: TimerMode;
  /** Seed assigned at the briefing so the briefing and the sandbox show the same scenario. */
  pending: Record<string, PendingSeed>;
  /** Custom scenarios persisted via localStorage key `mfd_custom_drills`. */
  customDrills: Drill[];
  refreshCustomDrills: () => void;
  addCustomDrill: (drill: Drill) => void;
  deleteCustomDrill: (id: string) => void;
  setTimerMode: (mode: TimerMode) => void;
  ensureSeed: (drillId: string, demoAllowed: boolean) => PendingSeed;
  clearPending: (drillId: string) => void;
  addAttempt: (attempt: Attempt) => void;
  attachQuiz: (attemptId: string, quiz: NonNullable<Attempt["quiz"]>) => void;
  resetAll: () => void;
}

const DEMO_DRILL_ID = "collect-request";

export const useDrillStore = create<DrillState>()(
  persist(
    (set, get) => ({
      attempts: [],
      timerMode: "relaxed",
      pending: {},
      customDrills: [],
      refreshCustomDrills: () => {
        set({ customDrills: listCustomDrills() });
      },
      addCustomDrill: (drill) => {
        const next = registerCustomDrill(drill);
        set({ customDrills: next });
      },
      deleteCustomDrill: (id) => {
        const next = removeCustomDrill(id);
        set((s) => {
          const restPending = { ...s.pending };
          delete restPending[id];
          return { customDrills: next, pending: restPending };
        });
      },
      setTimerMode: (timerMode) => {
        set({ timerMode });
        const uid = getActiveUid();
        if (uid) {
          void syncUserProfileFields(uid, { timerMode }).catch((err) => console.error(err));
        }
      },
      ensureSeed: (drillId, demoAllowed) => {
        const existing = get().pending[drillId];
        if (existing) return existing;
        const firstEver = drillId === DEMO_DRILL_ID && get().attempts.every((a) => a.drillId !== DEMO_DRILL_ID);
        const demo = demoAllowed && firstEver;
        const next: PendingSeed = { seed: demo ? DEMO_SEED : newSeed(), demo };
        set((s) => ({ pending: { ...s.pending, [drillId]: next } }));
        return next;
      },
      clearPending: (drillId) =>
        set((s) => {
          const rest = { ...s.pending };
          delete rest[drillId];
          return { pending: rest };
        }),
      addAttempt: (attempt) => {
        set((s) => ({ attempts: [...s.attempts, attempt] }));
        const uid = getActiveUid();
        if (uid) {
          void persistAttemptToFirestore(uid, attempt).catch((err) => console.error(err));
        }
      },
      attachQuiz: (attemptId, quiz) => {
        set((s) => ({ attempts: s.attempts.map((a) => (a.id === attemptId ? { ...a, quiz } : a)) }));
        const uid = getActiveUid();
        if (uid) {
          void persistQuizToFirestore(uid, attemptId, quiz).catch((err) => console.error(err));
        }
      },
      resetAll: () => {
        set({ attempts: [], pending: {}, timerMode: "relaxed" });
        const uid = getActiveUid();
        if (uid) {
          void clearUserFirestoreData(uid).catch((err) => console.error(err));
        }
      },
    }),
    {
      name: "mfd-drills",
      partialize: (state) => ({
        attempts: state.attempts,
        timerMode: state.timerMode,
        pending: state.pending,
      }),
    },
  ),
);
