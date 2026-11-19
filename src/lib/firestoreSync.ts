import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { AnalyticsEvent, Attempt, LibraryEntry, TimerMode } from "@/types";
import { db } from "./firebase";
import { OperationType, handleFirestoreError } from "./firestoreError";
import {
  SCHEMA_LIMITS,
  sanitizeAnalyticsEventPayload,
  sanitizeAttemptPayload,
  sanitizeDisplayName,
  sanitizeId,
  sanitizeLiveAlertPayload,
  sanitizeQuizRecord,
  sanitizeStringArray,
  sanitizeTimerMode,
} from "./firebaseValidation";

export interface SyncedUserProfile {
  uid: string;
  displayName: string;
  photoUrl?: string;
  demoSeed: boolean;
  timerMode: TimerMode;
  checklist: string[];
  bookmarks: string[];
}

export interface LocalSeedSnapshot {
  displayName: string;
  demoSeed: boolean;
  timerMode: TimerMode;
  checklist: string[];
  bookmarks: string[];
  attempts: Attempt[];
  events: AnalyticsEvent[];
  liveAlerts?: LibraryEntry[];
}

const ensuredUsers = new Set<string>();
const pendingAttemptWrites = new Map<string, Promise<void>>();

export function resetSyncCaches(): void {
  ensuredUsers.clear();
  pendingAttemptWrites.clear();
}

