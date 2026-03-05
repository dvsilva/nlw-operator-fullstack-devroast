"use client";

import { Switch } from "@base-ui/react/switch";
import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type ToggleProps = Pick<
  ComponentProps<"button">,
  "id" | "disabled" | "aria-label" | "aria-labelledby"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
};

function Toggle({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  className,
  ...props
}: ToggleProps) {
  return (
    <span className={twMerge("inline-flex items-center gap-3", className)}>
      <Switch.Root
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        className="group flex h-[22px] w-10 cursor-pointer items-center rounded-full bg-border-primary p-[3px] transition-colors data-[checked]:bg-accent-green"
        {...props}
      >
        <Switch.Thumb className="size-4 rounded-full bg-text-secondary transition-transform data-[checked]:translate-x-[18px] data-[checked]:bg-bg-page" />
      </Switch.Root>
      {label && (
        <span className="font-mono text-xs text-text-secondary group-has-[data-checked]:text-accent-green transition-colors">
          {label}
        </span>
      )}
    </span>
  );
}

export { Toggle, type ToggleProps };
