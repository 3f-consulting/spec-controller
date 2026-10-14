import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { provenanceObject } from "../provenance/provenance.js";
import type { RunContext } from "../domain/runProvenance.js";
import type { RenderInput } from "../domain/renderInput.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";

export type {
  ScenarioReconciliationTotals,
  QualityCheckReconciliationTotals,
  MissingByQualityCheck,
  FitnessTally,
} from "../domain/ledger.js";
export type {
  Summary,
  TestVolumeTotals,
  FitnessFunctionTotals,
  EvidenceReconciliation,
} from "../domain/evidenceReconciliation.js";

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
