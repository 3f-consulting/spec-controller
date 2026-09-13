/**
 * HOW A STEP IS NAMED BACK TO THE CONSUMER — `<workflow file>:<job id>:<step name>`, stated once.
 *
 * ONE STATEMENT OF THE FORM, because two readers now depend on it and they must not be free to
 * disagree. A `notChecks` entry is written in this form and matched against it
 * (`parse/stepExclusions`), and the report names a step in this form in every section that names
 * one at all — the consumer's own exclusions, and the reconciler's own steps
 * (`parse/reconcilerSteps`). A second spelling would mean a consumer copying a name off one
 * section of the report and finding it matches nothing when they write it into the other.
 *
 * FULLY QUALIFIED, and that is what the walk was widened to carry (3F-3352). `Typecheck` is a
 * check in this repository's `ci.yml` and plumbing in its `release.yml`, so a bare name is
 * ambiguous in any real tree — as an entry it would take out both, and as a report line it would
 * leave a reader unable to tell which of the two was meant.
 *
 * THE STEP'S OWN HALF IS GITHUB'S. Its `name:`, else the action it `uses:`, else the first
 * non-blank line of its `run:` — the string GitHub itself shows in a run log, so a consumer
 * reading a report line or writing an entry copies what is already in front of them.
 *
 * NO NAME FOR THE SOURCE MEANS NO QUALIFIED NAME. `ciSources` is an array of anonymous source
 * strings and the core holds no filesystem — `ciSourcePaths.ts` is explicit that keeping it that
 * way is the point — so the names arrive as data from the CLI edge. A source this run was given
 * none for can be named by nobody, and what each caller does with that silence is its own: an
 * entry excludes no such step (the safe direction), and the reconciler account falls back to the
 * step's own identity rather than dropping a step it recognised.
 */

import type { CiWorkflowStep } from "./checkScriptsRunInCI.js";

/** The one string that names this step, or nothing for a step whose source has no name. */
export function qualifiedStepName(
  step: CiWorkflowStep,
  ciSourceNames: readonly string[]
): string | undefined {
  const source = ciSourceNames[step.sourceIndex];
  return source === undefined ? undefined : `${source}:${step.jobId}:${step.identity}`;
}
