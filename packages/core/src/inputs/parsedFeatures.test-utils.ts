import { parseFeatureCorpus, type ParsedFeatureFile } from "./gherkin.js";

export function parsedFeatures(sources: readonly string[], files: readonly string[] = []): ParsedFeatureFile[] {
  const parse = parseFeatureCorpus(sources.map((source, i) => ({ file: files[i] ?? `source-${i}.feature`, source })));
  if (parse.kind === "unparseable") throw new Error(parse.faults.map(({ message }) => message).join("\n"));
  return [...parse.parsed];
}
