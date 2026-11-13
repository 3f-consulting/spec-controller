import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface FeatureSource {
  readonly file: string;
  readonly source: string;
}

// Every feature file under the folder, at any depth; no folder holds none.
export function featureSourcesUnder(folder: string): FeatureSource[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".feature"))
    .map((path) => ({ file: join(folder, path), source: readFileSync(join(folder, path), "utf8") }));
}
