import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Delete, ShieldAlert, X } from "lucide-react";
import { spring } from "@/theme/tokens";

interface MockPinPadProps {
  mode: "pin" | "otp";
  onComplete: () => void;
  onCancel: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * PracticeOS NPCI-style fake keypad. Only the NUMBER of digits is tracked;
 * the digits themselves are never stored, logged or validated.
 */
export function MockPinPad({ mode, onComplete, onCancel }: MockPinPadProps) {
  const length = mode === "pin" ? 4 : 6;
  const [filled, setFilled] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (filled < length || doneRef.current) return;
    doneRef.current = true;
    const id = window.setTimeout(onComplete, 220);
    return () => window.clearTimeout(id);
  }, [filled, length, onComplete]);

  const press = () => setFilled((n) => Math.min(length, n + 1));
  const back = () => setFilled((n) => Math.max(0, n - 1));

  return (
    <motion.div
      role="dialog"
      aria-label={mode === "pin" ? "Enter UPI PIN (practice keypad)" : "Enter OTP (practice keypad)"}
      className="absolute inset-0 z-40 flex flex-col bg-[#F6F7F9] text-zinc-900"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      {/* PracticeOS App Top Bar */}
      <div className="shrink-0 bg-[#1D4ED8] px-4 py-3 text-white shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold opacity-90">NPCI · Practice Keypad</p>
            <h2 className="truncate text-base font-extrabold leading-snug">
              {mode === "pin" ? "NPCI UPI PIN" : "OTP Verification"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel keypad"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-black/20 text-white hover:bg-black/35"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto p-3.5 space-y-3">
        {/* Warning Banner */}
        <div className="space-y-1 rounded-2xl border border-amber-500 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
            <ShieldAlert size={13} strokeWidth={2.2} aria-hidden />
            Practice Keypad · No digits stored
          </p>
          <p className="text-xs font-bold leading-snug text-zinc-900">
            {mode === "pin"
              ? "Entering your UPI PIN authorizes money to LEAVE your bank account."
              : "Entering an OTP authorizes an external action or login."}
          </p>
        </div>

        {/* Keypad Card */}
        <div className="space-y-3 rounded-2xl border border-zinc-300 bg-white p-3.5 shadow-sm">
          <p className="text-center text-[11px] font-extrabold tracking-wider text-zinc-700">
            {mode === "pin" ? "ENTER 4-DIGIT UPI PIN" : "ENTER 6-DIGIT OTP"}
          </p>
          <div className="flex justify-center gap-3 py-1" aria-label={`${filled} of ${length} digits entered`} role="img">
            {Array.from({ length }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ scale: i < filled ? 1.15 : 1 }}
                transition={spring}
                className={`inline-block h-4 w-4 rounded-full border-2 ${
                  i < filled ? "border-blue-700 bg-blue-700" : "border-zinc-500 bg-transparent"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={press}
                aria-label={`Digit ${k}`}
                className="tnum min-h-[44px] cursor-pointer rounded-xl bg-zinc-100 text-lg font-extrabold text-zinc-900 transition-colors hover:bg-zinc-200 active:bg-zinc-300"
              >
                {k}
              </button>
            ))}
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={press}
              aria-label="Digit 0"
              className="tnum min-h-[44px] cursor-pointer rounded-xl bg-zinc-100 text-lg font-extrabold text-zinc-900 transition-colors hover:bg-zinc-200 active:bg-zinc-300"
            >
              0
            </button>
            <button
              type="button"
              onClick={back}
              aria-label="Delete"
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              <Delete size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] w-full cursor-pointer rounded-xl border-2 border-blue-700 bg-white px-3.5 py-2 text-xs font-extrabold text-blue-950 transition-colors hover:bg-blue-50"
        >
          Go Back Safely
        </button>
      </div>
    </motion.div>
  );
}
