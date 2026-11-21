import type { ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SearchInputProps extends Omit<ComponentProps<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  /** gray — заливка, white — белый с обводкой при фокусе. */
  appearance?: "gray" | "white";
}

export function SearchInput({ value, onValueChange, appearance = "gray", className, ...props }: SearchInputProps) {
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-3 rounded-xl px-3.5 transition-colors",
        appearance === "gray"
          ? "bg-muted focus-within:border-muted-foreground/50 border border-transparent"
          : "border border-transparent bg-surface focus-within:border-muted-foreground/50",
        className
      )}
    >
      <Search className="text-muted-foreground size-5 shrink-0" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={event => onValueChange(event.target.value)}
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => onValueChange("")}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
