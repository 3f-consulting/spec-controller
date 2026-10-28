import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext, RunInputName } from "../domain/runProvenance.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import type { ExitCodeOf, FeatureNames } from "../domain/renderInput.js";
import { assembleRenderInput } from "./renderInput.js";
import { assembleSavedReport } from "./savedReport.js";
import { renderReport } from "../render/markdown.js";
import { projectProvenanceObject, type ProvenanceFacts } from "../render/provenanceFacts.js";
import { provenanceObject } from "../provenance/provenance.js";

export function renderMarkdown(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  exitCodeOf: ExitCodeOf,
  evidenceObligations?: EvidenceObligations,
  featureNames?: FeatureNames
): string {
  return renderReport(assembleRenderInput(evidenceReconciliation, ctx, evidenceObligations, featureNames), ctx.inputs, exitCodeOf);
}

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

export function renderReportFromJson(json: string, inputNames: readonly RunInputName[], exitCodeOf: ExitCodeOf): string {
  return renderReport(assembleSavedReport(JSON.parse(json), false), inputNames, exitCodeOf);
}

export function projectProvenance(ctx: RunContext): ProvenanceFacts {
  return projectProvenanceObject(provenanceObject(ctx), ctx.inputs);
}
