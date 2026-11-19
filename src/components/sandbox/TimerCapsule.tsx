import { cn } from "@/utils/cn";
import { colors } from "@/theme/tokens";
import { formatClock } from "@/utils/formatters";

interface TimerCapsuleProps {
  remainingMs: number;
  totalMs: number;
  noTimer?: boolean;
  /** Compact pill used as the floating timer on mobile. */
  compact?: boolean;
  /** Hide from assistive tech (used for the duplicate mobile capsule). */
  decorative?: boolean;
  className?: string;
}

const ANNOUNCE_AT = [60, 30, 20, 10, 5];

/** Circular timer: blue, then orange, then red in the last 20% (or calm ring in no-timer mode). */
export function TimerCapsule({
  remainingMs,
  totalMs,
  noTimer = false,
  compact = false,
  decorative = false,
  className,
}: TimerCapsuleProps) {
  const fraction = noTimer ? 1 : totalMs === 0 ? 0 : Math.max(0, Math.min(1, remainingMs / totalMs));
  const color = noTimer ? colors.success : fraction > 0.35 ? colors.accent : fraction > 0.2 ? colors.warning : colors.danger;
  const secs = Math.ceil(remainingMs / 1000);
  const announce = !noTimer && ANNOUNCE_AT.includes(secs) ? `${secs} seconds left` : "";

  const size = compact ? 28 : 132;
  const stroke = compact ? 4 : 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const ring = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(60,60,67,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.3s" }}
      />
    </svg>
  );

  if (compact) {
    return (
      <div
        aria-hidden={decorative || undefined}
        className={cn("glass-regular glass-lens relative inline-flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4", className)}
      >
        {ring}
        <span className="t-headline tnum" style={{ color: noTimer || fraction > 0.2 ? undefined : "var(--danger-text)" }}>
          {noTimer ? "No timer" : formatClock(remainingMs)}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden={decorative || undefined}
      className={cn("glass-regular glass-lens relative inline-flex items-center justify-center rounded-full p-3", className)}
    >
      <div className="relative">
        {ring}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            role={decorative ? undefined : "timer"}
            aria-label={decorative ? undefined : noTimer ? "No time limit" : "Time remaining"}
            className={cn(
              "tnum font-bold leading-none tracking-tight",
              noTimer ? "text-[17px]" : "text-[30px]",
            )}
            style={{ color: noTimer ? "var(--success-text)" : fraction > 0.2 ? "var(--label)" : "var(--danger-text)" }}
          >
            {noTimer ? "No timer" : formatClock(remainingMs)}
          </span>
          <span className="t-caption mt-1 text-label-2">{noTimer ? "relaxed" : "left"}</span>
        </div>
      </div>
      {!decorative && announce && (
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      )}
    </div>
  );
}
