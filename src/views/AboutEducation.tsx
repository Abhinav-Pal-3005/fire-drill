import { useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Hash,
  Lock,
  PhoneCall,
  RotateCcw,
  Scale,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  UserCheck,
  Wrench,
} from "lucide-react";
import { toast } from "@/components/glass/GlassToast";
import { getReadiness } from "@/features/adaptive/adaptiveEngine";
import { useFirebaseAuth } from "@/providers/FirebaseProvider";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useDrillStore } from "@/store/useDrillStore";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/utils/cn";

export default function AboutEducation() {
  const demoSeed = useUserStore((s) => s.demoSeed);
  const setDemoSeed = useUserStore((s) => s.setDemoSeed);
  const displayName = useUserStore((s) => s.displayName);
  const photoUrl = useUserStore((s) => s.photoUrl);
  const attempts = useDrillStore((s) => s.attempts);
  const resetDrills = useDrillStore((s) => s.resetAll);
  const clearEvents = useAnalyticsStore((s) => s.clear);
  const { user } = useFirebaseAuth();

  const [confirm, setConfirm] = useState(false);
  const [showUssdGuide, setShowUssdGuide] = useState(false);

  const readiness = useMemo(() => getReadiness(attempts), [attempts]);
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "AR";

  const reset = () => {
    resetDrills();
    clearEvents();
    setConfirm(false);
    toast(user ? "Cloud and local practice history cleared." : "Simulation history & local practice data cleared.");
  };

  return (
    <div className="mx-auto flex w-full max-w-[740px] flex-col gap-5 pb-8">
      {/* Status & Sandbox Assurance Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-st-surface-high px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-st-secondary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-st-on-surface-variant">
            Sandbox Safety Shield Active
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-st-secondary">
          <ShieldCheck size={15} strokeWidth={2} aria-hidden />
          100% Mock Data
        </span>
      </div>

      {/* User Profile Micro-Card */}
      <div className="flex items-center justify-between gap-3 rounded-[24px] bg-st-surface-low p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-12 w-12 shrink-0 overflow-hidden place-items-center rounded-full bg-st-primary-container text-[15px] font-bold text-st-on-primary">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={displayName}
                width={48}
                height={48}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-st-secondary text-st-on-secondary shadow-sm">
              <UserCheck size={11} strokeWidth={2.2} aria-hidden />
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-bold text-st-on-surface">{displayName}</h1>
            <p className="truncate text-[13px] text-st-on-surface-variant">
              Readiness {readiness}/100 · {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
            </p>
          </div>
        </div>
        <Link
          to="/profile"
          className="shrink-0 rounded-full bg-st-surface-highest px-4 py-2 text-[13px] font-bold text-st-primary-container transition-colors hover:bg-st-primary-container hover:text-st-on-primary"
        >
          Inspect
        </Link>
      </div>

      {/* SECTION 1: SIMULATION & DRILL ENGINE */}
      <section className="space-y-1.5">
        <h2 className="px-2 text-[11px] font-bold uppercase tracking-wider text-st-on-surface-variant">
          Simulation &amp; Drill Engine
        </h2>
        <div className="divide-y divide-st-outline-variant/40 overflow-hidden rounded-[24px] bg-st-surface-low shadow-sm">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-primary-container text-st-on-primary shadow-sm">
                <SlidersHorizontal size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-st-on-surface">Demo seed for first collect run</p>
                <p className="text-[13px] text-st-on-surface-variant">
                  Uses fixed ₹4,500 on your first collect-request drill for predictable demos; later runs randomise.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={demoSeed}
              aria-label="Use demo seed for first collect-request run"
              onClick={() => {
                setDemoSeed(!demoSeed);
                toast(!demoSeed ? "Demo seed enabled" : "Demo seed disabled");
              }}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors",
                demoSeed ? "bg-st-primary-container" : "bg-st-surface-dim",
              )}
            >
              <span
                className={cn(
                  "block h-6 w-6 rounded-full bg-st-surface-lowest shadow-md transition-transform",
                  demoSeed ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-surface-highest text-st-primary-container">
                <Shuffle size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-st-on-surface">Dynamic Deception Seed</p>
                <p className="text-[13px] text-st-on-surface-variant">
                  Names &amp; amounts randomise on replay; grading stays deterministic (40% steps, 25% order, 20% flags,
                  15% speed).
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-st-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-st-on-secondary-container">
              Active
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: EMERGENCY SOS & OFFICIAL RESOURCES */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-st-tertiary-container">
            Emergency SOS &amp; Official Resources
          </h2>
          <span className="text-[12px] text-st-on-surface-variant">Statutory channels</span>
        </div>
        <div className="divide-y divide-st-outline-variant/40 overflow-hidden rounded-[24px] bg-st-surface-low shadow-sm">
          <Link to="/sos" className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-st-surface-container">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-error text-st-on-error shadow-sm">
                <PhoneCall size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[15px] font-bold text-st-on-surface">
                  <span>Emergency SOS Triage &amp; 1930</span>
                  <span className="rounded-full bg-st-error-container px-2 py-0.5 text-[11px] font-bold text-st-on-error-container">
                    1930
                  </span>
                </p>
                <p className="truncate text-[13px] text-st-on-surface-variant">
                  Open the Golden Hour step-by-step response playbook
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-st-on-surface-variant" aria-hidden />
          </Link>

          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-st-surface-container"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-surface-highest text-st-primary-container">
                <Scale size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-st-on-surface">National Cyber Crime Portal</p>
                <p className="truncate text-[13px] text-st-on-surface-variant">
                  cybercrime.gov.in · RBI, NPCI &amp; official bank 24×7 helpline directory
                </p>
              </div>
            </div>
            <ExternalLink size={17} className="shrink-0 text-st-on-surface-variant" aria-hidden />
          </a>
        </div>
      </section>

      {/* SECTION 3: PRIVACY & OFFLINE RESILIENCE */}
      <section className="space-y-1.5">
        <h2 className="px-2 text-[11px] font-bold uppercase tracking-wider text-st-on-surface-variant">
          Privacy &amp; Offline Resilience
        </h2>
        <div className="divide-y divide-st-outline-variant/40 overflow-hidden rounded-[24px] bg-st-surface-low shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-secondary-container text-st-on-secondary-container">
                <Lock size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-st-on-surface">Privacy-First Persistence</p>
                <p className="text-[13px] text-st-on-surface-variant">
                  {user
                    ? "Your drill history, readiness & checklist sync to your private Firestore space via Google Auth. No real PINs are ever stored."
                    : "No real PINs are checked (only digit count). Sign in with Google anytime to back up your practice metrics to Firestore."}
                </p>
              </div>
            </div>
            <CheckCircle2 size={20} className="shrink-0 text-st-secondary" aria-hidden />
          </div>

          <div className="p-4">
            <button
              type="button"
              onClick={() => setShowUssdGuide((v) => !v)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-surface-highest text-st-primary-container">
                  <Hash size={18} strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-st-on-surface">Offline USSD Guide (*99#)</p>
                  <p className="text-[13px] text-st-on-surface-variant">
                    Emergency bank/UPI steps even when mobile data is unavailable
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                className={cn("shrink-0 text-st-on-surface-variant transition-transform", showUssdGuide && "rotate-90")}
                aria-hidden
              />
            </button>
            {showUssdGuide && (
              <div className="mt-3 rounded-2xl bg-st-surface p-3.5 text-[13px] leading-relaxed text-st-on-surface-variant">
                Dial <strong>*99#</strong> from your bank-registered SIM without internet to check UPI status or
                deregister UPI, or call <strong>1930</strong> / your bank&apos;s 24×7 toll-free helpline printed on the
                back of your debit card.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-st-error-container/25"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-error-container text-st-on-error-container">
                <RotateCcw size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-st-error">Reset Practice Data &amp; History</p>
                <p className="text-[13px] text-st-on-surface-variant">
                  Clears attempts, scores, and analytics events stored in this browser
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-st-error" aria-hidden />
          </button>
        </div>
      </section>

      {/* SECTION 4: EDUCATION & SCOPE */}
      <section className="space-y-3 rounded-[24px] bg-st-surface-low p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-st-surface-highest text-st-primary-container">
            <BookOpen size={18} strokeWidth={2} aria-hidden />
          </span>
          <h2 className="text-[17px] font-bold text-st-primary">Education, not advice</h2>
        </div>
        <p className="text-[14px] leading-relaxed text-st-on-surface-variant">
          Everything here is pre-written for learning. It is not personal, legal, or financial advice, and no real
          payments ever happen. Names of apps, banks, and lenders in drills are invented. A critical mistake, like
          entering a PIN to receive money, caps the drill score at 20%.
        </p>

        <div className="pt-2">
          <div className="mb-2 flex items-center gap-2">
            <Wrench size={16} className="text-st-on-surface-variant" aria-hidden />
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-st-on-surface-variant">Architecture</h3>
          </div>
          <ul className="space-y-2 text-[13px] text-st-on-surface-variant">
            {[
              ["Google Sign-In", "Authenticates your identity securely with Firebase Auth."],
              ["Cloud Firestore", "Persists your drill attempts, readiness, bookmarks, checklist, and live alerts."],
              ["Live advisories", "Refreshed weekly via grounded search for real Indian cyber-fraud cases and added to your library."],
            ].map(([name, text]) => (
              <li key={name} className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-st-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-st-on-tertiary-fixed">
                  {name === "Live advisories" ? "WEEKLY" : "CLOUD"}
                </span>
                <span>
                  <strong className="font-semibold text-st-on-surface">{name}:</strong> {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-[480px] space-y-4 rounded-[28px] bg-st-surface-low p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-st-error">
              <AlertTriangle size={24} strokeWidth={2} aria-hidden />
              <h3 id="reset-dialog-title" className="text-[20px] font-bold text-st-on-surface">
                Reset All Practice Data?
              </h3>
            </div>
            <p className="text-[14px] leading-relaxed text-st-on-surface-variant">
              {user
                ? "This removes your completed attempts, readiness scores, bookmarks, and analytics events from both this browser and your Firestore account. This cannot be undone."
                : "This removes your completed attempts, readiness scores, and analytics events from this browser. This cannot be undone."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={reset}
                className="min-h-[48px] w-full rounded-full bg-st-error font-semibold text-st-on-error shadow-sm transition-transform active:scale-[0.98]"
              >
                Confirm Complete Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="min-h-[46px] w-full rounded-full bg-st-surface-highest font-semibold text-st-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
