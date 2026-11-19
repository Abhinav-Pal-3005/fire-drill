import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  Check,
  Lock,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { useEmergencyStore } from "@/store/useEmergencyStore";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/formatters";

interface FrozenSelectTxStepProps {
  onUnfreezeExit: () => void;
}

function formatTimeShort(iso: string | null): string {
  if (!iso) return "Just now";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "Just now";
  }
}

export function FrozenSelectTxStep({ onUnfreezeExit }: FrozenSelectTxStepProps) {
  const frozenAtIso = useEmergencyStore((s) => s.frozenAtIso);
  const transactions = useEmergencyStore((s) => s.transactions);
  const selectedTxIds = useEmergencyStore((s) => s.selectedTxIds);
  const preventiveFreezeOnly = useEmergencyStore((s) => s.preventiveFreezeOnly);
  const toggleTransaction = useEmergencyStore((s) => s.toggleTransaction);
  const selectPreventiveOnly = useEmergencyStore((s) => s.selectPreventiveOnly);
  const proceedToVector = useEmergencyStore((s) => s.proceedToVector);

  const [confirmUnfreeze, setConfirmUnfreeze] = useState(false);

  const selectedCount = selectedTxIds.length;
  const selectedTotal = transactions
    .filter((tx) => selectedTxIds.includes(tx.id))
    .reduce((sum, tx) => sum + tx.amountInr, 0);

  const canContinue = selectedCount > 0 || preventiveFreezeOnly;

  const handleUnfreezeTap = () => {
    if (!confirmUnfreeze) {
      setConfirmUnfreeze(true);
      return;
    }
    onUnfreezeExit();
  };

  return (
    <div className="mx-auto flex w-full max-w-[740px] flex-col gap-5 px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
      {/* Minimal Panic-Proof Header — Zero Nav Distractions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#7F1D1D]">
          <Lock size={15} strokeWidth={2.2} aria-hidden />
          <span className="tabular-nums">Step 1 of 2</span>
          <span aria-hidden="true">·</span>
          <span>Outbound Locked</span>
        </div>

        <button
          type="button"
          onClick={handleUnfreezeTap}
          className={cn(
            "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-semibold transition-colors",
            confirmUnfreeze
              ? "bg-white text-[#991B1B] ring-2 ring-[#DC2626]"
              : "text-[#7F1D1D]/85 hover:bg-white/70 hover:text-[#7F1D1D]",
          )}
        >
          <Unlock size={15} strokeWidth={2} aria-hidden />
          <span>{confirmUnfreeze ? "Tap again to unfreeze" : "False alarm? Unfreeze"}</span>
        </button>
      </div>

      {/* Primary Containment Confirmation Banner */}
      <section
        aria-live="polite"
        className="rounded-3xl bg-[#DC2626] p-6 text-white shadow-[0_14px_32px_-8px_rgba(220,38,38,0.42)] sm:p-7"
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <ShieldCheck size={26} strokeWidth={2.1} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-[28px]">
              Your account is paused. No more money can leave.
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-white/95">
              Outbound UPI, IMPS/NEFT, and cards are locked right now. Inbound refunds and reversals stay open.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/20 pt-4 text-[13px] font-medium text-white/90">
          <span className="inline-flex items-center gap-1.5">
            <Lock size={14} strokeWidth={2.2} aria-hidden />
            <span>UPI, IMPS &amp; Cards paused</span>
          </span>
          <span aria-hidden="true" className="text-white/50">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ArrowDownLeft size={14} strokeWidth={2.2} aria-hidden />
            <span>Inbound credits open</span>
          </span>
          <span aria-hidden="true" className="text-white/50">
            ·
          </span>
          <span className="tabular-nums">Locked at {formatTimeShort(frozenAtIso)}</span>
        </div>
      </section>

      {/* Zero-Typing Transaction Selection */}
      <section aria-labelledby="select-tx-heading" className="flex flex-col gap-3.5 pt-1">
        <div className="space-y-1">
          <h2
            id="select-tx-heading"
            className="text-[20px] font-bold tracking-tight text-[#1E293B] sm:text-[22px]"
          >
            Tap any payment you did not want to make
          </h2>
          <p className="text-[14px] leading-relaxed text-[#475569]">
            No typing needed. Tapping a payment automatically attaches its 12-digit UTR, recipient bank, and exact time.
          </p>
        </div>

        <div className="flex flex-col gap-3" role="group" aria-label="Recent outbound payments">
          {transactions.map((tx) => {
            const selected = selectedTxIds.includes(tx.id);
            return (
              <button
                key={tx.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTransaction(tx.id)}
                className={cn(
                  "group flex min-h-[84px] w-full items-center justify-between gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99] sm:p-5",
                  selected
                    ? "border-[#DC2626] bg-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.22)]"
                    : "border-[#E2E8F0] bg-white/95 hover:border-[#FCA5A5] hover:bg-white",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-[#DC2626] bg-[#DC2626] text-white"
                        : "border-[#CBD5E1] bg-white text-transparent group-hover:border-[#DC2626]/60",
                    )}
                    aria-hidden
                  >
                    <Check size={16} strokeWidth={2.75} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold leading-snug text-[#0F172A] sm:text-[17px]">
                      {tx.recipientName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-[#64748B]">
                      <span>{tx.rail}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.relativeTime}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.beneficiaryBank}</span>
                    </div>
                    {selected && (
                      <p className="mt-1.5 text-[12px] font-semibold text-[#B91C1C]">
                        UTR &amp; bank trace attached automatically
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="block text-[20px] font-bold leading-none tabular-nums text-[#0F172A] sm:text-[22px]">
                    {formatINR(tx.amountInr)}
                  </span>
                  <span className="mt-1.5 block text-[12px] font-medium text-[#64748B]">
                    {selected ? "Selected" : "Tap to mark"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Preventive Freeze Tap Option (Zero Typing) */}
        <button
          type="button"
          aria-pressed={preventiveFreezeOnly}
          onClick={selectPreventiveOnly}
          className={cn(
            "mt-1 flex min-h-[68px] w-full items-center justify-between gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99] sm:px-5",
            preventiveFreezeOnly
              ? "border-[#D97706] bg-[#FFFBEB] shadow-sm"
              : "border-[#E2E8F0] bg-white/80 hover:border-[#FCD34D] hover:bg-white",
          )}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                preventiveFreezeOnly
                  ? "border-[#D97706] bg-[#D97706] text-white"
                  : "border-[#CBD5E1] bg-white text-transparent",
              )}
              aria-hidden
            >
              <Check size={16} strokeWidth={2.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#0F172A]">
                No money has left yet — keep my account locked
              </p>
              <p className="text-[13px] text-[#475569]">
                Stop a scammer before any payment goes through.
              </p>
            </div>
          </div>
        </button>
      </section>

      {/* Single Primary Action — Sticky Thumb-Zone CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#FECACA] bg-[#FEF2F2]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[740px]">
          <button
            type="button"
            disabled={!canContinue}
            onClick={proceedToVector}
            className={cn(
              "flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-[16px] font-bold transition-all active:scale-[0.99]",
              canContinue
                ? "bg-[#DC2626] text-white shadow-[0_10px_24px_-6px_rgba(220,38,38,0.5)] hover:bg-[#B91C1C]"
                : "cursor-not-allowed bg-[#E2E8F0] text-[#64748B]",
            )}
          >
            {selectedCount > 0 ? (
              <>
                <span className="tabular-nums">
                  Lock {selectedCount} {selectedCount === 1 ? "Payment" : "Payments"} ({formatINR(selectedTotal)}) &amp; Continue
                </span>
                <ArrowRight size={20} strokeWidth={2.4} aria-hidden />
              </>
            ) : preventiveFreezeOnly ? (
              <>
                <span>Continue Preventive Lockdown</span>
                <ArrowRight size={20} strokeWidth={2.4} aria-hidden />
              </>
            ) : (
              <span>Tap a payment above to continue</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
