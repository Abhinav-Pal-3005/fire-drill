import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  listCustomDrills,
  registerCustomDrill as persistCustomDrill,
  removeCustomDrill as deleteCustomDrill,
} from "@/features/drills/drillLoader";
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
  /** Reactive mirror of custom drills persisted in localStorage (`mfd_custom_drills`). */
  customDrills: Drill[];
  setTimerMode: (mode: TimerMode) => void;
  ensureSeed: (drillId: string, demoAllowed: boolean) => PendingSeed;
  clearPending: (drillId: string) => void;
  addAttempt: (attempt: Attempt) => void;
  attachQuiz: (attemptId: string, quiz: NonNullable<Attempt["quiz"]>) => void;
  registerCustomDrill: (drill: Drill) => Drill;
  removeCustomDrill: (drillId: string) => void;
  syncCustomDrills: () => void;
  resetAll: () => void;
}

const DEMO_DRILL_ID = "collect-request";

export const useDrillStore = create<DrillState>()(
  persist(
    (set, get) => ({
      attempts: [],
      timerMode: "relaxed",
      pending: {},
      customDrills: listCustomDrills(),
      setTimerMode: (timerMode) => set({ timerMode }),
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
      addAttempt: (attempt) => set((s) => ({ attempts: [...s.attempts, attempt] })),
      attachQuiz: (attemptId, quiz) =>
        set((s) => ({ attempts: s.attempts.map((a) => (a.id === attemptId ? { ...a, quiz } : a)) })),
      registerCustomDrill: (drill) => {
        const saved = persistCustomDrill(drill);
        set({ customDrills: listCustomDrills() });
        return saved;
      },
      removeCustomDrill: (drillId) => {
        deleteCustomDrill(drillId);
        set((s) => {
          const restPending = { ...s.pending };
          delete restPending[drillId];
          return { customDrills: listCustomDrills(), pending: restPending };
        });
      },
      syncCustomDrills: () => set({ customDrills: listCustomDrills() }),
      resetAll: () => set({ attempts: [], pending: {}, timerMode: "relaxed" }),
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
