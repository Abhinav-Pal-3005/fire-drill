import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";
import type { NavItem } from "./GlassTabBar";

interface GlassSidebarProps {
  items: NavItem[];
  pathname: string;
  brand: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Floating glass sidebar (desktop). */
export function GlassSidebar({ items, pathname, brand, footer, className }: GlassSidebarProps) {
  return (
    <aside
      className={cn(
        "glass-regular fixed bottom-4 left-4 top-4 z-50 flex w-[240px] flex-col rounded-sheet p-3",
        className,
      )}
    >
      <div className="px-3 pb-4 pt-3">{brand}</div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "t-callout relative flex min-h-[48px] items-center gap-3 rounded-full px-4 font-medium transition-colors",
                active ? "text-accent-text" : "text-label-2 hover:text-label",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-lens"
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9),0_2px_10px_rgba(20,30,60,0.10)]"
                />
              )}
              <Icon size={20} strokeWidth={1.75} className="relative" aria-hidden />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {footer && <div className="px-3 pb-2 pt-3">{footer}</div>}
    </aside>
  );
}
