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
 * FAKE keypad. Only the NUMBER of digits is tracked; the digits themselves are never stored,
 * logged or validated.
 */
export function MockPinPad({ mode, onComplete, onCancel }: MockPinPadProps) {
  const length = mode === "pin" ? 4 : 6;
  const [filled, setFilled] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (filled < length || doneRef.current) return;
    doneRef.current = true;
    const id = window.setTimeout(onComplete, 260);
    return () => window.clearTimeout(id);
  }, [filled, length, onComplete]);

  const press = () => setFilled((n) => Math.min(length, n + 1));
  const back = () => setFilled((n) => Math.max(0, n - 1));

  const keyClass =
    "glass-regular relative grid h-[60px] w-[60px] place-items-center rounded-full text-[24px] font-medium text-label transition-colors hover:bg-white/90 sm:h-[64px] sm:w-[64px]";

  return (
    <motion.div
      role="dialog"
      aria-label={mode === "pin" ? "Enter UPI PIN (practice keypad)" : "Enter OTP (practice keypad)"}
      className="absolute inset-0 z-40 flex flex-col items-center justify-between overflow-y-auto bg-gradient-to-b from-[#d6e6ff] via-[#e8e4ff] to-[#f2f6fd] px-6 pb-6 pt-5"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#8f4b00]">
          <ShieldAlert size={12} strokeWidth={2} aria-hidden /> Practice keypad
        </span>
        <h2 className="text-[19px] font-bold text-[#0b1b3a]">{mode === "pin" ? "Enter UPI PIN" : "Enter OTP"}</h2>
        <p className="max-w-[24ch] text-[12.5px] text-[#4f5f7a]">Nothing you type here is saved or checked.</p>
        <div className="mt-3 flex gap-3" aria-label={`${filled} of ${length} digits entered`} role="img">
          {Array.from({ length }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ scale: i < filled ? 1.15 : 1 }}
              transition={spring}
              className={`block h-3.5 w-3.5 rounded-full ${i < filled ? "bg-accent-pressed" : "bg-[rgba(60,60,67,0.22)]"}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-5 gap-y-3 py-3">
        {KEYS.map((k) => (
          <motion.button key={k} type="button" onClick={press} whileTap={{ scale: 0.92 }} transition={spring} className={keyClass} aria-label={`Digit ${k}`}>
            <span className="tnum">{k}</span>
          </motion.button>
        ))}
        <motion.button type="button" onClick={onCancel} whileTap={{ scale: 0.92 }} transition={spring} className={keyClass} aria-label="Cancel">
          <X size={22} strokeWidth={1.75} />
        </motion.button>
        <motion.button type="button" onClick={press} whileTap={{ scale: 0.92 }} transition={spring} className={keyClass} aria-label="Digit 0">
          <span className="tnum">0</span>
        </motion.button>
        <motion.button type="button" onClick={back} whileTap={{ scale: 0.92 }} transition={spring} className={keyClass} aria-label="Delete">
          <Delete size={22} strokeWidth={1.75} />
        </motion.button>
      </div>
    </motion.div>
  );
}
