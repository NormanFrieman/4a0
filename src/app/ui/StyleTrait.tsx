export type Trait = "solid" | "balanced" | "combative";

const mark: Record<Trait, string> = { solid: "▪", balanced: "◆", combative: "✦" };

/** Style trait of a card (GDD §7.2). `label` comes from i18n. */
export function StyleTrait({ trait, label }: { trait: Trait; label: string }) {
  return (
    <span className="whitespace-nowrap italic" data-trait={trait}>
      <span aria-hidden className="mr-1 text-[0.8em] not-italic opacity-70">
        {mark[trait]}
      </span>
      {label}
    </span>
  );
}
