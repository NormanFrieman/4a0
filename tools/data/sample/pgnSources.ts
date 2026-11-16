/**
 * DEVELOPMENT DATA — per-player PGN collections for the sample opening books
 * (GDD §7.1). Source: PGN Mentor (https://www.pgnmentor.com/files.html),
 * licence not stated; to be confirmed or replaced before launch (GDD §14).
 * People missing here fall back to the decade book.
 */
import type { NameMatcher } from "../books/buildBooks.ts";

export const PGN_BASE_URL = "https://www.pgnmentor.com/players/";

export interface PgnSource extends NameMatcher {
  /** Collection name: `${PGN_BASE_URL}${file}.zip`. */
  file: string;
}

const src = (file: string, surnames: string[] = [file.toLowerCase()], initial?: string) => ({
  file,
  surnames,
  ...(initial ? { initial } : {}),
});

/** personId → collection. */
export const pgnSources: Record<string, PgnSource> = {
  "anatoly-karpov": src("Karpov", ["karpov"], "a"),
  "lev-polugaevsky": src("Polugaevsky"),
  "mikhail-tal": src("Tal", ["tal"], "m"),
  "lajos-portisch": src("Portisch"),
  "zoltan-ribli": src("Ribli"),
  "robert-byrne": src("Byrne", ["byrne"], "r"),
  "lubomir-kavalek": src("Kavalek"),
  "larry-evans": src("Evans", ["evans"], "l"),
  "svetozar-gligoric": src("Gligoric"),
  "ljubomir-ljubojevic": src("Ljubojevic"),
  "borislav-ivkov": src("Ivkov"),
  "vlastimil-hort": src("Hort"),
  "tony-miles": src("Miles", ["miles"], "a"),
  "john-nunn": src("Nunn", ["nunn"], "j"),
  "jonathan-speelman": src("Speelman"),
  "jan-timman": src("Timman"),
  "robert-hubner": src("Huebner", ["huebner", "hubner"]),
  "wolfgang-unzicker": src("Unzicker"),
  "oscar-panno": src("Panno"),
  "miguel-quinteros": src("Quinteros"),
};
