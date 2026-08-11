/**
 * The `ingest/guard` reader — the NAMED-guard observer (the watermelon input).
 * Per NAMED `@lint=<guard>` handle it reports `{ staticCheck, exists, enforcedOverRealSource }`,
 * where `enforcedOverRealSource` means the static check's command appears as a CI `run:` step over the
 * real tree — so a named static check that exists but is not wired reconciles as the WATERMELON.
 *
 * One of the two static-check observers: this one reads the OBLIGATION side; the
 * running-guard observer (`runningStaticChecks`, `ingest/ciGuards`) reads every running CI guard. Both
 * share the watermelon-critical CI-parse primitive (`ciRunCommands` / `commandInvokesScript`) from
 * `ingest/ciCommands`, so the structural parse lives in ONE place.
 *
 * Parent: @SCN-LNT-001 (the seam-bearing first sub-issue; satisfied path).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { ciRunCommands, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { ScriptCitation } from "./fitnessCitations.js";

/**
 * Read each named static check's evidenceObservation from the CI config source + package.json:
 *   - `exists` — the static check is a `package.json` `scripts` entry.
 *   - `enforcedOverRealSource` — its command is a CI `run:` step over the real tree.
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
  const runCommands = ciRunCommands(ciSources);
  return guards.map((guard) => {
    const citation = citedScn(guard);
    return {
      qualityCheck: "lint" as const,
      staticCheck: guard,
      exists: Object.prototype.hasOwnProperty.call(scripts, guard),
      enforcedOverRealSource: runCommands.some((cmd) =>
        commandInvokesScript(cmd, guard)
      ),
      // Spread rather than two `?? undefined` assignments, so an observation that cites nothing
      // carries neither key and its JSON stays byte-identical. Both terms or neither — the seam
      // resolves them together, and a half-citation would be a shape no reader knows how to read.
      ...(citation !== null ? { scnId: citation.scnId, checkTag: citation.checkTag } : {}),
    };
  });
}
