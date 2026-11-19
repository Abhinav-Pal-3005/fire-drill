import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BellRing } from "lucide-react";
import { spring } from "@/theme/tokens";
import { cn } from "@/utils/cn";

interface MockNotificationBannerProps {
  visible: boolean;
  appName: string;
  title: string;
  body: string;
  urgent?: boolean;
  onTap: () => void;
}

/** iOS/Android-style banner that slides in from the top of the phone screen. */
export function MockNotificationBanner({
  visible,
  appName,
  title,
  body,
  urgent = false,
  onTap,
}: MockNotificationBannerProps) {
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
          className={cn(
            "glass-thick absolute inset-x-2 top-2 z-30 flex cursor-pointer items-start gap-3 rounded-[22px] p-3 text-left shadow-lg",
            urgent && "ring-2 ring-red-500/80",
          )}
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white",
              urgent ? "bg-red-600" : "bg-accent",
            )}
          >
            {urgent ? <AlertTriangle size={18} strokeWidth={2} /> : <BellRing size={18} strokeWidth={1.75} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-[#4f5f7a]">
                {appName}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[10.5px] font-bold",
                  urgent ? "rounded-full bg-red-100 px-1.5 py-0.5 text-red-700" : "text-[#4f5f7a]",
                )}
              >
                {urgent ? "URGENT" : "now"}
              </span>
            </span>
            <span className="block text-[13.5px] font-semibold leading-snug text-[#0b1b3a]">{title}</span>
            <span className="line-clamp-2 block text-[12.5px] leading-snug text-[#33415c]">{body}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
