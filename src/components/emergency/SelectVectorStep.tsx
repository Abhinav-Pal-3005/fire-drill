import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link2Off,
  Lock,
  MonitorOff,
  PhoneOff,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { ATTACK_VECTORS } from "@/features/emergency/telemetry";
import type { AttackVector } from "@/features/emergency/types";
import { useEmergencyStore } from "@/store/useEmergencyStore";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/formatters";

const VECTOR_ICONS: Record<AttackVector, LucideIcon> = {
  FAKE_AUTHORITY_CALL: PhoneOff,
  SCREEN_SHARE_APP: MonitorOff,
  PHISHING_LINK: Link2Off,
  QR_COLLECT_REQUEST: QrCode,
};

export function SelectVectorStep() {
  const attackVector = useEmergencyStore((s) => s.attackVector);
  const selectedTxIds = useEmergencyStore((s) => s.selectedTxIds);
  const transactions = useEmergencyStore((s) => s.transactions);
  const selectVector = useEmergencyStore((s) => s.selectVector);
  const backToSelectTx = useEmergencyStore((s) => s.backToSelectTx);
  const executeContainmentAndDispatch = useEmergencyStore((s) => s.executeContainmentAndDispatch);

  const selectedTotal = transactions
    .filter((tx) => selectedTxIds.includes(tx.id))
    .reduce((sum, tx) => sum + tx.amountInr, 0);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
      {/* Minimal Header — Back + Step Context */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={backToSelectTx}
          className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[14px] font-semibold text-[#78350F] transition-colors hover:bg-white/70"
        >
          <ArrowLeft size={18} strokeWidth={2.2} aria-hidden />
          <span>Back to payments</span>
        </button>

        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#78350F]">
          <Lock size={14} strokeWidth={2.2} aria-hidden />
          <span className="tabular-nums">Step 2 of 2</span>
          <span aria-hidden="true">·</span>
          <span>Account Paused</span>
        </div>
      </div>

      {/* Calm, Blame-Free Prompt Header */}
      <section className="rounded-3xl bg-[#D97706] p-6 text-white shadow-[0_14px_32px_-8px_rgba(217,119,6,0.38)] sm:p-7">
        <h1 className="text-[24px] font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-[28px]">
          How did they reach you?
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/95">
          Tap the closest match. We will automatically shut down that channel on your device and send your bank freeze request.
        </p>
        <div className="mt-4 border-t border-white/20 pt-3.5 text-[13px] font-medium text-white/95 tabular-nums">
          {selectedTxIds.length > 0 ? (
            <span>
              Account paused · {selectedTxIds.length}{" "}
              {selectedTxIds.length === 1 ? "payment" : "payments"} marked ({formatINR(selectedTotal)})
            </span>
          ) : (
            <span>Account paused · Preventive device &amp; rail lockdown</span>
          )}
        </div>
      </section>

      {/* 4 Oversized Attack Vector Tap Cards */}
      <section aria-label="Choose how the scam happened" className="grid gap-3.5 md:grid-cols-2">
        {ATTACK_VECTORS.map((vector) => {
          const Icon = VECTOR_ICONS[vector.id];
          const selected = attackVector === vector.id;
          return (
            <button
              key={vector.id}
              type="button"
              aria-pressed={selected}
              onClick={() => selectVector(vector.id)}
              className={cn(
                "group flex min-h-[136px] flex-col justify-between gap-3 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99]",
                selected
                  ? "border-[#D97706] bg-white shadow-[0_10px_28px_-8px_rgba(217,119,6,0.28)]"
                  : "border-[#E2E8F0] bg-white/95 hover:border-[#FCD34D] hover:bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors",
                    selected
                      ? "bg-[#D97706] text-white"
                      : "bg-[#FEF3C7] text-[#92400E] group-hover:bg-[#FDE68A]",
                  )}
                >
                  <Icon size={24} strokeWidth={2} aria-hidden />
                </span>

                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    selected
                      ? "border-[#D97706] bg-[#D97706] text-white"
                      : "border-[#CBD5E1] bg-white text-transparent",
                  )}
                  aria-hidden
                >
                  <Check size={16} strokeWidth={2.75} />
                </span>
              </div>

              <div>
                <h2 className="text-[17px] font-bold leading-snug text-[#0F172A]">{vector.title}</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-[#475569]">{vector.description}</p>
              </div>

              <p
                className={cn(
                  "border-t pt-2.5 text-[12px] font-semibold leading-snug",
                  selected
                    ? "border-[#FDE68A] text-[#B45309]"
                    : "border-[#F1F5F9] text-[#64748B]",
                )}
              >
                Auto-defense: {vector.autoActionPreview}
              </p>
            </button>
          );
        })}
      </section>

      {/* Single Sticky Bottom Primary Action */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#FDE68A] bg-[#FFFBEB]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[760px]">
          <button
            type="button"
            disabled={!attackVector}
            onClick={() => void executeContainmentAndDispatch()}
            className={cn(
              "flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-[16px] font-bold transition-all active:scale-[0.99]",
              attackVector
                ? "bg-[#DC2626] text-white shadow-[0_10px_24px_-6px_rgba(220,38,38,0.48)] hover:bg-[#B91C1C]"
                : "cursor-not-allowed bg-[#E2E8F0] text-[#64748B]",
            )}
          >
            {attackVector ? (
              <>
                <span>Shut Down Channel &amp; Send Bank Freeze</span>
                <ArrowRight size={20} strokeWidth={2.4} aria-hidden />
              </>
            ) : (
              <span>Tap one option above to continue</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
