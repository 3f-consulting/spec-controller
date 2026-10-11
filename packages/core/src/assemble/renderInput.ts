import type { ScenarioCodeError, ScenarioCodePopulation } from "../domain/scenarioCodeError.js";
import type { Ledger } from "../model.js";
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import { provenanceObject, type ProvenanceObject, type RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "../census/evidenceObligations.js";

export type {
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  FitnessTally,
} from "../domain/ledger.js";
export type {
  Summary,
  TestVolumeTotals,
  FitnessFunctionTotals,
  EvidenceReconciliation,
} from "../domain/evidenceReconciliation.js";

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

export function assembleRenderInput(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: ReadonlyMap<string, string>
): RenderInput {
  return {
    runProvenance: provenanceObject(ctx),
    ...evidenceReconciliation,
    ...(evidenceObligations
      ? {
          evidenceObligations: {
            excludedOccurrences: evidenceObligations.excludedOccurrences,
            untaggedScenarios: evidenceObligations.untaggedScenarios,
            ...(evidenceObligations.sharedScnCodes && evidenceObligations.sharedScnCodes.length > 0
              ? { sharedScnCodes: evidenceObligations.sharedScnCodes }
              : {}),
          },
        }
      : {}),
    ...(featureNames && featureNames.size > 0
      ? { metadata: { featureNames: Object.fromEntries(featureNames) } }
      : {}),
  };
}
