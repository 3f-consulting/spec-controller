/**
 * THE STEPS THAT ARE THE RECONCILER (@SCN-USG-014) — the step running this reconciliation, and the
 * step writing the step record it reads.
 *
 * THE SECTION IS WHY THE EXCLUSION IS ALLOWED TO BE INVISIBLE TO CONFIGURATION. A step that
 * reaches the reader leaves it as an observation, as a behavioural runner, as the reconciler, or
 * as a step the consumer named a non-check, and none of the four is silent. This is the one of
 * them nobody wrote down, so it is the one where saying it out loud matters most: a consumer who
 * configured nothing still reads which two steps this tool took out of its own books, and why.
 *
 * TWO SENTENCES, BECAUSE THE TWO HALVES ARE DIFFERENT FACTS. One step RUNS the reconciliation this
 * report is; the other WRITES the record that run reads, before it reads it. Both are unsatisfiable
 * as citations and both are off the books, but a consumer looking at their pipeline needs to know
 * which of their steps was taken for which.
 *
 * ITS OWN MODULE rather than a further section in `markdown.ts`: the precedent is `runVerdict.ts`,
 * `behaviouralRunners.ts` and `excludedSteps.ts`, each moved out for exactly this reason.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";

/** What each half of the reconciler is, said in the consumer's terms rather than this tool's. */
const WHAT_IT_IS: Readonly<Record<ReconcilerStep["role"], string>> = {
  reconciles: "this step runs the reconciliation this report is",
  records: "this step writes the step record the reconciliation reads",
};

/**
 * The reconciler's own steps, or nothing at all.
 *
 * OMITTED WHERE THE PIPELINE DOES NOT RUN THIS TOOL, which is every target that reconciles
 * somewhere else: the section appears only when there is something to account for, and every other
 * report is byte-identical to what it was.
 */
export const reconcilerSection = (report: RenderInput): string[] => {
  const steps = report.summary.reconcilerSteps ?? [];
  if (steps.length === 0) return [];
  return [
    "### The reconciler",
    "",
    ...steps.map(({ step, role }) => `- ${step} — the reconciler: ${WHAT_IT_IS[role]}.`),
    "",
  ];
};
