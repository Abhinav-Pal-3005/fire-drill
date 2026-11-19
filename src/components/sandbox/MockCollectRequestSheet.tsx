import { motion } from "framer-motion";
import { spring } from "@/theme/tokens";
import { PhoneButton } from "./phoneUi";

interface MockCollectRequestSheetProps {
  name: string;
  upiId: string;
  amount: string;
  note: string;
  onApprove: () => void;
  onDecline: () => void;
  onClose: () => void;
}

/** In-phone bottom sheet showing a collect request with Pay and Decline. */
export function MockCollectRequestSheet({ name, upiId, amount, note, onApprove, onDecline, onClose }: MockCollectRequestSheetProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-end">
      <motion.button
        type="button"
        aria-label="Close request"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.div
        role="dialog"
        aria-label="Collect request"
        className="relative w-full rounded-t-[28px] bg-white px-4 pb-6 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.18)]"
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
        <dl className="mt-3 space-y-1.5 rounded-2xl bg-[#f2f6fd] p-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-[#4f5f7a]">UPI ID</dt>
            <dd className="truncate font-semibold text-[#0b1b3a]">{upiId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#4f5f7a]">Note</dt>
            <dd className="truncate text-right font-semibold text-[#0b1b3a]">{note}</dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <PhoneButton variant="secondary" onClick={onDecline}>
            Decline
          </PhoneButton>
          <PhoneButton onClick={onApprove}>Pay ₹{amount}</PhoneButton>
        </div>
      </motion.div>
    </div>
  );
}
