/**
 * WHAT BECAME OF EVERY STEP THIS RUN READ (@SCN-USG-018) — the population, the four dispositions,
 * and whether they add back up to it.
 *
 * THE SECTION IS THIS AXIS'S FIRST NON-NEGOTIABLE MADE CHECKABLE. Nothing seen is dropped: a step
 * that reaches the reader leaves it as a candidate fitness check, as one of the runners the target
 * named, as the reconciler, or as a step the consumer called a non-check, and there is no fifth
 * outcome. Every section above this one names what a step BECAME, so a step that became nothing is
 * missing from none of them and every one reads exactly as it would have read had the step never
 * existed. This is the only cut of the report that can see an absence, and seeing absences is what
 * the whole axis is for.
 *
 * BOTH TOTALS, SIDE BY SIDE, AND THE SUM IS NOT THE READER'S TO MAKE. `Accounted for` is the
 * figure the count itself arrived at; a reader adding the four dispositions up for themselves
 * would be checking their own arithmetic against nothing, and would go on agreeing with a report
 * whose four figures had lost a step between them. Stated as a pair, the identity is something a
 * consumer reads rather than derives.
 *
 * A TABLE AND THEN A SENTENCE, because the two answer different readers. The row is what a
 * consumer compares against their own pipeline — four candidates and three non-checks is a claim
 * about their file they can check. The line under it is the verdict, and where the figures
 * disagree it names both of them, because a bare "does not balance" over numbers a reader has to
 * subtract for themselves is the report withholding the one thing it knows.
 *
 * Its own module rather than a further section in `markdown.ts`, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom. The precedent is
 * `runVerdict.ts` and, along this axis, `discoveryScope.ts`, `behaviouralRunners.ts`,
 * `excludedSteps.ts` and `reconcilerSteps.ts`.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

/**
 * The verdict line — one sentence, and where the two totals disagree it states both.
 *
 * ONE SENTENCE FOR EITHER DISAGREEMENT, deliberately. A step accounted for as nothing and a step
 * accounted for twice are opposite faults, but the reader's next move is the same in both cases
 * and the figures already say which it is: a second sentence would be a branch nothing in this
 * repository can reach, kept alive to describe a case the guards on the count forbid.
 */
const verdictOf = ({ stepsRead, accountedFor }: StepAccounting): string =>
  accountedFor === stepsRead
    ? "- every step this run read is accounted for."
    : `- ${stepsRead} step(s) read, ${accountedFor} accounted for — the four dispositions do not ` +
      `add up to the steps this run read.`;

/**
 * The accounting, or nothing at all.
 *
 * OMITTED WHERE THE RUN READ NO STEP, which is the only way the count can be empty: the section
 * appears wherever there is a pipeline to account for, and a run handed no CI configuration
 * renders byte-identically to before.
 */
export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  const { stepsRead, candidates, runners, reconciler, excluded, accountedFor } = accounting;
  return [
    "### Step accounting",
    "",
    "| Steps read | Candidates | Runners | Reconciler | Excluded | Accounted for |",
    "| --- | --- | --- | --- | --- | --- |",
    `| ${stepsRead} | ${candidates} | ${runners} | ${reconciler} | ${excluded} | ${accountedFor} |`,
    "",
    verdictOf(accounting),
    "",
  ];
};
