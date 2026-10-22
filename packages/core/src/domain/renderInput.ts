import type { ScenarioCodeError, ScenarioCodePopulation } from "./scnTags.js";
import type { Ledger } from "./ledger.js";
import type { Summary } from "./evidenceReconciliation.js";
import type { ProvenanceObject } from "./runProvenance.js";
import type { SharedScnCode, UntaggedScenario } from "./corpusCounts.js";
import type { RunVerdict } from "./runVerdict.js";

export interface EvidenceObligationsSection {
  readonly excludedOccurrences: number;
  readonly untaggedScenarios: readonly UntaggedScenario[];
  readonly sharedScnCodes?: readonly SharedScnCode[];
}

export interface ReportMetadata {
  readonly featureNames?: Record<string, string>;
}

export interface RenderInput {
  readonly runProvenance: ProvenanceObject;
  readonly summary: Summary;
  readonly ledger: Ledger;
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
  readonly scenarioCodePopulation?: ScenarioCodePopulation;
  readonly evidenceObligations?: EvidenceObligationsSection;
  readonly metadata?: ReportMetadata;
}

export type FeatureNames = ReadonlyMap<string, string>;

export type ExitCodeOf = (verdict: RunVerdict) => number;
