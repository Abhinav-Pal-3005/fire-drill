import { useState } from "react";
import { Calculator } from "lucide-react";
import { formatINR } from "@/utils/formatters";
import { PhoneButton } from "./phoneUi";

interface MockInterestCalculatorProps {
  /** Starting loan amount in rupees. */
  principal: number;
  onCalculate: () => void;
}

/**
 * Interactive calculator. Everything here is an "Illustrative example":
 * simple monthly interest for learning, not a real offer or rate.
 */
export function MockInterestCalculator({ principal, onCalculate }: MockInterestCalculatorProps) {
  const [amount, setAmount] = useState(principal);
  const [months, setMonths] = useState(6);
  const [rate, setRate] = useState(3);
  const [shown, setShown] = useState(false);

  const interest = (amount * rate * months) / 100;
  const total = amount + interest;

  const slider = "h-11 w-full cursor-pointer accent-[#007aff]";

  return (
    <section aria-label="Interest calculator" className="space-y-3 rounded-[20px] bg-white p-3.5 ring-1 ring-[#e3eaf6]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-[#0b1b3a]">
          <Calculator size={16} strokeWidth={1.75} aria-hidden /> Interest calculator
        </h3>
        <span className="rounded-full bg-[#fff4e0] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8f4b00]">
          Illustrative example
        </span>
      </div>

      <label className="block text-[12.5px] text-[#33415c]">
        <span className="flex justify-between">
          <span>Loan amount</span>
          <strong className="tnum text-[#0b1b3a]">{formatINR(amount)}</strong>
        </span>
        <input type="range" min={1000} max={50000} step={500} value={amount} onChange={(e) => { setAmount(Number(e.target.value)); setShown(false); }} className={slider} />
      </label>
      <label className="block text-[12.5px] text-[#33415c]">
        <span className="flex justify-between">
          <span>Months to repay</span>
          <strong className="tnum text-[#0b1b3a]">{months}</strong>
        </span>
        <input type="range" min={1} max={12} step={1} value={months} onChange={(e) => { setMonths(Number(e.target.value)); setShown(false); }} className={slider} />
      </label>
      <label className="block text-[12.5px] text-[#33415c]">
        <span className="flex justify-between">
          <span>Interest per month</span>
          <strong className="tnum text-[#0b1b3a]">{rate}%</strong>
        </span>
        <input type="range" min={1} max={8} step={0.5} value={rate} onChange={(e) => { setRate(Number(e.target.value)); setShown(false); }} className={slider} />
      </label>

      <PhoneButton
        variant="secondary"
        onClick={() => {
          setShown(true);
          onCalculate();
        }}
      >
        Show total repayment
      </PhoneButton>

      {shown && (
        <div role="status" className="rounded-2xl bg-[#eaf3ff] p-3 text-[13px] text-[#0b1b3a]">
          <p className="flex justify-between">
            <span>Extra paid as interest</span>
            <strong className="tnum">{formatINR(interest)}</strong>
          </p>
          <p className="mt-1 flex justify-between text-[15px]">
            <span className="font-semibold">Total you repay</span>
            <strong className="tnum">{formatINR(total)}</strong>
          </p>
        </div>
      )}
      <p className="text-[11.5px] leading-snug text-[#4f5f7a]">
        Illustrative example only. Simple monthly interest to show how cost adds up. It is not a real offer, rate or advice.
      </p>
    </section>
  );
}
