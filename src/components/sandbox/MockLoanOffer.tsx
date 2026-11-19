import type { ReactNode } from "react";
import { BadgePercent, Zap } from "lucide-react";
import type { RedFlag } from "@/types";
import { PhoneBody, PhoneHeader } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";

interface MockLoanOfferProps {
  lender: string;
  amount: string;
  headline?: string;
  tagline?: string;
  termsNote?: string;
  redFlags?: RedFlag[];
  redFlagPhrases?: string[];
  found?: string[];
  onFlag?: (flagId: string) => void;
  onMiss?: () => void;
  onBack?: () => void;
  children?: ReactNode;
}

/** Offer details screen. `children` holds the calculator and action rows. */
export function MockLoanOffer({
  lender,
  amount,
  headline = "\u201CPre-approved\u201D for you",
  tagline = "\u201CInstant money. Easy EMIs.\u201D",
  termsNote,
  redFlags,
  redFlagPhrases,
  found,
  onFlag,
  onMiss,
  onBack,
  children,
}: MockLoanOfferProps) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Loan offer" subtitle={lender} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
        <div className="rounded-[20px] bg-gradient-to-br from-[#0a58d6] to-[#5856d6] p-4 text-white">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-white/90">
            <BadgePercent size={14} strokeWidth={2} aria-hidden /> {headline}
          </p>
          <p className="tnum mt-1 text-[34px] font-bold tracking-tight">₹{amount}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/90">
            <Zap size={14} strokeWidth={2} aria-hidden /> {tagline}
          </p>
        </div>
        {termsNote && (
          <div className="rounded-[20px] bg-white p-3.5 text-[13.5px] text-[#0b1b3a] ring-1 ring-[#e3eaf6]">
            <RedFlagText
              text={termsNote}
              flags={redFlags}
              phrases={redFlagPhrases}
              found={found}
              onFlag={onFlag}
              onMiss={onMiss}
            />
          </div>
        )}
        {children}
      </PhoneBody>
    </>
  );
}
