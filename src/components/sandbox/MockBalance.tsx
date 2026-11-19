import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { PhoneBody, PhoneHeader } from "./phoneUi";

interface MockBalanceProps {
  balance: string;
  note?: string;
  onBack: () => void;
  children?: ReactNode;
}

/** Balance and history screen. No PIN is needed in this sandbox view. */
export function MockBalance({ balance, note, onBack, children }: MockBalanceProps) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Balance and history" onBack={onBack} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
        <div className="rounded-[20px] bg-white p-4 ring-1 ring-[#e3eaf6]">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">Practice balance</p>
          <p className="tnum mt-1 text-[32px] font-bold tracking-tight text-[#0b1b3a]">₹{balance}</p>
          {note && (
            <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-[#1e7b34]">
              <CheckCircle2 size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              {note}
            </p>
          )}
        </div>
        <h3 className="px-1 text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">Recent activity</h3>
        {children}
      </PhoneBody>
    </>
  );
}
