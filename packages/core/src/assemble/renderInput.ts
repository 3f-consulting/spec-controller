import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { provenanceObject } from "../provenance/provenance.js";
import type { RunContext } from "../domain/runProvenance.js";
import { errorsOf, scenarioCodesOf, summaryStatingNoFault, type RenderInput } from "../domain/renderInput.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import { runVerdict, type RunVerdict, type VerdictInputs } from "../domain/runVerdict.js";
import { outOfBalanceByFeature } from "../domain/outOfBalanceByFeature.js";

export type {
  ClaimReconciliationTotals,
  QualityCheckReconciliationTotals,
  MissingByQualityCheck,
} from "../domain/ledger.js";
export type { Summary, EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

export type UnconcludedSummary = Omit<RenderInput["summary"], "runVerdict"> & {
  readonly runVerdict?: RunVerdict;
};

export function concludedSummary(summary: UnconcludedSummary, verdictInputs: VerdictInputs): RenderInput["summary"] {
  return { ...summary, runVerdict: runVerdict(verdictInputs) };
}

export function assembleRenderInput(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: ReadonlyMap<string, string>
): RenderInput {
  const errors = errorsOf(evidenceReconciliation.scenarioCodeErrors, evidenceReconciliation.summary);
  const scenarioCodes = scenarioCodesOf(evidenceReconciliation.scenarioCodePopulation, evidenceObligations);
  const byFeature = outOfBalanceByFeature(
    evidenceReconciliation.ledger.claimReconciliations,
    scenarioCodes?.untaggedScenarios ?? [],
    Object.fromEntries(featureNames ?? []),
  );
  return {
    runProvenance: provenanceObject(ctx),
    ...(errors ? { errors } : {}),
    ...(scenarioCodes ? { scenarioCodes } : {}),
    summary: concludedSummary({
      ...summaryStatingNoFault(evidenceReconciliation.summary),
      ...(byFeature.length > 0 ? { outOfBalanceByFeature: byFeature } : {}),
    }, {
      ledger: evidenceReconciliation.ledger,
      scenarioCodeErrors: evidenceReconciliation.scenarioCodeErrors,
      strict: ctx.strict === true,
    }),
    ledger: evidenceReconciliation.ledger,
  };
}
