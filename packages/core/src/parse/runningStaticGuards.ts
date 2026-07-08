/**
 * The running-guard observer — emit a `GuardEvidenceObservation` for
 * EVERY running CI guard, not just the demanded ones. This is the static analogue of the runner
 * emitting every test result: CI publishes no guard manifest, so the running set is DERIVED — a
 * `package.json` `lint:*` script that a CI `run:` step actually invokes (@SCN-USG-001).
 * It completes the static stream so the one reconcile engine sees every running guard (a demanded
 * one matches its `@lint` obligation; an undemanded one folds to the suspense row) — no
 * derive-and-diff patch.
 *
 * One of the two static-guard observers: this one reads every RUNNING CI guard; the
 * demanded-guard observer (`checkStaticEvidenceObligations`, `ingest/guard`) reads the declared demand side (the
 * watermelon input). Both share the watermelon-critical CI-parse primitive (`ciRunCommands` /
 * `commandInvokesScript`) from `ingest/ciCommands`.
 *
 * A running guard is `exists: true` (a `package.json` script by construction — the
 * `Object.keys(scripts)` source) and `enforcedOverRealSource: true` (a CI `run:` step invokes it
 * by construction — the `commandInvokesScript` filter). The demanded guards' watermelon detail
 * (exists / enforcedOverRealSource for a guard that does NOT run) is the OTHER observer's job.
 *
 * `lint:*`-named scripts only (the portfolio-shaped v1 convention): `install`/`corepack`/`checkout`
 * aren't scripts and never match; `test`/`cucumber` are the RUNTIME axis's observed evidence and
 * must NOT be double-counted; `tsc` is deferred with the multi-ecosystem config work.
 *
 * Parent: @SCN-USG-001 (the unattributed static-guard).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { ciRunCommands, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";

export function runningStaticGuards(
  ciSource: string,
  packageJson: PackageJsonScripts
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const runCommands = ciRunCommands(ciSource);
  return Object.keys(scripts)
    .filter((name) => name.startsWith("lint:"))
    .filter((name) => runCommands.some((cmd) => commandInvokesScript(cmd, name)))
    .sort()
    .map((guard) => ({
      qualityCheck: "lint" as const,
      guard,
      exists: true,
      enforcedOverRealSource: true,
    }));
}
