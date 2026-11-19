import { createContext, useContext, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

/** Pages publish their title here so the nav bar can show it inline once the large title scrolls away. */
export const NavTitleContext = createContext<(title: string) => void>(() => undefined);

export function useNavTitle(title: string): void {
  const setTitle = useContext(NavTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);
}

interface LargeTitleProps {
  title: string;
  subtitle?: ReactNode;
  className?: string;
}

/** Large title that sits in the page flow and collapses into the nav bar on scroll. */
export function LargeTitle({ title, subtitle, className }: LargeTitleProps) {
  useNavTitle(title);
  return (
    <div className={cn("pb-5 pt-2", className)}>
      <h1 className="t-large-title">{title}</h1>
      {subtitle && <p className="t-callout mt-1 max-w-[60ch] text-label-2">{subtitle}</p>}
    </div>
  );
}

interface GlassNavBarProps {
  title: string;
  collapsed: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function GlassNavBar({ title, collapsed, leading, trailing }: GlassNavBarProps) {
  return (
    <div className="relative flex h-14 items-center justify-between gap-3 px-[var(--gutter)]">
      <motion.div
        aria-hidden
        className="glass-regular absolute inset-0 rounded-b-card"
        initial={false}
        animate={{ opacity: collapsed ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
      <div className="relative z-[2] flex min-w-[96px] items-center">{leading}</div>
      <motion.p
        aria-hidden
        className="t-headline relative z-[2] truncate"
        initial={false}
        animate={{ opacity: collapsed ? 1 : 0, y: collapsed ? 0 : 6 }}
        transition={{ duration: 0.2 }}
      >
        {title}
      </motion.p>
      <div className="relative z-[2] flex min-w-[96px] items-center justify-end">{trailing}</div>
    </div>
  );
}
