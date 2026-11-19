import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

export function SearchField({ value, onChange, placeholder = "Search", ariaLabel, className }: SearchFieldProps) {
  return (
    <div className={cn("glass-thin relative flex min-h-[48px] items-center gap-2 rounded-full px-4", className)}>
      <Search size={18} strokeWidth={1.75} className="text-label-2" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="t-body min-w-0 flex-1 bg-transparent text-label outline-none placeholder:text-label-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(60,60,67,0.12)] text-label-2 hover:bg-[rgba(60,60,67,0.2)]"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
