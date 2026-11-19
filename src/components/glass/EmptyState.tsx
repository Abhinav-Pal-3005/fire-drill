import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-accent-tint text-accent-text">
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <h3 className="t-headline">{title}</h3>
      <p className="t-subhead max-w-[34ch] text-label-2">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
