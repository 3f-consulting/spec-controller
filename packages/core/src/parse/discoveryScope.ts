/**
 * THE SCOPE DISCOVERY RANGED OVER (@SCN-USG-020, 3F-3343) — one entry per job of every workflow
 * `--ci` resolved: the file, the job, how many steps this run read from it, and how many of those
 * steps are candidate fitness checks.
 *
 * WHY THE REPORT SAYS IT AT ALL, AND WHY IT IS THE ANSWER RATHER THAN A CONSOLATION FOR NOT HAVING
 * ONE. This axis's analysis asked what the tool says when it is pointed somewhere that yields an
 * implausible answer — at a release workflow, or at one job of several. The answer is that it
 * makes NO judgement about plausibility and states its scope instead: a trigger-based or name-based
 * rule for "this looks like a release workflow" is exactly the judgement the ticket puts out of
 * scope, and it is a list of ours, which is the drift the whole inversion exists to remove. A
 * consumer reading the file, the job and the counts knows on sight, and corrects it by narrowing
 * `--ci` (@SCN-USG-008) or by naming the steps that are not checks (@SCN-USG-015).
 *
 * AND IT IS THE ANSWER TO THE QUIETER HALF — THE JOB THE TOOL NEVER LOOKED AT. The census reports
 * how many checks ran and nothing said how many jobs, in how many files, that number came from. A
 * consumer whose second job holds three checks reads exactly what a consumer with three checks in
 * one job reads, and neither figure can be got from the other.
 *
 * BOTH FIGURES PER JOB, because either alone is satisfiable by a reader wrong about the other, and
 * a job that reads its whole pipeline and contributes nothing is precisely the case a reader most
 * needs to see. A job every step of which something took out is reported with none, never dropped.
 *
 * THE CANDIDATE FIGURE IS THE OBSERVER'S OWN RULE, asked through `isCandidateStep`
 * (`parse/runningStaticChecks`) rather than restated here. A census re-deriving membership would
 * be measuring its own arithmetic — it would go on agreeing with the scope section while the books
 * beneath it said something else, which is the one disagreement a reader of this section cannot
 * see. Same walk, too (`ciWorkflowSteps`), so the two readers cannot come to disagree about which
 * steps a workflow even runs.
 *
 * NOT THE ACCOUNTING IDENTITY (@SCN-USG-018). That one asserts the dispositions sum to the steps
 * read, so nothing the reader saw was dropped; this one asserts the provenance — which files and
 * which jobs those steps came from. A reader satisfies either alone: a correct sum over a scope it
 * never names, or a named scope whose numbers do not add up.
 *
 * SORTED, so two runs over one tree cannot differ and a diff of two reports never turns on the
 * order a directory happened to be handed back in — the same reason `ciSourcePathsOf` sorts. The
 * sort is stable, so two jobs no name separates stay in the order their sources were read.
 *
 * NO FILESYSTEM, AND THE NAMES ARE INJECTED, for the reason `stepExclusions` states next door:
 * `ciSources` is an array of anonymous source strings and `ciSourcePaths.ts` is explicit that
 * keeping the core that way is the point. A source this run was given no name for is still a
 * source it READ, so its jobs keep their entries and lose only the half of their name nobody
 * supplied — the direction `reconcilerSteps` takes, and never a dropped row.
 */

import { ciWorkflowSteps, type CiWorkflowStep, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { isCandidateStep } from "./runningStaticChecks.js";
import type { JobDiscoveryScope } from "../domain/evidenceReconciliation.js";

/** One entry under construction — the same shape, with the two figures still being counted. */
type Tally = { source?: string; job: string; steps: number; candidates: number };

/**
 * BY SOURCE INDEX AND JOB, never by the source's NAME. Two sources this run was given no name for
 * are two files it read, and keying on the name would fold their same-named jobs into one entry —
 * a job the reader ranged over, gone from the account of what it ranged over.
 */
const keyOf = (step: CiWorkflowStep): string => `${step.sourceIndex}:${step.jobId}`;

export function discoveryScope(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean = () => false
): readonly JobDiscoveryScope[] {
  const tallies = new Map<string, Tally>();
  for (const step of ciWorkflowSteps(ciSources)) {
    const source = ciSourceNames[step.sourceIndex];
    const tally = tallies.get(keyOf(step)) ?? {
      // Spread rather than a `source: undefined` assignment, so an entry for a source nobody named
      // carries no key at all — the shape an absent citation has everywhere else in this engine.
      ...(source !== undefined ? { source } : {}),
      job: step.jobId,
      steps: 0,
      candidates: 0,
    };
    tally.steps += 1;
    if (isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)) tally.candidates += 1;
    tallies.set(keyOf(step), tally);
  }
  // BY FILE AND THEN BY JOB. A source with no name sorts ahead of every named one, which is a
  // settled place rather than a chosen one: it is what an absent name compares as, and the point
  // of the sort is that two runs over one tree agree.
  return [...tallies.values()].sort(
    (a, b) => (a.source ?? "").localeCompare(b.source ?? "") || a.job.localeCompare(b.job)
  );
}
