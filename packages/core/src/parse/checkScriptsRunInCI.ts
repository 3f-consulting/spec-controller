/**
 * The CI-parse primitive — the shared static-evidence reader machinery BOTH static-check
 * observers import: walk the CI config STRUCTURALLY to its steps (`ciWorkflowSteps`, of which
 * `ciRunSteps` is the projection to the `run:` ones and `ciRunCommands` the projection to their
 * command strings), and test whether a command invokes
 * a given npm script by an EXACT package-manager invocation (`commandInvokesScript`).
 * `runningStaticChecks` (the running-check observer, and since 3F-3410 the only static-check
 * observer) reads a check's enforcement off these, so the watermelon-critical parse lives in ONE
 * place — a mis-read could itself HIDE a watermelon (read a severed static check as enforced, or
 * the reverse).
 *
 * The CI config is parsed with the reputable `yaml` parser (jobs → steps → run, including
 * block-scalar `run:` and `if:`/matrix steps) — never line-scanned. The step mapping is read
 * for its `continue-on-error` and its `id:` as well as its `run:`, because a step whose red the job
 * would swallow is a check that reports without enforcing (3F-3042, @SCN-LNT-032) and a step's
 * `id:` is where a consumer writes the `@SCN` its check cites (3F-3261). A static check's
 * command counts as enforced only on an EXACT
 * package-manager invocation of its script name (`pnpm <script>` / `pnpm run <script>` /
 * `npm run <script>` / `yarn <script>`), so a sibling static check's run step never falsely enforces it.
 *
 * Parent: @SCN-LNT-001.
 */

import { parse } from "yaml";

/** The minimal shape of `package.json` the static check observers depend on. */
export interface PackageJsonScripts {
  scripts?: Record<string, string>;
}

/** A non-null object — the YAML-parse walk narrows through these. */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** The one key that severs a step's red from the job's verdict — GitHub spells it in two places. */
const CONTINUE_ON_ERROR = "continue-on-error";

/**
 * One CI `run:` step: the command, the `id:` it was given, and whether its red is the job's verdict.
 *
 * A UNION RATHER THAN AN OPTIONAL FIELD for the `continue-on-error` half, so the invariant is
 * unrepresentable rather than commented. A step that does not abort the job always names the key
 * that severs it — a reader has to know WHICH key to delete, and the two live in two different
 * places — and a step that does abort it carries no such key to go stale beside the flag.
 *
 * `id` IS OPTIONAL AND THAT IS NOT THE SAME SHAPE OF QUESTION. There is no second key and no
 * invariant to pair it with: the step either carries an `id:` or it does not, and its absence is a
 * fact about the workflow rather than a state needing a witness. Optional rather than `string |
 * null` for the reason the observation's own `scnId` is (`domain/journal.ts`) — an absent citation
 * carries no key at all.
 *
 * @SCN-LNT-032 — features/fitness-reconciliation.feature.
 */
export type CiRunStep = { readonly command: string; readonly id?: string } & StepAbortsJob;

/**
 * Whether a step's red is the job's verdict, and — when it is not — which key severed it.
 *
 * NAMED RATHER THAN INLINED because two step readings now carry it: `CiRunStep`, which is the
 * `run:`-only projection every existing caller reads, and `CiWorkflowStep`, the whole-pipeline
 * walk below. Restating the union in both would let the two drift into disagreeing about the one
 * attribute that separates a gate from a gate in name only.
 */
type StepAbortsJob =
  | { readonly abortsJob: true }
  | {
      readonly abortsJob: false;
      /** Which key carries the `continue-on-error`, and the value it carries. */
      readonly continuesOnError: { readonly carriedBy: "step" | "job"; readonly value: string };
    };

/**
 * What a step DOES — GitHub gives a step one of these two and never both.
 *
 * A UNION RATHER THAN TWO OPTIONAL FIELDS, so "a step with neither" and "a step with both" are
 * unrepresentable instead of being states every reader has to remember to handle.
 */
export type CiStepAction =
  /** A shell step, carrying the command it runs. */
  | { readonly runs: string }
  /** An action step, carrying the action reference it uses. */
  | { readonly uses: string };

