/**
 * THE ACCOUNTING IDENTITY (@SCN-USG-018, 3F-3343) — how many steps of the target's pipeline this
 * run read, what became of each of them, and the total those dispositions come to.
 *
 * WHY A COUNT EXISTS AT ALL, WHEN FOUR SECTIONS OF THE REPORT ALREADY NAME THE STEPS. This axis's
 * first non-negotiable is that nothing seen is dropped: a step that reaches the reader leaves it
 * as a candidate fitness check, as one of the runners the target named, as the reconciler, or as a
 * step the consumer called a non-check, and there is no fifth outcome. That is a claim about code,
 * and no reader can check it by reading. Every account beside this one names what a step BECAME —
 * so a step that became nothing is missing from no list, and all four of them read exactly as they
 * would have read had the step never existed. Only the population, counted against the
 * dispositions, can see an absence like that.
 *
 * IT ASKS WHAT WOULD STOP BEING COUNTED, NOT WHAT WOULD FAIL. A removal-shaped fault — a filter
 * dropping a step on a branch nobody enumerated — raises nothing for double-entry to miss the
 * other half of. It posts no row, names no step and reds no assertion, because what it did was to
 * not happen. This is the instrument for that shape of fault and it is the only one on the axis.
 *
 * THE SUM IS THIS READER'S, AND THAT IS THE POINT OF CARRYING IT. `accountedFor` is added up here
 * and stated beside `stepsRead`, so the two totals can be compared rather than reconstructed. A
 * report that printed the four dispositions and left the adding to whoever read it would be
 * satisfied by any four figures at all — including four produced by a reader that had lost a step.
 *
 * EVERY DISPOSITION IS THE PRODUCT'S OWN RULE, ASKED, NEVER RESTATED HERE. The candidates come
 * from `isCandidateStep`, the runners from `runsNamedRunner`, and the other two from the seams the
 * composition already built (`parse/reconcilerSteps`, `parse/stepExclusions`). A count that
 * re-derived any of them would be measuring its own arithmetic: it would go on agreeing with
 * itself while the books beneath it posted something else, which is the one disagreement a reader
 * of a total has no way to see. It is the SAME walk, too (`ciWorkflowSteps`), so the population
 * being counted is the population the observers read.
 *
 * THE FOUR ARE DISJOINT BY CONSTRUCTION AND EXHAUSTIVE BY ASSERTION, which is the asymmetry the
 * identity turns on. Each rule below carries the guards that keep a step out of a second
 * disposition, so the count can never exceed the population by accident; nothing here makes them
 * COVER the population, and whether they do is exactly what the two totals say out loud.
 *
 * THE PRECEDENCE IS THE COMPOSITION'S, NOT A PREFERENCE. The exclusion seam discovery is asked
 * through puts the reconciler ahead of the consumer's own list, and a runner is a step the
 * observer never reached the runner rule for if something had already taken it out of discovery.
 * A step that is two things at once is counted under the first of them, so the report's dispositions
 * add up to the pipeline rather than to more than it.
 *
 * NOT THE SCOPE CENSUS beside it (`parse/discoveryScope`, @SCN-USG-020), which counts the same
 * population for a different question: that one says WHICH files and WHICH jobs the steps came
 * from, this one says none of them went missing on the way. A reader satisfies either alone.
 */

import { ciWorkflowSteps, type CiWorkflowStep, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { isCandidateStep, runsNamedRunner } from "./runningStaticChecks.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export function stepAccounting(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isReconciler: (step: CiWorkflowStep) => boolean,
  isNamedANonCheck: (step: CiWorkflowStep) => boolean
): StepAccounting {
  const steps = ciWorkflowSteps(ciSources);
  // THE COMPOSED SEAM, REBUILT FROM ITS TWO HALVES RATHER THAN TAKEN WHOLE. The observer is asked
  // one question per step and cannot tell the two facts apart; this reader has to, because "the
  // reconciler" and "the consumer said so" are the two dispositions a report keeps separate.
  const isExcludedFromDiscovery = (step: CiWorkflowStep): boolean =>
    isReconciler(step) || isNamedANonCheck(step);
  const count = (holds: (step: CiWorkflowStep) => boolean): number => steps.filter(holds).length;

  const candidates = count((step) =>
    isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)
  );
  const reconciler = count(isReconciler);
  // NOT ALSO THE RECONCILER, so a consumer who wrote a `notChecks` entry naming a step this tool
  // takes out of its own books does not have it counted twice — and the surplus does not read as
  // a pipeline larger than the one that ran.
  const excluded = count((step) => !isReconciler(step) && isNamedANonCheck(step));
  // NOT ALREADY OUT OF DISCOVERY, for the same reason and in the observer's own order: the runner
  // rule is a question about a step the reader is still looking at.
  const runnerSteps = count(
    (step) => !isExcludedFromDiscovery(step) && runsNamedRunner(step, packageJson, runners)
  );

  return {
    stepsRead: steps.length,
    candidates,
    runners: runnerSteps,
    reconciler,
    excluded,
    accountedFor: candidates + runnerSteps + reconciler + excluded,
  };
}
