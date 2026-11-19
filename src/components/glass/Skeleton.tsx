import { cn } from "@/utils/cn";

/** Shimmer placeholder. Give it explicit dimensions via className to avoid layout shift. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-control", className)} />;
}
