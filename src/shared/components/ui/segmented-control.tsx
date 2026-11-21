import { cn } from "@/shared/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
  "aria-label"?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("bg-muted flex h-12 w-75 shrink-0 rounded-xl p-0.5", className)}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "flex-1 rounded-[10px] text-base font-semibold transition-colors",
              active ? "bg-ink-bar text-white" : "text-foreground hover:bg-line/60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
