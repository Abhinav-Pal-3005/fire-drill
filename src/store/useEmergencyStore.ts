import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dispatchBankLien, getOfflineQueue } from "@/features/emergency/lienClient";
import { buildRecentOutboundTransactions } from "@/features/emergency/mockTransactions";
import {
  build1930Summary,
  captureForensicSnapshot,
  getInitialRemediationActions,
  runVectorRemediation,
} from "@/features/emergency/telemetry";
import type {
  AttackVector,
  DispatchStatus,
  EmergencyState,
  ForensicDisputePayload,
  ForensicSnapshot,
  OutboundTransaction,
  RemediationAction,
} from "@/features/emergency/types";

interface EmergencyStoreState {
  emergencyState: EmergencyState;
  outboundLocked: boolean;
  inboundOpen: boolean;
  frozenAtIso: string | null;
  caseReferenceId: string | null;
  transactions: OutboundTransaction[];
  selectedTxIds: string[];
  preventiveFreezeOnly: boolean;
  attackVector: AttackVector | null;
  telemetry: ForensicSnapshot | null;
  remediationLog: RemediationAction[];
  payload: ForensicDisputePayload | null;
  dispatchStatus: DispatchStatus | null;
  offlineQueueCount: number;
  returnPath: string;
  isSyncingOffline: boolean;

  /** Immediately freezes outbound rails, captures silent telemetry, and enters FROZEN_SELECT_TX. */
  triggerEmergency: (fromPath?: string) => void;
  toggleTransaction: (txId: string) => void;
  selectPreventiveOnly: () => void;
  proceedToVector: () => void;
  backToSelectTx: () => void;
  selectVector: (vector: AttackVector) => void;
  executeContainmentAndDispatch: (overrideVector?: AttackVector) => Promise<void>;
  mark1930Copied: () => void;
  retryOfflineSync: () => Promise<boolean>;
  unfreezeAndExit: () => void;
}

function createCaseReferenceId(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `MFD-SOS-${datePart}-${randomPart}`;
}

