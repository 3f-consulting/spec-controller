import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { provenanceObject } from "../provenance/provenance.js";
import type { RunContext } from "../domain/runProvenance.js";
import { errorsOf, claimCodesOf, summaryStatingNoFault, type RenderInput } from "../domain/renderInput.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import { runVerdict, type RunVerdict, type VerdictInputs } from "../domain/runVerdict.js";
import { outOfBalanceByFeature } from "../domain/outOfBalanceByFeature.js";

export type {
  ClaimReconciliationTotals,
  ReconciliationLineTotals,
  MissingByQualityCheckKind,
} from "../domain/ledger.js";
export type { Summary, EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

export type UnconcludedSummary = Omit<RenderInput["summary"], "runVerdict"> & {
  readonly runVerdict?: RunVerdict;
};

export function concludedSummary(summary: UnconcludedSummary, verdictInputs: VerdictInputs): RenderInput["summary"] {
  const { runVerdict: _saved, ...rest } = summary;
  return { runVerdict: runVerdict(verdictInputs), ...rest };
}

export function assembleRenderInput(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: ReadonlyMap<string, string>
): RenderInput {
  const errorsInTheInputs = errorsOf(evidenceReconciliation.claimCodeErrors, evidenceReconciliation.summary);
  const claimCodes = claimCodesOf(evidenceReconciliation.claimCodePopulation, evidenceObligations);
  const byFeature = outOfBalanceByFeature(
    evidenceReconciliation.ledger.claimReconciliations,
    claimCodes?.untaggedScenarios ?? [],
    Object.fromEntries(featureNames ?? []),
  );
  return {
    runProvenance: provenanceObject(ctx),
    ...(errorsInTheInputs ? { errorsInTheInputs } : {}),
    summary: concludedSummary({
      ...(claimCodes ? { claimCodes } : {}),
      ...summaryStatingNoFault(evidenceReconciliation.summary),
      ...(byFeature.length > 0 ? { outOfBalanceByFeature: byFeature } : {}),
    }, {
      ledger: evidenceReconciliation.ledger,
      claimCodeErrors: evidenceReconciliation.claimCodeErrors,
      strict: ctx.strict === true,
    }),
    claimReconciliations: evidenceReconciliation.ledger.claimReconciliations,
  };
}
