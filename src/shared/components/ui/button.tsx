import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

/**
 * Кнопка дизайн-системы: 5 ролей (primary…quinary) × 2 цветовые схемы (ink / brand).
 * Состояния: default → hover/pressed (+1 ступень) → active (+2) → disabled (30–50% opacity).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:bg-muted disabled:text-disabled-fg [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      tone: { ink: "", brand: "" },
      variant: {
        primary: "",
        secondary: "",
        tertiary: "border",
        quaternary: "bg-surface",
        quinary: "bg-surface",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-sm font-normal [&_svg]:size-4",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-4 text-base",
        icon: "size-12 p-0",
      },
    },
    compoundVariants: [
      {
        tone: "ink",
        variant: "primary",
        class: "bg-ink text-white hover:bg-ink-hover active:bg-ink-active",
      },
      {
        tone: "ink",
        variant: "secondary",
        class: "bg-muted text-foreground hover:bg-neutral-hover active:bg-neutral-active",
      },
      {
        tone: "ink",
        variant: "tertiary",
        class: "border-foreground bg-surface text-foreground hover:bg-surface-alt active:bg-neutral-hover",
      },
      {
        tone: "ink",
        variant: "quaternary",
        class: "text-foreground hover:bg-surface-alt active:bg-neutral-hover",
      },
      {
        tone: "ink",
        variant: "quinary",
        class: "text-foreground hover:bg-neutral-hover active:bg-neutral-active",
      },
      {
        tone: "brand",
        variant: "primary",
        class: "bg-brand text-white hover:bg-brand-hover active:bg-brand-active",
      },
      {
        tone: "brand",
        variant: "secondary",
        class: "bg-brand-soft text-brand-ink hover:bg-brand-soft-hover active:bg-brand-soft-active",
      },
      {
        tone: "brand",
        variant: "tertiary",
        class: "border-brand bg-surface text-brand-ink hover:bg-brand-soft active:bg-brand-soft-hover",
      },
    ],
    defaultVariants: { tone: "ink", variant: "primary", size: "md" },
  }
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, tone, variant, size, ...props }: ButtonProps) {
  return <button type="button" className={cn(buttonVariants({ tone, variant, size }), className)} {...props} />;
}
