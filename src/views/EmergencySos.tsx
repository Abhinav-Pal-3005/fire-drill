import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Headset,
  Info,
  ListChecks,
  Phone,
  PhoneCall,
  Share2,
  Shield,
  Siren,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { toast } from "@/components/glass/GlassToast";

export default function EmergencySos() {
  const navigate = useNavigate();
  const [savedUtr, setSavedUtr] = useState(true);
  const [notedVpa, setNotedVpa] = useState(false);

  const copy1930 = async () => {
    try {
      await navigator.clipboard.writeText("1930");
      toast("Copied 1930 to clipboard");
    } catch {
      toast("National helpline: 1930");
    }
  };

  const shareChecklist = async () => {
    const payload = {
      title: "EMERGENCY: Financial Fraud Recovery Checklist",
      text: "Urgent fraud triage steps: 1. Call 1930 immediately. 2. Freeze bank & UPI. 3. File complaint at cybercrime.gov.in.",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // User cancelled or share unsupported; fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${payload.title}\n${payload.text}`);
    } catch {
      // Ignore clipboard failures
    }
    toast("Emergency checklist copied to clipboard");
  };

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 pb-6">
      {/* Top Emergency Escape Banner */}
      <div className="w-full rounded-[24px] bg-st-error p-5 text-st-on-error shadow-[0_8px_24px_-2px_rgba(186,26,26,0.3)]">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
            <Siren size={22} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-white" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-wider">Emergency Escape Mode Active</span>
            </div>
            <p className="mt-1 text-[20px] font-bold leading-tight">Stay calm. Act now to freeze your funds.</p>
            <p className="mt-1 text-[13px] text-white/90">
              Golden window: Act immediately to halt unauthorized interbank settlement.
            </p>
          </div>
        </div>
      </div>

      {/* Primary One-Tap Helplines */}
      <div className="flex flex-col gap-2.5">
        <a
          href="tel:1930"
          className="group flex w-full items-center justify-between rounded-[28px] bg-st-error p-6 text-st-on-error shadow-[0_12px_32px_-4px_rgba(186,26,26,0.38)] transition-transform active:scale-[0.98]"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/20">
              <PhoneCall size={28} strokeWidth={2} className="animate-pulse" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/85">
                Govt of India · 24x7 Priority Desk
              </span>
              <span className="mt-1 block text-[28px] font-bold leading-none tracking-tight">CALL 1930</span>
              <span className="mt-1 block truncate text-[13px] text-white/90">
                Direct National Cyber Financial Fraud Line
              </span>
            </div>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-st-surface text-st-error shadow-md transition-transform group-hover:scale-105">
            <Phone size={20} strokeWidth={2} aria-hidden />
          </span>
        </a>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy1930}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-st-surface-container px-4 text-[13px] font-semibold text-st-on-surface transition-transform active:scale-95"
          >
            <Copy size={16} strokeWidth={2} aria-hidden />
            <span>Copy 1930</span>
          </button>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-st-surface-container px-4 text-[13px] font-semibold text-st-on-surface transition-transform active:scale-95"
          >
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
            <span>cybercrime.gov.in</span>
          </a>
        </div>
      </div>

      {/* Golden Hour Protocol */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-st-surface-high p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-secondary text-st-on-secondary">
            <Shield size={18} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-st-on-surface">Golden Hour Protocol</p>
            <p className="text-[13px] text-st-on-surface-variant">
              RBI guidelines protect zero-liability reporting when you alert your bank without delay.
            </p>
          </div>
        </div>
        <div className="shrink-0 pl-2 text-right">
          <span className="block text-[20px] font-bold leading-none text-st-secondary">T+0</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-st-on-surface-variant">Critical</span>
        </div>
      </div>

      {/* Recovery Playbook */}
      <section className="space-y-3" aria-labelledby="playbook-heading">
        <div className="flex items-center justify-between px-1">
          <h2 id="playbook-heading" className="text-[20px] font-bold tracking-tight text-st-on-surface">
            Recovery Playbook
          </h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
            Execute Sequentially
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Step 1 */}
          <div className="rounded-[24px] bg-st-surface-container p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-primary-container text-[13px] font-bold text-st-on-primary">
                1
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px] font-semibold text-st-on-surface">Block UPI &amp; Freeze Bank</h3>
                  <span className="rounded-full bg-st-error-container px-2.5 py-0.5 text-[10px] font-bold uppercase text-st-on-error-container">
                    Priority
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-st-on-surface-variant">
                  Stop outbound transactions before money leaves initial accounts.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toast("Use the 24×7 helpline printed on your bank card or inside your official bank app.")}
                    className="flex items-center justify-between rounded-2xl bg-st-surface p-3 text-left transition-colors hover:bg-st-surface-lowest"
                  >
                    <span className="flex items-center gap-2.5">
                      <Headset size={18} strokeWidth={2} className="text-st-primary-container" aria-hidden />
                      <span className="text-[13px] font-semibold text-st-on-surface">Call Bank 24x7 Emergency Desk</span>
                    </span>
                    <ChevronRight size={18} className="text-st-on-surface-variant" aria-hidden />
                  </button>
                  <details className="group rounded-2xl bg-st-surface p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-st-primary-container">
                      <span className="flex items-center gap-1.5">
                        <Info size={16} strokeWidth={2} aria-hidden /> Official app &amp; SMS block details
                      </span>
                      <ChevronDown size={16} className="text-st-on-surface-variant transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2.5 border-t border-st-outline-variant/40 pt-2.5 text-[13px] text-st-on-surface-variant">
                      <p>Use the number on the back of your debit card or inside your official bank app to freeze UPI and cards.</p>
                      <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-st-secondary-container/50 px-2.5 py-1.5 text-[12px] font-medium text-st-on-secondary-container">
                        <BadgeCheck size={15} strokeWidth={2} aria-hidden />
                        <span>Temporary UPI freezes can be lifted later after verification.</span>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-[24px] bg-st-surface-container p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-primary-container text-[13px] font-bold text-st-on-primary">
                2
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-st-on-surface">Save Proof &amp; 12-Digit UTR</h3>
                <p className="mt-1 text-[13px] text-st-on-surface-variant">
                  Crucial transaction artifacts required to trace and freeze recipient wallets.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-st-surface p-3">
                    <input
                      type="checkbox"
                      checked={savedUtr}
                      onChange={(e) => setSavedUtr(e.target.checked)}
                      className="h-5 w-5 accent-st-secondary"
                    />
                    <span className="text-[13px] font-semibold text-st-on-surface">
                      Screenshot transaction &amp; 12-digit UTR No.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-st-surface p-3">
                    <input
                      type="checkbox"
                      checked={notedVpa}
                      onChange={(e) => setNotedVpa(e.target.checked)}
                      className="h-5 w-5 accent-st-secondary"
                    />
                    <span className="text-[13px] font-semibold text-st-on-surface">
                      Note fraudster UPI ID / phone / suspicious link
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-[24px] bg-st-surface-container p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-primary-container text-[13px] font-bold text-st-on-primary">
                3
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-st-on-surface">File at cybercrime.gov.in</h3>
                <p className="mt-1 text-[13px] text-st-on-surface-variant">
                  Official government portal complaint creates a legal acknowledgement number.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-st-primary-container px-4 py-2.5 text-[13px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-95"
                  >
                    <span>Open Cybercrime Portal Form</span>
                    <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
                  </a>
                  <details className="group rounded-2xl bg-st-surface p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-st-primary-container">
                      <span className="flex items-center gap-1.5">
                        <ListChecks size={16} strokeWidth={2} aria-hidden /> Details to have ready
                      </span>
                      <ChevronDown size={16} className="text-st-on-surface-variant transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="mt-2.5 list-disc space-y-1 border-t border-st-outline-variant/40 pl-5 pt-2.5 text-[13px] text-st-on-surface-variant">
                      <li>Bank account number &amp; IFSC</li>
                      <li>Suspect UPI ID / phone number</li>
                      <li>Debit timestamp, UTR &amp; SMS copy</li>
                    </ul>
                  </details>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-[24px] bg-st-surface-container p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-primary-container text-[13px] font-bold text-st-on-primary">
                4
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-st-on-surface">De-link UPI &amp; Secure SIM / Device</h3>
                <p className="mt-1 text-[13px] text-st-on-surface-variant">
                  Revoke device binding and sign out active sessions if your phone or OTPs may be exposed.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href="tel:*99%23"
                    className="flex items-center justify-between rounded-2xl bg-st-surface p-3 transition-colors hover:bg-st-surface-lowest"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
                        <Smartphone size={16} strokeWidth={2} aria-hidden />
                      </span>
                      <span>
                        <span className="block text-[13px] font-semibold text-st-on-surface">Offline USSD (*99#)</span>
                        <span className="block text-[12px] text-st-on-surface-variant">Manage or deregister UPI without internet</span>
                      </span>
                    </span>
                    <ArrowRight size={16} className="text-st-on-surface-variant" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Family & Trusted Ally Support */}
      <div className="rounded-[24px] bg-st-surface-container p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-primary-fixed text-st-on-primary-fixed">
            <Users size={18} strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h3 className="text-[18px] font-bold text-st-on-surface">Family &amp; Trusted Ally Support</h3>
            <p className="text-[13px] text-st-on-surface-variant">Two heads handle triage better under panic.</p>
          </div>
        </div>
        <p className="mt-2.5 text-[13px] text-st-on-surface-variant">
          Share this actionable playbook with trusted allies to divide bank and helpline calls quickly.
        </p>
        <button
          type="button"
          onClick={shareChecklist}
          className="mt-3.5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-st-primary-container px-5 text-[15px] font-semibold text-st-on-primary shadow-md transition-transform active:scale-[0.98]"
        >
          <Share2 size={18} strokeWidth={2} aria-hidden />
          <span>Share Emergency Checklist with Family</span>
        </button>
      </div>

      {/* Exit Emergency Mode */}
      <div className="flex flex-col items-center gap-2 pt-1 text-center">
        <button
          type="button"
          onClick={() => navigate("/progress")}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-st-surface-container px-5 py-2 text-[13px] font-semibold text-st-on-surface-variant transition-colors hover:bg-st-surface-high"
        >
          <X size={16} strokeWidth={2} aria-hidden />
          <span>Exit Emergency Mode &amp; Return to Readiness</span>
        </button>
        <p className="max-w-[400px] text-[12px] text-st-on-surface-variant">
          Safe mode does not transmit personal details to servers. Helpline links connect to statutory agencies.
        </p>
      </div>
    </div>
  );
}
