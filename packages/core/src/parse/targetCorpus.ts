import { citationOfCitedRow, type ScriptCitation } from "./fitnessCitations.js";
import { scenariosOf, type ParsedFeatureFile } from "./scenarios.js";
import type { Scenario } from "../model.js";

export interface TargetCorpus {
  readonly scenarios: readonly Scenario[];
  readonly citedRow: (citedScn: string | undefined) => ScriptCitation | null;
}

export function readTargetCorpus(
  features: readonly ParsedFeatureFile[],
  deferralTags: readonly string[]
): TargetCorpus {
  return {
    scenarios: features.flatMap((feature) => scenariosOf(feature, deferralTags)),
    citedRow: (citedScn) => citationOfCitedRow(citedScn),
  };
}