/**
 * ONE step of ONE job of ONE workflow — every step, whatever form it takes, with the identity a
 * consumer would recognise it by and the job it belongs to.
 *
 * WHY THIS EXISTS BESIDE `CiRunStep` (3F-3352). Three things this walk has always seen and thrown
 * away are each needed to report a pipeline rather than a subset of it: `uses:` steps (a quality
 * check can be an action, so discarding them at the walk drops real checks), the step's `name:`
 * (which is how a consumer identifies a step, and how a report names one), and the job the step
 * belongs to (`Typecheck` in `ci.yml` and `Typecheck` in `release.yml` are otherwise
 * indistinguishable, which makes a per-step exclusion unwritable).
 *
 * A SOURCE INDEX RATHER THAN A FILENAME. `ciSources` is an array of anonymous source strings and
 * the core holds no filesystem — deliberately, and `ciSourcePaths.ts` says why. Mapping the index
 * back to a workflow file is the CLI edge's job, where the paths are already resolved.
 */
export type CiWorkflowStep = {
  /** Which of the `ciSources` this step was read from — an index, never a path. */
  readonly sourceIndex: number;
  /** The key this step's job is written under in the workflow's `jobs:` mapping. */
  readonly jobId: string;
  /** What GitHub itself would display for this step — see `identityOf`. */
  readonly identity: string;
  readonly id?: string;
  /**
   * The step's OWN `env:` values, as written — where a workflow EXPRESSION crosses into a step.
   *
   * WHY A READER WANTS THEM (3F-3358). A `${{ }}` expansion inside `run:` is substituted into the
   * script before bash sees it, so a value carrying a quote would end the string and the rest
   * would be shell; the way a workflow hands a step something GitHub computed is therefore `env:`,
   * and this repository's own step-record dump says so in as many words. A reader that cannot see
   * `env:` cannot tell a step producing the run's own step record from any other shell step.
   *
   * THE STEP'S OWN, NEVER THE JOB'S, and that is a narrowing rather than an omission. A job-level
   * `env:` reaches every step of the job, so reading it here would answer this question the same
   * way for all of them — and a reader that took an expression off the job would set the whole
   * job aside on the strength of one key.
   *
   * VALUES, NOT KEYS. What a caller asks about is what a step was handed; the name a workflow gave
   * it is the author's own word for it, and not one this walk has any business carrying.
   */
  readonly env: readonly string[];
} & CiStepAction &
  StepAbortsJob;

/**
 * Does a `continue-on-error` value leave a step's red as the job's verdict?
 *
 * THE SAFE DIRECTION, the one this walk already takes on a document it cannot parse at all:
 * absent, `false`, or the string `"false"` vouches for a step and nothing else does. An
 * expression's value is decided by the run rather than by the document, so a step this parse
 * cannot PROVE will abort the job is a step it must not vouch for — the reading that reports a
 * check unenforced (flagged) rather than falsely enforced (hidden).
 */
function vouchesForTheStep(value: unknown): boolean {
  return value === undefined || value === false || value === "false";
}

/**
 * A step's own `env:` VALUES, or none — anything that is not a string is not an expression and is
 * not something a reader here can be given, the same safe direction `idOf` below takes.
 */
