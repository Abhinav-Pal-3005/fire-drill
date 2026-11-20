import type { ReactNode } from "react";
import { BadgePercent, Zap } from "lucide-react";
import type { RedFlag } from "@/types";
import { PhoneBody, PhoneButton, PhoneHeader } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";
import type { WidgetActionHandler } from "./scenes/sceneTypes";

interface MockLoanOfferProps {
  lender: string;
  amount: string;
  subtitle?: string;
  badgeLabel?: string;
  headline?: string;
  termsNote?: string;
  redFlags?: RedFlag[];
  redFlagPhrases?: string[];
  found?: string[];
  onFlag?: (flagId: string) => void;
  onMiss?: () => void;
  highlightHints?: boolean;
  onAction?: WidgetActionHandler;
  onBack?: () => void;
  children?: ReactNode;
}

/** Offer details screen. `children` holds the calculator and action rows when provided. */
export function MockLoanOffer({
  lender,
  amount,
  subtitle = lender,
  badgeLabel = "\u201CPre-approved\u201D for you",
  headline = "\u201CInstant money. Easy EMIs.\u201D",
  termsNote,
  redFlags,
  redFlagPhrases,
  found = [],
  onFlag,
  onMiss,
  highlightHints = false,
  onAction,
  onBack,
  children,
}: MockLoanOfferProps) {
  const hasTermsInspector = Boolean(
    termsNote && ((redFlags && redFlags.length > 0) || (redFlagPhrases && redFlagPhrases.length > 0)),
  );

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Loan offer" subtitle={subtitle} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
        <div className="rounded-[20px] bg-gradient-to-br from-[#0a58d6] to-[#5856d6] p-4 text-white">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-white/90">
            <BadgePercent size={14} strokeWidth={2} aria-hidden /> {badgeLabel}
          </p>
          <p className="tnum mt-1 text-[34px] font-bold tracking-tight">₹{amount}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/90">
            <Zap size={14} strokeWidth={2} aria-hidden /> {headline}
          </p>
        </div>
        {termsNote && (
          <div className="rounded-[20px] bg-white p-3.5 text-[13.5px] text-[#0b1b3a] ring-1 ring-[#e3eaf6]">
            {hasTermsInspector && onFlag && onMiss ? (
              <RedFlagText
                text={termsNote}
                flags={redFlags ?? []}
                phrases={redFlagPhrases}
                found={found}
                onFlag={onFlag}
                onMiss={onMiss}
                highlightHints={highlightHints}
              />
            ) : (
              <p className="leading-snug text-[#33415c]">{termsNote}</p>
            )}
          </div>
        )}
        {children}
        {!children && onAction && (
          <div className="space-y-2">
            <PhoneButton variant="secondary" onClick={() => onAction("VERIFY_LENDER", { lender })}>
              Check RBI lender registration
            </PhoneButton>
            <PhoneButton variant="secondary" onClick={() => onAction("DECLINE_REQUEST", { lender })}>
              Decline offer &amp; revoke permissions
            </PhoneButton>
            <PhoneButton onClick={() => onAction("APPROVE_LOAN", { lender, amount })}>
              Approve instant loan ₹{amount}
            </PhoneButton>
          </div>
        )}
      </PhoneBody>
    </>
  );
}
