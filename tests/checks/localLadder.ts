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
 * THE CI PARSE IS IMPORTED, NEVER REWRITTEN. `ciRunSteps` / `commandInvokesScript` are the
 * primitives `runningStaticChecks` already reads a static check's enforcement off. That parse is
 * watermelon-critical — a mis-read could report a wired check as unwired, or a severed one as
 * enforced — which is exactly why it lives in one place. A
 * second YAML walk here would be a second thing to get wrong, disagreeing silently.
 *
 * THE MANIFEST IS NOT THE SOURCE; `ci.yml` IS. A `package.json` script CI does not run is not
 * a local gate, however gate-shaped its name, and a script CI DOES run is one however ordinary
 * its name looks. Which handles are gates is not a fact about the manifest at all: the workspace
 * CLI sat in that object without being one until ci.yml's self-reconciliation step began invoking
 * it directly (3F-3293), and it became a gate that day with no edit here.
 *
 * AN EXCLUDED STEP'S POSITION IS ASSERTED, NOT MERELY PRESERVED (3F-3014). Every gate has two
 * chances to run — this ladder and CI — and an entry in `CI_ONLY_EXCLUSIONS` has one. A `run:`
 * step that reds aborts the job, so a gate ahead of an excluded step can cost it that one run
 * while reporting nothing: not absent, not disabled, UNREACHED, which is the one shape the
 * ledger cannot see, because when the job dies first the ledger is never asked either. That is
 * measured, not hypothetical — a stale mutation record redding the self-reconciliation took
 * `lint:scn-subissues` off the board for three consecutive commits during 3F-2994. So the
 * derivation keeps a position it used to discard, and reports it as `late`.
 *
 * AND A GATE WHOSE RED THE JOB WOULD SWALLOW IS NOT A GATE (3F-3042). Everything above rests on
 * one premise — a green CI run is the state in which every unconditional step ran, because a
 * `run:` step that reds aborts the job. That was measured over 200 runs and then ruled
 * ACCEPTABLE rather than engineered away, which is only honest while nothing falsifies it.
 * `continue-on-error` is the one attribute that does: the step runs, reds, and leaves the job
 * green, so its red buys nothing and every reading downstream of the run cannot tell it from a
 * pass. A ruling whose premise nothing holds is an honour convention, so the widened parse reads
 * the attribute and such a step is reported `unenforced` rather than gated.
 *
 * @SCN-LAD-001 — features/local-ladder.feature.
 */

import {
  commandInvokesScript,
  type PackageJsonScripts,
} from "@3f-consulting/spec-controller-core";
import { ciRunSteps } from "@3f-consulting/spec-controller-core/internal";

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
 * `scripts/verify.sh` exists to close, so a skipped gate must say why its local answer cannot
 * be believed, rather than merely that running it here is inconvenient.
 *
 * UNSOUND IS ENOUGH; IMPOSSIBLE IS NOT REQUIRED — and unsound is the commoner shape, because
 * an absent env var arrives as its empty value rather than as an error, so the step runs and
 * answers on less than it has. A step that answers here on inputs that are not here is as
 * excluded as one that could not start. An entry claiming it cannot run instead argues for
 * its own deletion: the reader who tests that claim runs the step, finds it green, and takes
 * the entry out.
 *
 * The free-text form is ruled, not overlooked. The obvious check — require the reason to name
 * an `env:` key the derived gate drops — would have passed the one entry caught false here,
 * which named two real ones (3F-3041).
 */
export interface LadderExclusion {
  readonly script: string;
  readonly reason: string;
}

/**
 * An excluded step CI runs behind a gate, and the gates it runs behind.
 *
 * POSITION IS LOAD-BEARING FOR AN EXCLUDED STEP AND FOR NOTHING ELSE. Every gate has two
 * chances to run — the local ladder and CI — and an entry in `CI_ONLY_EXCLUSIONS` has one, by
 * the exclusion's own written reason. A `run:` step that reds aborts the job, so any gate
 * ahead of the excluded step can cost it that one run while reporting nothing: the step is
 * not absent and not disabled but UNREACHED, and an obligation is only reconciled missing
 * when the check does not run AND the ledger is asked. The job dying first skips both.
 */
