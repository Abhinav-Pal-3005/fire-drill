import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Attempt } from "@/types";
import { DEMO_SEED, newSeed } from "@/utils/seedRandom";

export interface PendingSeed {
  seed: number;
  demo: boolean;
}

interface DrillState {
  attempts: Attempt[];
  /** Seed assigned at the briefing so the briefing and the sandbox show the same scenario. */
  pending: Record<string, PendingSeed>;
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
      pending: {},
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
      resetAll: () => set({ attempts: [], pending: {} }),
    }),
    { name: "mfd-drills" },
  ),
);
