import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: [
    "inline-flex items-center justify-center gap-2",
    "font-mono font-medium cursor-pointer",
    "transition-colors duration-150",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  variants: {
    variant: {
      primary: [
        "bg-accent-green text-bg-page",
        "enabled:hover:bg-green-primary",
        "enabled:active:bg-accent-green/80",
      ],
      secondary: [
        "bg-transparent text-text-primary",
        "border border-border-primary",
        "enabled:hover:bg-bg-elevated",
        "enabled:active:bg-bg-surface",
      ],
      ghost: [
        "bg-transparent text-text-secondary",
        "border border-border-primary",
        "enabled:hover:text-text-primary",
        "enabled:hover:bg-bg-elevated",
        "enabled:active:bg-bg-surface",
      ],
      danger: [
        "bg-accent-red text-white",
        "enabled:hover:bg-destructive",
        "enabled:active:bg-accent-red/80",
      ],
    },
    size: {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-xs",
      lg: "px-6 py-2.5 text-[13px]",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "lg",
  },
});

type ButtonVariants = VariantProps<typeof button>;

type ButtonProps = ComponentProps<"button"> & ButtonVariants;

function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={button({ variant, size, className })} {...props} />;
}

export { Button, button, type ButtonProps, type ButtonVariants };
