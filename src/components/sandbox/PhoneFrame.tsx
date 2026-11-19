import type { ReactNode } from "react";
import { BatteryFull, Clock, ShieldCheck, Signal, Wifi } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatClock } from "@/utils/formatters";

interface PhoneFrameProps {
  children: ReactNode;
  timer?: { remainingMs: number; totalMs: number };
  className?: string;
}

/**
 * iPhone-style frame on desktop (Dynamic Island, status bar, home indicator).
 * On mobile it becomes a full-width screen. A permanent SANDBOX chip and live timer live inside the frame.
 */
export function PhoneFrame({ children, timer, className }: PhoneFrameProps) {
  const fraction = timer && timer.totalMs > 0 ? Math.max(0, Math.min(1, timer.remainingMs / timer.totalMs)) : 1;
  const urgent = timer ? fraction <= 0.2 : false;
  const warn = timer ? !urgent && fraction <= 0.35 : false;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full flex-col overflow-hidden bg-white",
        "h-[calc(100dvh_-_200px)] min-h-[520px] rounded-[28px] shadow-glass",
        "lg:[--ph:max(560px,min(740px,calc(100dvh_-_170px)))] lg:h-[var(--ph)] lg:w-[calc(var(--ph)*0.47)] lg:rounded-phone lg:border-[9px] lg:border-[#1d1d1f] lg:shadow-[0_30px_80px_rgba(20,30,60,0.28)]",
        className,
      )}
    >
      <div className="absolute left-1/2 top-2 z-30 hidden h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black lg:block" aria-hidden />
      <div className="hidden h-11 shrink-0 items-end justify-between bg-white px-7 pb-1 text-[13px] font-semibold text-[#0b1b3a] lg:flex" aria-hidden>
        <span className="tnum">9:41</span>
        <span className="flex items-center gap-1">
          <Signal size={14} strokeWidth={2} />
          <Wifi size={14} strokeWidth={2} />
          <BatteryFull size={16} strokeWidth={2} />
        </span>
      </div>

      <div className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e0] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#8f4b00]">
            <ShieldCheck size={12} strokeWidth={2} aria-hidden />
            Sandbox · no real money
          </span>
          {timer && (
            <span
              className={cn(
                "tnum inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors",
                urgent
                  ? "animate-pulse bg-[#ffdad6] text-[#93000a]"
                  : warn
                    ? "bg-[#fff4e0] text-[#8f4b00]"
                    : "bg-[#eaf3ff] text-[#0062cc]",
              )}
            >
              <Clock size={12} strokeWidth={2.2} aria-hidden />
              {formatClock(timer.remainingMs)}
            </span>
          )}
        </div>
        {timer && (
          <div className="h-[3px] w-full bg-[#e3eaf6]" aria-hidden>
            <div
              className={cn(
                "h-full transition-[width,background-color] duration-200 ease-linear",
                urgent ? "bg-[#ff3b30]" : warn ? "bg-[#ff9500]" : "bg-[#007aff]",
              )}
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1 bg-[#f2f6fd]">{children}</div>

      <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-30 hidden h-[5px] w-[110px] -translate-x-1/2 rounded-full bg-[#1d1d1f]/80 lg:block" aria-hidden />
    </div>
  );
}
