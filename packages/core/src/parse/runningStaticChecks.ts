/**
 * The running-check observer — emit a `GuardEvidenceObservation` for EVERY static check CI runs,
 * not just the obliged ones. This is the static analogue of the runner emitting every test result:
 * CI publishes no static check manifest, so the running set is DERIVED from the target's own
 * pipeline (@SCN-USG-001). It completes the static stream so the one reconcile engine sees every
 * running static check (a named one matches its `@lint` obligation; a no-evidence-obligation one
 * folds to the suspense row) — no derive-and-diff patch.
 *
 * WHAT A CANDIDATE IS, AND IT IS SAID BY SUBTRACTION (@SCN-USG-004, 3F-3343). A step of the
 * pipeline is a candidate fitness check UNLESS it runs a behavioural runner the target's manifest
 * named, or something took it out of discovery entirely. There is no rule about what a check is
 * CALLED, because the set of names a quality check might be given belongs to the consumer and is
 * unbounded: this observer used to read a target's scripts through an observed prefix set
 * (`lint:`, `guard:`), which is a sample of that set, and a pipeline whose scripts are `lint`,
 * `typecheck`, `audit` was one the reader could not see and said nothing about. The prefix set is
 * gone, and nothing shaped like it replaced it.
 *
 * AND THERE IS NO RULE ABOUT WHAT FORM A CHECK TAKES EITHER (@SCN-USG-013). A `uses:` step is a
 * candidate on exactly the same terms as a `run:` one: a quality check can be an action, so a
 * reader keyed on a step's shape would drop real checks as silently as one keyed on their names —
 * the same guess, one layer along. What names such a step is the action reference GitHub displays
 * for it, because it invokes no script of the consumer's to be named by.
 *
 * THE FAILURE DIRECTION IS DELIBERATE AND IS THE WHOLE ARGUMENT. Under the retired rule silence
 * hid checks a consumer HAS, and a false negative is invisible. Under this one nothing is hidden:
 * a step that reaches this reader leaves it as an observation, as a named runner, or as a step
 * something took out — each of which the report says out loud — so a false POSITIVE is visible and
 * correctable in one line of the consumer's own configuration.
 *
 * THE ONLY STATIC-CHECK OBSERVER THE RECONCILIATION COMPOSITION WIRES IN (3F-3397). Discovery and
 * attribution are one reader now: every running check reaches the books here, and the `citedScn`
 * seam below stamps the credit's row as the step is observed — there is no second, obligation-side
 * reader left to keep in agreement with it — and since 3F-3410 there is no such reader ANYWHERE:
 * the obligation-side observer this sentence used to point at has been deleted, so this is the only
 * static-check observer there is, not merely the only one wired in. The CI-parse walk still
 * comes from `checkScriptsRunInCI` (`ciWorkflowSteps`, of which `ciRunSteps` and `ciRunCommands`
 * are the projections / `commandInvokesScript`).
 *
 * `exists: true` BY CONSTRUCTION — a step the pipeline runs is a check that is there to be run.
 * `enforcedOverRealSource` is READ, not assumed (@SCN-LNT-032): a step whose red its job survives
 * runs, reds and leaves the pipeline green, so being invoked is not being enforced. The named
 * static checks' OTHER watermelon detail — a static check that does not run at all — is the OTHER
 * observer's job. `qualityCheck: "lint"` is the static-check AXIS name, and never a convention.
 *
 * AND A STEP THIS READER IS NOT LOOKING AT IS NOT READ AT ALL (@SCN-USG-015, @SCN-USG-014). Two
 * different facts take a step out of discovery — the consumer named it a non-check, or it is the
 * reconciler itself — and they reach this observer as the ONE `isExcludedFromDiscovery` seam
 * below, asked BEFORE the walk is used for anything: such a step carries no check onto the books,
 * is not consulted for a check's enforcement, and supplies no citation. What keeps that from being
 * a new silence is that the step is NAMED on the report, under whichever of the two it was — the
 * disposition is said out loud, and this reader never has to know which one it was.
 *
 * Parent: @SCN-USG-001 (the uncited static-check); @SCN-USG-004 (the inverted membership rule);
 * @SCN-USG-011 (the runner recognition); @SCN-USG-015 (the consumer's own exclusions);
 * @SCN-USG-014 (the reconciler's own steps).
 */

import type { GuardEvidenceObservation } from "../model.js";
import { commandRuns } from "./commandRuns.js";
import {
  ciWorkflowSteps,
  commandInvokesScript,
  type CiWorkflowStep,
  type PackageJsonScripts,
} from "./checkScriptsRunInCI.js";
import type { BehaviouralRunner } from "../domain/evidenceReconciliation.js";
import type { ScriptCitation } from "./fitnessCitations.js";

