import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";

interface GlassToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** iOS-style switch. The 44px hit area wraps a 51x31 track. */
export function GlassToggle({ checked, onChange, label, disabled = false }: GlassToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <span
        className={cn(
          "relative block h-[31px] w-[51px] rounded-full transition-colors duration-200",
          checked ? "bg-success" : "bg-[rgba(120,120,128,0.32)]",
        )}
      >
        <motion.span
          className="absolute left-[2px] top-[2px] block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
          animate={{ x: checked ? 20 : 0 }}
          transition={spring}
        />
      </span>
    </button>
  );
}
