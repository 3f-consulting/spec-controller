import { readFileSync } from "node:fs";
import { MissingFeatureCorpusError } from "../ingest/gherkinValidation.js";
import { corpusFeatureFiles, extractFeatureCode, type CorpusFeatureFile } from "../ingest/ingestScenarios.js";
import { AppMessage } from "../messages.js";
import { readOrRefuse, refuse } from "./unreadable.js";

export function readHeaderCodes(featuresDir: string): string[] {
  return featureFilesIn(featuresDir).flatMap(({ path }) => {
    const code = extractFeatureCode(readOrRefuse(AppMessage.FeatureFile, path, () => readFileSync(path, "utf8")));
    return code === null ? [] : [code];
  });
}

function featureFilesIn(dir: string): CorpusFeatureFile[] {
  try {
    return corpusFeatureFiles(dir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    return refuse(AppMessage.FeatureCorpus, dir, err);
  }
}
