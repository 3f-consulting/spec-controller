import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { provenanceObject } from "../provenance/provenance.js";
import type { RunContext } from "../domain/runProvenance.js";
import { errorsOf, scenarioCodesOf, summaryStatingNoFault, type RenderInput } from "../domain/renderInput.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import { runVerdict, type RunVerdict, type VerdictInputs } from "../domain/runVerdict.js";
import { everyStepAccountedFor } from "../domain/uncitedFitnessFunctions.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export type {
  ClaimReconciliationTotals,
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

export type UnconcludedSummary = Omit<RenderInput["summary"], "runVerdict" | "stepAccounting"> & {
  readonly runVerdict?: RunVerdict;
  readonly stepAccounting?: StepAccounting;
};

export function concludedSummary(
  { stepAccounting, ...summary }: UnconcludedSummary,
  verdictInputs: VerdictInputs
): RenderInput["summary"] {
  return {
    ...summary,
    ...(stepAccounting
      ? { stepAccounting: { ...stepAccounting, everyStepAccountedFor: everyStepAccountedFor(stepAccounting) } }
      : {}),
    runVerdict: runVerdict(verdictInputs),
  };
}

export function assembleRenderInput(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: ReadonlyMap<string, string>
): RenderInput {
  const errors = errorsOf(evidenceReconciliation.scenarioCodeErrors, evidenceReconciliation.summary);
  const scenarioCodes = scenarioCodesOf(evidenceReconciliation.scenarioCodePopulation, evidenceObligations);
  return {
    runProvenance: provenanceObject(ctx),
    ...(errors ? { errors } : {}),
    ...(scenarioCodes ? { scenarioCodes } : {}),
    summary: concludedSummary(summaryStatingNoFault(evidenceReconciliation.summary), {
      ledger: evidenceReconciliation.ledger,
      scenarioCodeErrors: evidenceReconciliation.scenarioCodeErrors,
      strict: ctx.strict === true,
    }),
    ledger: evidenceReconciliation.ledger,
    ...(featureNames && featureNames.size > 0
      ? { metadata: { featureNames: Object.fromEntries(featureNames) } }
      : {}),
  };
}
