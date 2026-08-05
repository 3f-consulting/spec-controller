/**
 * The local-ladder derivation — `pnpm verify`'s gate list, computed from `ci.yml` rather
 * than typed beside it.
 *
 * 3F-2420 built `scripts/verify.sh` because CONTRIBUTING.md listed five gates while CI ran
 * thirteen: "a green-check assembled by hand from prose is a green-check that silently
 * narrows". The same failure then recurred one layer in — `lint:anemic-domain` landed with a
 * CI step and no matching `gate` line, so `pnpm verify` was a proper SUBSET of CI from
 * 1f7977f until 3F-2444. Moving a hand-maintained list somewhere tidier does not stop it
 * being hand-maintained, so the list stops existing: a gate cannot be forgotten when nobody
 * adds one.
 *
 * THE CI PARSE IS IMPORTED, NEVER REWRITTEN. `ciRunCommands` / `commandInvokesScript` are the
 * primitives `runningStaticChecks` and `checkStaticEvidenceObligations` already read a static
 * check's enforcement off. That parse is watermelon-critical — a mis-read could report a
 * wired check as unwired, or the reverse — which is exactly why it lives in one place. A
 * second YAML walk here would be a second thing to get wrong, disagreeing silently.
 *
 * THE MANIFEST IS NOT THE SOURCE; `ci.yml` IS. A `package.json` script CI does not run is not
 * a local gate — `build`, `mutation` and `balance` are not quality gates and must not become
 * them by living in the same object.
 *
 * @SCN-LAD-001 — features/local-ladder.feature.
 */

import {
  ciRunCommands,
  commandInvokesScript,
  type PackageJsonScripts,
} from "@3f-consulting/spec-controller-core";

/** One rung of the local ladder: a CI step's script, and the command CI runs for it. */
export interface LadderGate {
  /** The `package.json` script name the CI step invokes. */
  readonly script: string;
  /** The CI step's command, carried verbatim rather than re-typed as `pnpm <script>`. */
  readonly command: string;
}

/**
 * A step CI runs that the local ladder deliberately skips, and why.
 *
 * The reason is not decoration. An unexplained gap in a green-check is the failure
 * `scripts/verify.sh` exists to close, so a skipped gate must say what makes it unrunnable
 * here rather than merely inconvenient.
 */
export interface LadderExclusion {
  readonly script: string;
  readonly reason: string;
}

/**
 * A CI step the derivation will not turn into a gate, and will not drop either.
 *
 * The shell consumer runs one command per gate, so a step whose command spans lines has no
 * form to run, and a step invoking two scripts has no single script to name it by. Both are
 * reported rather than resolved: taking the first line runs half a gate and calls it green,
 * and picking one of two scripts loses the other to `package.json` key order. Naming them
 * reds `pnpm verify` until someone splits the step or excludes it with a reason.
 */
export interface UnsupportedStep {
  /** The script the step invokes — the first, where it invokes more than one. */
  readonly script: string;
  /** The step's command, as CI carries it. */
  readonly command: string;
  /** What about the step the ladder cannot represent. */
  readonly why: string;
}

/** The gates `pnpm verify` runs, derived from a CI config and a package manifest. */
export interface LocalLadder {
  /** One gate per CI script step, in the CI config's order. */
  readonly gates: readonly LadderGate[];
  /** The excluded steps this CI config actually runs — to be printed, never swallowed. */
  readonly omitted: readonly LadderExclusion[];
  /**
   * Exclusions excusing a step this CI config does not run.
   *
   * An exclusion covering nothing excuses nothing by construction, so it reds nothing and
   * costs nothing to leave behind — which is how it survives to license the next script that
   * takes the name. The ratchet `lint:complexity-exceptions` and `lint:exempt-data-floor`
   * already apply to their own lists, applied to this one.
   */
  readonly stale: readonly LadderExclusion[];
  /** CI script steps the ladder cannot represent — named, never dropped. */
  readonly unsupported: readonly UnsupportedStep[];
}

/**
 * The steps this repository runs in CI and does not gate locally.
 *
 * THE CRITERION IS STRUCTURAL, NOT A MATTER OF TASTE. A derived gate carries a step's
 * COMMAND and never its `env:` block, so a step needing CI-supplied environment is exactly a
 * step that cannot run here. That is what stops this list becoming the place inconvenient
 * gates go: "it needs the pull request" is checkable, "it is slow" is not.
 *
 * IT NARROWS THE LOCAL LADDER, NEVER CI. ci.yml is untouched by anything in this file, so a
 * gate an entry dodges still reds on the pull request. An entry added wrongly is a written,
 * printed decision caught in review — not drift, which is why the list is allowed to exist at
 * all. An entry that goes STALE is caught by the ladder itself (@SCN-LAD-005).
 */
export const CI_ONLY_EXCLUSIONS: readonly LadderExclusion[] = [
  {
    script: "lint:scn-subissues",
    reason:
      "judges the pull request's diff through GITHUB_BASE_SHA / GITHUB_HEAD_REF, so it has no answer outside a PR context",
  },
];

/**
 * Derive the local ladder from a CI config and a package manifest.
 *
 * ORDER IS THE CI CONFIG'S ORDER, AND IT IS LOAD-BEARING. `lint:self-balance` reconciles this
 * repository against the two JSON reports `test` and `cucumber` emit, so both must run ahead
 * of it. Run out of order it reports every evidence obligation unobserved — "the suite did
 * not run", not "the code is wrong".
 *
 * A malformed CI config yields no gates, inheriting `ciRunCommands`' safe direction: an empty
 * ladder reds `pnpm verify` visibly, where a partial one would run and look green.
 */
export function deriveLocalLadder(
  ciSource: string,
  packageJson: PackageJsonScripts,
  exclusions: readonly LadderExclusion[],
): LocalLadder {
  const scripts = Object.keys(packageJson.scripts ?? {});
  const gates: LadderGate[] = [];
  const omitted: LadderExclusion[] = [];
  const unsupported: UnsupportedStep[] = [];

  for (const rawCommand of ciRunCommands(ciSource)) {
    const command = rawCommand.trim();
    const invoked = scripts.filter((name) => commandInvokesScript(command, name));
    const script = invoked[0];
    if (script === undefined) continue;

    const exclusion = exclusions.find((entry) => entry.script === script);
    if (exclusion !== undefined) {
      omitted.push(exclusion);
      continue;
    }

    const why = unrepresentable(command, invoked);
    if (why !== undefined) unsupported.push({ script, command, why });
    else gates.push({ script, command });
  }

  // Staleness is measured against what CI RUNS, not against what package.json holds: the
  // script surviving in the manifest after its CI step is deleted is exactly the case an
  // existence check would wave through, leaving the ladder narrower than anyone intended.
  const stale = exclusions.filter(
    (entry) => !omitted.some((omission) => omission.script === entry.script),
  );

  return { gates, omitted, stale, unsupported };
}

/** What about a CI step the ladder cannot represent as one gate — or nothing, if it can. */
function unrepresentable(command: string, invoked: readonly string[]): string | undefined {
  if (command.includes("\n")) {
    return "the command spans lines; a gate runs one command, and running only its first line would run half a gate and call it green";
  }
  if (invoked.length > 1) {
    return `the step invokes ${invoked.length} scripts (${invoked.join(", ")}); naming it by one would lose the others to package.json key order`;
  }
  return undefined;
}
