/** Page header in the almanac style: kicker, game title, section line. */
export function Masthead({
  title,
  kicker,
  section,
}: {
  title: string;
  kicker?: string;
  section?: string;
}) {
  return (
    <header className="border-b-4 border-double border-ink pb-2 text-center">
      {kicker && <div className="text-[11px] tracking-[0.3em] text-muted uppercase">{kicker}</div>}
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
      {section && (
        <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted italic">
          <span className="h-px w-10 shrink-0 bg-line" />
          {section}
          <span className="h-px w-10 shrink-0 bg-line" />
        </div>
      )}
    </header>
  );
}

/** Thin horizontal rule between sections. */
export const Rule = ({ className = "my-4" }: { className?: string }) => (
  <hr className={`border-0 border-t border-line ${className}`} />
);

/** Small-caps label (board numbers, field names). */
export const Kicker = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] tracking-[0.2em] text-muted uppercase">{children}</span>
);
