/**
 * THE RUNTIME TEST-VOLUME CENSUS a run banked — the `### Test volume` cut under Summary views.
 *
 * Its own module rather than a section in `markdown.ts`, which sits at a `max-lines` exception —
 * and an exception excuses existing debt, never headroom. Moved out whole at @SCN-USG-015, when
 * the excluded-step cut beside it needed the room; `runVerdict.ts`, `staticChecks.ts` and
 * `behaviouralRunners.ts` are the precedent, each moved for exactly this reason. It goes out
 * BESIDE `staticChecks.ts` deliberately: that module's own header already calls this section its
 * mirror on the runtime axis, and the two now sit where a reader looking for either finds both.
 * NOTHING about the section changed in the move: same emitter, same lines, same omit-when-absent.
 */

import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import type { RenderInput } from "../assemble/renderInput.js";

/**
 * Test volume (@SCN-RPT-010) — the evidence-observation side under Summary views, the
 * counterpart to the Evidence reconciliation' evidence-obligation side. Renders the balancing identity
 * (`N evidence observations = a on scenarios + b on phantom scenarios + c on the suspense scenario`,
 * a DERIVED view of the retained aggregate, grouped by the SCENARIO-KIND each credit posted to)
 * then the per-quality-check evidence observation table
 * (all four runtime quality-checks, zeros shown — a fixed tally like Evidence reconciliation).
 * Omitted only when no evidence-observation read is threaded (the 3-arg back-compat path). The
 * identity holds BY CONSTRUCTION (one shared pass in src/evidenceObservations.ts); the renderer
 * only sums what the aggregate already counted by kind. Quality-checks read as their tag words,
 * lowercase (the label-=-tag rule). The numbers read off the report's materialised
 * `summary.testVolume` + `summary.rawByRuntimeQualityCheck` (both Ledger folds, 3F-2103 — the
 * `evidenceObservations` section retired).
 */
export const testVolumeSection = (report: RenderInput): string[] => {
  const volume = report.summary.testVolume;
  const raw = report.summary.rawByRuntimeQualityCheck;
  if (!volume || !raw) return [];
  const total = volume.totalEvidenceObservations;
  // Three DIRECT reads off the materialised kind-counts — the renderer does no arithmetic on this
  // line. The three terms are grouped by the SCENARIO-KIND each credit posted to (the canon
  // grouping): on scenarios (a scenario's account), on phantom scenarios (invented
  // phantom-scenario accounts — many can exist, hence the plural) and on the suspense scenario (the
  // one suspense account, singular — includes broken). The identity total = onScenario +
  // onPhantomScenario + onSuspenseScenario holds BY CONSTRUCTION (one shared runtimeObservationTally
  // fold), so the three printed terms cannot drift from the total.
  const lines = [
    "### Test volume",
    "",
    `${total} evidence observations = ${volume.onScenario} on scenarios + ${volume.onPhantomScenario} on phantom scenarios + ${volume.onSuspenseScenario} on the suspense scenario.`,
    "",
    "| Quality-check | Evidence observations |",
    "| --- | --- |",
  ];
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    lines.push(`| ${qualityCheck} | ${raw[qualityCheck]} |`);
  }
  lines.push("");
  return lines;
};
