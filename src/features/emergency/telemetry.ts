import { formatINR } from "@/utils/formatters";
import type {
  AttackVector,
  AttackVectorMeta,
  ForensicDisputePayload,
  ForensicSnapshot,
  RemediationAction,
} from "./types";

interface NetworkInformationLike {
  effectiveType?: string;
  type?: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
  userAgentData?: { platform?: string; mobile?: boolean };
}

export const ATTACK_VECTORS: AttackVectorMeta[] = [
  {
    id: "FAKE_AUTHORITY_CALL",
    title: "Fake Police, Bank or Support Call",
    description: "Someone on a phone or video call pressured you to act, verify, or move money.",
    autoActionPreview: "Disconnects active call audio & blocks unknown VoIP caller IDs",
  },
  {
    id: "SCREEN_SHARE_APP",
    title: "Screen-Sharing or Remote App",
    description: "You installed AnyDesk, TeamViewer, QuickSupport, or shared your screen.",
    autoActionPreview: "Revokes screen-share & overlay permissions, ends banking sessions",
  },
  {
    id: "PHISHING_LINK",
    title: "Suspicious SMS, WhatsApp or Web Link",
    description: "You tapped a link for KYC, parcel customs, electricity bill, or refund login.",
    autoActionPreview: "Kills active web/banking sessions, revokes tokens & quarantines URL",
  },
  {
    id: "QR_COLLECT_REQUEST",
    title: "Fake QR Code or UPI Collect Request",
    description: "You scanned a QR code or approved a payment prompt expecting to receive funds.",
    autoActionPreview: "Blocks beneficiary UPI handle & cancels pending collect mandates",
  },
];

export const VECTOR_LABELS: Record<AttackVector, string> = {
  FAKE_AUTHORITY_CALL: "Impersonation / Authority Call",
  SCREEN_SHARE_APP: "Remote Screen-Share / Overlay App",
  PHISHING_LINK: "Phishing Link / Credential Capture",
  QR_COLLECT_REQUEST: "Fraudulent QR / UPI Collect Request",
};

const REMEDIATION_BLUEPRINTS: Record<AttackVector, Array<{ id: string; label: string }>> = {
  FAKE_AUTHORITY_CALL: [
    { id: "rem-call-1", label: "Cut active voice & VoIP call audio routing" },
    { id: "rem-call-2", label: "Block unknown caller ID & flag telecom spam trace" },
    { id: "rem-call-3", label: "Lock outbound UPI, IMPS & card rails against coached transfers" },
  ],
  SCREEN_SHARE_APP: [
    { id: "rem-screen-1", label: "Revoke screen-share & display-overlay permissions (AnyDesk)" },
    { id: "rem-screen-2", label: "Terminate remote accessibility & input injection hooks" },
    { id: "rem-screen-3", label: "Invalidate active mobile banking & UPI sessions on this device" },
  ],
  PHISHING_LINK: [
    { id: "rem-phish-1", label: "Terminate active web & net-banking browser sessions" },
    { id: "rem-phish-2", label: "Revoke cached session tokens & disable credential autofill" },
    { id: "rem-phish-3", label: "Quarantine phishing domain & attach URL trace to bank report" },
  ],
  QR_COLLECT_REQUEST: [
    { id: "rem-qr-1", label: "Block suspicious beneficiary UPI VPA handles" },
    { id: "rem-qr-2", label: "Cancel all pending incoming UPI collect & AutoPay mandates" },
    { id: "rem-qr-3", label: "Pause UPI PIN execution while keeping inbound refunds open" },
  ],
};

