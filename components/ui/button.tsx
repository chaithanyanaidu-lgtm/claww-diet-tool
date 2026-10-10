import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--ink))]",
  secondary: "border border-line bg-surface text-ink hover:border-muted",
  quiet: "px-3 text-muted hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
