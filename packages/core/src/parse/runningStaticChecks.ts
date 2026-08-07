/**
 * The running-guard observer — emit a `GuardEvidenceObservation` for
 * EVERY running CI guard, not just the named ones. This is the static analogue of the runner
 * emitting every test result: CI publishes no static check manifest, so the running set is DERIVED — a
 * `package.json` `lint:*` script that a CI `run:` step actually invokes (@SCN-USG-001).
 * It completes the static stream so the one reconcile engine sees every running static check (a named
 * one matches its `@lint` obligation; a no-evidence-obligation one folds to the suspense row) — no
 * derive-and-diff patch.
 *
 * One of the two static-check observers: this one reads every RUNNING CI guard; the
 * named-guard observer (`checkStaticEvidenceObligations`, `ingest/guard`) reads the OBLIGATION side (the
 * watermelon input). Both share the watermelon-critical CI-parse primitive (`ciRunCommands` /
 * `commandInvokesScript`) from `ingest/ciCommands`.
 *
 * A running static check is `exists: true` (a `package.json` script by construction — the
 * `Object.keys(scripts)` source) and `enforcedOverRealSource: true` (a CI `run:` step invokes it
 * by construction — the `commandInvokesScript` filter). The named static checks' watermelon detail
 * (exists / enforcedOverRealSource for a static check that does NOT run) is the OTHER observer's job.
 *
 * A script counts as a static check when its name matches any configured `guardPrefixes` entry —
 * the guard-prefix set is SET at the CLI edge (`ingest/ingestQualityChecks.ts`, default
 * `["lint:", "guard:"]`) and INJECTED here, so the core makes no convention assumption
 * (@SCN-USG-004). `install`/`corepack`/`checkout` aren't scripts and never match; `test`/`cucumber`
 * are the RUNTIME axis's observed evidence and carry no guard prefix, so they are excluded by
 * construction (@SCN-USG-003); `tsc` is deferred with the multi-ecosystem config work.
 * `qualityCheck: "lint"` is the static-check AXIS name (unchanged) — not the script prefix.
 *
 * Parent: @SCN-USG-001 (the uncited static-check); @SCN-USG-004 (the guard-prefix set).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { ciRunCommands, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";

export function runningStaticChecks(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  guardPrefixes: readonly string[],
  // @SCN-USG-009 (3F-2495) — scripts the TARGET configures AS static checks, EXTENDING the prefix
  // discovery rather than replacing it. The prefix set is a heuristic for FINDING checks, never
  // the definition of one: membership is a property of the check (does it analyse source without
  // executing it), and `tsc --noEmit` has that property whatever its script is called.
  //
  // Only the DISCOVERY direction ever needed this. `checkStaticEvidenceObligations` — the
  // named-obligation observer — has never consulted the prefixes, so a scenario carrying
  // `@lint=typecheck` always reconciled. What could not happen was finding a non-prefixed check
  // NOBODY named: the unattributed check was invisible exactly when it was unattributed.
  //
  // Trailing and optional, so the frozen v1 barrel's symbol surface is untouched.
  configuredStaticChecks: readonly string[] = []
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const runCommands = ciRunCommands(ciSources);
  return Object.keys(scripts)
    .filter(
      (name) =>
        guardPrefixes.some((prefix) => name.startsWith(prefix)) ||
        configuredStaticChecks.includes(name)
    )
    .filter((name) => runCommands.some((cmd) => commandInvokesScript(cmd, name)))
    .sort()
    .map((guard) => ({
      qualityCheck: "lint" as const,
      staticCheck: guard,
      exists: true,
      enforcedOverRealSource: true,
    }));
}
