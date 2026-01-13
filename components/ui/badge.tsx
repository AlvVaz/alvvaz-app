import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 transition-colors duration-200",
        className
      )}
    >
      {children}
    </span>
  );
}