export interface LateExclusion {
  readonly script: string;
  readonly reason: string;
  /** The gates CI runs ahead of it — each one a red that costs this step its only run. */
  readonly gatesAhead: readonly string[];
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

/**
 * A CI step the derivation will not vouch for, and the key that severs it.
 *
 * A gate is a step whose red is the job's verdict. `continue-on-error` breaks that: the step
 * runs, reds, and the job stays green, so the gate is a gate in name only and is
 * indistinguishable from a passing one by every reading downstream of the run. Reported
 * rather than resolved, for the reason `unsupported` is: the ladder cannot make a swallowed
 * red count, and running the rest as though it did is the subset that looks green.
 */
export interface UnenforcedStep {
  readonly script: string;
  /** The step's command, as CI carries it. */
  readonly command: string;
  /** How the job would swallow this step's red — its own `continue-on-error`, or its job's. */
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
  /**
   * Excluded steps this CI config runs behind at least one gate — the gates ahead named.
   *
   * Structural, exactly like `stale`: a fact about the config read, never a judgement about
   * which gates ahead are LIKELY to red. The threshold is zero because there is no other
   * threshold a derivation can state — "three gates ahead is fine, four is not" is a number
   * somebody has to defend, which is the shape this file exists to remove.
   */
  readonly late: readonly LateExclusion[];
  /** CI script steps the ladder cannot represent — named, never dropped. */
  readonly unsupported: readonly UnsupportedStep[];
  /**
   * CI script steps whose red would not abort the job — the key that severs each one named.
   *
   * The premise every other reading in this file rests on: a green CI run is the state in
   * which every unconditional step ran, because a `run:` step that reds aborts the job
   * (3F-3042, measured over 200 runs and ruled acceptable rather than engineered away).
   * `continue-on-error` is the one attribute that falsifies it, so it is the one attribute
   * this derivation refuses to read past.
   */
  readonly unenforced: readonly UnenforcedStep[];
}

/**
 * The exclusions a TARGET names — the steps it runs in CI and does not gate locally.
 *
 * IT WAS A CONSTANT COMPILED INTO THIS FILE, AND ITS ONE ENTRY RETIRED WITH THE CHECK THAT
 * NEEDED IT (3F-3165). `lint:scn-subissues` was excluded because a derived gate carries a step's
 * command without its `env:` block, so `PR_BODY` is empty locally and correct work would have red
 * as though nobody had claimed the exemption. The check now answers that case itself — exit 3, "I
 * examined nothing", neither a pass nor a fault (3F-3163 / 3F-3169 / 3F-3170) — so the subset is
 * expressed ONCE, in the check's own answer, instead of twice in an exclusion list and a
 * behaviour. This repository names no exclusions at all, and `pnpm ladder` prints no omission.
 *
 * SO THE LIST BECAME THE TARGET'S RATHER THAN THE TOOL'S, which is where `--root` already put
 * every other input. A constant here could only ever describe one repository, and the emitter is
 * pointed at others.
 *
 * THE CRITERION IS STRUCTURAL, NOT A MATTER OF TASTE. A derived gate carries a step's
 * COMMAND and never its `env:` block, so a step needing CI-supplied environment is exactly a
 * step whose local answer is computed from inputs that are not here. That is what stops this
 * list becoming the place inconvenient gates go: "it needs the pull request" is checkable,
 * "it is slow" is not.
 *
 * WHAT THE CRITERION DOES NOT SAY IS THAT THE STEP FAILS. An absent env var arrives as its
 * empty value, so the step runs, greens or reds on less than it needs, and says nothing about
 * the difference. That silence is what an entry's reason is for: it is about whether the
 * answer can be believed, never about whether the command executes.
 *
 * IT NARROWS THE LOCAL LADDER, NEVER CI. ci.yml is untouched by anything in this file, so a
 * gate an entry dodges still reds on the pull request. An entry added wrongly is a written,
 * printed decision caught in review — not drift, which is why the list is allowed to exist at
 * all. An entry that goes STALE is caught by the ladder itself (@SCN-LAD-005).
 *
 * A MALFORMED OR ABSENT KEY YIELDS NO EXCLUSIONS, the safe direction: a target that says nothing
 * gates everything CI runs, and cannot narrow its own green-check by writing the key wrongly.
 */
export function ciOnlyExclusionsOf(packageJson: unknown): readonly LadderExclusion[] {
  const named = (packageJson as { specController?: { ciOnlyExclusions?: unknown } } | null)
    ?.specController?.ciOnlyExclusions;
  if (!Array.isArray(named)) return [];
  return named.flatMap((entry) => {
    const row = entry as { script?: unknown; reason?: unknown };
    return typeof row.script === "string" && typeof row.reason === "string"
      ? [{ script: row.script, reason: row.reason }]
      : [];
  });
}

/**
 * Derive the local ladder from a CI config and a package manifest.
 *
 * ORDER IS THE CI CONFIG'S ORDER, AND IT IS LOAD-BEARING. The self-reconciliation reconciles this
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
  const late: LateExclusion[] = [];
  const unsupported: UnsupportedStep[] = [];
  const unenforced: UnenforcedStep[] = [];
  // Every script a CI step invokes, whatever the derivation then does with that step. Staleness
  // is measured against THIS rather than against `omitted`, because the two parted company the
  // moment a step could be skipped for a reason other than its exclusion (@SCN-LAD-008): a
  // swallowed excluded step IS run by CI, so reading its absence from `omitted` as "CI no longer
  // runs it" states the one thing that is not true about it.
  const invokedInCi = new Set<string>();

  for (const step of ciRunSteps([ciSource])) {
    const command = step.command.trim();
    const invoked = scripts.filter((name) => commandInvokesScript(command, name));
    const script = invoked[0];
    if (script === undefined) continue;
    invokedInCi.add(script);

    // AHEAD OF THE EXCLUSION LOOKUP, AND THAT ORDERING IS LOAD-BEARING. The excluded step is the
    // one gate with a single chance to run (`CI_ONLY_EXCLUSIONS`, @SCN-LAD-007), so swallowing ITS
    // red is the worst instance of this fault — and a lookup running first would `continue` past
    // it, print the omission with its reason, and report nothing at all.
    if (!step.abortsJob) {
      const carried = step.continuesOnError;
      const whose = carried.carriedBy === "job" ? "its job carries" : "it carries";
      unenforced.push({ script, command, why: `${whose} continue-on-error: ${carried.value}` });
      continue;
    }

    const exclusion = exclusions.find((entry) => entry.script === script);
    if (exclusion !== undefined) {
      omitted.push(exclusion);
      // The gates ALREADY COLLECTED are the ones CI runs ahead of this step, and each is a red
      // that can abort the job before it. Zero of them is the only threshold this derivation
      // can state without maintaining a number somebody has to defend.
      if (gates.length > 0) {
        late.push({ ...exclusion, gatesAhead: gates.map((gate) => gate.script) });
      }
      continue;
    }

    const why = unrepresentable(command, invoked);
    if (why !== undefined) unsupported.push({ script, command, why });
    else gates.push({ script, command });
  }

  // Staleness is measured against what CI RUNS, not against what package.json holds: the
  // script surviving in the manifest after its CI step is deleted is exactly the case an
  // existence check would wave through, leaving the ladder narrower than anyone intended.
  const stale = exclusions.filter((entry) => !invokedInCi.has(entry.script));

  return { gates, omitted, stale, late, unsupported, unenforced };
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
