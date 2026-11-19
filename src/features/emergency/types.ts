export type EmergencyState =
  | "IDLE"
  | "FROZEN_SELECT_TX"
  | "SELECT_VECTOR"
  | "DISPATCHING"
  | "GROUNDING_MODE";

export type AttackVector =
  | "FAKE_AUTHORITY_CALL"
  | "SCREEN_SHARE_APP"
  | "PHISHING_LINK"
  | "QR_COLLECT_REQUEST";

export interface OutboundTransaction {
  id: string;
  recipientName: string;
  recipientVpa: string;
  beneficiaryBank: string;
  amountInr: number;
  relativeTime: string;
  timestampIso: string;
  utr: string;
  rail: "UPI" | "IMPS" | "CARD";
}

export interface ForensicSnapshot {
  capturedAtIso: string;
  activeVoiceCallDetected: boolean;
  screenShareDetected: boolean;
  suspiciousOverlayApps: string[];
  networkOnline: boolean;
  connectionType: string;
  deviceFingerprint: string;
}

export interface RemediationAction {
  id: string;
  label: string;
  status: "PENDING" | "COMPLETED";
  executedAtIso?: string;
}

export interface ForensicDisputePayload {
  caseReferenceId: string;
  frozenAtIso: string;
  selectedTransactions: OutboundTransaction[];
  totalDisputedAmountInr: number;
  attackVector: AttackVector;
  telemetry: ForensicSnapshot;
  remediationLog: RemediationAction[];
}

export interface DispatchStatus {
  bankLienStatus: "PENDING" | "LOCKED" | "QUEUED_OFFLINE" | "TIMEOUT_FALLBACK";
  bankLienReference?: string;
  helpline1930Copied: boolean;
  helpline1930Summary: string;
  offlineQueued: boolean;
}

export interface AttackVectorMeta {
  id: AttackVector;
  title: string;
  description: string;
  autoActionPreview: string;
}
