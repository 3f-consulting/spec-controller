import type { FeatureAsWritten } from "../domain/postEvidenceObligation.js";

export function featureAsWrittenFrom(file: string, _source: string): FeatureAsWritten {
  return { file, fileTags: [], scenarios: [], wordsWrittenAsTags: [] };
}
