import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MousePointerClick, ScanLine, Send, type LucideIcon } from "lucide-react";
import type { Drill } from "@/types";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";

/* In-phone UI kit: a clean blue/white payment-app look (solid surfaces, not glass). */

export function PhoneHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex min-h-[56px] items-center gap-2 border-b border-[#e3eaf6] bg-white px-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-11 w-11 place-items-center rounded-full text-accent-text hover:bg-[#eaf3ff]"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-bold leading-tight text-[#0b1b3a]">{title}</p>
        {subtitle && <p className="truncate text-[12px] text-[#4f5f7a]">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PhoneBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("absolute inset-0 overflow-y-auto overscroll-contain", className)}>{children}</div>;
}

type PhoneButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonClass: Record<PhoneButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-pressed active:bg-accent-pressed",
  secondary: "bg-white text-[#0b1b3a] ring-1 ring-[#cdd9ee] hover:bg-[#f2f6fd] active:bg-[#e8eefb]",
  danger: "bg-[#d62d23] text-white hover:bg-[#b9241b] active:bg-[#b9241b]",
  ghost: "bg-transparent text-accent-text hover:bg-[#eaf3ff] active:bg-[#dbe9ff]",
};

export function PhoneButton({
  variant = "primary",
  onClick,
  children,
  icon,
  disabled = false,
  full = true,
  className,
}: {
  variant?: PhoneButtonVariant;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  full?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      className={cn(
        "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition-colors",
        buttonClass[variant],
        full && "w-full",
        disabled && "pointer-events-none opacity-45",
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export function PhoneRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  trailing,
  tone = "default",
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  tone?: "default" | "alert";
}) {
  const content = (
    <>
      {Icon && (
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            tone === "alert" ? "bg-[#ffeceb] text-[#b9241b]" : "bg-[#eaf3ff] text-accent-text",
          )}
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold leading-snug text-[#0b1b3a]">{title}</span>
        {subtitle && <span className="block text-[12.5px] leading-snug text-[#4f5f7a]">{subtitle}</span>}
      </span>
      {trailing ?? (onClick ? <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-[#4f5f7a]" /> : null)}
    </>
  );
  const base = "flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#e3eaf6]";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(base, "transition-colors hover:bg-[#f7faff] active:bg-[#eaf3ff]")}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}

export function PhoneSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      {title && <h3 className="px-1 text-[12px] font-bold uppercase tracking-wide text-[#4f5f7a]">{title}</h3>}
      {children}
    </section>
  );
}

/** Tiny in-phone snackbar so wrong taps get neutral feedback without giving the answer away. */
export function useSnack(): { snack: ReactNode; show: (message: string) => void } {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 1800);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const snack = (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={spring}
          className="pointer-events-none absolute inset-x-4 bottom-6 z-20 rounded-2xl bg-[#0b1b3a] px-4 py-3 text-center text-[13px] font-medium text-white"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { snack, show };
}

const DISTRACTOR_ICONS: Record<string, LucideIcon> = { send_money: Send, scan_qr: ScanLine };

export interface HomeTile {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

/** Distractors that belong on a given screen, shaped as home-screen tiles. */
export function distractorTiles(drill: Drill, screen: string, onTap: (key: string, label: string) => void): HomeTile[] {
  return drill.distractors
    .filter((d) => d.screen === screen)
    .map((d) => ({
      id: d.id,
      label: d.label,
      icon: DISTRACTOR_ICONS[d.actionKey] ?? MousePointerClick,
      onClick: () => onTap(d.actionKey, d.label),
    }));
}

/** Distractors that belong on a given screen, shaped as list rows. */
export function DistractorRows({
  drill,
  screen,
  onTap,
}: {
  drill: Drill;
  screen: string;
  onTap: (key: string, label: string) => void;
}) {
  const items = drill.distractors.filter((d) => d.screen === screen);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((d) => (
        <PhoneRow
          key={d.id}
          icon={DISTRACTOR_ICONS[d.actionKey] ?? MousePointerClick}
          title={d.label}
          onClick={() => onTap(d.actionKey, d.label)}
        />
      ))}
    </div>
  );
}
