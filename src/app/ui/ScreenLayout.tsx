import type { ReactNode } from "react";
import { Rule } from "./Masthead.tsx";

/**
 * Screen skeleton. On desktop (≥ lg) the screen fills the viewport and never
 * scrolls the page: `header`, `footer` and `actions` keep their height,
 * `children` takes the rest (panels inside it scroll with `lg:overflow-y-auto`
 * when needed).
 *
 * `actions` (the screen's buttons) is rendered once and moved with `order`:
 * right below the header on mobile, so it is reachable without scrolling, and
 * along the bottom on desktop.
 */
export function ScreenLayout({
  width,
  header,
  actions,
  footer,
  children,
  className = "",
}: {
  /** Tailwind max-width class, e.g. "max-w-3xl". */
  width: string;
  header?: ReactNode;
  /** The screen's buttons: below the header on mobile, at the bottom on desktop. */
  actions?: ReactNode;
  /** Other content after the main area (above the actions on desktop). */
  footer?: ReactNode;
  children: ReactNode;
  /** Extra classes for the content area. */
  className?: string;
}) {
  return (
    <div
      className={`mx-auto flex w-full ${width} flex-col px-4 py-6 lg:min-h-0 lg:flex-1 lg:py-2`}
    >
      {header && <div className="order-1 lg:shrink-0">{header}</div>}
      {actions && (
        <div className="order-2 lg:order-5 lg:shrink-0">
          <Rule className="hidden lg:my-3 lg:block" />
          <div className="mt-4 lg:mt-0">{actions}</div>
          <Rule className="mt-4 lg:hidden" />
        </div>
      )}
      <div className={`order-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col ${className}`}>
        {children}
      </div>
      {footer && <div className="order-4 lg:shrink-0">{footer}</div>}
    </div>
  );
}
