import type { ElementType, ReactNode } from "react";
import { cn } from "@/utils/cn";

export type GlassVariant = "thin" | "regular" | "thick" | "tinted";

const variantClass: Record<GlassVariant, string> = {
  thin: "glass-thin",
  regular: "glass-regular",
  thick: "glass-thick",
  tinted: "glass-tinted",
};

const paddingClass = { none: "", sm: "p-4", md: "p-5", lg: "p-6 sm:p-8" } as const;

interface GlassCardProps {
  variant?: GlassVariant;
  padding?: keyof typeof paddingClass;
  as?: ElementType;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

/** Floating glass surface (hero cards, sheets, controls). Use `Surface` for calm content. */
export function GlassCard({
  variant = "regular",
  padding = "md",
  as: Tag = "div",
  interactive = false,
  className,
  children,
  ariaLabel,
}: GlassCardProps) {
  return (
    <Tag
      aria-label={ariaLabel}
      className={cn(
        "relative rounded-card",
        variantClass[variant],
        paddingClass[padding],
        interactive && "transition-transform duration-200 hover:-translate-y-px active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface SurfaceProps {
  padding?: keyof typeof paddingClass;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/** Calm, non-blurred content surface. Keeps backdrop-filter layers to a minimum. */
export function Surface({ padding = "md", as: Tag = "div", className, children }: SurfaceProps) {
  return <Tag className={cn("surface rounded-card", paddingClass[padding], className)}>{children}</Tag>;
}
