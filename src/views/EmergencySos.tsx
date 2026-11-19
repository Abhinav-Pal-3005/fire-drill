import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Hash,
  PhoneCall,
  ShieldAlert,
  Siren,
  Smartphone,
} from "lucide-react";
import { cn } from "@/utils/cn";

const GOLDEN_HOUR_STEPS = [
  {
    id: "sos-1930",
    step: "Step 1 · Within minutes",
    title: "Call 1930 (National Cyber Fraud Helpline)",
    detail:
      "Report the transaction immediately during the Golden Hour so cybercell teams can place a lien on mule bank accounts before funds are withdrawn.",
  },
  {
    id: "sos-bank",
    step: "Step 2 · Freeze accounts",
    title: "Block UPI, cards & netbanking via your bank's 24×7 helpline",
    detail:
      "Use the number printed on the back of your debit card or inside your official banking app. Ask to freeze outbound UPI/IMPS and disable international/online card transactions.",
  },
  {
    id: "sos-evidence",
    step: "Step 3 · Keep evidence",
    title: "Save UTR numbers, screenshots, SMS headers & caller numbers",
    detail:
      "Do not delete suspicious chats or uninstall remote-access apps until you screenshot the sender ID, VPA, transaction reference (UTR), and timestamps.",
  },
  {
    id: "sos-portal",
    step: "Step 4 · Official complaint",
    title: "File a formal complaint at cybercrime.gov.in",
    detail:
      "Upload your UTR numbers, bank statement snippet, and suspect handle to receive an acknowledgement number for bank chargeback and police follow-up.",
  },
  {
    id: "sos-telecom",
    step: "Step 5 · Device & SIM safety",
    title: "Report scam numbers on Chakshu & block lost SIMs",
    detail:
      "If your phone was stolen, call your telecom operator to block the SIM immediately and use CEIR (ceir.gov.in) to lock the IMEI.",
  },
];

