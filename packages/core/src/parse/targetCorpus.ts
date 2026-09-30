import { citationOfCitedRow, type ScriptCitation } from "./fitnessCitations.js";
import {
  parseScenarios,
  parseTaggedScenarios,
} from "./scenarios.js";
import type { Scenario } from "../model.js";

export interface TargetCorpus {
  scenarios: Scenario[];
  citedRow: (citedScn: string | undefined) => ScriptCitation | null;
}

export function readTargetCorpus(
  sources: readonly string[],
  deferralTags: readonly string[]
): TargetCorpus {
  return {
    scenarios: sources.flatMap((source) => parseScenarios(source, deferralTags)),
    citedRow: (citedScn) => citationOfCitedRow(citedScn),
  };
}
