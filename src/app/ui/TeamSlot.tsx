import { Flag } from "./Flag.tsx";
import { Kicker } from "./Masthead.tsx";

/**
 * One of the 4 team slots (one per board). Empty slots are dashed;
 * `awaiting` highlights free slots while a card is selected.
 */
export function TeamSlot({
  label,
  card,
  emptyText,
  awaiting = false,
  onPlace,
}: {
  label: string;
  card?: { name: string; countryCode: string; countryName: string; year: number } | null;
  emptyText: string;
  awaiting?: boolean;
  onPlace?: () => void;
}) {
  const filled = !!card;
  return (
    <button
      type="button"
      onClick={onPlace}
      disabled={filled || !awaiting}
      className={`w-full border px-3 py-2 text-left transition ${filled ? "border-line bg-surface" : awaiting ? "cursor-pointer border-dashed border-accent bg-surface" : "border-dashed border-line"}`}
    >
      <Kicker>{label}</Kicker>
      {card ? (
        <div className="flex items-center gap-2">
          <Flag code={card.countryCode} label={card.countryName} className="w-5" />
          <span className="truncate font-bold">{card.name}</span>
          <span className="ml-auto text-sm text-muted italic">{card.year}</span>
        </div>
      ) : (
        <div className="text-muted italic">{emptyText}</div>
      )}
    </button>
  );
}
