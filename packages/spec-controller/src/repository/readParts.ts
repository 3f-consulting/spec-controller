import { readFileSync } from "node:fs";
import { featureCodeOfFile, parseFeatureCorpus } from "@3f-consulting/spec-controller-core";
import { AppMessage } from "../messages/messages.js";
import { readOrRefuse, UnparseableFeatureFiles } from "./unreadable.js";

export function readFeatureCodes(featureFiles: readonly { readonly path: string }[]): string[] {
  const sources = featureFiles.map(({ path }) => ({
    file: path,
    source: readOrRefuse(AppMessage.FeatureFile, path, () => readFileSync(path, "utf8")),
  }));
  const parse = parseFeatureCorpus(sources);
  if (parse.kind === "unparseable") return [];
  return parse.parsed.flatMap((feature) => featureCodeOfFile(feature) ?? []);
}