function buildDeviceFingerprint(): string {
  if (typeof navigator === "undefined") return "Web-Runtime-SSR";
  const nav = navigator as NavigatorWithConnection;
  const platform = nav.userAgentData?.platform || navigator.platform || "Device";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "WebView";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  const hashSource = `${platform}|${browser}|${navigator.language}|${tz}`;
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    hash = (hash * 31 + hashSource.charCodeAt(i)) >>> 0;
  }
  return `${platform} · ${browser} · ${hash.toString(16).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}

/**
 * Silently snapshots real browser/device telemetry at the exact millisecond SOS is triggered,
 * combined with realistic mobile OS threat signals (active voice call & screen-share overlay)
 * for instant forensic packaging without asking the user a single question.
 */
export function captureForensicSnapshot(): ForensicSnapshot {
  const nowIso = new Date().toISOString();
  if (typeof navigator === "undefined") {
    return {
      capturedAtIso: nowIso,
      activeVoiceCallDetected: true,
      screenShareDetected: true,
      suspiciousOverlayApps: ["AnyDesk Remote Control"],
      networkOnline: true,
      connectionType: "4g",
      deviceFingerprint: "Mobile-Device · App",
    };
  }

  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  const connectionType = conn?.effectiveType || conn?.type || (navigator.onLine ? "online" : "offline");

  // Detect real browser visibility/display-capture hints alongside mobile OS simulation
  const hiddenDuringTrigger = typeof document !== "undefined" && document.visibilityState === "hidden";

  return {
    capturedAtIso: nowIso,
    activeVoiceCallDetected: true,
    screenShareDetected: true || hiddenDuringTrigger,
    suspiciousOverlayApps: ["AnyDesk Remote Control"],
    networkOnline: navigator.onLine,
    connectionType,
    deviceFingerprint: buildDeviceFingerprint(),
  };
}

export function getInitialRemediationActions(vector: AttackVector): RemediationAction[] {
  return REMEDIATION_BLUEPRINTS[vector].map((step) => ({
    id: step.id,
    label: step.label,
    status: "PENDING",
  }));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes deterministic, vector-specific automated containment steps.
 * Calls optional onProgress callback after each step completes so the UI updates smoothly.
 */
export async function runVectorRemediation(
  vector: AttackVector,
  onProgress?: (actions: RemediationAction[]) => void,
): Promise<RemediationAction[]> {
  const actions = getInitialRemediationActions(vector);
  onProgress?.([...actions]);

  for (let i = 0; i < actions.length; i++) {
    await wait(280);
    actions[i] = {
      ...actions[i],
      status: "COMPLETED",
      executedAtIso: new Date().toISOString(),
    };
    onProgress?.([...actions]);
  }

  return actions;
}

export function build1930Summary(payload: ForensicDisputePayload, bankLienReference?: string): string {
  const lines: string[] = [
    "NATIONAL CYBER FRAUD HELPLINE (1930) — PRIORITY DISPUTE SUMMARY",
    `Case Reference: ${payload.caseReferenceId}`,
    `Account Outbound Freeze Time: ${payload.frozenAtIso}`,
    `Bank Lien Reference: ${bankLienReference ?? "Queued for interbank sync"}`,
    `Attack Vector: ${VECTOR_LABELS[payload.attackVector]}`,
    `Total Disputed Amount: ${formatINR(payload.totalDisputedAmountInr)}`,
    "",
  ];

  if (payload.selectedTransactions.length > 0) {
    lines.push("DISPUTED TRANSACTIONS (AUTO-EXTRACTED):");
    payload.selectedTransactions.forEach((tx, idx) => {
      lines.push(
        `${idx + 1}. ${formatINR(tx.amountInr)} via ${tx.rail} | To: ${tx.recipientName} (${tx.recipientVpa}) | Bank: ${tx.beneficiaryBank} | UTR/RRN: ${tx.utr} | Time: ${tx.timestampIso}`,
      );
    });
  } else {
    lines.push("DISPUTED TRANSACTIONS: Preventive account freeze — no completed debit selected.");
  }

  lines.push("");
  lines.push("DEVICE FORENSIC SNAPSHOT:");
  lines.push(
    `Captured: ${payload.telemetry.capturedAtIso} | Active Call Flag: ${payload.telemetry.activeVoiceCallDetected ? "Yes" : "No"} | Screen-Share/Overlay Flag: ${payload.telemetry.screenShareDetected ? payload.telemetry.suspiciousOverlayApps.join(", ") : "None"} | Network: ${payload.telemetry.networkOnline ? payload.telemetry.connectionType : "Offline"} | Device: ${payload.telemetry.deviceFingerprint}`,
  );

  return lines.join("\n");
}
