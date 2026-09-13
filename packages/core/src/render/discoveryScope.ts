/**
 * THE SCOPE THIS RUN RANGED OVER (@SCN-USG-020) — the workflow files `--ci` resolved, the jobs
 * within them, how many steps each held and how many of those became candidate fitness checks.
 *
 * THE SECTION IS THE TOOL'S ANSWER TO BEING POINTED AT THE WRONG THING. It makes no judgement
 * about whether a scope is a plausible one — a rule for "this looks like a release workflow" is
 * exactly the judgement this axis puts out of scope, and it is a list of ours. What it does
 * instead is say what it read, so a consumer sees a workflow they did not mean or a job they
 * forgot they had, and corrects it by narrowing `--ci` or by naming the steps that are not checks.
 *
 * AND IT IS WHERE THE QUIET JOB BECOMES VISIBLE. Every other cut of this report is about steps
 * that became something; this one is about the pipeline the steps came out of, so a job whose
 * every step was taken out — and a job the consumer forgot the tool could not see — reads here
 * and nowhere else.
 *
 * A TABLE RATHER THAN A LINE PER JOB, because four facts per row is what a reader compares down a
 * column: two jobs of one file, or the two figures of one job, are read against each other rather
 * than one sentence at a time. `behaviouralRunners.ts` takes the same shape for the same reason.
 *
 * Its own module rather than a further section in `markdown.ts`, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom. The precedent is
 * `runVerdict.ts` and, along this axis, `behaviouralRunners.ts`, `excludedSteps.ts` and
 * `reconcilerSteps.ts`.
 */

import type { RenderInput } from "../assemble/renderInput.js";

/**
 * The scope, or nothing at all.
 *
 * OMITTED WHERE THE RUN READ NO CI CONFIGURATION, which is the only way the census can be empty:
 * the section appears wherever there is a pipeline to account for, and a run handed none renders
 * byte-identically to before.
 *
 * A SOURCE THIS RUN WAS GIVEN NO NAME FOR STILL GETS ITS ROW, with an empty cell where the file
 * would be. The core holds no filesystem and the names arrive as data from the CLI edge
 * (`parse/stepNames`), so an unnamed source is one nobody could name rather than one nothing read
 * — and dropping its jobs would be a job the reader ranged over vanishing from the account of what
 * it ranged over, which is the silence this axis exists to end.
 */
export const discoveryScopeSection = (report: RenderInput): string[] => {
  const scope = report.summary.discoveryScope ?? [];
  if (scope.length === 0) return [];
  return [
    "### Discovery scope",
    "",
    "| Workflow | Job | Steps read | Candidates |",
    "| --- | --- | --- | --- |",
    ...scope.map(
      ({ source, job, steps, candidates }) =>
        `| ${source ?? "—"} | ${job} | ${steps} | ${candidates} |`
    ),
    "",
  ];
};
