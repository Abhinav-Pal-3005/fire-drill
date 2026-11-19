import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { hoverLift, press, spring } from "@/theme/tokens";

const MotionLink = motion.create(Link);

type Variant = "filled" | "glass" | "plain";
type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "min-h-[44px] px-4 text-[15px] gap-1.5",
  md: "min-h-[48px] px-5 text-[16px] gap-2",
  lg: "min-h-[56px] px-7 text-[17px] gap-2",
};

const variantClass: Record<Variant, string> = {
  filled:
    "bg-gradient-to-b from-accent to-accent-pressed text-white shadow-[0_8px_20px_rgba(0,98,204,0.30)] hover:brightness-105",
  glass: "glass-regular relative text-label hover:bg-white/85",
  plain: "text-accent-text hover:bg-accent-tint",
};

interface GlassButtonProps {
  variant?: Variant;
  size?: Size;
  to?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
  className?: string;
  fullWidth?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function GlassButton({
  variant = "filled",
  size = "md",
  to,
  href,
  onClick,
  disabled = false,
  type = "button",
  ariaLabel,
  className,
  fullWidth = false,
  icon,
  children,
}: GlassButtonProps) {
  const classes = cn(
    "inline-flex select-none items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition-[background-color,filter] duration-200",
    sizeClass[size],
    variantClass[variant],
    fullWidth && "w-full",
    disabled && "pointer-events-none opacity-45",
    className,
  );
  const motionProps = disabled ? {} : { whileTap: press, whileHover: hoverLift, transition: spring };
  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (to && !disabled) {
    return (
      <MotionLink to={to} className={classes} aria-label={ariaLabel} onClick={onClick} {...motionProps}>
        {content}
      </MotionLink>
    );
  }
  if (href && !disabled) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        aria-label={ariaLabel}
        onClick={onClick}
        {...motionProps}
      >
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button
      type={type}
      className={classes}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      {...motionProps}
    >
      {content}
    </motion.button>
  );
}
