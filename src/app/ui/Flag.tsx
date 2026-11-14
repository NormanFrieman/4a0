import type { ReactNode } from "react";

/** flag-icons SVG URLs, keyed by lowercase ISO code (e.g. "hu", "gb-eng"). */
const fileFlags = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/*.svg", {
      query: "?url",
      import: "default",
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -4), url]),
);

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/**
 * Defunct states that flag-icons does not ship. Simplified original drawings
 * (3:2), recognisable at small sizes.
 */
const defunctFlags: Record<string, ReactNode> = {
  su: (
    <>
      <rect width="30" height="20" fill="#cc0000" />
      <polygon points={starPoints(6.5, 2.6, 1.3)} fill="none" stroke="#ffd700" strokeWidth="0.4" />
      <path d="M4 5.5 a3 3 0 1 0 4.2 2.6" fill="none" stroke="#ffd700" strokeWidth="0.9" />
      <rect
        x="5.2"
        y="4.8"
        width="0.9"
        height="4.6"
        fill="#ffd700"
        transform="rotate(-45 5.6 7.1)"
      />
      <rect x="3.6" y="4.6" width="2.4" height="1" fill="#ffd700" transform="rotate(-45 4.8 5.1)" />
    </>
  ),
  yu: (
    <>
      <rect width="30" height="20" fill="#de0000" />
      <rect width="30" height="13.33" fill="#fff" />
      <rect width="30" height="6.67" fill="#003893" />
      <polygon points={starPoints(15, 10, 5.2)} fill="#de0000" stroke="#ffd700" strokeWidth="0.5" />
    </>
  ),
  cs: (
    <>
      <rect width="30" height="20" fill="#d7141a" />
      <rect width="30" height="10" fill="#fff" />
      <polygon points="0,0 15,10 0,20" fill="#11457e" />
    </>
  ),
  dd: (
    <>
      <rect width="30" height="20" fill="#ffce00" />
      <rect width="30" height="13.33" fill="#dd0000" />
      <rect width="30" height="6.67" fill="#000" />
      <circle cx="15" cy="10" r="3.6" fill="#ffce00" stroke="#000" strokeWidth="0.4" />
      <circle cx="15" cy="10" r="1.6" fill="none" stroke="#000" strokeWidth="0.5" />
    </>
  ),
};

/**
 * Country flag, 3:2. `code` is lowercase ISO 3166 (or a flag-icons code such
 * as "gb-eng"); su, yu, cs and dd are drawn here. Size it with a width class.
 */
export function Flag({
  code,
  label,
  className = "",
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const base = `inline-block aspect-[3/2] shrink-0 border border-line/60 ${className}`;
  const svg = defunctFlags[code];
  if (svg)
    return (
      <svg
        viewBox="0 0 30 20"
        preserveAspectRatio="xMidYMid slice"
        className={base}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {svg}
      </svg>
    );
  const url = fileFlags[code];
  if (url) return <img src={url} alt={label ?? ""} className={`${base} object-cover`} />;
  return (
    <span
      className={`${base} bg-surface text-center text-[9px] leading-none text-muted uppercase`}
      aria-label={label}
    >
      {code}
    </span>
  );
}