/**
 * WHICH TIERS' NAMED RUNNER THIS STEP RUNS — rule D asked of one step (@SCN-USG-011).
 *
 * ONE COMPARISON, TWO READERS. The recognition is REPORTED by `recognisedRunners` below and is
 * ASKED by the membership rule above, and a second implementation of it would be a second chance
 * for the report and the books to disagree about which step ran a runner — a step named as the
 * unit runner in one section and posted as an uncited fitness check in another.
 *
 * A TIER THE TARGET SAYS HAS NONE FALLS OUT HERE (@SCN-USG-016), and falls out silently: there is
 * no name for a whole-token match to be run against, so no step can be its runner. The statement
 * itself is not lost — the resolver keeps it and the report says it — but this reader answers only
 * "which named runner does this step run".
 */
function namedRunnersAt(
  step: CiWorkflowStep,
  scripts: Readonly<Record<string, string>>,
  runners: Readonly<Record<string, string | null>>
): readonly (readonly [string, string])[] {
  if (!("runs" in step)) return [];
  const command = step.runs;
  return Object.entries(runners).filter(
    (entry): entry is [string, string] =>
      entry[1] !== null && commandRuns(command, entry[1], scripts)
  );
}

/**
 * WHAT THIS CANDIDATE IS CALLED — the runnable handle a report row and a reconciling credit carry.
 *
 * THE SCRIPT IT INVOKES, WHERE IT INVOKES ONE (3F-3397). A handle is where-to-fix: the thing a
 * consumer runs to reproduce the check, and the vocabulary the citation seam already speaks — the
 * `citedScn` callback below resolves a run through the target's registry to a bare check tag, and
 * a handle spelled the same way is what lets a report row and a reconciling credit name the same
 * check. A step that reaches its check through the consumer's own manifest has that name
 * available, so it is used.
 *
 * OTHERWISE THE STEP'S OWN IDENTITY, which is GitHub's (`checkScriptsRunInCI`) and therefore the
 * string already in the consumer's run log. `pnpm exec eslint` and a bare `run: ruff` invoke no
 * script of theirs and so have no handle to be named by; inventing one out of the command's shape
 * would be a convention, which is the thing this rule exists without. Naming the step is the
 * honest answer and the one a consumer can act on.
 *
 * AND AN ACTION STEP IS ALWAYS THAT SECOND CASE (@SCN-USG-013). A `uses:` step states no command
 * at all, so there is nothing for the manifest hop to be asked about and no script of the
 * consumer's to reach — its identity is the action reference GitHub displays for it, or the
 * `name:` its author gave it. The branch is not a special case for actions: it is the same
 * fallback a command invoking no script of theirs already takes, arrived at one step earlier.
 */
function handleOf(step: CiWorkflowStep, scripts: Readonly<Record<string, string>>): string {
  if (!("runs" in step)) return step.identity;
  const invoked = Object.keys(scripts).filter((name) => commandInvokesScript(step.runs, name));
  return invoked[0] ?? step.identity;
}

/**
 * IS THIS STEP A CANDIDATE FITNESS CHECK — the membership rule itself, asked of one step.
 *
 * ONE RULE, TWO READERS, for the reason `namedRunnersAt` above is one function. The observer below
 * posts a check for every step this answers yes to, and the scope census (`parse/discoveryScope`,
 * @SCN-USG-020) reports how many of each job's steps it answered yes to. A census re-deriving the
 * rule for itself would be measuring its own arithmetic: it would go on agreeing with the report
 * while disagreeing with the books beneath it, which is the one disagreement a reader of a scope
 * section has no way to see.
 *
 * SAID BY SUBTRACTION, which is the inversion in one line (@SCN-USG-004). A step is a candidate
 * unless something took it out of discovery entirely, or it runs a behavioural runner the target
 * named. There is no third condition and nothing here reads a step's name.
 *
 * ASKED IN THAT ORDER. A step this reader is not looking at is not a step it decided against, so
 * the exclusion is asked before anything is read off the step for the runner rule.
 */
export function isCandidateStep(
  step: CiWorkflowStep,
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean
): boolean {
  return !isExcludedFromDiscovery(step) && !runsNamedRunner(step, packageJson, runners);
}

/**
 * DOES THIS STEP RUN A RUNNER THE TARGET NAMED — rule D as a yes or no (@SCN-USG-011).
 *
 * THE SAME COMPARISON A THIRD TIME, AND STILL ONLY ONE OF THEM. The membership rule above asks it,
 * the report's recognised-runner cut asks it, and the accounting identity (`parse/stepAccounting`,
 * @SCN-USG-018) asks it to say which disposition a step got. A count that decided "is this a
 * runner" out of its own reading of the rule could report every step accounted for while the books
 * beneath it had posted one of them twice, or not at all — and a total that agrees with itself is
 * exactly the reassurance the identity exists to refuse.
 *
 * WHICH TIERS IS THE OTHER QUESTION and is not this one. The report names the tier a step was
 * recognised for, and one step can be two tiers' runner; a count of dispositions wants the step,
 * once, whatever it was recognised as.
 */
