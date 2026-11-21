import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva("inline-flex items-center justify-center whitespace-nowrap", {
  variants: {
    tone: {
      blue: "rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white",
      dark: "rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white",
      /** Бейдж на тёмной панели выделения (светлее фона панели). */
      onDark: "h-6 rounded-full bg-ink-bar-badge px-2 text-sm text-white",
      /** Счётчик на карточке шаблона. */
      counter: "h-[18px] min-w-[22px] rounded-md bg-surface px-1.5 text-xs leading-none font-semibold text-foreground",
    },
  },
  defaultVariants: { tone: "blue" },
});

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
