import { useTranslation } from "react-i18next";
import { balance } from "../../config/balance.ts";
import { pickableCards } from "../../draft/draft.ts";
import { Button, Flag, LineupRow, Masthead, Rule, TeamSlot, formatPoints } from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { cardView } from "./helpers.ts";

export function Draft() {
  const { t } = useTranslation();
  const { dataset: ds, draft, selectedCardId, selectCard, placeCard, rerollDraft } = useSession();
  if (!ds || !draft?.currentTeamId) return null;
  const team = ds.team(draft.currentTeamId);
  const olympiad = ds.olympiad(team.year);
  const pickable = new Set(pickableCards(ds, draft));
  const filled = draft.slots.filter(Boolean).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Masthead
        title={t("app.title")}
        kicker={t("app.kicker")}
        section={t("draft.section", { n: filled + 1, total: balance.draft.slots })}
      />
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_280px]">
        <article>
          <div className="flex items-start gap-4">
            <Flag code={team.countryCode} label={team.countryName} className="mt-2 w-14" />
            <div>
              <h2 className="font-display text-3xl font-bold">
                {team.countryName}, {team.year}
              </h2>
              <p className="text-muted italic">
                {t("draft.edition", { city: olympiad.city, rank: team.finalRank })}
              </p>
            </div>
          </div>
          <Rule />
          <p className="mb-2 text-sm text-muted">{t("draft.instructions")}</p>
          <ol className="divide-y divide-dotted divide-line">
            {team.cardIds.map((id) => {
              const v = cardView(ds, id);
              const details = [
                `${formatPoints(v.card.score)}/${v.card.games}`,
                ...v.card.medals.map((m) => t(`draft.medal_${m}`)),
              ].join(" · ");
              return (
                <li key={id}>
                  <LineupRow
                    boardLabel={
                      v.card.board <= 4
                        ? t("draft.boardOrdinal", { n: v.card.board })
                        : t("draft.reserveBoard")
                    }
                    name={v.name}
                    title={v.card.title}
                    trait={v.trait}
                    traitLabel={t(`trait.${v.trait}`)}
                    details={details}
                    strength={v.card.strength}
                    selected={selectedCardId === id}
                    disabled={!pickable.has(id)}
                    onSelect={() => selectCard(id)}
                  />
                </li>
              );
            })}
          </ol>
          <Rule />
          <Button
            variant="link"
            className="text-sm tracking-widest text-accent uppercase"
            onClick={rerollDraft}
            disabled={draft.rerollsLeft === 0}
          >
            {t("draft.reroll", { left: draft.rerollsLeft, total: balance.draft.rerollsPerDraft })}
          </Button>
        </article>

        <aside className="border-line md:border-l md:pl-6">
          <h3 className="font-display text-xl font-bold italic">{t("draft.yourTeam")}</h3>
          <div className="mt-3 space-y-2">
            {draft.slots.map((id, i) => {
              const v = id ? cardView(ds, id) : null;
              return (
                <TeamSlot
                  key={i}
                  label={i < 4 ? t("slots.board", { n: i + 1 }) : t("slots.reserve")}
                  emptyText={selectedCardId ? t("draft.placeHere") : t("draft.emptySlot")}
                  awaiting={!!selectedCardId}
                  onPlace={() => placeCard(i)}
                  card={
                    v && {
                      name: v.name,
                      countryCode: v.team.countryCode,
                      countryName: v.team.countryName,
                      year: v.team.year,
                    }
                  }
                />
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