export async function ensureUserProfile(user: User, local: LocalSeedSnapshot): Promise<SyncedUserProfile> {
  const uid = sanitizeId(user.uid, SCHEMA_LIMITS.idMax);
  const path = `users/${uid}`;
  const userRef = doc(db, "users", uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const googleName = sanitizeDisplayName(user.displayName || local.displayName);
  const photoUrl =
    typeof user.photoURL === "string" && user.photoURL.length > 0
      ? user.photoURL.slice(0, SCHEMA_LIMITS.photoUrlMax)
      : undefined;

  if (!snap.exists()) {
    const initialChecklist = sanitizeStringArray(
      local.checklist,
      SCHEMA_LIMITS.checklistMaxItems,
      SCHEMA_LIMITS.checklistItemMaxLen,
    );
    const initialBookmarks = sanitizeStringArray(
      local.bookmarks,
      SCHEMA_LIMITS.bookmarksMaxItems,
      SCHEMA_LIMITS.bookmarksItemMaxLen,
    );
    const timerMode = sanitizeTimerMode(local.timerMode);

    const payload: Record<string, unknown> = {
      uid,
      displayName: googleName,
      demoSeed: Boolean(local.demoSeed),
      timerMode,
      checklist: initialChecklist,
      bookmarks: initialBookmarks,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (photoUrl) {
      payload.photoUrl = photoUrl;
    }

    try {
      await setDoc(userRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    ensuredUsers.add(uid);

    // Migrate any pre-sign-in local attempts, events & live alerts from this device into Firestore
    await migrateLocalHistory(uid, local.attempts, local.events);
    if (local.liveAlerts && local.liveAlerts.length > 0) {
      await persistLiveAlertsToFirestore(uid, local.liveAlerts);
    }

    return {
      uid,
      displayName: googleName,
      photoUrl,
      demoSeed: Boolean(local.demoSeed),
      timerMode,
      checklist: initialChecklist,
      bookmarks: initialBookmarks,
    };
  }

  ensuredUsers.add(uid);
  const data = snap.data() as Record<string, unknown>;
  const serverChecklist = Array.isArray(data.checklist) ? (data.checklist as string[]) : [];
  const serverBookmarks = Array.isArray(data.bookmarks) ? (data.bookmarks as string[]) : [];

  // Merge guest-session checklist/bookmarks/attempts if any exist before signing in
  const mergedChecklist = sanitizeStringArray(
    [...serverChecklist, ...local.checklist],
    SCHEMA_LIMITS.checklistMaxItems,
    SCHEMA_LIMITS.checklistItemMaxLen,
  );
  const mergedBookmarks = sanitizeStringArray(
    [...serverBookmarks, ...local.bookmarks],
    SCHEMA_LIMITS.bookmarksMaxItems,
    SCHEMA_LIMITS.bookmarksItemMaxLen,
  );

  const needsChecklistUpdate = mergedChecklist.length !== serverChecklist.length;
  const needsBookmarksUpdate = mergedBookmarks.length !== serverBookmarks.length;
  const needsPhotoUpdate = Boolean(photoUrl && data.photoUrl !== photoUrl);

  if (needsChecklistUpdate || needsBookmarksUpdate) {
    try {
      await updateDoc(userRef, {
        checklist: mergedChecklist,
        bookmarks: mergedBookmarks,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  if (needsPhotoUpdate && photoUrl) {
    try {
      await updateDoc(userRef, {
        photoUrl,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  if (local.attempts.length > 0 || local.events.length > 0) {
    await migrateLocalHistory(uid, local.attempts, local.events);
  }
  if (local.liveAlerts && local.liveAlerts.length > 0) {
    await persistLiveAlertsToFirestore(uid, local.liveAlerts);
  }

  return {
    uid,
    displayName: sanitizeDisplayName((data.displayName as string | undefined) || googleName),
    photoUrl: (data.photoUrl as string | undefined) ?? photoUrl,
    demoSeed: typeof data.demoSeed === "boolean" ? data.demoSeed : true,
    timerMode: sanitizeTimerMode(data.timerMode as TimerMode | undefined),
    checklist: mergedChecklist,
    bookmarks: mergedBookmarks,
  };
}

async function migrateLocalHistory(uid: string, attempts: Attempt[], events: AnalyticsEvent[]): Promise<void> {
  if (attempts.length === 0 && events.length === 0) return;

  const attemptsPath = `users/${uid}/attempts`;
  const existingAttemptIds = new Set<string>();
  try {
    const snap = await getDocs(query(collection(db, "users", uid, "attempts"), where("userId", "==", uid)));
    for (const d of snap.docs) existingAttemptIds.add(d.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, attemptsPath);
  }

  const newAttempts = attempts.filter((a) => !existingAttemptIds.has(sanitizeId(a.id, SCHEMA_LIMITS.idMax)));
  for (let i = 0; i < newAttempts.length; i += 400) {
    const batch = writeBatch(db);
    const slice = newAttempts.slice(i, i + 400);
    for (const a of slice) {
      const id = sanitizeId(a.id, SCHEMA_LIMITS.idMax);
      batch.set(doc(db, "users", uid, "attempts", id), {
        ...sanitizeAttemptPayload(a, uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, attemptsPath);
    }
  }

  const eventsPath = `users/${uid}/events`;
  const existingEventIds = new Set<string>();
  try {
    const snap = await getDocs(query(collection(db, "users", uid, "events"), where("userId", "==", uid)));
    for (const d of snap.docs) existingEventIds.add(d.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, eventsPath);
  }

  const recentEvents = events.slice(-200).filter((e) => !existingEventIds.has(sanitizeId(e.id, SCHEMA_LIMITS.idMax)));
  for (let i = 0; i < recentEvents.length; i += 400) {
    const batch = writeBatch(db);
    const slice = recentEvents.slice(i, i + 400);
    for (const ev of slice) {
      const id = sanitizeId(ev.id, SCHEMA_LIMITS.idMax);
      batch.set(doc(db, "users", uid, "events", id), {
        ...sanitizeAnalyticsEventPayload(ev, uid),
        createdAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, eventsPath);
    }
  }
}

export async function syncUserProfileFields(
  uid: string,
  patch: Partial<Pick<SyncedUserProfile, "displayName" | "demoSeed" | "timerMode" | "checklist" | "bookmarks">>,
): Promise<void> {
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const path = `users/${safeUid}`;
  const cleanPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (patch.displayName !== undefined) {
    cleanPatch.displayName = sanitizeDisplayName(patch.displayName);
  }
  if (patch.demoSeed !== undefined) {
    cleanPatch.demoSeed = Boolean(patch.demoSeed);
  }
  if (patch.timerMode !== undefined) {
    cleanPatch.timerMode = sanitizeTimerMode(patch.timerMode);
  }
  if (patch.checklist !== undefined) {
    cleanPatch.checklist = sanitizeStringArray(
      patch.checklist,
      SCHEMA_LIMITS.checklistMaxItems,
      SCHEMA_LIMITS.checklistItemMaxLen,
    );
  }
  if (patch.bookmarks !== undefined) {
    cleanPatch.bookmarks = sanitizeStringArray(
      patch.bookmarks,
      SCHEMA_LIMITS.bookmarksMaxItems,
      SCHEMA_LIMITS.bookmarksItemMaxLen,
    );
  }

  try {
    await updateDoc(doc(db, "users", safeUid), cleanPatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function persistAttemptToFirestore(uid: string, attempt: Attempt): Promise<void> {
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const attemptId = sanitizeId(attempt.id, SCHEMA_LIMITS.idMax);
  const path = `users/${safeUid}/attempts/${attemptId}`;

  const writePromise = (async () => {
    try {
      await setDoc(doc(db, "users", safeUid, "attempts", attemptId), {
        ...sanitizeAttemptPayload(attempt, safeUid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  })();

  pendingAttemptWrites.set(attemptId, writePromise);
  try {
    await writePromise;
  } finally {
    pendingAttemptWrites.delete(attemptId);
  }
}

export async function persistQuizToFirestore(
  uid: string,
  attemptIdRaw: string,
  quiz: NonNullable<Attempt["quiz"]>,
): Promise<void> {
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const attemptId = sanitizeId(attemptIdRaw, SCHEMA_LIMITS.idMax);
  const path = `users/${safeUid}/attempts/${attemptId}`;

  const pending = pendingAttemptWrites.get(attemptId);
  if (pending) {
    await pending.catch(() => {});
  }

  try {
    await updateDoc(doc(db, "users", safeUid, "attempts", attemptId), {
      quiz: sanitizeQuizRecord(quiz),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function persistEventToFirestore(uid: string, event: AnalyticsEvent): Promise<void> {
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const eventId = sanitizeId(event.id, SCHEMA_LIMITS.idMax);
  const path = `users/${safeUid}/events/${eventId}`;

  try {
    await setDoc(doc(db, "users", safeUid, "events", eventId), {
      ...sanitizeAnalyticsEventPayload(event, safeUid),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function persistLiveAlertsToFirestore(uid: string, alerts: LibraryEntry[]): Promise<void> {
  if (alerts.length === 0) return;
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const alertsPath = `users/${safeUid}/alerts`;

  const existingIds = new Set<string>();
  try {
    const snap = await getDocs(query(collection(db, "users", safeUid, "alerts"), where("userId", "==", safeUid)));
    for (const d of snap.docs) existingIds.add(d.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, alertsPath);
  }

  const trimmedAlerts = alerts.slice(0, 18);
  const newAlerts = trimmedAlerts.filter((a) => !existingIds.has(sanitizeId(a.id, SCHEMA_LIMITS.shortIdMax)));
  if (newAlerts.length === 0) return;

  for (let i = 0; i < newAlerts.length; i += 400) {
    const batch = writeBatch(db);
    for (const alert of newAlerts.slice(i, i + 400)) {
      const alertId = sanitizeId(alert.id, SCHEMA_LIMITS.shortIdMax);
      batch.set(doc(db, "users", safeUid, "alerts", alertId), {
        ...sanitizeLiveAlertPayload(alert, safeUid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, alertsPath);
    }
  }
}

export async function clearUserFirestoreData(uid: string): Promise<void> {
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const userPath = `users/${safeUid}`;
  const attemptsPath = `users/${safeUid}/attempts`;
  const eventsPath = `users/${safeUid}/events`;

  try {
    await updateDoc(doc(db, "users", safeUid), {
      demoSeed: true,
      timerMode: "relaxed",
      checklist: [],
      bookmarks: [],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  let attemptDocs;
  try {
    attemptDocs = await getDocs(query(collection(db, "users", safeUid, "attempts"), where("userId", "==", safeUid)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, attemptsPath);
  }

  for (let i = 0; i < attemptDocs.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of attemptDocs.docs.slice(i, i + 400)) {
      batch.delete(d.ref);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, attemptsPath);
    }
  }

  let eventDocs;
  try {
    eventDocs = await getDocs(query(collection(db, "users", safeUid, "events"), where("userId", "==", safeUid)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, eventsPath);
  }

  for (let i = 0; i < eventDocs.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of eventDocs.docs.slice(i, i + 400)) {
      batch.delete(d.ref);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, eventsPath);
    }
  }
}

export function subscribeUserData(
  uid: string,
  callbacks: {
    onProfile: (profile: SyncedUserProfile) => void;
    onAttempts: (attempts: Attempt[]) => void;
    onEvents: (events: AnalyticsEvent[]) => void;
    onLiveAlerts?: (alerts: LibraryEntry[]) => void;
    onQuotaError?: () => void;
  },
): Unsubscribe {
  const safeUid = sanitizeId(uid, SCHEMA_LIMITS.idMax);
  const userPath = `users/${safeUid}`;
  const attemptsPath = `users/${safeUid}/attempts`;
  const eventsPath = `users/${safeUid}/events`;
  const alertsPath = `users/${safeUid}/alerts`;

  const unsubProfile = onSnapshot(
    doc(db, "users", safeUid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      callbacks.onProfile({
        uid: safeUid,
        displayName: sanitizeDisplayName(data.displayName as string | undefined),
        photoUrl: data.photoUrl as string | undefined,
        demoSeed: typeof data.demoSeed === "boolean" ? data.demoSeed : true,
        timerMode: sanitizeTimerMode(data.timerMode as TimerMode | undefined),
        checklist: Array.isArray(data.checklist) ? (data.checklist as string[]) : [],
        bookmarks: Array.isArray(data.bookmarks) ? (data.bookmarks as string[]) : [],
      });
    },
    (error) => {
      if (error.message.includes("Quota exceeded")) callbacks.onQuotaError?.();
      handleFirestoreError(error, OperationType.GET, userPath);
    },
  );

  const unsubAttempts = onSnapshot(
    query(collection(db, "users", safeUid, "attempts"), where("userId", "==", safeUid)),
    (snap) => {
      const list: Attempt[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: String(data.id ?? d.id),
            drillId: String(data.drillId),
            concept: data.concept as Attempt["concept"],
            seed: Number(data.seed ?? 0),
            demoSeed: Boolean(data.demoSeed),
            timerMode: sanitizeTimerMode(data.timerMode as TimerMode | undefined),
            startedAt: Number(data.startedAt ?? 0),
            finishedAt: Number(data.finishedAt ?? 0),
            grade: data.grade as Attempt["grade"],
            ...(data.quiz ? { quiz: data.quiz as Attempt["quiz"] } : {}),
          };
        })
        .sort((a, b) => a.finishedAt - b.finishedAt);
      callbacks.onAttempts(list);
    },
    (error) => {
      if (error.message.includes("Quota exceeded")) callbacks.onQuotaError?.();
      handleFirestoreError(error, OperationType.LIST, attemptsPath);
    },
  );

  const unsubEvents = onSnapshot(
    query(collection(db, "users", safeUid, "events"), where("userId", "==", safeUid)),
    (snap) => {
      const list: AnalyticsEvent[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: String(data.id ?? d.id),
            ts: Number(data.ts ?? 0),
            type: data.type as AnalyticsEvent["type"],
            drillId: String(data.drillId),
            concept: data.concept as AnalyticsEvent["concept"],
            ...(typeof data.stepId === "string" ? { stepId: data.stepId } : {}),
            ...(typeof data.correct === "boolean" ? { correct: data.correct } : {}),
            timeMs: Number(data.timeMs ?? 0),
            seed: Number(data.seed ?? 0),
          };
        })
        .sort((a, b) => a.ts - b.ts);
      callbacks.onEvents(list);
    },
    (error) => {
      if (error.message.includes("Quota exceeded")) callbacks.onQuotaError?.();
      handleFirestoreError(error, OperationType.LIST, eventsPath);
    },
  );

  const unsubAlerts = callbacks.onLiveAlerts
    ? onSnapshot(
        query(collection(db, "users", safeUid, "alerts"), where("userId", "==", safeUid)),
        (snap) => {
          const list: LibraryEntry[] = snap.docs
            .map((d) => {
              const data = d.data() as Record<string, unknown>;
              const src = (data.source ?? {}) as Record<string, unknown>;
              return {
                id: String(data.id ?? d.id),
                title: String(data.title ?? ""),
                scamType: data.scamType as LibraryEntry["scamType"],
                concept: data.concept as LibraryEntry["concept"],
                ...(typeof data.location === "string" ? { location: data.location } : {}),
                ...(typeof data.amountLost === "string" ? { amountLost: data.amountLost } : {}),
                summary: String(data.summary ?? ""),
                howItWorks: Array.isArray(data.howItWorks) ? (data.howItWorks as string[]) : [],
                redFlags: Array.isArray(data.redFlags) ? (data.redFlags as string[]) : [],
                howToStop: Array.isArray(data.howToStop) ? (data.howToStop as string[]) : [],
                source: {
                  name: String(src.name ?? ""),
                  publisher: String(src.publisher ?? ""),
                  url: String(src.url ?? ""),
                  date: String(src.date ?? ""),
                },
                linkedDrillId: String(data.linkedDrillId ?? "collect-request"),
                verified: Boolean(data.verified),
                lastVerifiedOn: String(data.lastVerifiedOn ?? ""),
                isLiveAlert: true,
                weekKey: typeof data.weekKey === "string" ? data.weekKey : undefined,
                refreshedAt: typeof data.refreshedAt === "number" ? data.refreshedAt : undefined,
              };
            })
            .sort((a, b) => (b.refreshedAt ?? 0) - (a.refreshedAt ?? 0));
          callbacks.onLiveAlerts?.(list);
        },
        (error) => {
          if (error.message.includes("Quota exceeded")) callbacks.onQuotaError?.();
          handleFirestoreError(error, OperationType.LIST, alertsPath);
        },
      )
    : undefined;

  return () => {
    unsubProfile();
    unsubAttempts();
    unsubEvents();
    unsubAlerts?.();
  };
}
