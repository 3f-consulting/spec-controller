/**
 * The `ingest/guard` reader — the DEMANDED-guard observer (the watermelon input).
 * Per declared `@lint=<guard>` handle it reports `{ guard, exists, enforcedOverRealSource }`,
 * where `enforcedOverRealSource` means the guard's command appears as a CI `run:` step over the
 * real tree — so a demanded guard that exists but is not wired reconciles as the WATERMELON.
 *
 * One of the two static-guard observers: this one reads the DECLARED demand side; the
 * running-guard observer (`runningStaticGuards`, `ingest/ciGuards`) reads every running CI guard. Both
 * share the watermelon-critical CI-parse primitive (`ciRunCommands` / `commandInvokesScript`) from
 * `ingest/ciCommands`, so the structural parse lives in ONE place.
 *
 * Parent: @SCN-LNT-001 (the seam-bearing first sub-issue; satisfied path).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { ciRunCommands, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";

/**
 * Read each named guard's evidenceObservation from the CI config source + package.json:
 *   - `exists` — the guard is a `package.json` `scripts` entry.
 *   - `enforcedOverRealSource` — its command is a CI `run:` step over the real tree.
 */
export function checkStaticEvidenceObligations(
  guards: string[],
  ciSource: string,
  packageJson: PackageJsonScripts
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const runCommands = ciRunCommands(ciSource);
  return guards.map((guard) => ({
    qualityCheck: "lint" as const,
    guard,
    exists: Object.prototype.hasOwnProperty.call(scripts, guard),
    enforcedOverRealSource: runCommands.some((cmd) =>
      commandInvokesScript(cmd, guard)
    ),
  }));
}
