import type { ReactNode } from "react";
import { BadgePercent, Zap } from "lucide-react";
import { PhoneBody, PhoneHeader } from "./phoneUi";

interface MockLoanOfferProps {
  lender: string;
  amount: string;
  onBack: () => void;
  children: ReactNode;
}

/** Offer details screen. `children` holds the calculator and action rows. */
export function MockLoanOffer({ lender, amount, onBack, children }: MockLoanOfferProps) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Loan offer" subtitle={lender} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
        <div className="rounded-[20px] bg-gradient-to-br from-[#0a58d6] to-[#5856d6] p-4 text-white">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-white/90">
            <BadgePercent size={14} strokeWidth={2} aria-hidden /> {"\u201CPre-approved\u201D"} for you
          </p>
          <p className="tnum mt-1 text-[34px] font-bold tracking-tight">₹{amount}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/90">
            <Zap size={14} strokeWidth={2} aria-hidden /> {"\u201CInstant money. Easy EMIs.\u201D"}
          </p>
        </div>
        {children}
      </PhoneBody>
    </>
  );
}
