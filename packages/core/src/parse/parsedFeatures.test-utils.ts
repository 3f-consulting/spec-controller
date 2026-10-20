import { parseFeatureCorpus, type ParsedFeatureFile } from "./scenarios.js";

export function parsedFeatures(sources: readonly string[]): ParsedFeatureFile[] {
  const parse = parseFeatureCorpus(sources.map((source, i) => ({ file: `source-${i}.feature`, source })));
  if (parse.kind === "unparseable") throw new Error(parse.faults.map(({ message }) => message).join("\n"));
  return [...parse.features];
}