function envValuesOf(value: unknown): readonly string[] {
  return isRecord(value)
    ? Object.values(value).filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * A step's `id:`, or nothing.
 *
 * A STRING OR SILENCE. YAML will hand back a number for `id: 001` and a mapping for a malformed
 * one, and neither is something a citation can be read off — so anything but a non-empty string
 * reads as no `id:` at all. The SAFE direction again: an unreadable `id:` leaves the step citing
 * nothing, which posts to suspense and is visible, rather than citing a coerced word that would
 * answer some obligation by accident.
 */
function idOf(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return id === "" ? undefined : id;
}

/** A step's own `continue-on-error` read against its job's. */
function abortsJobOf(ownValue: unknown, jobValue: unknown): StepAbortsJob {
  // The step's own key is named ahead of its job's because it is the nearer one to delete;
  // either alone is enough to sever the step, so this decides the message and not the verdict.
  if (!vouchesForTheStep(ownValue)) {
    return { abortsJob: false, continuesOnError: { carriedBy: "step", value: String(ownValue) } };
  }
  if (!vouchesForTheStep(jobValue)) {
    return { abortsJob: false, continuesOnError: { carriedBy: "job", value: String(jobValue) } };
  }
  return { abortsJob: true };
}

/**
 * What a step does, or nothing at all.
 *
 * `run:` IS READ FIRST so that a malformed step carrying both keys is read exactly as this walk
 * has always read it. A step carrying neither is not a step GitHub would run, and yields nothing
 * — the same safe direction the rest of this parse takes on what it cannot make sense of.
 */
function actionOf(step: Record<string, unknown>): CiStepAction | undefined {
  const runs = step["run"];
  if (typeof runs === "string") return { runs };
  const uses = step["uses"];
  if (typeof uses === "string") return { uses };
  return undefined;
}

/**
 * The string GitHub itself displays for a step: its `name:`, else the action it `uses:`, else the
 * first line of its `run:`.
 *
 * IN GITHUB'S OWN ORDER AND FOR GITHUB'S OWN REASON — a consumer naming a step in configuration,
 * or reading one off a report, reads the string already in front of them in their run log, so
 * nothing new has to be learned to write one down. The first NON-BLANK line of a `run:`, because a
 * block scalar may open on one and an empty identity is a string no consumer can write.
 */
function identityOf(name: unknown, action: CiStepAction): string {
  if (typeof name === "string" && name.trim() !== "") return name.trim();
  if ("uses" in action) return action.uses;
  return action.runs.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}

/**
 * The steps of ONE job. A job-level `continue-on-error` reaches every one of them, which
 * is why the job's own key is read here rather than left to the step loop to miss.
 */
function stepsOfJob(jobId: string, job: unknown, sourceIndex: number): CiWorkflowStep[] {
  if (!isRecord(job)) return [];
  const steps = job["steps"];
  if (!Array.isArray(steps)) return [];
  const jobValue = job[CONTINUE_ON_ERROR];
  const read: CiWorkflowStep[] = [];
  for (const step of steps) {
    if (!isRecord(step)) continue;
    const action = actionOf(step);
    if (action === undefined) continue;
    const id = idOf(step["id"]);
    read.push({
      sourceIndex,
      jobId,
      identity: identityOf(step["name"], action),
      env: envValuesOf(step["env"]),
      // Spread rather than an `id: undefined` assignment, so a step carrying no `id:` carries no
      // key at all — the shape an absent citation has everywhere else in this engine.
      ...(id !== undefined ? { id } : {}),
      ...action,
      ...abortsJobOf(step[CONTINUE_ON_ERROR], jobValue),
    });
  }
  return read;
}

/**
 * Every step of ONE config source, walked STRUCTURALLY from the parsed document
 * (jobs → steps). A malformed config that fails to parse yields no steps — the SAFE
 * direction: it reports static checks as unenforced (flagged), never falsely enforced (hidden).
 */
function stepsOf(ciSource: string, sourceIndex: number): CiWorkflowStep[] {
  let doc: unknown;
  try {
    doc = parse(ciSource);
  } catch {
    return [];
  }
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.entries(jobs).flatMap(([jobId, job]) => stepsOfJob(jobId, job, sourceIndex));
}

/** One whole-pipeline step read back down to the `run:`-step shape its callers have always had. */
function runStepOf(step: CiWorkflowStep & { readonly runs: string }): CiRunStep {
  const read = { command: step.runs, ...(step.id !== undefined ? { id: step.id } : {}) };
  return step.abortsJob
    ? { ...read, abortsJob: true }
    : { ...read, abortsJob: false, continuesOnError: step.continuesOnError };
}

/**
 * Every CI `run:` step command across ALL of a target's config sources.
 *
 * A pipeline split across files — a nightly sweep, a security scan — enforces its checks
 * just as a single file does, so "does this check run in CI" is a question about the whole
 * set (3F-2238). Per-source, not joined: parse tolerance stays per document, so one
 * malformed workflow costs only its own commands instead of discarding every other file's
 * — joining first would widen the watermelon-hiding surface this parse exists to keep narrow.
 *
 * Sources, never paths: the caller reads the files, so no filesystem and no CI-provider
 * layout enters the core.
 */
export function ciRunCommands(ciSources: readonly string[]): string[] {
  return ciRunSteps(ciSources).map((step) => step.command);
}

/**
 * Every CI `run:` step across ALL of a target's config sources — the command, the `id:` it carries,
 * and whether the step's red would abort the job.
 *
 * THE SAME WALK `ciRunCommands` READS, WIDENED — never a second one, and widened TWICE now for the
 * same reason. `continue-on-error` and `id` are both keys of the step mapping this walk already
 * visits and used to discard, and a second walk to pick either up would be a second thing to get
 * wrong, disagreeing silently with the first about which steps a workflow even runs.
 * `ciRunCommands` is this function's projection, so the two cannot disagree.
 *
 * WHY A CALLER WANTS `abortsJob` (3F-3042). A green CI run is evidence that every unconditional
 * step ran, because a `run:` step that reds aborts the job. `continue-on-error` is the one
 * attribute that falsifies that: the step runs, reds, and leaves the job green. A reader that
 * cannot see it cannot tell a gate from a gate in name only.
 *
 * WHY A CALLER WANTS `id` (3F-3261). A check step's `id:` is where a consumer writes the `@SCN`
 * their check cites — a citation, never a declaration: the obligation stays in the scenario and the
 * command stays in the step. Reading it here is what lets the derivation say WHICH row a wired
 * check answers, rather than only that it is wired.
 *
 * @SCN-LNT-032 — features/fitness-reconciliation.feature.
 */
export function ciRunSteps(ciSources: readonly string[]): CiRunStep[] {
  return ciWorkflowSteps(ciSources).flatMap((step) => ("runs" in step ? [runStepOf(step)] : []));
}

/**
 * EVERY step across ALL of a target's config sources — `uses:` as well as `run:`, each with the
 * identity GitHub displays for it, the job it belongs to, and the source it was read from.
 *
 * THE WALK, OF WHICH `ciRunSteps` IS NOW THE PROJECTION — never a second one, for the third time
 * and the same reason. `uses:`, `name:` and the job key are all reachable from the mapping this
 * walk already visits, and a sibling walk to pick them up would be free to disagree with this one
 * about which steps a workflow even runs. `ciRunSteps` projects this, so the two cannot; that is
 * the relationship `ciRunCommands` already has to `ciRunSteps`, one layer along.
 *
 * WHY A CALLER WANTS THE WIDER READING (3F-3352, parent 3F-3343). A pipeline's quality checks are
 * whatever a consumer's pipeline runs, and a reader that discards every `uses:` step at the walk
 * cannot see a check that is an action; one that forgets `name:` cannot report a step by the
 * string its author reads in their own run log; and one that flattens the jobs cannot tell two
 * identically-named steps in two workflows apart, which is what makes a per-step judgement about
 * one of them unwritable.
 *
 * IT CHANGES NO VERDICT. Nothing is discovered, excluded or classified here — this reader makes
 * the steps VISIBLE, and what is done with them is its callers'.
 */
export function ciWorkflowSteps(ciSources: readonly string[]): CiWorkflowStep[] {
  return ciSources.flatMap((ciSource, sourceIndex) => stepsOf(ciSource, sourceIndex));
}

/**
 * Does a single command LINE invoke the given npm script via a package manager?
 * Matches `pnpm <guard>`, `pnpm run <guard>`, `npm run <guard>`, `yarn <guard>`
 * on an EXACT script-name token — no fuzzy substring (a fuzzy match could hide a
 * watermelon by treating a sibling static check's step as this static check's).
 */
function lineInvokesScript(line: string, guard: string): boolean {
  const tokens = line.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === "pnpm" || tok === "yarn") {
      let j = i + 1;
      if (tokens[j] === "run") j++;
      if (tokens[j] === guard) return true;
    }
    if (tok === "npm" && tokens[i + 1] === "run" && tokens[i + 2] === guard) {
      return true;
    }
  }
  return false;
}

/** Does any line of a (possibly multi-line block-scalar) command invoke the script? */
export function commandInvokesScript(command: string, guard: string): boolean {
  return command.split(/\r?\n/).some((line) => lineInvokesScript(line, guard));
}
