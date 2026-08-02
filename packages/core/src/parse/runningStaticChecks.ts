/**
 * The running-guard observer — emit a `GuardEvidenceObservation` for
 * EVERY running CI guard, not just the named ones. This is the static analogue of the runner
 * emitting every test result: CI publishes no static guard manifest, so the running set is DERIVED — a
 * `package.json` `lint:*` script that a CI `run:` step actually invokes (@SCN-USG-001).
 * It completes the static stream so the one reconcile engine sees every running static guard (a named
 * one matches its `@lint` obligation; an undemanded one folds to the suspense row) — no
 * derive-and-diff patch.
 *
 * One of the two static-guard observers: this one reads every RUNNING CI guard; the
 * named-guard observer (`checkStaticEvidenceObligations`, `ingest/guard`) reads the declared evidence-obligation side (the
 * watermelon input). Both share the watermelon-critical CI-parse primitive (`ciRunCommands` /
 * `commandInvokesScript`) from `ingest/ciCommands`.
 *
 * A running static guard is `exists: true` (a `package.json` script by construction — the
 * `Object.keys(scripts)` source) and `enforcedOverRealSource: true` (a CI `run:` step invokes it
 * by construction — the `commandInvokesScript` filter). The named static guards' watermelon detail
 * (exists / enforcedOverRealSource for a static guard that does NOT run) is the OTHER observer's job.
 *
 * A script counts as a static guard when its name matches any configured `guardPrefixes` entry —
 * the guard-prefix set is DECLARED at the CLI edge (`ingest/ingestQualityChecks.ts`, default
 * `["lint:", "guard:"]`) and INJECTED here, so the core makes no convention assumption
 * (@SCN-USG-004). `install`/`corepack`/`checkout` aren't scripts and never match; `test`/`cucumber`
 * are the RUNTIME axis's observed evidence and carry no guard prefix, so they are excluded by
 * construction (@SCN-USG-003); `tsc` is deferred with the multi-ecosystem config work.
 * `qualityCheck: "lint"` is the static-guard AXIS name (unchanged) — not the script prefix.
 *
 * Parent: @SCN-USG-001 (the uncited static-guard); @SCN-USG-004 (the guard-prefix set).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { ciRunCommands, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";

export function runningStaticChecks(
  ciSource: string,
  packageJson: PackageJsonScripts,
  guardPrefixes: readonly string[]
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const runCommands = ciRunCommands(ciSource);
  return Object.keys(scripts)
    .filter((name) => guardPrefixes.some((prefix) => name.startsWith(prefix)))
    .filter((name) => runCommands.some((cmd) => commandInvokesScript(cmd, name)))
    .sort()
    .map((guard) => ({
      qualityCheck: "lint" as const,
      staticGuard: guard,
      exists: true,
      enforcedOverRealSource: true,
    }));
}
