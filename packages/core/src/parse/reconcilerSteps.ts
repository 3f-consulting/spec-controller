/**
 * THE RECONCILER'S OWN STEPS (@SCN-USG-014, 3F-3343) — which steps of a target's pipeline are this
 * reconciliation rather than something it reconciles, and how the report says so.
 *
 * THE SECOND EXCLUSION, AND THE ONLY ONE NOBODY CONFIGURES. A behavioural runner is excluded by a
 * rule over what the target named and a non-check by the consumer's own list; this one is excluded
 * BY CONSTRUCTION, because the run that computes the books cannot be a row in them. The
 * distinction is not a nicety: a `notChecks` pair produces the identical report over the identical
 * pipeline, and the two answers part company only at the consumer who has written nothing — whose
 * very first run would otherwise report their own reconciler as an uncited fitness check, and go
 * on doing so until they learned to configure it away.
 *
 * A CITATION ON EITHER IS UNSATISFIABLE, WHICH IS WHAT MAKES IT CONSTRUCTION RATHER THAN JUDGEMENT.
 * The step record is written BEFORE the reconciliation reads it — necessarily, since that record
 * is its input — so no run's record can ever carry the reconciling step's own outcome, and no
 * scenario can ever be shown to have been answered by it. A demand nothing could satisfy is not a
 * check somebody failed to cite. It is not a check.
 *
 * TWO HALVES, RECOGNISED TWO WAYS, AND NEITHER IS A LIST OF NAMES.
 *
 *   - THE RUN: a step whose command runs this tool's own reconciling invocation, compared as whole
 *     adjacent shell tokens and followed through the manifest scripts a step invokes — the runner
 *     rule's own comparison (`parse/commandRuns`), because a pipeline invokes a binary through a
 *     script alias far more often than it writes its name. ADJACENT is what keeps the same binary
 *     run for another purpose a candidate: this repository's own pipeline runs `spec-controller
 *     tags` beside its balance step, and that is an ordinary step of the pipeline being reconciled.
 *   - THE RECORD: a step carrying GitHub's own step-record expression, which is the only way that
 *     record can be produced. Read off the step's `env:` and its command, wherever the consumer
 *     wrote it, and not off its title — a step called `Dump this run's step record` that produces
 *     no record is an ordinary step, and one called anything at all that produces the record is
 *     the dump.
 *
 * THE INVOCATION IS INJECTED, NEVER ASSUMED. How this product is invoked at a consumer's command
 * line is a fact the application edge holds (`ingest/ingestQualityChecks.ts`), like the script
 * prefixes and the workflow names beside it; the core is handed it as data. A run told no
 * invocation recognises no reconciling step, which is the safe direction — a candidate too many,
 * visible on the report, rather than a step taken off the books by a rule nobody supplied.
 *
 * THE ACCOUNT AND THE SEAM COME OFF ONE RULE. `isReconciler` re-asks the same question of a single
 * step rather than consulting the list this module built, so the account the report prints and the
 * steps discovery skipped cannot come to disagree — a step named on the report as the reconciler
 * while its check sits on the books is a report that contradicts itself in one page.
 */

import { ciWorkflowSteps, type CiWorkflowStep } from "./checkScriptsRunInCI.js";
import { commandRuns } from "./commandRuns.js";
import { qualifiedStepName } from "./stepNames.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";

/** What a run's pipeline yielded of the reconciler — the account, and the one answer per step. */
export interface ReconcilerSteps {
  /** The steps that are the reconciler, in the order the pipeline runs them. */
  readonly steps: readonly ReconcilerStep[];
  /** Whether this step is the reconciler rather than a step of the pipeline it reconciles. */
  readonly isReconciler: (step: CiWorkflowStep) => boolean;
}

/**
 * GitHub'S OWN EXPRESSION FOR THE RUN'S STEP RECORD, whitespace-stripped and lowercased to compare
 * against — its function names are case-insensitive and its expressions tolerate spacing, so
 * `${{ toJSON(steps) }}` and `${{tojson(steps)}}` are one expression and get one answer.
 */
const STEP_RECORD_EXPRESSION = "tojson(steps)";

/** Does this step produce the run's own step record — the input the reconciliation reads? */
function producesTheStepRecord(step: CiWorkflowStep): boolean {
  return [...step.env, ...("runs" in step ? [step.runs] : [])].some((written) =>
    written.replace(/\s+/g, "").toLowerCase().includes(STEP_RECORD_EXPRESSION)
  );
}

/**
 * Which half of the reconciler this step is, or nothing at all.
 *
 * THE RUN IS ASKED FIRST, so a step that both reconciles and dumps is named as the reconciliation
 * rather than as its input. Either way it is off the books; what the order settles is only which
 * of the two sentences the report prints, and the stronger fact about such a step is that it runs
 * the reconciliation.
 */
function roleOf(
  step: CiWorkflowStep,
  invocation: string,
  scripts: Readonly<Record<string, string>>
): ReconcilerStep["role"] | undefined {
  if ("runs" in step && commandRuns(step.runs, invocation, scripts)) return "reconciles";
  return producesTheStepRecord(step) ? "records" : undefined;
}

export function reconcilerSteps(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  invocation: string,
  packageJson: { scripts?: Record<string, string> }
): ReconcilerSteps {
  const scripts = packageJson.scripts ?? {};
  return {
    // THE WALK, of which every other reader on this axis takes its own projection (3F-3352) — the
    // same parse, so the step this account names is the step discovery skipped.
    steps: ciWorkflowSteps(ciSources).flatMap((step) => {
      const role = roleOf(step, invocation, scripts);
      // NAMED BY ITS IDENTITY WHERE ITS SOURCE HAS NO NAME. The recognition never depended on the
      // name — a citation on this step is unsatisfiable whatever file it lives in — so a run given
      // no name for a source must not go quiet about a step it set aside. It says which step, in
      // the string GitHub itself displays, and only the qualification is missing.
      return role === undefined
        ? []
        : [{ step: qualifiedStepName(step, ciSourceNames) ?? step.identity, role }];
    }),
    isReconciler: (step) => roleOf(step, invocation, scripts) !== undefined,
  };
}