export const useEmergencyStore = create<EmergencyStoreState>()(
  persist(
    (set, get) => ({
      emergencyState: "IDLE",
      outboundLocked: false,
      inboundOpen: true,
      frozenAtIso: null,
      caseReferenceId: null,
      transactions: [],
      selectedTxIds: [],
      preventiveFreezeOnly: false,
      attackVector: null,
      telemetry: null,
      remediationLog: [],
      payload: null,
      dispatchStatus: null,
      offlineQueueCount: 0,
      returnPath: "/",
      isSyncingOffline: false,

      triggerEmergency: (fromPath) => {
        const current = get().emergencyState;
        if (current !== "IDLE") return;

        const snapshot = captureForensicSnapshot();
        const txs = buildRecentOutboundTransactions(Date.now());
        const safeReturn = fromPath && !fromPath.startsWith("/sos") ? fromPath : "/";

        set({
          emergencyState: "FROZEN_SELECT_TX",
          outboundLocked: true,
          inboundOpen: true,
          frozenAtIso: snapshot.capturedAtIso,
          caseReferenceId: createCaseReferenceId(),
          transactions: txs,
          selectedTxIds: [],
          preventiveFreezeOnly: false,
          attackVector: null,
          telemetry: snapshot,
          remediationLog: [],
          payload: null,
          dispatchStatus: null,
          offlineQueueCount: getOfflineQueue().length,
          returnPath: safeReturn,
          isSyncingOffline: false,
        });
      },

      toggleTransaction: (txId) =>
        set((state) => {
          const exists = state.selectedTxIds.includes(txId);
          return {
            selectedTxIds: exists
              ? state.selectedTxIds.filter((id) => id !== txId)
              : [...state.selectedTxIds, txId],
            preventiveFreezeOnly: false,
          };
        }),

      selectPreventiveOnly: () =>
        set((state) => ({
          selectedTxIds: [],
          preventiveFreezeOnly: !state.preventiveFreezeOnly,
        })),

      proceedToVector: () => {
        const { selectedTxIds, preventiveFreezeOnly } = get();
        if (selectedTxIds.length === 0 && !preventiveFreezeOnly) return;
        set({ emergencyState: "SELECT_VECTOR" });
      },

      backToSelectTx: () => set({ emergencyState: "FROZEN_SELECT_TX" }),

      selectVector: (vector) => set({ attackVector: vector }),

      executeContainmentAndDispatch: async (overrideVector) => {
        const state = get();
        const vector = overrideVector ?? state.attackVector;
        if (!vector) return;

        const frozenAtIso = state.frozenAtIso ?? new Date().toISOString();
        const caseReferenceId = state.caseReferenceId ?? createCaseReferenceId();
        const telemetry = state.telemetry ?? captureForensicSnapshot();
        const selectedTransactions = state.transactions.filter((tx) =>
          state.selectedTxIds.includes(tx.id),
        );
        const totalDisputedAmountInr = selectedTransactions.reduce(
          (sum, tx) => sum + tx.amountInr,
          0,
        );

        const initialActions = getInitialRemediationActions(vector);

        set({
          attackVector: vector,
          emergencyState: "DISPATCHING",
          remediationLog: initialActions,
          dispatchStatus: {
            bankLienStatus: "PENDING",
            helpline1930Copied: false,
            helpline1930Summary: "",
            offlineQueued: false,
          },
        });

        const basePayload: ForensicDisputePayload = {
          caseReferenceId,
          frozenAtIso,
          selectedTransactions,
          totalDisputedAmountInr,
          attackVector: vector,
          telemetry,
          remediationLog: initialActions,
        };

        // Run vector remediation and Bank Lien dispatch concurrently; neither can block GROUNDING_MODE
        const [completedRemediation, lienResult] = await Promise.all([
          runVectorRemediation(vector, (progress) => {
            set({ remediationLog: progress });
          }),
          dispatchBankLien(basePayload, 3500),
        ]);

        const finalPayload: ForensicDisputePayload = {
          ...basePayload,
          remediationLog: completedRemediation,
        };

        const summary = build1930Summary(finalPayload, lienResult.bankLienReference);

        let copied = false;
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(summary);
            copied = true;
          } catch {
            copied = false;
          }
        }

        // Brief pause so user registers all checkmarks completed before calming blue transition
        await new Promise((resolve) => setTimeout(resolve, 380));

        set({
          emergencyState: "GROUNDING_MODE",
          remediationLog: completedRemediation,
          payload: finalPayload,
          offlineQueueCount: getOfflineQueue().length,
          dispatchStatus: {
            bankLienStatus: lienResult.bankLienStatus,
            bankLienReference: lienResult.bankLienReference,
            helpline1930Copied: copied,
            helpline1930Summary: summary,
            offlineQueued: lienResult.offlineQueued,
          },
        });
      },

      mark1930Copied: () =>
        set((state) => ({
          dispatchStatus: state.dispatchStatus
            ? { ...state.dispatchStatus, helpline1930Copied: true }
            : null,
        })),

      retryOfflineSync: async () => {
        const { payload, dispatchStatus, isSyncingOffline } = get();
        if (!payload || !dispatchStatus || isSyncingOffline) return false;
        if (dispatchStatus.bankLienStatus === "LOCKED") return true;

        set({ isSyncingOffline: true });
        const result = await dispatchBankLien(payload, 3500);
        const updatedSummary = build1930Summary(payload, result.bankLienReference);

        set({
          isSyncingOffline: false,
          offlineQueueCount: getOfflineQueue().length,
          dispatchStatus: {
            ...dispatchStatus,
            bankLienStatus: result.bankLienStatus,
            bankLienReference: result.bankLienReference,
            helpline1930Summary: updatedSummary,
            offlineQueued: result.offlineQueued,
          },
        });

        return result.bankLienStatus === "LOCKED";
      },

      unfreezeAndExit: () =>
        set({
          emergencyState: "IDLE",
          outboundLocked: false,
          inboundOpen: true,
          frozenAtIso: null,
          caseReferenceId: null,
          transactions: [],
          selectedTxIds: [],
          preventiveFreezeOnly: false,
          attackVector: null,
          telemetry: null,
          remediationLog: [],
          payload: null,
          dispatchStatus: null,
          isSyncingOffline: false,
        }),
    }),
    {
      name: "mfd-emergency",
      partialize: (state) => ({
        emergencyState:
          state.emergencyState === "DISPATCHING"
            ? state.payload && state.dispatchStatus
              ? "GROUNDING_MODE"
              : "SELECT_VECTOR"
            : state.emergencyState,
        outboundLocked: state.outboundLocked,
        inboundOpen: state.inboundOpen,
        frozenAtIso: state.frozenAtIso,
        caseReferenceId: state.caseReferenceId,
        transactions: state.transactions,
        selectedTxIds: state.selectedTxIds,
        preventiveFreezeOnly: state.preventiveFreezeOnly,
        attackVector: state.attackVector,
        telemetry: state.telemetry,
        remediationLog: state.remediationLog,
        payload: state.payload,
        dispatchStatus: state.dispatchStatus,
        offlineQueueCount: state.offlineQueueCount,
        returnPath: state.returnPath,
      }),
    },
  ),
);
