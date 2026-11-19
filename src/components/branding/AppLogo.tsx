import { Flame } from "lucide-react";
import { APP_NAME, BRAND_COLORS } from "@/constants/branding";
import { cn } from "@/utils/cn";

interface AppLogoProps {
  size?: "md" | "lg";
  className?: string;
}

/**
 * Placeholder app logo mark.
 * Swap the inner icon with an <img> or brand asset whenever a final logo file is ready.
 */
export function AppLogo({ size = "lg", className }: AppLogoProps) {
  const isLarge = size === "lg";

  return (
    <div
      role="img"
      aria-label={`${APP_NAME} logo`}
      style={{ backgroundColor: BRAND_COLORS.primary, color: BRAND_COLORS.onPrimary }}
      className={cn(
        "grid place-items-center shadow-[0_14px_34px_rgba(1,45,29,0.18)] select-none",
        isLarge ? "h-20 w-20 rounded-[24px]" : "h-14 w-14 rounded-[18px]",
        className,
      )}
    >
      <Flame size={isLarge ? 40 : 28} strokeWidth={1.9} aria-hidden />
    </div>
  );
}
