import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "link" | "toggle";

const styles: Record<Variant, string> = {
  primary: "bg-accent px-4 py-2 text-accent-ink hover:brightness-110",
  secondary: "border border-ink px-4 py-2 hover:bg-surface",
  link: "px-1 py-1 italic underline decoration-dotted underline-offset-4 hover:text-accent",
  toggle:
    "border border-line px-3 py-1 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper aria-selected:border-ink aria-selected:bg-ink aria-selected:text-paper",
};

/**
 * Buttons: primary (one per screen), secondary, link (low-emphasis), toggle
 * (segmented choices such as playback speed; pass `aria-pressed`, or
 * `aria-selected` with `role="tab"`).
 */
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`cursor-pointer transition disabled:cursor-default disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
