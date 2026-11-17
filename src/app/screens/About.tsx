import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Masthead, Rule, ScreenLayout } from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { sourceLink } from "../buildInfo.ts";

const SECTIONS = ["data", "books", "engine", "libraries", "license", "disclaimer"] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 leading-relaxed">{children}</p>
    </section>
  );
}

/** About / credits: data sources, engine, licenses, disclaimer (GDD §14.1). */
export function About() {
  const { t } = useTranslation();
  const { closeAbout } = useSession();
  return (
    <ScreenLayout
      width="max-w-2xl"
      header={
        <Masthead
          compact
          title={t("app.title")}
          kicker={t("app.kicker")}
          section={t("about.section")}
        />
      }
      footer={
        <>
          <Rule className="my-4 lg:my-3" />
          <div className="text-center">
            <Button className="px-8 py-2" onClick={closeAbout}>
              {t("about.back")}
            </Button>
          </div>
        </>
      }
    >
      <div className="mt-6 lg:mt-4 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
        {SECTIONS.map((key) => (
          <Section key={key} title={t(`about.${key}.title`)}>
            {t(`about.${key}.body`)}
            {key === "license" && (
              <>
                {" "}
                <a
                  href={sourceLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="italic underline decoration-dotted underline-offset-4 hover:text-accent"
                >
                  {t("about.license.link")}
                </a>
              </>
            )}
          </Section>
        ))}
      </div>
    </ScreenLayout>
  );
}