export function runsNamedRunner(
  step: CiWorkflowStep,
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>
): boolean {
  return namedRunnersAt(step, packageJson.scripts ?? {}, runners).length > 0;
}

export function runningStaticChecks(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  // @SCN-USG-004 (3F-3343) — THE TARGET'S DECLARED BEHAVIOURAL RUNNERS, which is what decides
  // membership now that nothing decides it by name. This argument replaces the observed prefix
  // set that used to sit here, and the replacement is the inversion in one line: the tool no
  // longer guesses at the open set of things a check might be called, it is told the closed set of
  // things that are not checks — one command per canon tier, named once by the consumer.
  //
  // THE PARTITION, NOT THE WHOLE BLOCK (@SCN-USG-019). Only entries keyed by a canon tier reach
  // rule D; a key outside the four is reported rather than honoured, and the caller resolves that
  // (`resolveRunners`) so a consumer cannot take their own checks out of discovery one invented
  // key at a time.
  //
  // AN EMPTY RECORD IS A REAL AND SUPPORTED STATE (@SCN-USG-017). A target that has named no
  // runners has every step of its pipeline reported as a candidate, which is exactly the report
  // `new-client` is sold on: a first run that says what your pipeline ran, out loud, before you
  // have configured anything at all.
  runners: Readonly<Record<string, string | null>>,
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
  citedScn: (script: string, citedByStep?: string) => ScriptCitation | null = () => null,
  // @SCN-USG-015 / @SCN-USG-014 (3F-3343) — WHETHER THIS STEP IS ONE THIS READER LOOKS AT, asked of
  // every step before it is read for anything. Such a step carries no check into this observer, is
  // not consulted for a check's enforcement, and cannot supply a citation: it is not a step this
  // reader is looking at, which is a different thing from a step whose check it decided against.
  //
  // TWO FACTS, ONE ANSWER, AND THE COMPOSITION IS THE CALLER'S. The consumer named the step a
  // non-check (`parse/stepExclusions`), or it is the reconciler itself (`parse/reconcilerSteps`) —
  // by construction and by configuration, which the REPORT tells apart because a consumer needs to
  // know which of them took a step out. This reader does not: what it needs is one answer per step,
  // and asking it two questions would put the precedence between them in an observer that has no
  // business holding it, in a second place, free to disagree with the account the report prints.
  //
  // A FUNCTION, and the exclusion seam's own module states why (`parse/stepExclusions`): taking
  // the entry list instead would put the file-and-job qualification rule inside an observer with
  // no business restating it.
  //
  // THE EXCLUSION IS ABOUT A STEP, NEVER ABOUT A SCRIPT. A check the consumer excluded at one step
  // and still runs at another is a check their pipeline runs, and reading the entry as being about
  // the script would delete it from the report on the strength of something they did not say.
  //
  // Trailing and optional: a target that names no non-checks observes exactly what it observed
  // before, byte for byte.
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean = () => false
): GuardEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  // THE STEPS, NOT THEIR COMMANDS, AND THE WHOLE-PIPELINE WALK RATHER THAN ITS `run:` PROJECTION.
  // `ciRunSteps` is that projection and was what this reader took until @SCN-USG-015; the wider
  // reading is taken here because a step is taken out of discovery by its IDENTITY, the job it
  // belongs to and — for the reconciler's dump — the expression its `env:` carries, and the
  // projection drops all three. It is the SAME parse either way — the projection is built from
  // this walk — so no second reading of the workflow enters.
  //
  // EVERY STEP, WHATEVER FORM IT TAKES (@SCN-USG-013). This filter read `run:` steps alone until
  // now, and the narrowing was never principled: a quality check can be an ACTION — CodeQL's
  // analyse step, a dependency review — so a rule discarding every `uses:` step drops real checks
  // and drops them silently, which is the prefix rule arriving one layer along in a parse
  // limitation's clothes. It is also the shape a non-Node consumer arrives in: a pipeline whose
  // static analysis is an action has no manifest script for it, and a `run:`-only reading hands
  // them the same empty report the Node-shaped limit used to.
  //
  // NOTHING ELSE IN THIS READER NEEDED WIDENING, which is what says the narrowing was incidental.
  // The runner rule already answers "no" for a step stating no command, the exclusion seam already
  // takes a step of either form, and the handle already falls back to the step's own identity —
  // so what is deleted here is a condition, not a case.
  //
  // THE RULE ITSELF IS `isCandidateStep` ABOVE, and it is a named function rather than this
  // filter's body because the scope census asks it too (@SCN-USG-020). Two statements of "is this
  // a candidate" would be free to disagree, and the report would then name a number of candidates
  // per job that the books beneath it did not post.
  const candidates = ciWorkflowSteps(ciSources).filter((step) =>
    isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)
  );
  return candidates
    .map((step) => {
      const staticCheck = handleOf(step, scripts);
      // AND THE SEAM IS ASKED WITH THE STEP (@SCN-LNT-031). Read as an INPUT to the citation and
      // not only as a refinement of one: the code the consumer wrote on the step names the
      // configured row, and that row is where the check tag a CI step cannot state comes from.
      const citation = citedScn(staticCheck, step.id);
      return {
        qualityCheck: "lint" as const,
        staticCheck,
        exists: true,
        // WHETHER THE JOB'S VERDICT DEPENDS ON THIS STEP (@SCN-LNT-032), read off the step that
        // ran it rather than folded across every step that runs the same script. A candidate IS a
        // step now, so a check run twice — once severed, once not — is two observations with two
        // honest answers, where the fold had to pick one and would have vouched for the severed
        // one on the strength of its sibling.
        enforcedOverRealSource: step.abortsJob,
        // Spread rather than two `?? undefined` assignments, so an observation that cites nothing
        // carries neither key and its JSON stays byte-identical. Both terms or neither — a
        // half-citation would be a shape no reader knows how to read, and the bare check tag is
        // the term a CI step CANNOT state: `id:` names the row, never the characteristic the
        // ledger reconciles on. So a step's `id:` refines which row a citation posts to; it does
        // not manufacture a citation where the seam reached no check tag at all — that target has
        // registered nothing, which is `new-client`, and its observations belong in suspense.
        ...(citation !== null
          ? { scnId: step.id ?? citation.scnId, checkTag: citation.checkTag }
          : {}),
      };
    })
    // BY HANDLE, which is the order this observer has always emitted in and the order a reader of
    // the report expects. Stable, so two steps sharing a handle stay in the order their pipeline
    // runs them.
    .sort((a, b) => a.staticCheck.localeCompare(b.staticCheck));
}

