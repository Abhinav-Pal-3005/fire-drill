import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { spring } from "@/theme/tokens";
import type { RedFlag } from "@/types";
import { PhoneButton } from "./phoneUi";
import { RedFlagText } from "./RedFlagText";
import type { WidgetActionHandler } from "./scenes/sceneTypes";

interface MockCollectRequestSheetProps {
  name: string;
  upiId: string;
  amount: string;
  note: string;
  bankName?: string;
  warningBanner?: string;
  redFlags?: RedFlag[];
  redFlagPhrases?: string[];
  found?: string[];
  onFlag?: (flagId: string) => void;
  onMiss?: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  onClose?: () => void;
  onAction?: WidgetActionHandler;
}

/** In-phone bottom sheet showing a collect request with Pay and Decline. */
export function MockCollectRequestSheet({
  name,
  upiId,
  amount,
  note,
  bankName,
  warningBanner,
  redFlags,
  redFlagPhrases,
  found,
  onFlag,
  onMiss,
  onApprove,
  onDecline,
  onClose,
  onAction,
}: MockCollectRequestSheetProps) {
  const handleApprove = () => {
    onApprove?.();
    onAction?.("ACCEPT_COLLECT", { label: `Approve collect request (₹${amount})`, amount, upiId });
  };

  const handleDecline = () => {
    onDecline?.();
    onAction?.("DECLINE_REQUEST", { label: "Declined collect request", amount, upiId });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end">
      <motion.button
        type="button"
        aria-label="Close request"
        onClick={onClose ?? handleDecline}
        className="absolute inset-0 bg-black/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.div
        role="dialog"
        aria-label="Collect request"
        className="relative max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-white px-4 pb-6 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.18)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={spring}
      >
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-black/15" aria-hidden />
        <p className="text-center text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">Collect request</p>
        <p className="mt-1 text-center text-[15px] text-[#0b1b3a]">
          <strong>{name}</strong> is requesting
        </p>
        <p className="tnum text-center text-[34px] font-bold tracking-tight text-[#0b1b3a]">₹{amount}</p>

        {warningBanner && (
          <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-amber-400/70 bg-amber-50 p-2.5 text-[12px] font-semibold text-amber-950">
            <AlertTriangle size={15} strokeWidth={2.2} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
            <span>{warningBanner}</span>
          </div>
        )}

        <dl className="mt-3 space-y-2 rounded-2xl bg-[#f2f6fd] p-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-[#4f5f7a]">UPI ID</dt>
            <dd className="min-w-0 truncate font-semibold text-[#0b1b3a]">{upiId}</dd>
          </div>
          {bankName && (
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-[#4f5f7a]">Debit account</dt>
              <dd className="truncate font-semibold text-[#0b1b3a]">{bankName}</dd>
            </div>
          )}
          <div className="space-y-1 border-t border-[#dbe6fa] pt-2">
            <dt className="text-[11.5px] font-bold uppercase tracking-wide text-[#4f5f7a]">Requester note</dt>
            <dd className="font-semibold text-[#0b1b3a]">
              {redFlags || redFlagPhrases ? (
                <RedFlagText
                  text={note}
                  flags={redFlags}
                  phrases={redFlagPhrases}
                  found={found}
                  onFlag={onFlag}
                  onMiss={onMiss}
                  className="text-[13px] font-semibold text-[#0b1b3a]"
                />
              ) : (
                note
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <PhoneButton variant="secondary" onClick={handleDecline}>
            Decline
          </PhoneButton>
          <PhoneButton onClick={handleApprove}>Pay ₹{amount}</PhoneButton>
        </div>
      </motion.div>
    </div>
  );
}
