import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";

interface ToastItem {
  id: number;
  message: string;
  stub: boolean;
}

interface ToastStore {
  items: ToastItem[];
  push: (message: string, stub: boolean) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, stub) => {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { id, message, stub }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** Show a transient toast. Pass `stub: true` for clearly labelled mock features. */
export function toast(message: string, options: { stub?: boolean; durationMs?: number } = {}): void {
  const id = useToastStore.getState().push(message, Boolean(options.stub));
  window.setTimeout(() => useToastStore.getState().dismiss(id), options.durationMs ?? 3200);
}

interface GlassToastProps {
  children: ReactNode;
  onClose?: () => void;
  icon?: ReactNode;
  className?: string;
}

/** Presentational glass toast, also used for hints. */
export function GlassToast({ children, onClose, icon, className }: GlassToastProps) {
  return (
    <div
      role="status"
      className={cn("glass-thick relative flex items-start gap-3 rounded-[20px] py-3 pl-4 pr-3", className)}
    >
      <span className="mt-0.5 text-accent-text">{icon ?? <Info size={20} strokeWidth={1.75} />}</span>
      <div className="t-subhead min-w-0 flex-1 pt-px text-label">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-label-2 hover:bg-black/5"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

/** Mount once in the app shell. */
export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[110] flex flex-col items-center gap-2 px-4 lg:bottom-8">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={spring}
            className="pointer-events-auto w-full max-w-[420px]"
          >
            <GlassToast onClose={() => dismiss(t.id)}>
              {t.stub && <span className="mr-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-text">STUB</span>}
              {t.message}
            </GlassToast>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
