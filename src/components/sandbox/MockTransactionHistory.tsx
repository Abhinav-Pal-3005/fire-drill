import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/utils/cn";

export interface MockTransaction {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  direction: "debit" | "credit";
}

interface MockTransactionHistoryProps {
  items: MockTransaction[];
  onSelect?: (id: string) => void;
}

export function MockTransactionHistory({ items, onSelect }: MockTransactionHistoryProps) {
  return (
    <ul className="divide-y divide-[#e3eaf6] overflow-hidden rounded-[20px] bg-white ring-1 ring-[#e3eaf6]">
      {items.map((t) => {
        const Icon = t.direction === "debit" ? ArrowUpRight : ArrowDownLeft;
        const body = (
          <>
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                t.direction === "debit" ? "bg-[#ffeceb] text-[#b9241b]" : "bg-[#e5f8ea] text-[#1e7b34]",
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[14px] font-semibold text-[#0b1b3a]">{t.title}</span>
              <span className="block truncate text-[12px] text-[#4f5f7a]">{t.subtitle}</span>
            </span>
            <span className={cn("tnum text-[14px] font-semibold", t.direction === "debit" ? "text-[#0b1b3a]" : "text-[#1e7b34]")}>
              {t.direction === "debit" ? "−" : "+"}₹{t.amount}
            </span>
          </>
        );
        return (
          <li key={t.id}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 hover:bg-[#f7faff] active:bg-[#eaf3ff]"
              >
                {body}
              </button>
            ) : (
              <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
