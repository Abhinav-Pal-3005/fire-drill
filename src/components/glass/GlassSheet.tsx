import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { spring } from "@/theme/tokens";

interface GlassSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hide the close button for must-read sheets (still closable with the primary action). */
  hideClose?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet that springs up, with a grabber. Esc and backdrop tap close it. */
export function GlassSheet({ open, onClose, title, hideClose = false, children, footer }: GlassSheetProps) {
  const controls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass-thick relative flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-sheet outline-none sm:rounded-b-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
          >
            <div
              className="flex min-h-[28px] cursor-grab touch-none justify-center pt-3"
              onPointerDown={(e) => controls.start(e)}
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-black/20" />
            </div>
            <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-1">
              <h2 className="t-title3">{title}</h2>
              {!hideClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(60,60,67,0.08)] text-label-2 transition-colors hover:bg-[rgba(60,60,67,0.14)]"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              )}
            </div>
            <div className="overflow-y-auto px-6 pb-6 pt-2">{children}</div>
            {footer && <div className="border-t border-separator px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
