import { ChampionName } from "./ChampionName.tsx";
import { StyleTrait, type Trait } from "./StyleTrait.tsx";

/**
 * One card in a roll's lineup, as a selectable typographic row (Draft).
 * Strength is `null` in the Mestre mode (hidden, GDD §4.2). `champion` is the
 * world champion label (i18n), only for world champions: their name is gold,
 * with the label as tooltip and for screen readers.
 */
export function LineupRow({
  boardLabel,
  name,
  title,
  trait,
  traitLabel,
  details,
  strength,
  champion,
  selected = false,
  disabled = false,
  onSelect,
}: {
  boardLabel: string;
  name: string;
  title: string;
  trait: Trait;
  traitLabel: string;
  /** Extra line after the trait, e.g. "7½/11 · medalha de prata". */
  details?: string;
  strength: number | null;
  champion?: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={`grid w-full cursor-pointer grid-cols-[2.25rem_1fr_auto] items-baseline gap-x-3 px-2 py-2.5 lg:py-1.5 text-left transition disabled:cursor-default disabled:opacity-40 ${selected ? "bg-accent text-accent-ink" : "hover:bg-surface"}`}
    >
      <span className="text-sm tabular-nums opacity-70">{boardLabel}</span>
      <span className="min-w-0">
        <ChampionName
          name={name}
          champion={champion}
          inherit={selected}
          className="text-lg font-bold"
        />{" "}
        <span className="text-xs tracking-widest uppercase opacity-70">{title}</span>
        <span className="block text-sm opacity-80">
          <StyleTrait trait={trait} label={traitLabel} />
          {details && <span className="italic"> · {details}</span>}
        </span>
      </span>
      <span className="font-display text-2xl font-bold tabular-nums">{strength ?? "?"}</span>
    </button>
  );
}
