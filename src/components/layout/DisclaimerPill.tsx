import { ExternalLink, Info, Landmark, Phone, ShieldAlert, Building2, Scale } from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { layout } from "@/theme/tokens";

interface DisclaimerPillProps {
  onClick: () => void;
  sandbox?: boolean;
}

/** Slim capsule shown under the nav bar on every screen. */
export function DisclaimerPill({ onClick, sandbox = false }: DisclaimerPillProps) {
  if (sandbox) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className="glass-thin relative inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full px-3 transition-transform active:scale-[0.97]"
      >
        <Info size={14} strokeWidth={1.75} className="shrink-0 text-accent-text" aria-hidden />
        <span className="t-caption truncate text-label">{layout.disclaimer}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex max-w-full items-center gap-2 rounded-full bg-st-surface-container-high px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-st-on-surface-variant transition-colors hover:bg-st-surface-highest active:scale-[0.98]"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-st-secondary" aria-hidden />
      <span className="truncate">Education Sandbox · No Real Money</span>
    </button>
  );
}

interface ResourcesSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ResourcesSheet({ open, onClose }: ResourcesSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title="Official resources">
      <p className="t-subhead mb-4 text-label-2">
        Money Fire Drill is for practice only. {layout.disclaimer} If something real has happened, use these official
        routes as soon as possible.
      </p>
      <ul className="surface divide-y divide-separator overflow-hidden rounded-card">
        <li className="flex items-start gap-3 p-4">
          <Phone size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="t-headline">National cybercrime helpline</p>
            <p className="t-subhead text-label-2">Call 1930 to report cyber fraud.</p>
          </div>
          <a
            href="tel:1930"
            className="t-headline tnum inline-flex min-h-[44px] items-center rounded-full px-3 text-accent-text hover:bg-accent-tint"
          >
            1930
          </a>
        </li>
        <li className="flex items-start gap-3 p-4">
          <ShieldAlert size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="t-headline">Cybercrime reporting portal</p>
            <p className="t-subhead text-label-2">Report online at cybercrime.gov.in.</p>
          </div>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open cybercrime.gov.in in a new tab"
            className="grid h-11 w-11 place-items-center rounded-full text-accent-text hover:bg-accent-tint"
          >
            <ExternalLink size={18} strokeWidth={1.75} />
          </a>
        </li>
        <li className="flex items-start gap-3 p-4">
          <Building2 size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <div>
            <p className="t-headline">Your bank</p>
            <p className="t-subhead text-label-2">
              Banks have 24×7 helplines. Use the number on your card or inside the bank&apos;s official app.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3 p-4">
          <Scale size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <div>
            <p className="t-headline">NPCI dispute redressal</p>
            <p className="t-subhead text-label-2">
              NPCI has a dispute redressal process for payments. Start in your payment app and bank, then check the
              current steps on official channels.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3 p-4">
          <Landmark size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <div>
            <p className="t-headline">RBI</p>
            <p className="t-subhead text-label-2">
              RBI regulates banks, lenders and NBFCs. Check a lender through official channels before sharing anything.
            </p>
          </div>
        </li>
      </ul>
    </GlassSheet>
  );
}
