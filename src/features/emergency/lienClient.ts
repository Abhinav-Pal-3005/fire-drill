import type { DispatchStatus, ForensicDisputePayload } from "./types";

const OFFLINE_QUEUE_KEY = "mfd-emergency-offline-queue";

export interface LienDispatchResult {
  bankLienStatus: DispatchStatus["bankLienStatus"];
  bankLienReference?: string;
  offlineQueued: boolean;
}

export function getOfflineQueue(): ForensicDisputePayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ForensicDisputePayload[]) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineDispute(payload: ForensicDisputePayload): ForensicDisputePayload[] {
  if (typeof window === "undefined") return [payload];
  const existing = getOfflineQueue().filter((item) => item.caseReferenceId !== payload.caseReferenceId);
  const next = [...existing, payload];
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Storage quota exceeded or unavailable; keep in-memory state moving
  }
  return next;
}

export function removeOfflineDispute(caseReferenceId: string): ForensicDisputePayload[] {
  if (typeof window === "undefined") return [];
  const next = getOfflineQueue().filter((item) => item.caseReferenceId !== caseReferenceId);
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures
  }
  return next;
}

/**
 * Dispatches the ForensicDisputePayload to the simulated Bank Lien API with an explicit timeout
 * and offline fallback. Never throws — guarantees the user always progresses to GROUNDING_MODE.
 */
export async function dispatchBankLien(
  payload: ForensicDisputePayload,
  timeoutMs = 3500,
): Promise<LienDispatchResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueOfflineDispute(payload);
    return {
      bankLienStatus: "QUEUED_OFFLINE",
      offlineQueued: true,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/emergency/lien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      enqueueOfflineDispute(payload);
      return {
        bankLienStatus: "TIMEOUT_FALLBACK",
        offlineQueued: true,
      };
    }

    const data = (await response.json()) as { lienReference?: string };
    removeOfflineDispute(payload.caseReferenceId);
    return {
      bankLienStatus: "LOCKED",
      bankLienReference: data.lienReference || `LIEN-NPCI-${payload.caseReferenceId.slice(-6)}`,
      offlineQueued: false,
    };
  } catch {
    clearTimeout(timer);
    enqueueOfflineDispute(payload);
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    return {
      bankLienStatus: offline ? "QUEUED_OFFLINE" : "TIMEOUT_FALLBACK",
      offlineQueued: true,
    };
  }
}
