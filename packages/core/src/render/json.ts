/**
 * The JSON renderer — the machine-readable whole-document report, the sibling of the
 * markdown renderer. Now GLUE-FREE (@SCN-RMD-001): it serialises the ONE
 * whole-document report model (`assembleReport`) with `JSON.stringify`, no per-key
 * hand-assembly. The report model — not this renderer — owns the section set, the
 * document order, and the manifesto-vocabulary key names. So the JSON is provably
 * the model, not a lossy projection: humans read the markdown; machines/CI read the json;
 * both are one model in two renderings.
 *
 * Parent: (@SCN-RMD-001).
 */

import type { Ledger } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import type { RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import type { StaticEvidenceObservationKindCounts } from "../census/staticEvidenceObservations.js";
import type { FeatureNames } from "./markdown.js";
import { assembleReport } from "../assemble/report.js";

export function renderJson(
  balance: Ledger,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  evidenceObservations?: RuntimeEvidenceObservationKindCounts,
  guards?: StaticEvidenceObservationKindCounts,
  featureNames?: FeatureNames
): string {
  return JSON.stringify(
    assembleReport(balance, ctx, evidenceObligations, evidenceObservations, guards, featureNames),
    null,
    2
  );
}
