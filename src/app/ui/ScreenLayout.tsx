import type { ReactNode } from "react";

/**
 * Screen skeleton. On desktop (≥ lg) the screen fills the viewport and never
 * scrolls the page: `header` and `footer` keep their height, `children` takes
 * the rest (panels inside it scroll with `lg:overflow-y-auto` when needed).
 * Below lg it is plain document flow.
 */
export function ScreenLayout({
  width,
  header,
  footer,
  children,
  className = "",
}: {
  /** Tailwind max-width class, e.g. "max-w-3xl". */
  width: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Extra classes for the content area. */
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full ${width} px-4 py-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:py-2`}
    >
      {header && <div className="lg:shrink-0">{header}</div>}
      <div className={`lg:flex lg:min-h-0 lg:flex-1 lg:flex-col ${className}`}>{children}</div>
      {footer && <div className="lg:shrink-0">{footer}</div>}
    </div>
  );
}
