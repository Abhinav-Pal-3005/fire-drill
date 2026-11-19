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
}: MockComplaintFormProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10">
        <PhoneHeader title={title} onBack={onBack} />
      </div>
      <PhoneBody className="space-y-4 px-3 pb-24 pt-[68px]">
        <p className="px-1 text-[13.5px] leading-snug text-[#33415c]">{intro}</p>
        <dl className="space-y-2 rounded-[20px] bg-white p-3.5 text-[13px] ring-1 ring-[#e3eaf6]">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between gap-3">
              <dt className="text-[#4f5f7a]">{d.label}</dt>
              <dd className="tnum truncate font-semibold text-[#0b1b3a]">{d.value}</dd>
            </div>
          ))}
        </dl>
        <fieldset className="space-y-2">
          <legend className="px-1 pb-1 text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">Reason</legend>
          {reasons.map((r) => (
            <label
              key={r}
              className={cn(
                "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl bg-white px-3 text-[14px] font-medium text-[#0b1b3a] ring-1 transition-colors",
                reason === r ? "ring-2 ring-accent" : "ring-[#e3eaf6] hover:bg-[#f7faff]",
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
          <p role="status" className="flex items-start gap-2 rounded-2xl bg-[#e5f8ea] p-3 text-[13.5px] font-medium text-[#1e7b34]">
            <CheckCircle2 size={18} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
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
      </PhoneBody>
    </>
  );
}
