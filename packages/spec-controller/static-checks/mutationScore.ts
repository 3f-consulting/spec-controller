/**
 * The mutation producer's pure half — what a mutation report's mutants are worth as a score
 * (@SCN-MUT-007, @SCN-MUT-008 — features/mutation-score.feature).
 *
 * THE SCORE IS DERIVED, NEVER TRANSCRIBED. Stryker's report carries the per-mutant outcomes AND
 * a `thresholds` block of its own. Reading the second would be copying a verdict the ledger
 * exists to reconcile — the runner grading its own homework, one artefact further out — so
 * nothing here reads that block, and both evidence arms run on a report whose block disagrees
 * with its own mutants, which is the only shape of this that reds a reader that started reading
 * the verdict.
 *
 * THE ARITHMETIC IS THE METRIC'S, NOT THIS REPOSITORY'S. `mutation-testing-metrics@3.7.3` →
 * `Metrics` defines the score as `totalDetected / totalValid × 100`: detected is killed plus
 * timed-out, and valid adds the survived and the never-covered. Mutants that errored at runtime,
 * failed to compile or were ignored sit OUTSIDE `totalValid` and so outside the score. That is
 * the library's ruling rather than a choice taken here, and a producer counting every mutant it
 * found would report a different number from every other tool reading the same run.
 */

/**
 * Where a mutation run leaves the report this reads, relative to a repository root.
 *
 * STRYKER'S OWN DEFAULT FOR ITS `json` REPORTER, WHICH `stryker.config.json` THEREFORE DOES NOT
 * RESTATE. Two copies of a path is two things keyed by the same word that agree until the day one
 * is edited, and the failure a drifted pair produces here is not loud — a producer looking where
 * nothing was written posts no measurement, and a missing row reconciles as a sweep that never
 * ran. Held to the upstream default, a version that moved it reds this producer out loud instead,
 * naming the path it looked in.
 *
 * Beneath `reports/`, which `.gitignore` excludes: a mutation report enumerates which lines of
 * the domain core no test kills, so it lives for the length of the job and is never tracked.
 */
export const MUTATION_REPORT_PATH = "reports/mutation/mutation.json";

/**
 * The outcomes of a mutant the suite DETECTED, spelled as the report schema spells them.
 *
 * `mutation-testing-report-schema@3.7.3` → `MutantStatus`. A timed-out mutant is detected: the
 * suite noticed it, however it noticed it.
 */
const DETECTED: readonly string[] = ["Killed", "Timeout"];

/**
 * The outcomes of a mutant the run counts as valid and did NOT detect.
 *
 * A never-covered mutant is undetected rather than uncounted — a line no test reaches is exactly
 * what this axis measures, and leaving it out of the denominator would score a suite higher for
 * testing less.
 */
const UNDETECTED: readonly string[] = ["Survived", "NoCoverage"];

/**
 * Every mutant outcome in a parsed mutation report, across every file it covers.
 *
 * ACROSS EVERY FILE, WHICH IS THE HALF A SINGLE-FILE FIXTURE WOULD NOT SHOW. The report keys its
 * mutants by the file they were made in, so a reader taking one file's list would score a whole
 * tree by whichever file sorted first.
 *
 * A REPORT IT CANNOT WALK YIELDS NO OUTCOMES rather than a fault, which is the stance every
 * reader at this edge already takes with something it cannot read. What an empty walk is worth is
 * the caller's to decide, and `mutationScoreOf` decides it in one place.
 */
export function mutantOutcomesIn(report: unknown): string[] {
  const files = (report as { files?: unknown } | null)?.files;
  if (typeof files !== "object" || files === null) return [];
  return Object.values(files as Record<string, unknown>).flatMap((file) => {
    const mutants = (file as { mutants?: unknown } | null)?.mutants;
    if (!Array.isArray(mutants)) return [];
    return mutants
      .map((mutant) => (mutant as { status?: unknown } | null)?.status)
      .filter((status): status is string => typeof status === "string");
  });
}

/**
 * The score those mutants imply, or `null` where the run produced no valid mutant to score.
 *
 * NO VALID MUTANT IS NOT A ZERO. Zero is the score of a suite that detected nothing, and a run
 * with nothing to detect has not earned it — the quotient has no answer, so this says so and
 * leaves what to do about it to the edge that asked.
 *
 * AND THE QUOTIENT IS NOT ROUNDED. A resolution is a small opinion about which side of a bar a
 * run belongs on: a score a hair under its floor, rounded to the resolution the bar is authored
 * at, meets a bar it did not meet. `stepTiming` can round its seconds because a wall-clock
 * crosses a printed trigger band long before it crosses its gate; this axis has no band, so the
 * number handed to the ledger is the one the metric defines and nothing else.
 */
export function mutationScoreOf(outcomes: readonly string[]): number | null {
  const detected = outcomes.filter((outcome) => DETECTED.includes(outcome)).length;
  const valid = detected + outcomes.filter((outcome) => UNDETECTED.includes(outcome)).length;
  if (valid === 0) return null;
  return (detected / valid) * 100;
}

/**
 * The score a mutation report is worth read off its SOURCE, or `null` where the run left nothing
 * this can read (@SCN-MUT-008).
 *
 * SOURCE RATHER THAN A PARSED REPORT, BECAUSE THAT IS THE ONLY FORM A PRODUCER EVER HAS ONE IN. A
 * sweep leaves bytes on a disk or it leaves nothing, and absent, empty and unparseable are three
 * different faults arriving as one question. Taking a parsed report would push two of the three
 * back out to whoever called, where each caller would answer them again and one would eventually
 * answer differently.
 *
 * AND ALL THREE READ AS NO SCORE, which is the stance every reader at this edge already takes with
 * something it cannot read — `alreadyPostedIn`, one file over, on the artefact it reads. What a
 * caller does about it is the caller's. What it must not do is invent a number, and both numbers
 * available to invent are wrong the same way: a literal zero is the score of a suite that detected
 * nothing, a claim about the CODE made out of a fault in the harness measuring it, and `0 / 0 ×
 * 100` is `NaN`, which the ledger's reader drops — leaving a defect indistinguishable from a sweep
 * that never ran.
 */
export function mutationScoreIn(source: string | undefined): number | null {
  if (source === undefined) return null;
  let report: unknown;
  try {
    report = JSON.parse(source);
  } catch {
    return null;
  }
  return mutationScoreOf(mutantOutcomesIn(report));
}
