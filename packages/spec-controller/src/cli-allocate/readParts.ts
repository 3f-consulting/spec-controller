/**
 * The parts the corpus carries: the header codes of its feature files, read where `balance` reads its
 * corpus by default. A part only history or a test fixture carries is not one of them.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractFeatureCode } from "../ingest/ingestScenarios.js";

/** The header codes of the feature files in `featuresDir`; none when there is no such directory. */
export function readHeaderCodes(featuresDir: string): string[] {
  return featureFilesIn(featuresDir).flatMap((name) => {
    const code = extractFeatureCode(readFileSync(join(featuresDir, name), "utf8"));
    return code === null ? [] : [code];
  });
}

function featureFilesIn(dir: string): string[] {
  try {
    return readdirSync(dir).filter((name) => name.endsWith(".feature"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
