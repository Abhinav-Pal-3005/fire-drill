import { create } from "zustand";
import { persist } from "zustand/middleware";
import { syncUserProfileFields } from "@/lib/firestoreSync";
import { getActiveUid } from "@/lib/syncBridge";
import { createLearnerId } from "@/utils/id";

interface UserState {
  /** Anonymous id when signed out, or Firebase Auth uid when signed in. */
  learnerId: string;
  /** Display label (synced with Firestore when signed in). */
  displayName: string;
  /** Optional Google account avatar URL. */
  photoUrl?: string;
  /** Local guest session flag (no credentials required). */
  isGuest: boolean;
  demoSeed: boolean;
  checklist: string[];
  bookmarks: string[];
  setGuestMode: (isGuest: boolean) => void;
  setDisplayName: (name: string) => void;
  setDemoSeed: (value: boolean) => void;
  toggleChecklist: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      learnerId: createLearnerId(),
      displayName: "Learner",
      photoUrl: undefined,
      isGuest: false,
      demoSeed: true,
      checklist: [],
      bookmarks: [],
      setGuestMode: (isGuest) => set({ isGuest }),
      setDisplayName: (rawName) => {
        const displayName = rawName.trim().slice(0, 80) || "Learner";
        set({ displayName });
        const uid = getActiveUid();
        if (uid) {
          void syncUserProfileFields(uid, { displayName }).catch((err) => console.error(err));
        }
      },
      setDemoSeed: (demoSeed) => {
        set({ demoSeed });
        const uid = getActiveUid();
        if (uid) {
          void syncUserProfileFields(uid, { demoSeed }).catch((err) => console.error(err));
        }
      },
      toggleChecklist: (id) => {
        const cur = get().checklist;
        const checklist = cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id];
        set({ checklist });
        const uid = getActiveUid();
        if (uid) {
          void syncUserProfileFields(uid, { checklist }).catch((err) => console.error(err));
        }
      },
      toggleBookmark: (id) => {
        const cur = get().bookmarks;
        const bookmarks = cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id];
        set({ bookmarks });
        const uid = getActiveUid();
        if (uid) {
          void syncUserProfileFields(uid, { bookmarks }).catch((err) => console.error(err));
        }
      },
    }),
    { name: "mfd-user" },
  ),
);
