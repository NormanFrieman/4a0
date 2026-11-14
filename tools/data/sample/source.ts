/**
 * TEST DATA — hand-written source for the sample dataset (`pnpm data:sample`).
 * Lineups are real teams, but ratings, scores, ranks and decisiveness are
 * approximate, typed from memory for testing only. The authorised source
 * and the full pipeline come in Phase 2 (GDD §9, §13).
 */

export interface SourcePlayer {
  name: string;
  title: "GM" | "IM" | "FM";
  fide: number;
  points: number;
  games: number;
  /** 1 − draw rate, approximate. */
  decisiveness: number;
  medal?: "gold" | "silver" | "bronze";
}

export interface SourceTeam {
  countryCode: string;
  countryName: string;
  year: number;
  finalRank: number;
  /** Real board order; 5th and 6th are reserves. */
  players: SourcePlayer[];
}

export interface SourceOlympiad {
  year: number;
  city: string;
  country: string;
  rounds: number;
  teamsCount: number;
}

export const olympiads: SourceOlympiad[] = [
  { year: 1970, city: "Siegen", country: "Alemanha Ocidental", rounds: 15, teamsCount: 60 },
  { year: 1974, city: "Nice", country: "França", rounds: 17, teamsCount: 74 },
  { year: 1976, city: "Haifa", country: "Israel", rounds: 13, teamsCount: 48 },
  { year: 1978, city: "Buenos Aires", country: "Argentina", rounds: 14, teamsCount: 65 },
  { year: 1980, city: "La Valletta", country: "Malta", rounds: 14, teamsCount: 82 },
  { year: 1982, city: "Lucerna", country: "Suíça", rounds: 14, teamsCount: 92 },
  { year: 1984, city: "Salônica", country: "Grécia", rounds: 14, teamsCount: 88 },
];

const p = (
  name: string,
  title: SourcePlayer["title"],
  fide: number,
  points: number,
  games: number,
  decisiveness: number,
  medal?: SourcePlayer["medal"],
): SourcePlayer => ({
  name,
  title,
  fide,
  points,
  games,
  decisiveness,
  ...(medal ? { medal } : {}),
});

