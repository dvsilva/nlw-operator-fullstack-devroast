import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const diffLine = tv({
  base: "flex gap-2 px-4 py-2 font-mono text-[13px] w-full",
  variants: {
    type: {
      added: "bg-diff-added",
      removed: "bg-diff-removed",
      context: "bg-transparent",
    },
  },
  defaultVariants: {
    type: "context",
  },
});

const diffPrefix = tv({
  base: "select-none shrink-0",
  variants: {
    type: {
      added: "text-accent-green",
      removed: "text-accent-red",
      context: "text-text-tertiary",
    },
  },
  defaultVariants: {
    type: "context",
  },
});

const diffContent = tv({
  base: "",
  variants: {
    type: {
      added: "text-text-primary",
      removed: "text-text-secondary",
      context: "text-text-secondary",
    },
  },
  defaultVariants: {
    type: "context",
  },
});

type DiffLineVariants = VariantProps<typeof diffLine>;

type DiffLineProps = Omit<ComponentProps<"div">, "type"> & DiffLineVariants;

const prefixMap = {
  added: "+",
  removed: "-",
  context: " ",
} as const;

function DiffLine({ type, className, children, ...props }: DiffLineProps) {
  return (
    <div className={diffLine({ type, className })} {...props}>
      <span className={diffPrefix({ type })}>
        {prefixMap[type ?? "context"]}
      </span>
      <span className={diffContent({ type })}>{children}</span>
    </div>
  );
}

export { DiffLine, diffLine, type DiffLineProps, type DiffLineVariants };
