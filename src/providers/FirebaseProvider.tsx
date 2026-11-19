"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { toast } from "@/components/glass/GlassToast";
import { auth, googleProvider, testConnection } from "@/lib/firebase";
import { getQuotaUpgradeUrl, isQuotaExceededError } from "@/lib/firestoreError";
import {
  ensureUserProfile,
  resetSyncCaches,
  subscribeUserData,
} from "@/lib/firestoreSync";
import { setActiveUid } from "@/lib/syncBridge";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  syncing: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void testConnection();
  }, []);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!nextUser) {
        setActiveUid(null);
        resetSyncCaches();
        setUser(null);
        setSyncing(false);
        setAuthReady(true);
        return;
      }

      setUser(nextUser);
      setSyncing(true);

      try {
        const userState = useUserStore.getState();
        const drillState = useDrillStore.getState();
        const analyticsState = useAnalyticsStore.getState();

        const profile = await ensureUserProfile(nextUser, {
          displayName: userState.displayName,
          demoSeed: userState.demoSeed,
          timerMode: drillState.timerMode,
          checklist: userState.checklist,
          bookmarks: userState.bookmarks,
          attempts: drillState.attempts,
          events: analyticsState.events,
        });

        if (cancelled) return;

        // Mark active UID after ensuring parent /users/{uid} exists
        setActiveUid(nextUser.uid);

        useUserStore.setState({
          learnerId: nextUser.uid,
          displayName: profile.displayName,
          photoUrl: profile.photoUrl,
          isGuest: false,
          demoSeed: profile.demoSeed,
          checklist: profile.checklist,
          bookmarks: profile.bookmarks,
        });
        useDrillStore.setState({ timerMode: profile.timerMode });

        unsubFirestore = subscribeUserData(nextUser.uid, {
          onProfile: (p) => {
            useUserStore.setState({
              learnerId: p.uid,
              displayName: p.displayName,
              photoUrl: p.photoUrl,
              isGuest: false,
              demoSeed: p.demoSeed,
              checklist: p.checklist,
              bookmarks: p.bookmarks,
            });
            useDrillStore.setState({ timerMode: p.timerMode });
          },
          onAttempts: (attempts) => {
            useDrillStore.setState({ attempts });
          },
          onEvents: (events) => {
            useAnalyticsStore.setState({ events });
          },
          onQuotaError: () => {
            toast(`Daily Firestore free-tier quota exceeded. Upgrade or retry tomorrow: ${getQuotaUpgradeUrl()}`);
          },
        });
      } catch (err) {
        console.error("Failed to sync Firestore user profile:", err);
        if (isQuotaExceededError(err)) {
          setAuthError("Daily Firestore quota exceeded. Quota resets tomorrow.");
        } else {
          setAuthError("Could not sync cloud data. Please check your connection and try again.");
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
          setAuthReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setAuthError(null);
      } else if (code === "auth/popup-blocked") {
        setAuthError("Sign-in popup was blocked by your browser. Please allow popups and try again.");
      } else {
        setAuthError(err instanceof Error ? err.message : "Google Sign-In failed. Please try again.");
      }
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async (): Promise<void> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      setActiveUid(null);
      resetSyncCaches();
      await signOut(auth);
      useDrillStore.setState({ attempts: [], pending: {}, timerMode: "relaxed" });
      useAnalyticsStore.setState({ events: [] });
      useUserStore.setState({
        displayName: "Learner",
        photoUrl: undefined,
        isGuest: true,
        demoSeed: true,
        checklist: [],
        bookmarks: [],
      });
      toast("Signed out cleanly");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-out failed.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<FirebaseContextValue>(
    () => ({
      user,
      authReady,
      syncing,
      authLoading,
      authError,
      signInWithGoogle,
      signOutUser,
      clearAuthError,
    }),
    [user, authReady, syncing, authLoading, authError, signInWithGoogle, signOutUser, clearAuthError],
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebaseAuth(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error("useFirebaseAuth must be used inside <FirebaseProvider>");
  }
  return ctx;
}
