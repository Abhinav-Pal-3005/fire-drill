import { AnimatePresence, motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { spring } from "@/theme/tokens";

interface MockNotificationBannerProps {
  visible: boolean;
  appName: string;
  title: string;
  body: string;
  onTap: () => void;
}

/** iOS-style banner that slides in from the top of the phone screen. */
export function MockNotificationBanner({ visible, appName, title, body, onTap }: MockNotificationBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={onTap}
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={spring}
          aria-label={`Notification from ${appName}: ${title}. Tap to open.`}
          className="glass-thick absolute inset-x-2 top-2 z-20 flex items-start gap-3 rounded-[22px] p-3 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-white">
            <BellRing size={18} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[#4f5f7a]">{appName}</span>
              <span className="text-[11px] text-[#4f5f7a]">now</span>
            </span>
            <span className="block text-[14px] font-semibold leading-snug text-[#0b1b3a]">{title}</span>
            <span className="block text-[13px] leading-snug text-[#33415c]">{body}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