/**
 * RULE D (@SCN-USG-011, 3F-3343) — the steps of a target's pipeline that run the behavioural
 * runners its manifest named, each with the tier it was named for and the step it was found at.
 *
 * IT IS THE ACCOUNT, AND SINCE @SCN-USG-004 THE SAME COMPARISON IS ALSO THE VERDICT. This reader
 * REPORTS which step ran which named runner; the membership rule above ASKS the same question of
 * each step and takes a runner's step out of discovery. Both go through `namedRunnersAt`, so the
 * report and the books cannot come to disagree — a step named here as the unit runner is the same
 * step that is not on the books as a fitness check.
 *
 * AND BEING NAMED IS WHAT LETS THE RULE BE THIS SIMPLE. A step recognised as a runner leaves the
 * reader NAMED rather than silent, so what the recognition gets wrong is visible in the report and
 * correctable in one line of the consumer's own configuration — the safe direction, in the one
 * place where the unsafe one would be invisible.
 *
 * `run:` STEPS ONLY, because the rule is about a COMMAND. A `uses:` step runs an action and states
 * no command for a runner to be a token of; what such a step is instead is a question for the
 * disposition rule, not for this one.
 *
 * ONE ENTRY PER TIER PER STEP. Two tiers sharing a runner is the ordinary case — `@integration` and
 * `@e2e` are both `cucumber-js` in three portfolio repositories — and each tier is a separate thing
 * the consumer said, so collapsing them would answer for a tier nobody asked about.
 *
 * A TIER THE TARGET SAYS HAS NONE FALLS OUT IN `namedRunnersAt` (@SCN-USG-016), and falls out
 * silently, which is right: there is no name for a whole-token match to be run against, so no step
 * can be its runner. The statement itself is not lost — the resolver keeps it, and the report says
 * it — but this reader answers only "which step runs which named runner", and a null is not an
 * answer to that.
 */
export function recognisedRunners(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>
): BehaviouralRunner[] {
  const scripts = packageJson.scripts ?? {};
  // THE WIDENED WALK, of which the observer above's `ciRunSteps` is the `run:`-only projection
  // (3F-3352) — the SAME parse, so this reader and that one cannot come to disagree about which
  // steps a workflow runs. It is read here for the step's IDENTITY, which is the string a consumer
  // reads in their own run log and therefore the only useful way to name a step back to them.
  return ciWorkflowSteps(ciSources).flatMap((step) =>
    namedRunnersAt(step, scripts, runners).map(([tier, runner]) => ({
      tier,
      runner,
      step: step.identity,
    }))
  );
}