export default function EmergencySos() {
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);

  const toggleStep = (id: string) => {
    setCheckedSteps((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 pb-8">
      {/* Hero Banner */}
      <section className="rounded-[28px] bg-st-error-container/65 p-6 shadow-sm ring-1 ring-st-error/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-st-error px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-st-on-error">
              <Siren size={13} strokeWidth={2.2} aria-hidden />
              Golden Hour SOS Guide
            </span>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-st-primary sm:text-[32px]">
              Emergency Fraud Response Playbook
            </h1>
            <p className="max-w-[56ch] text-[14.5px] leading-relaxed text-st-on-surface">
              If real money was lost or someone is coercing you right now, disconnect the call, do not enter any PIN or
              OTP, and act in the exact order below.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="tel:1930"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-st-error px-5 text-[14px] font-bold text-st-on-error shadow-sm transition-transform active:scale-[0.98]"
          >
            <PhoneCall size={17} strokeWidth={2.2} aria-hidden />
            <span>Call 1930 Helpline</span>
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-st-surface-lowest px-5 text-[14px] font-semibold text-st-primary shadow-sm transition-colors hover:bg-st-surface"
          >
            <span>Open cybercrime.gov.in</span>
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
          </a>
        </div>
      </section>

      {/* Golden Hour Step-by-Step Checklist */}
      <section className="space-y-3 rounded-[28px] bg-st-surface-container p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[20px] font-bold text-st-primary">Golden Hour Step-by-Step Checklist</h2>
            <p className="text-[13px] text-st-on-surface-variant">
              Tap each step as you complete it to stay calm and systematic.
            </p>
          </div>
          <span className="tnum rounded-full bg-st-secondary-container px-3 py-1 text-[12px] font-bold text-st-on-secondary-container">
            {checkedSteps.length} / {GOLDEN_HOUR_STEPS.length} Done
          </span>
        </div>

        <div className="space-y-2.5">
          {GOLDEN_HOUR_STEPS.map((item) => {
            const done = checkedSteps.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleStep(item.id)}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-left transition-colors",
                  done
                    ? "border-st-secondary/40 bg-st-secondary-container/45"
                    : "border-st-outline-variant/40 bg-st-surface hover:bg-st-surface-lowest",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                    done
                      ? "border-st-secondary bg-st-secondary text-st-on-secondary"
                      : "border-st-outline-variant bg-st-surface-container text-transparent",
                  )}
                  aria-hidden
                >
                  <CheckCircle2 size={15} strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-st-secondary">
                    {item.step}
                  </span>
                  <p className={cn("text-[15px] font-bold text-st-primary", done && "line-through opacity-75")}>
                    {item.title}
                  </p>
                  <p className="text-[13.5px] leading-relaxed text-st-on-surface-variant">{item.detail}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Official Channels & Offline Fallback */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-[24px] bg-st-surface-container p-5 shadow-sm">
          <div className="flex items-center gap-2 text-st-primary">
            <Hash size={18} strokeWidth={2} aria-hidden />
            <h3 className="text-[16px] font-bold">No Internet? Use USSD *99#</h3>
          </div>
          <p className="text-[13.5px] leading-relaxed text-st-on-surface-variant">
            Dial <strong>*99#</strong> from your bank-registered SIM without mobile data to manage or deregister UPI
            if your device is offline or compromised.
          </p>
        </div>

        <div className="space-y-2 rounded-[24px] bg-st-surface-container p-5 shadow-sm">
          <div className="flex items-center gap-2 text-st-primary">
            <FileText size={18} strokeWidth={2} aria-hidden />
            <h3 className="text-[16px] font-bold">What 1930 Will Ask For</h3>
          </div>
          <p className="text-[13.5px] leading-relaxed text-st-on-surface-variant">
            Keep your 12-digit <strong>UTR / transaction ID</strong>, bank name, exact rupee amount, date/time, and
            scammer UPI ID or phone number ready.
          </p>
        </div>
      </div>

      {/* Official Links & Practice Drills */}
      <section className="space-y-3 rounded-[24px] bg-st-surface-low p-5 shadow-sm">
        <h2 className="text-[16px] font-bold text-st-primary">Rehearse Recovery Drills in Safe Sandbox</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            to="/drills/lost-phone/brief"
            className="flex items-center justify-between gap-3 rounded-2xl bg-st-surface p-3.5 shadow-sm transition-colors hover:bg-st-surface-lowest"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone size={18} className="shrink-0 text-st-secondary" aria-hidden />
              <span className="text-[14px] font-semibold text-st-on-surface">Lost phone emergency drill</span>
            </div>
            <ArrowRight size={16} className="shrink-0 text-st-outline" aria-hidden />
          </Link>
          <Link
            to="/drills/wrong-transfer/brief"
            className="flex items-center justify-between gap-3 rounded-2xl bg-st-surface p-3.5 shadow-sm transition-colors hover:bg-st-surface-lowest"
          >
            <div className="flex items-center gap-2.5">
              <Building2 size={18} className="shrink-0 text-st-secondary" aria-hidden />
              <span className="text-[14px] font-semibold text-st-on-surface">Wrong transfer &amp; bank dispute</span>
            </div>
            <ArrowRight size={16} className="shrink-0 text-st-outline" aria-hidden />
          </Link>
          <Link
            to="/drills/digital-arrest/brief"
            className="flex items-center justify-between gap-3 rounded-2xl bg-st-surface p-3.5 shadow-sm transition-colors hover:bg-st-surface-lowest"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={18} className="shrink-0 text-st-secondary" aria-hidden />
              <span className="text-[14px] font-semibold text-st-on-surface">Digital arrest call response</span>
            </div>
            <ArrowRight size={16} className="shrink-0 text-st-outline" aria-hidden />
          </Link>
          <Link
            to="/progress"
            className="flex items-center justify-between gap-3 rounded-2xl bg-st-surface p-3.5 shadow-sm transition-colors hover:bg-st-surface-lowest"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-st-secondary" aria-hidden />
              <span className="text-[14px] font-semibold text-st-on-surface">Printable armor checklist</span>
            </div>
            <ArrowRight size={16} className="shrink-0 text-st-outline" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
