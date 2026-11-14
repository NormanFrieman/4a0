/** Sample dataset for tests, read straight from public/data/sample. */
import index from "../../public/data/sample/index.json";
import persons from "../../public/data/sample/persons.json";
import y1970 from "../../public/data/sample/olympiads/1970.json";
import y1974 from "../../public/data/sample/olympiads/1974.json";
import y1976 from "../../public/data/sample/olympiads/1976.json";
import y1978 from "../../public/data/sample/olympiads/1978.json";
import y1980 from "../../public/data/sample/olympiads/1980.json";
import y1982 from "../../public/data/sample/olympiads/1982.json";
import y1984 from "../../public/data/sample/olympiads/1984.json";
import { assembleDataset } from "./dataset.ts";
import type { DatasetIndex, OlympiadFile, Person } from "./types.ts";

export const sampleDataset = () =>
  assembleDataset(
    index as DatasetIndex,
    persons as Person[],
    [y1970, y1974, y1976, y1978, y1980, y1982, y1984] as OlympiadFile[],
  );
