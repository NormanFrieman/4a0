/**
 * de.wikipedia flag templates (year suffix removed: `{{SUN-1980}}` → "SUN")
 * → flag code (flag-icons, plus the historical codes of the sample: `su`,
 * `yu`, `cs`) and pt-BR name. Only the teams that enter the dataset need an
 * entry; a missing one stops the build.
 */
export interface Country {
  code: string;
  name: string;
}

const countries: Record<string, Country> = {
  ARG: { code: "ar", name: "Argentina" },
  ARM: { code: "am", name: "Armênia" },
  AUS: { code: "au", name: "Austrália" },
  AUT: { code: "at", name: "Áustria" },
  AZE: { code: "az", name: "Azerbaijão" },
  BGR: { code: "bg", name: "Bulgária" },
  BIH: { code: "ba", name: "Bósnia e Herzegovina" },
  BLR: { code: "by", name: "Bielorrússia" },
  BRA: { code: "br", name: "Brasil" },
  CAN: { code: "ca", name: "Canadá" },
  CHE: { code: "ch", name: "Suíça" },
  CHL: { code: "cl", name: "Chile" },
  CHN: { code: "cn", name: "China" },
  COL: { code: "co", name: "Colômbia" },
  CSK: { code: "cs", name: "Tchecoslováquia" },
  CUB: { code: "cu", name: "Cuba" },
  CZE: { code: "cz", name: "Tchéquia" },
  DNK: { code: "dk", name: "Dinamarca" },
  EGY: { code: "eg", name: "Egito" },
  ENG: { code: "gb-eng", name: "Inglaterra" },
  ESP: { code: "es", name: "Espanha" },
  EST: { code: "ee", name: "Estônia" },
  FIN: { code: "fi", name: "Finlândia" },
  FRA: { code: "fr", name: "França" },
  GEO: { code: "ge", name: "Geórgia" },
  GRC: { code: "gr", name: "Grécia" },
  HRV: { code: "hr", name: "Croácia" },
  HUN: { code: "hu", name: "Hungria" },
  IDN: { code: "id", name: "Indonésia" },
  IND: { code: "in", name: "Índia" },
  IRN: { code: "ir", name: "Irã" },
  ISL: { code: "is", name: "Islândia" },
  ISR: { code: "il", name: "Israel" },
  ITA: { code: "it", name: "Itália" },
  KAZ: { code: "kz", name: "Cazaquistão" },
  LTU: { code: "lt", name: "Lituânia" },
  LVA: { code: "lv", name: "Letônia" },
  MDA: { code: "md", name: "Moldávia" },
  MEX: { code: "mx", name: "México" },
  MKD: { code: "mk", name: "Macedônia do Norte" },
  MNG: { code: "mn", name: "Mongólia" },
  NLD: { code: "nl", name: "Países Baixos" },
  NOR: { code: "no", name: "Noruega" },
  PER: { code: "pe", name: "Peru" },
  PHL: { code: "ph", name: "Filipinas" },
  POL: { code: "pl", name: "Polônia" },
  PRT: { code: "pt", name: "Portugal" },
  PRY: { code: "py", name: "Paraguai" },
  ROU: { code: "ro", name: "Romênia" },
  RUS: { code: "ru", name: "Rússia" },
  SCG: { code: "yu", name: "Sérvia e Montenegro" },
  SRB: { code: "rs", name: "Sérvia" },
  SUN: { code: "su", name: "URSS" },
  SVK: { code: "sk", name: "Eslováquia" },
  SVN: { code: "si", name: "Eslovênia" },
  SWE: { code: "se", name: "Suécia" },
  TUR: { code: "tr", name: "Turquia" },
  UKR: { code: "ua", name: "Ucrânia" },
  USA: { code: "us", name: "Estados Unidos" },
  UZB: { code: "uz", name: "Uzbequistão" },
  VNM: { code: "vn", name: "Vietnã" },
  WLS: { code: "gb-wls", name: "País de Gales" },
  YUG: { code: "yu", name: "Iugoslávia" },
};

/** Templates whose name depends on the year. */
function historical(template: string, year: number): Country | undefined {
  if (template === "DEU")
    return { code: "de", name: year < 1991 ? "Alemanha Ocidental" : "Alemanha" };
  if (template === "FRG") return { code: "de", name: "Alemanha Ocidental" };
  if (template === "DDR" || template === "GDR") return { code: "dd", name: "Alemanha Oriental" };
  return undefined;
}

/**
 * Country of a team. `suffix` is the host's extra team ("B", "C"), shown as
 * "Hungria 2", "Hungria 3" (plano-dados.md, "Casos especiais").
 */
export function countryOf(template: string, year: number, suffix: string | null): Country {
  const c = historical(template, year) ?? countries[template];
  if (!c) throw new Error(`countries.ts: no entry for flag template "${template}" (${year})`);
  if (!suffix) return c;
  const n = { B: 2, C: 3 }[suffix];
  if (!n) throw new Error(`countries.ts: unknown team suffix "${suffix}"`);
  return { code: c.code, name: `${c.name} ${n}` };
}

/** "Ungarn B" → "B"; "Ungarn" → null. */
export function teamSuffix(teamName: string): string | null {
  return /\s([BC])$/.exec(teamName)?.[1] ?? null;
}
