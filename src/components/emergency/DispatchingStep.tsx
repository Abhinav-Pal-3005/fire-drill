import { CheckCircle2, Loader2, Shield } from "lucide-react";
import { VECTOR_LABELS } from "@/features/emergency/telemetry";
import { useEmergencyStore } from "@/store/useEmergencyStore";

function formatShortClock(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export function DispatchingStep() {
  const attackVector = useEmergencyStore((s) => s.attackVector);
  const remediationLog = useEmergencyStore((s) => s.remediationLog);

  const completedCount = remediationLog.filter((item) => item.status === "COMPLETED").length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[680px] flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <section
        aria-live="polite"
        className="rounded-3xl bg-[#0B192C] p-6 text-white shadow-[0_20px_48px_-12px_rgba(11,25,44,0.45)] sm:p-8"
      >
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0F4C81] text-white">
            <Shield size={24} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#93C5FD]">
              {attackVector ? VECTOR_LABELS[attackVector] : "Automated containment"}
            </p>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-[26px]">
              Securing your device and placing bank hold
            </h1>
          </div>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-[#CBD5E1]">
          Hold steady. We are closing the attack channel, locking your evidence packet, and preparing your 1930 helpline handoff.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {remediationLog.map((action) => {
            const done = action.status === "COMPLETED";
            return (
              <div
                key={action.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {done ? (
                    <CheckCircle2 size={20} strokeWidth={2.2} className="shrink-0 text-[#38BDF8]" aria-hidden />
                  ) : (
                    <Loader2 size={20} strokeWidth={2.2} className="shrink-0 animate-spin text-[#93C5FD]" aria-hidden />
                  )}
                  <span className="text-[14px] font-semibold text-white">{action.label}</span>
                </div>
                <span className="shrink-0 text-[12px] font-medium tabular-nums text-[#94A3B8]">
                  {done ? formatShortClock(action.executedAtIso) || "Done" : "Running"}
                </span>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Loader2 size={20} strokeWidth={2.2} className="shrink-0 animate-spin text-[#93C5FD]" aria-hidden />
              <span className="text-[14px] font-semibold text-white">
                Sending interbank lien &amp; packaging 1930 forensic script
              </span>
            </div>
            <span className="shrink-0 text-[12px] font-medium tabular-nums text-[#94A3B8]">
              {completedCount}/{remediationLog.length}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
