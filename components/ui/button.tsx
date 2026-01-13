import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variants = {
  primary:
    "bg-brand-950 text-white shadow-sm hover:bg-brand-900 focus-visible:outline-brand-500",
  secondary:
    "border border-brand-200 text-brand-900 hover:border-brand-400 hover:text-brand-950 focus-visible:outline-brand-500",
  subtle:
    "bg-white/80 text-brand-900 hover:bg-white focus-visible:outline-brand-400",
};

type ButtonVariant = keyof typeof variants;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
}

export function buttonLinkStyles({
  variant = "primary",
  className,
}: ButtonLinkProps) {
  return cn(baseStyles, variants[variant], className);
}
