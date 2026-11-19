import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Copy,
  ExternalLink,
  Landmark,
  PhoneCall,
  RefreshCw,
  Share2,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { toast } from "@/components/glass/GlassToast";
import { VECTOR_LABELS } from "@/features/emergency/telemetry";
import { useEmergencyStore } from "@/store/useEmergencyStore";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/formatters";

interface GroundingModeStepProps {
  onExitEmergency: () => void;
}

function formatClock(iso?: string | null): string {
  if (!iso) return "Recorded";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "Recorded";
  }
}

export function GroundingModeStep({ onExitEmergency }: GroundingModeStepProps) {
  const payload = useEmergencyStore((s) => s.payload);
  const dispatchStatus = useEmergencyStore((s) => s.dispatchStatus);
  const isSyncingOffline = useEmergencyStore((s) => s.isSyncingOffline);
  const mark1930Copied = useEmergencyStore((s) => s.mark1930Copied);
  const retryOfflineSync = useEmergencyStore((s) => s.retryOfflineSync);

  const summaryText = dispatchStatus?.helpline1930Summary ?? "";
  const isLocked = dispatchStatus?.bankLienStatus === "LOCKED";
  const isOfflineQueued =
    dispatchStatus?.bankLienStatus === "QUEUED_OFFLINE" ||
    dispatchStatus?.bankLienStatus === "TIMEOUT_FALLBACK";

  const handleCopySummary = async () => {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      mark1930Copied();
      toast("Complete 1930 forensic script copied to clipboard");
    } catch {
      toast("Unable to access clipboard — read your Case ID and UTRs below");
    }
  };

  const handleShareFamily = async () => {
    const shareTitle = `Emergency Scam Case ${payload?.caseReferenceId ?? ""}`.trim();
    const shareBody =
      summaryText ||
      "My account outbound payments are frozen. Please help me call 1930 National Cyber Fraud Helpline.";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareBody });
        return;
      } catch {
        // Fall back to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareBody);
      toast("Case dossier copied — paste to a trusted family member");
    } catch {
      toast("Share your Case Reference ID with a trusted family member");
    }
  };

  const handleRetrySync = async () => {
    const ok = await retryOfflineSync();
    if (ok) {
      toast("Interbank lien synced and confirmed");
    } else {
      toast("Still offline — packet stays queued and ready to sync automatically");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      {/* Grounding Blue Emotional State-Shift Hero */}
      <section
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl bg-[#0B192C] p-6 text-white shadow-[0_18px_44px_-12px_rgba(11,25,44,0.38)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#93C5FD]">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden />
              <span>Grounding Mode Active · Account Protected</span>
            </div>
            <h1 className="mt-2.5 text-[26px] font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-[32px]">
              You are safe now. Outbound payments are frozen.
            </h1>
            <p className="mt-2.5 max-w-[56ch] text-[15px] leading-relaxed text-[#CBD5E1]">
              Take one slow breath. Everything the helpline needs—your UTRs, bank trace, and device snapshot—is already packaged for you.
            </p>
          </div>

          {/* Gentle Guided Breathing Cue (compositor-only, respects prefers-reduced-motion) */}
          <div className="hidden shrink-0 flex-col items-center gap-1.5 sm:flex" aria-hidden>
            <div className="relative grid h-16 w-16 place-items-center">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#38BDF8]/40 bg-[#0F4C81]/40"
                animate={{ scale: [0.85, 1.08, 0.85], opacity: [0.55, 0.95, 0.55] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <ShieldCheck size={24} strokeWidth={2} className="relative text-[#BAE6FD]" />
            </div>
            <span className="text-[11px] font-medium text-[#93C5FD]">Breathe slow</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/15 pt-4 text-[13px] text-[#CBD5E1]">
          <span className="font-mono font-semibold tabular-nums text-white">
            {payload?.caseReferenceId ?? "MFD-SOS"}
          </span>
          <span aria-hidden="true" className="text-white/40">
            ·
          </span>
          <span className="tabular-nums">Frozen {formatClock(payload?.frozenAtIso)}</span>
          <span aria-hidden="true" className="text-white/40">
            ·
          </span>
          <span>Outbound locked</span>
          <span aria-hidden="true" className="text-white/40">
            ·
          </span>
          <span>Inbound open</span>
        </div>
      </section>

      {/* Primary Action — 1930 National Cyber Fraud Helpline Handoff */}
      <section aria-labelledby="helpline-heading" className="flex flex-col gap-3">
        <h2 id="helpline-heading" className="sr-only">
          Call 1930 National Cyber Fraud Helpline
        </h2>

        <a
          href="tel:1930"
          className="group flex min-h-[68px] w-full items-center justify-between gap-4 rounded-2xl bg-[#0F4C81] px-5 py-4 text-white shadow-[0_12px_28px_-6px_rgba(15,76,129,0.45)] transition-all hover:bg-[#0C3E6B] active:scale-[0.99] sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
              <PhoneCall size={24} strokeWidth={2.1} aria-hidden />
            </span>
            <div className="min-w-0">
              <span className="block text-[20px] font-bold leading-tight tracking-tight sm:text-[22px]">
                Call 1930 Helpline Now
              </span>
              <span className="mt-0.5 block text-[13px] text-[#DBEAFE]">
                National Cyber Financial Fraud Desk · 24×7 Priority
              </span>
            </div>
          </div>
          <ArrowUpRight
            size={22}
            strokeWidth={2.2}
            className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </a>

        <button
          type="button"
          onClick={handleCopySummary}
          className={cn(
            "flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border px-5 text-[15px] font-bold transition-all active:scale-[0.99]",
            dispatchStatus?.helpline1930Copied
              ? "border-[#0F4C81]/30 bg-[#E0F2FE] text-[#0B192C] hover:bg-[#BAE6FD]/60"
              : "border-[#CBD5E1] bg-white text-[#0B192C] hover:border-[#0F4C81]",
          )}
        >
          {dispatchStatus?.helpline1930Copied ? (
            <>
              <CheckCircle2 size={19} strokeWidth={2.2} className="text-[#0F4C81]" aria-hidden />
              <span>1930 Forensic Script Copied · Tap to Copy Again</span>
            </>
          ) : (
            <>
              <Copy size={19} strokeWidth={2.1} className="text-[#0F4C81]" aria-hidden />
              <span>Copy Complete 1930 Forensic Script</span>
            </>
          )}
        </button>
      </section>

      {/* Bank Lien / Offline Queue Status Card */}
      <section
        aria-labelledby="bank-lien-heading"
        className="rounded-3xl border border-[#CBD5E1] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
              isLocked
                ? "bg-[#E0F2FE] text-[#0F4C81]"
                : "bg-[#FEF3C7] text-[#92400E]",
            )}
          >
            {isLocked ? (
              <Landmark size={22} strokeWidth={2} aria-hidden />
            ) : dispatchStatus?.bankLienStatus === "QUEUED_OFFLINE" ? (
              <WifiOff size={22} strokeWidth={2} aria-hidden />
            ) : (
              <CloudUpload size={22} strokeWidth={2} aria-hidden />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="bank-lien-heading" className="text-[17px] font-bold text-[#0F172A]">
              {isLocked
                ? "Interbank Lien Request Logged"
                : "Dispute Saved Safely on Device (Offline Queue)"}
            </h2>
            {isLocked ? (
              <>
                <p className="mt-1 text-[14px] leading-relaxed text-[#475569]">
                  Your bank fraud desk received the auto-extracted UTR trail to hold receiving accounts during the settlement window.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[#334155]">
                  <span>
                    Lien Ref:{" "}
                    <strong className="font-mono font-bold tabular-nums text-[#0F4C81]">
                      {dispatchStatus?.bankLienReference}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Disputed: {formatINR(payload?.totalDisputedAmountInr ?? 0)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-[14px] leading-relaxed text-[#475569]">
                  {dispatchStatus?.bankLienStatus === "QUEUED_OFFLINE"
                    ? "No internet connection was detected, so your full forensic dispute packet is stored safely on this device and will sync automatically when signal returns."
                    : "The bank gateway took too long to reply, so your dispute packet is safely queued for automatic retry. You can call 1930 right now with your details below."}
                </p>
                {isOfflineQueued && (
                  <button
                    type="button"
                    disabled={isSyncingOffline}
                    onClick={handleRetrySync}
                    className="mt-3.5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#0F4C81] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#0C3E6B] disabled:opacity-60"
                  >
                    <RefreshCw
                      size={16}
                      strokeWidth={2.2}
                      className={cn(isSyncingOffline && "animate-spin")}
                      aria-hidden
                    />
                    <span>{isSyncingOffline ? "Syncing with bank..." : "Retry Bank Sync Now"}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Auto-Extracted Transaction Evidence (Read-Aloud Ready for 1930 Operator) */}
      <section
        aria-labelledby="evidence-heading"
        className="rounded-3xl border border-[#CBD5E1] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="evidence-heading" className="text-[17px] font-bold text-[#0F172A]">
            Read-Aloud Evidence for 1930 Operator
          </h2>
          <span className="text-[13px] font-semibold tabular-nums text-[#0F4C81]">
            {payload?.selectedTransactions.length
              ? `${payload.selectedTransactions.length} ${
                  payload.selectedTransactions.length === 1 ? "payment" : "payments"
                } · ${formatINR(payload.totalDisputedAmountInr)}`
              : "Preventive freeze"}
          </span>
        </div>

        {payload && payload.selectedTransactions.length > 0 ? (
          <div className="mt-4 divide-y divide-[#E2E8F0]">
            {payload.selectedTransactions.map((tx) => (
              <div key={tx.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-bold text-[#0F172A]">{tx.recipientName}</p>
                  <p className="text-[16px] font-bold tabular-nums text-[#0F172A]">
                    {formatINR(tx.amountInr)}
                  </p>
                </div>
                <div className="mt-1.5 grid gap-1 text-[13px] text-[#475569] sm:grid-cols-2">
                  <p>
                    12-digit UTR:{" "}
                    <span className="font-mono font-semibold tabular-nums text-[#0F172A]">
                      {tx.utr}
                    </span>
                  </p>
                  <p>
                    Recipient ID:{" "}
                    <span className="font-mono text-[#0F172A]">{tx.recipientVpa}</span>
                  </p>
                  <p>
                    Bank &amp; Rail: {tx.beneficiaryBank} · {tx.rail}
                  </p>
                  <p className="tabular-nums">Time: {formatClock(tx.timestampIso)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[14px] leading-relaxed text-[#475569]">
            Preventive lock active. No completed debit was selected—your account outbound rails remain paused while you verify with your bank.
          </p>
        )}

        {/* Completed Automated Containment Actions */}
        {payload && payload.remediationLog.length > 0 && (
          <div className="mt-5 border-t border-[#E2E8F0] pt-4">
            <h3 className="text-[14px] font-bold text-[#0F172A]">
              Automated Containment Completed · {VECTOR_LABELS[payload.attackVector]}
            </h3>
            <ul className="mt-2.5 space-y-2">
              {payload.remediationLog.map((step) => (
                <li
                  key={step.id}
                  className="flex items-start justify-between gap-3 text-[13px] text-[#334155]"
                >
                  <span className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      strokeWidth={2.2}
                      className="mt-0.5 shrink-0 text-[#0F4C81]"
                      aria-hidden
                    />
                    <span>{step.label}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-[#64748B]">
                    {formatClock(step.executedAtIso)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Silent Forensic Telemetry Snapshot (Collapsible so screen stays calm) */}
        {payload?.telemetry && (
          <details className="group mt-5 border-t border-[#E2E8F0] pt-4">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-[#0F4C81]">
              <span>View Silent Device Forensic Snapshot</span>
              <ChevronDown
                size={18}
                className="transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-3 grid gap-2 text-[13px] text-[#475569] sm:grid-cols-2">
              <p className="tabular-nums">
                Captured at:{" "}
                <span className="font-medium text-[#0F172A]">
                  {formatClock(payload.telemetry.capturedAtIso)}
                </span>
              </p>
              <p>
                Active voice call signal:{" "}
                <span className="font-medium text-[#0F172A]">
                  {payload.telemetry.activeVoiceCallDetected ? "Detected & isolated" : "None"}
                </span>
              </p>
              <p>
                Screen-share / overlay:{" "}
                <span className="font-medium text-[#0F172A]">
                  {payload.telemetry.screenShareDetected
                    ? payload.telemetry.suspiciousOverlayApps.join(", ")
                    : "None detected"}
                </span>
              </p>
              <p>
                Network:{" "}
                <span className="font-medium text-[#0F172A]">
                  {payload.telemetry.networkOnline
                    ? `Online (${payload.telemetry.connectionType})`
                    : "Offline at trigger"}
                </span>
              </p>
              <p className="sm:col-span-2">
                Device signature:{" "}
                <span className="font-mono text-[12px] text-[#0F172A]">
                  {payload.telemetry.deviceFingerprint}
                </span>
              </p>
            </div>
          </details>
        )}
      </section>

      {/* Secondary Helpful Handoff Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="https://cybercrime.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-[#CBD5E1] bg-white px-5 text-[15px] font-semibold text-[#0B192C] transition-colors hover:border-[#0F4C81]"
        >
          <span>Open cybercrime.gov.in</span>
          <ExternalLink size={17} strokeWidth={2} aria-hidden />
        </a>

        <button
          type="button"
          onClick={handleShareFamily}
          className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-[#CBD5E1] bg-white px-5 text-[15px] font-semibold text-[#0B192C] transition-colors hover:border-[#0F4C81]"
        >
          <Share2 size={17} strokeWidth={2} aria-hidden />
          <span>Share Dossier with Family</span>
        </button>
      </div>

      {/* Safe Exit */}
      <div className="flex flex-col items-center gap-2 pt-3 text-center">
        <button
          type="button"
          onClick={onExitEmergency}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl px-6 text-[14px] font-semibold text-[#334155] transition-colors hover:bg-white hover:text-[#0B192C]"
        >
          End Emergency Session &amp; Return to App
        </button>
        <p className="max-w-[46ch] text-[12px] text-[#64748B]">
          Practice simulation environment. For real financial fraud in India, dial 1930 or report at cybercrime.gov.in.
        </p>
      </div>
    </div>
  );
}
