import { readFileSync } from "node:fs";
import { featureCodeOfFile, parseFeatureCorpus } from "@3f-consulting/spec-controller-core";
import { corpusFeatureFiles, MissingFeatureCorpusError, type CorpusFeatureFile } from "../ingest/ingestScenarios.js";
import { AppMessage } from "../messages.js";
import { readOrRefuse, refuse, UnparseableFeatureFiles } from "./unreadable.js";

export function readFeatureCodes(featuresDir: string): string[] {
  const sources = featureFilesIn(featuresDir).map(({ path }) => ({
    file: path,
    source: readOrRefuse(AppMessage.FeatureFile, path, () => readFileSync(path, "utf8")),
  }));
  const parse = parseFeatureCorpus(sources);
  if (parse.kind === "unparseable") throw new UnparseableFeatureFiles(parse.faults);
  return parse.parsed.flatMap((feature) => featureCodeOfFile(feature) ?? []);
}

function featureFilesIn(dir: string): CorpusFeatureFile[] {
  try {
    return corpusFeatureFiles(dir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    return refuse(AppMessage.FeatureCorpus, dir, err);
  }
}
