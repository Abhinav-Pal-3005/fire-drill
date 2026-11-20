import type { ReactNode } from "react";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { PhoneBody, PhoneButton, PhoneHeader } from "./phoneUi";

interface MockComplaintFormProps {
  title: string;
  intro: string;
  /** Read-only details shown at the top (UPI ID, transaction ID...). */
  details: Array<{ label: string; value: string }>;
  reasons: string[];
  submitLabel: string;
  successText: string;
  onSubmit: () => void;
  onBack: () => void;
  embedded?: boolean;
  children?: ReactNode;
}

/** Generic complaint / report form. Submit stays disabled until a reason is chosen. */
export function MockComplaintForm({
  title,
  intro,
  details,
  reasons,
  submitLabel,
  successText,
  onSubmit,
  onBack,
  embedded = false,
  children,
}: MockComplaintFormProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const formContent = (
    <>
      <p className="px-0.5 text-[13px] leading-snug text-[#33415c]">{intro}</p>
      <dl className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3.5 text-[12.5px]">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between gap-3">
            <dt className="text-[#4f5f7a]">{d.label}</dt>
            <dd className="tnum truncate font-semibold text-[#0b1b3a]">{d.value}</dd>
          </div>
        ))}
      </dl>
      <fieldset className="space-y-2">
        <legend className="px-0.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#4f5f7a]">Reason</legend>
        {reasons.map((r) => (
          <label
            key={r}
            className={cn(
              "flex min-h-[46px] cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 text-[13px] font-semibold text-[#0b1b3a] transition-colors",
              reason === r ? "border-blue-700 ring-1 ring-blue-700" : "border-zinc-200 hover:bg-[#f7faff]",
            )}
          >
            <input
              type="radio"
              name="reason"
              checked={reason === r}
              onChange={() => setReason(r)}
              disabled={done}
              className="h-4 w-4 accent-[#007aff]"
            />
            {r}
          </label>
        ))}
      </fieldset>
      {done ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-emerald-400 bg-[#e5f8ea] p-3 text-[13px] font-semibold text-[#1e7b34]"
        >
          <CheckCircle2 size={17} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
          {successText}
        </p>
      ) : (
        <PhoneButton
          disabled={!reason}
          onClick={() => {
            setDone(true);
            onSubmit();
          }}
        >
          {submitLabel}
        </PhoneButton>
      )}
      {children}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        {formContent}
        <button
          type="button"
          onClick={onBack}
          className="min-h-[40px] w-full cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title={title} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">{formContent}</PhoneBody>
    </>
  );
}
