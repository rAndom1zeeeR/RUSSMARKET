import { useId, type ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

interface TimeFieldProps extends Omit<ComponentProps<"input">, "type" | "onChange"> {
  label: string;
  onValueChange: (value: string) => void;
  /** Приглушённый текст — значение по умолчанию, пользователь его ещё не менял. */
  muted?: boolean;
}

export function TimeField({ label, onValueChange, muted = false, className, id, ...props }: TimeFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={inputId} className="text-muted-foreground mb-1.25 block text-xs leading-4">
        {label}
      </label>
      <input
        id={inputId}
        type="time"
        onChange={event => onValueChange(event.target.value)}
        className={cn(
          "bg-muted focus:border-muted-foreground/50 h-12 w-full rounded-xl border border-transparent px-4 text-base outline-none [&::-webkit-calendar-picker-indicator]:hidden",
          muted ? "text-muted-foreground" : "text-foreground"
        )}
        {...props}
      />
    </div>
  );
}
