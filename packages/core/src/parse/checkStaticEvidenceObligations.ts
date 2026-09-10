/**
 * The `ingest/guard` reader — the NAMED-guard observer (the watermelon input).
 * Per NAMED `@lint=<guard>` handle it reports `{ staticCheck, exists, enforcedOverRealSource }`,
 * where `enforcedOverRealSource` means the static check's command appears as a CI `run:` step over the
 * real tree WHOSE RED IS THAT JOB'S VERDICT — so a named static check that exists but is not wired,
 * or is wired to a step the job survives, reconciles as the WATERMELON.
 *
 * One of the two static-check observers: this one reads the OBLIGATION side; the
 * running-guard observer (`runningStaticChecks`, `ingest/ciGuards`) reads every running CI guard. Both
 * share the watermelon-critical CI-parse primitive (`ciRunSteps` / `commandInvokesScript`) from
 * `ingest/ciCommands`, so the structural parse lives in ONE place — and since @SCN-LNT-032 both read
 * the same field off it, so the two cannot come to disagree about what enforcement is.
 *
 * Parent: @SCN-LNT-001 (the seam-bearing first sub-issue; satisfied path).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { ciRunSteps, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { ScriptCitation } from "./fitnessCitations.js";

/**
 * Read each named static check's evidenceObservation from the CI config source + package.json:
 *   - `exists` — the static check is a `package.json` `scripts` entry.
 *   - `enforcedOverRealSource` — its command is a CI `run:` step over the real tree AND that step's
 *     red is its job's verdict.
 */
export function checkStaticEvidenceObligations(
  guards: string[],
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  // @SCN-LNT-002 (3F-2569) — THIS READER STAMPS THE CITATION TOO, and it is the only one that can
  // stamp it for the watermelon. The running-check observer emits what CI RUNS, so a check that
  // runs nowhere is exactly what its filter removes; the exists-but-unwired fact has always come
  // from this side, and under citation-routing it has to arrive here already carrying the `@SCN`.
  //
  // Without it a fitness obligation could not reconcile at all: its `staticCheck` is the BARE check
  // tag its stepless scenario carries (`planted-watermelon`) while this observation names the
  // runnable handle (`lint:planted-watermelon`), so the two can never meet by name and the
  // obligation reads `missing` — a check that exists and enforces nothing, reported as one nobody
  // wrote. The citation is what joins them (`qualityCheckReconciliation`, citation-first).
  //
  // BOTH TERMS, not just the @SCN — the same widening, and the same reason, as the running-check
  // observer's. The bare check tag is what an Evidence Obligation NAMES, so it is what the
  // reconciler compares against; without it a row carrying two bare check tags hands the first
  // credit it finds to both of its fitness obligations (@SCN-LNT-012).
  //
  // Trailing, optional, and defaulting to citing NOTHING — so a target that has registered nothing
  // observes exactly what it observed before. There is no name-match left to fall back to: an
  // uncited credit posts to suspense and answers no obligation (3F-2590 removed the posting arm;
  // 3F-2625 the by-handle half in `domain/qualityCheckReconciliation`). The same shape and the same
  // reasoning as `runningStaticChecks`' parameter: what a reader needs is one answer per handle,
  // never a registry's shape.
  citedScn: (script: string) => ScriptCitation | null = () => null
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  // THE STEPS, NOT THEIR COMMANDS (@SCN-LNT-032). `ciRunCommands` is this walk's projection, so
  // reading the steps is the SAME parse rather than a second one — and `abortsJob` is the field the
  // projection discarded. It has been read off both carriers of the severance correctly since
  // 3F-3042 and reached no published consumer until now, which is how this reader came to certify
  // as satisfied a check whose red its target's job swallows.
  const runSteps = ciRunSteps(ciSources);
  return guards.map((guard) => {
    const citation = citedScn(guard);
    return {
      qualityCheck: "lint" as const,
      staticCheck: guard,
      exists: Object.prototype.hasOwnProperty.call(scripts, guard),
      // ANY step that both invokes the check and aborts its job on a red — `some`, not `every`,
      // because a check a second step runs unsevered IS one the job's verdict depends on. The same
      // rule in the same shape as `runningStaticChecks`', deliberately: two observers answering one
      // question differently is the disagreement this shared primitive exists to foreclose.
      enforcedOverRealSource: runSteps.some(
        (step) => commandInvokesScript(step.command, guard) && step.abortsJob
      ),
      // Spread rather than two `?? undefined` assignments, so an observation that cites nothing
      // carries neither key and its JSON stays byte-identical. Both terms or neither — the seam
      // resolves them together, and a half-citation would be a shape no reader knows how to read.
      ...(citation !== null ? { scnId: citation.scnId, checkTag: citation.checkTag } : {}),
    };
  });
}
