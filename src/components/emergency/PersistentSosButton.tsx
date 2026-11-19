import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useEmergencyStore } from "@/store/useEmergencyStore";
import { cn } from "@/utils/cn";

interface PersistentSosButtonProps {
  compact?: boolean;
  className?: string;
}

/**
 * Persistent one-tap emergency trigger visible across the app shell.
 * Immediately locks outbound rails and transitions IDLE -> FROZEN_SELECT_TX without forms or prompts.
 */
export function PersistentSosButton({ compact = false, className }: PersistentSosButtonProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const triggerEmergency = useEmergencyStore((s) => s.triggerEmergency);

  const handleTrigger = () => {
    triggerEmergency(pathname);
    navigate("/sos");
  };

  return (
    <button
      type="button"
      onClick={handleTrigger}
      aria-label="SOS — Scammed? Tap to immediately freeze outbound payments"
      className={cn(
        "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#DC2626] px-3.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(220,38,38,0.32)] transition-transform hover:bg-[#B91C1C] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626] sm:px-4",
        compact && "px-3 text-[12px]",
        className,
      )}
    >
      <ShieldAlert size={17} strokeWidth={2.2} aria-hidden />
      <span className="hidden min-[400px]:inline">SOS / Scammed?</span>
      <span className="min-[400px]:hidden">SOS</span>
    </button>
  );
}