export const teams: SourceTeam[] = [
  {
    countryCode: "su",
    countryName: "URSS",
    year: 1980,
    finalRank: 1,
    players: [
      p("Anatoly Karpov", "GM", 2725, 6.5, 9, 0.4),
      p("Lev Polugaevsky", "GM", 2625, 6, 10, 0.35),
      p("Mikhail Tal", "GM", 2615, 7.5, 11, 0.75, "silver"),
      p("Yuri Balashov", "GM", 2600, 6.5, 10, 0.4),
      p("Efim Geller", "GM", 2580, 5.5, 8, 0.5),
      p("Garry Kasparov", "GM", 2595, 9.5, 12, 0.7, "gold"),
    ],
  },
  {
    countryCode: "hu",
    countryName: "Hungria",
    year: 1978,
    finalRank: 1,
    players: [
      p("Lajos Portisch", "GM", 2630, 8, 11, 0.4, "bronze"),
      p("Zoltán Ribli", "GM", 2595, 7, 11, 0.4),
      p("Gyula Sax", "GM", 2550, 7.5, 11, 0.65),
      p("András Adorján", "GM", 2535, 6, 9, 0.55),
      p("István Csom", "GM", 2500, 6.5, 8, 0.5, "gold"),
      p("László Vadász", "IM", 2465, 4.5, 7, 0.6),
    ],
  },
  {
    countryCode: "us",
    countryName: "EUA",
    year: 1976,
    finalRank: 1,
    players: [
      p("Robert Byrne", "GM", 2550, 6.5, 10, 0.5),
      p("Lubomir Kavalek", "GM", 2555, 6.5, 10, 0.5),
      p("Larry Evans", "GM", 2480, 7, 10, 0.4),
      p("James Tarjan", "GM", 2525, 7, 10, 0.55),
      p("William Lombardy", "GM", 2530, 7.5, 10, 0.45, "silver"),
      p("Kim Commons", "IM", 2455, 6, 8, 0.6),
    ],
  },
  {
    countryCode: "yu",
    countryName: "Iugoslávia",
    year: 1974,
    finalRank: 2,
    players: [
      p("Svetozar Gligorić", "GM", 2575, 9, 14, 0.4),
      p("Ljubomir Ljubojević", "GM", 2620, 10, 14, 0.7, "silver"),
      p("Borislav Ivkov", "GM", 2540, 6.5, 12, 0.45),
      p("Albin Planinc", "GM", 2520, 8, 12, 0.75),
      p("Dragoljub Velimirović", "GM", 2520, 6.5, 9, 0.8),
      p("Aleksandar Matanović", "GM", 2495, 5, 7, 0.35),
    ],
  },
  {
    countryCode: "cs",
    countryName: "Tchecoslováquia",
    year: 1982,
    finalRank: 4,
    players: [
      p("Vlastimil Hort", "GM", 2600, 7.5, 12, 0.35),
      p("Jan Smejkal", "GM", 2545, 7, 11, 0.45),
      p("Lubomír Ftáčnik", "GM", 2545, 8, 11, 0.6),
      p("Vlastimil Jansa", "GM", 2510, 5.5, 9, 0.5),
      p("Ján Plachetka", "GM", 2480, 5, 8, 0.4),
      p("Karel Mokrý", "IM", 2450, 6.5, 9, 0.55),
    ],
  },
  {
    countryCode: "gb-eng",
    countryName: "Inglaterra",
    year: 1984,
    finalRank: 2,
    players: [
      p("Tony Miles", "GM", 2600, 7, 11, 0.6),
      p("John Nunn", "GM", 2615, 10, 11, 0.7, "gold"),
      p("Jonathan Speelman", "GM", 2570, 6, 10, 0.55),
      p("Murray Chandler", "GM", 2560, 7, 11, 0.5),
      p("Jonathan Mestel", "GM", 2550, 6.5, 10, 0.6),
      p("Nigel Short", "GM", 2545, 7, 10, 0.55),
    ],
  },
  {
    countryCode: "nl",
    countryName: "Países Baixos",
    year: 1976,
    finalRank: 2,
    players: [
      p("Jan Timman", "GM", 2585, 7, 11, 0.55),
      p("Gennadi Sosonko", "GM", 2570, 7, 11, 0.45),
      p("Jan Hein Donner", "GM", 2480, 6, 10, 0.35),
      p("Hans Ree", "GM", 2465, 6.5, 10, 0.4),
      p("Franciscus Kuijpers", "IM", 2450, 6, 9, 0.5),
      p("Hans Böhm", "IM", 2435, 5, 8, 0.55),
    ],
  },
  {
    countryCode: "de",
    countryName: "Alemanha Ocidental",
    year: 1980,
    finalRank: 7,
    players: [
      p("Robert Hübner", "GM", 2595, 7, 11, 0.4),
      p("Wolfgang Unzicker", "GM", 2510, 6, 10, 0.35),
      p("Helmut Pfleger", "GM", 2525, 6.5, 10, 0.5),
      p("Hans-Joachim Hecht", "GM", 2475, 5.5, 9, 0.55),
      p("Klaus Darga", "GM", 2465, 5, 8, 0.45),
      p("Stefan Kindermann", "IM", 2435, 5, 8, 0.6),
    ],
  },
  {
    countryCode: "ar",
    countryName: "Argentina",
    year: 1978,
    finalRank: 9,
    players: [
      p("Miguel Quinteros", "GM", 2530, 6, 10, 0.6),
      p("Oscar Panno", "GM", 2515, 6.5, 11, 0.35),
      p("Jorge Rubinetti", "IM", 2450, 6, 10, 0.4),
      p("Jaime Emma", "IM", 2420, 5, 9, 0.5),
      p("Juan Hase", "IM", 2400, 4.5, 7, 0.55),
    ],
  },
  {
    countryCode: "bg",
    countryName: "Bulgária",
    year: 1970,
    finalRank: 6,
    players: [
      p("Milko Bobotsov", "GM", 2500, 7, 13, 0.4),
      p("Georgi Tringov", "GM", 2475, 7.5, 13, 0.55),
      p("Ivan Radulov", "IM", 2465, 8, 13, 0.6),
      p("Nikola Padevsky", "GM", 2450, 6.5, 12, 0.45),
      p("Atanas Kolarov", "IM", 2430, 6, 10, 0.5),
      p("Ivan Popov", "IM", 2420, 5.5, 9, 0.55),
    ],
  },
];
