import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { spring } from "@/theme/tokens";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

interface GlassTabBarProps {
  items: NavItem[];
  pathname: string;
  className?: string;
}

/** Floating pill tab bar with a sliding lens indicator (mobile). */
export function GlassTabBar({ items, pathname, className }: GlassTabBarProps) {
  return (
    <nav aria-label="Primary" className={cn("fixed inset-x-3 bottom-3 z-50", className)}>
      <div className="glass-regular glass-lens relative mx-auto flex max-w-[520px] rounded-full p-1.5">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-[2] flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors",
                active ? "text-accent-text" : "text-label-2 hover:text-label",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-lens"
                  transition={spring}
                  className="glass-lens absolute inset-0 -z-[1] rounded-full bg-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9),0_2px_10px_rgba(20,30,60,0.12)]"
                />
              )}
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
