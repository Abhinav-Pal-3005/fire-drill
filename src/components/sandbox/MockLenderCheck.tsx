import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { PhoneBody, PhoneButton, PhoneHeader } from "./phoneUi";

/** Fictional practice registry. Not a real list and not a real RBI lookup. */
const PRACTICE_REGISTRY = [
  "Astra Finserv Ltd",
  "Meridian Credit Co.",
  "BlueOak Capital NBFC",
  "Northwind Microfinance",
];

interface MockLenderCheckProps {
  lender: string;
  onChecked: () => void;
  onBack: () => void;
}

export function MockLenderCheck({ lender, onChecked, onBack }: MockLenderCheckProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<"found" | "missing" | null>(null);
  const [checkedName, setCheckedName] = useState("");

  const lookup = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const found = PRACTICE_REGISTRY.some((r) => r.toLowerCase() === clean.toLowerCase());
    setCheckedName(clean);
    setResult(found ? "found" : "missing");
    onChecked();
  };

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title="Lender registration check" subtitle="Practice lookup · fictional list" onBack={onBack} />
      </div>
      <PhoneBody className="space-y-3 px-3 pb-24 pt-[68px]">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(query);
          }}
        >
          <label className="block text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]" htmlFor="lender-q">
            Lender name
          </label>
          <div className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-[#cdd9ee] focus-within:ring-2 focus-within:ring-accent">
            <Search size={16} strokeWidth={1.75} className="text-[#4f5f7a]" aria-hidden />
            <input
              id="lender-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a lender name"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#0b1b3a] outline-none placeholder:text-[#7a879e]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery(lender);
              lookup(lender);
            }}
            className="min-h-[44px] rounded-full bg-[#eaf3ff] px-3.5 text-[13px] font-semibold text-accent-text hover:bg-[#dbe9ff]"
          >
            Use the lender from the SMS: {lender}
          </button>
          <PhoneButton onClick={() => lookup(query)} disabled={!query.trim()}>
            Check registration
          </PhoneButton>
        </form>

        {result && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-2xl p-3 text-[13.5px] ${
              result === "found" ? "bg-[#e5f8ea] text-[#1e7b34]" : "bg-[#fff4e0] text-[#8f4b00]"
            }`}
          >
            {result === "found" ? (
              <CheckCircle2 size={18} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            ) : (
              <AlertTriangle size={18} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            )}
            <span>
              {result === "found"
                ? `"${checkedName}" appears in this practice list.`
                : `"${checkedName}" was not found in this practice list. Be careful, and never share an OTP or KYC details with it.`}
            </span>
          </div>
        )}

        <section className="rounded-[20px] bg-white p-3.5 ring-1 ring-[#e3eaf6]">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">Practice list (fictional)</h3>
          <ul className="mt-2 space-y-1 text-[13.5px] text-[#0b1b3a]">
            {PRACTICE_REGISTRY.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-snug text-[#4f5f7a]">
            This is a practice list. In real life, RBI regulates lenders and NBFCs, so check a lender through official
            channels.
          </p>
        </section>
      </PhoneBody>
    </>
  );
}
