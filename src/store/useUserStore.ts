import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";
import { createLearnerId } from "@/utils/id";

interface UserState {
  /** Anonymous id. No name, email or any personal data is ever stored. */
  learnerId: string;
  /** Optional local display label (never leaves this device). */
  displayName: string;
  /** Local guest session flag (no credentials required). */
  isGuest: boolean;
  /** v2: replace this fake role with real authentication. */
  role: Role;
  demoSeed: boolean;
  checklist: string[];
  bookmarks: string[];
  setGuestMode: (isGuest: boolean) => void;
  setRole: (role: Role) => void;
  setDisplayName: (name: string) => void;
  setDemoSeed: (value: boolean) => void;
  toggleChecklist: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      learnerId: createLearnerId(),
      displayName: "Aarav Ray",
      isGuest: false,
      role: "learner",
      demoSeed: true,
      checklist: [],
      bookmarks: [],
      setGuestMode: (isGuest) => set({ isGuest }),
      setRole: (role) => set({ role }),
      setDisplayName: (displayName) => set({ displayName: displayName.trim() || "Learner" }),
      setDemoSeed: (demoSeed) => set({ demoSeed }),
      toggleChecklist: (id) =>
        set((s) => ({
          checklist: s.checklist.includes(id) ? s.checklist.filter((c) => c !== id) : [...s.checklist, id],
        })),
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [...s.bookmarks, id],
        })),
    }),
    { name: "mfd-user" },
  ),
);
