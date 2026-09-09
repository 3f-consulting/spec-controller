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
 * watermelon input). Both share the watermelon-critical CI-parse primitive (`ciRunSteps`, of which
 * `ciRunCommands` is the projection / `commandInvokesScript`) from `ingest/ciCommands`.
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
import { ciRunSteps, commandInvokesScript, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { ScriptCitation } from "./fitnessCitations.js";

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
  configuredStaticChecks: readonly string[] = [],
  // @SCN-LNT-001 (3F-2568) — THE OBSERVER STAMPS THE CITATION. Citation-routing inverts what
  // name-match relied on: the DEBIT used to cite, so a run never had to know which scenario it
  // belonged to. Now the CREDIT cites, and the only moment a run and the corpus are both in hand
  // is the moment the run is observed — so the `@SCN` is stamped here rather than recovered
  // downstream from the handle, which is the lookup name-match already proved cannot be trusted.
  //
  // The seam arrives as a FUNCTION rather than as the registry and the corpus map, because what
  // this reader needs is one answer per handle. Passing the two structures would put the
  // composition (`citationOfScript`) inside an observer that has no business knowing a registry's
  // shape — and where a registry is AUTHORED is still open (increment D).
  //
  // BOTH TERMS, not just the @SCN. The seam already resolves the bare check tag on its way to the
  // scenario, and the observation needs it: the @SCN says which ROW the credit posts to, the tag
  // says which OBLIGATION on that row it answers. A row carrying two bare check tags raises two
  // fitness obligations and is cited by two runs, so the @SCN alone cannot tell their credits
  // apart (@SCN-LNT-012). Resolved once at the seam rather than looked up again here, which would
  // give this reader an opinion about a registry's shape.
  //
  // Defaults to citing NOTHING, so a target that has registered nothing observes exactly what it
  // observed before. What such a target's credits then DO has changed: every one of them cites
  // nothing, so every one posts to suspense and answers no obligation. No name-match remains to
  // catch them (3F-2590 removed the posting arm; 3F-2625 the by-handle half in
  // `domain/qualityCheckReconciliation`, which was still live for a prefix-less check whose handle
  // and bare tag are the same word).
  //
  // IT IS ASKED ABOUT THE STEP AS WELL AS THE HANDLE (@SCN-LNT-031, 3F-3273). A consumer's own
  // citation is written on the CI step, so a seam handed only the handle cannot see the one thing
  // the consumer said — and the widening is what lets the citation come off the ROW that code
  // names rather than out of the handle's spelling. The second argument is optional and every
  // existing caller supplies a one-argument function, which JavaScript is free to keep passing two
  // arguments to: the seams that resolve a handle go on answering exactly as they did.
  citedScn: (script: string, citedByStep?: string) => ScriptCitation | null = () => null
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  // THE STEPS, NOT THEIR COMMANDS. `ciRunCommands` is this walk's projection, so reading the steps
  // is the SAME parse rather than a second one — and the step is what carries the `id:` the
  // citation below comes off (3F-3261).
  const runSteps = ciRunSteps(ciSources);
  return Object.keys(scripts)
    .filter(
      (name) =>
        guardPrefixes.some((prefix) => name.startsWith(prefix)) ||
        configuredStaticChecks.includes(name)
    )
    .filter((name) => runSteps.some((step) => commandInvokesScript(step.command, name)))
    .sort()
    .map((guard) => {
      // THE STEP'S OWN `@SCN`, WHERE ITS AUTHOR WROTE ONE. The `id:` on the CI step that invokes
      // this check is the consumer's explicit citation, so it names the row ahead of anything the
      // seam DERIVED for the same handle: an explicit citation beats a derived one, which is the
      // whole point of writing it. First carrier in CI order wins, the corpus's own tie-break
      // (`parse/fitnessCitations`), and a step with no `id:` never masks a later step that has one.
      const citedByStep = runSteps.find(
        (step) => step.id !== undefined && commandInvokesScript(step.command, guard)
      )?.id;
      // AND THE SEAM IS ASKED WITH IT (@SCN-LNT-031). Read ahead of the seam rather than after it,
      // because it is now an INPUT to the citation and not only a refinement of one: the code names
      // the configured row, and that row is where the check tag a CI step cannot state comes from.
      const citation = citedScn(guard, citedByStep);
      return {
        qualityCheck: "lint" as const,
        staticCheck: guard,
        exists: true,
        enforcedOverRealSource: true,
        // Spread rather than two `?? undefined` assignments, so an observation that cites nothing
        // carries neither key and its JSON stays byte-identical. Both terms or neither — a
        // half-citation would be a shape no reader knows how to read, and the bare check tag is
        // the term a CI step CANNOT state: `id:` names the row, never the characteristic the
        // ledger reconciles on. So a step's `id:` refines which row a citation posts to; it does
        // not manufacture a citation where the seam reached no check tag at all — that target has
        // registered nothing, which is `new-client`, and its observations belong in suspense.
        ...(citation !== null
          ? { scnId: citedByStep ?? citation.scnId, checkTag: citation.checkTag }
          : {}),
      };
    });
}
