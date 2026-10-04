import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractFeatureCode } from "../ingest/ingestScenarios.js";
import { AppMessage } from "../messages.js";
import { readOrRefuse, refuse } from "./unreadable.js";

export function readHeaderCodes(featuresDir: string): string[] {
  return featureFilesIn(featuresDir).flatMap((name) => {
    const path = join(featuresDir, name);
    const code = extractFeatureCode(readOrRefuse(AppMessage.FeatureFile, path, () => readFileSync(path, "utf8")));
    return code === null ? [] : [code];
  });
}

function featureFilesIn(dir: string): string[] {
  try {
    return readdirSync(dir).filter((name) => name.endsWith(".feature"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    return refuse(AppMessage.FeatureCorpus, dir, err);
  }
}
