import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import type { FeatureNames } from "./markdown.js";
import { assembleRenderInput } from "../assemble/renderInput.js";

export function renderJson(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: FeatureNames
): string {
  return JSON.stringify(
    assembleRenderInput(evidenceReconciliation, ctx, evidenceObligations, featureNames),
    null,
    2
  );
}
