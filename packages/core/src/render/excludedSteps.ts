/**
 * THE STEPS THE TARGET NAMED NON-CHECKS (@SCN-USG-015), and the entries of its list that named no
 * step at all.
 *
 * THIS SECTION IS WHY THE EXCLUSION IS ALLOWED TO EXIST. A step that reaches the reader leaves it
 * as an observation, as a behavioural runner, as the reconciler, or as a step the consumer named a
 * non-check — and none of those four is silent. An exclusion that simply removed a step would be
 * the very silence this axis exists to end, arriving in a new coat and with the consumer's own
 * signature on it, so the price of being able to say "not a check" is being told what it took out.
 *
 * TWO SENTENCES, BECAUSE THE TWO HALVES ARE OPPOSITE FACTS. An entry that named a step took one out
 * of discovery, which is a thing that happened and a thing to check. An entry that named none took
 * nothing out — a stale line, most often a step renamed since it was written — and reading it as
 * the first would tell the consumer their pipeline is narrower than it is.
 *
 * Its own module rather than a further section in `markdown.ts`, under the file-length ceiling
 * then in force — retired portfolio-wide on 2026-09-18 (3F-2320). What keeps it out is that it
 * is a self-contained emitter, read on its own terms. The precedent is `runVerdict.ts` and, one
 * sub-issue along, `behaviouralRunners.ts`.
 */

import type { RenderInput } from "../assemble/renderInput.js";

/**
 * The excluded steps and the stale entries, or nothing at all.
 *
 * OMITTED WHEN THE TARGET HAS NAMED NO NON-CHECKS, which is every target that carries no such
 * list: the section appears only when there is something the consumer said, and every other
 * report is byte-identical to what it was.
 */
export const excludedStepsSection = (report: RenderInput): string[] => {
  const excluded = report.summary.excludedSteps ?? [];
  const unmatched = report.summary.unmatchedNotChecks ?? [];
  if (excluded.length === 0 && unmatched.length === 0) return [];
  return [
    "### Excluded steps",
    "",
    ...excluded.map((entry) => `- ${entry} — excluded: the target names this step a non-check.`),
    // AFTER THE STEPS THAT WERE EXCLUDED, because those are what the list did and these are what
    // it failed to do. A consumer reads what came out of discovery and then what they wrote that
    // took nothing out of it.
    ...unmatched.map(
      (entry) => `- ${entry} — matches no step: the entry names nothing this run read.`
    ),
    "",
  ];
};
