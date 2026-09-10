/**
 * The CI-parse primitive — the shared static-evidence reader machinery BOTH static-check
 * observers import: walk the CI config STRUCTURALLY to its `run:` steps (`ciRunSteps`, of which
 * `ciRunCommands` is the projection to their command strings), and test whether a command invokes
 * a given npm script by an EXACT package-manager invocation (`commandInvokesScript`). `checkStaticEvidenceObligations` (the obligation-side observer) and
 * `runningStaticChecks` (the running-check observer) both read a check's
 * enforcement off these, so the watermelon-critical parse lives in ONE place — a mis-read could
 * itself HIDE a watermelon (read a wired static check as unwired, or the reverse).
 *
 * The CI config is parsed with the reputable `yaml` parser (jobs → steps → run, including
 * block-scalar `run:` and `if:`/matrix steps) — never line-scanned. The step mapping is read
 * for its `continue-on-error` and its `id:` as well as its `run:`, because a step whose red the job
 * would swallow is a check that reports without enforcing (3F-3042, @SCN-LAD-008) and a step's
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
 * @SCN-LAD-008 — features/local-ladder.feature.
 */
export type CiRunStep = { readonly command: string; readonly id?: string } & (
  | { readonly abortsJob: true }
  | {
      readonly abortsJob: false;
      /** Which key carries the `continue-on-error`, and the value it carries. */
      readonly continuesOnError: { readonly carriedBy: "step" | "job"; readonly value: string };
    }
);

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

/** One `run:` step, read with its `id:`, its own `continue-on-error` and its job's. */
function stepOf(
  command: string,
  id: string | undefined,
  ownValue: unknown,
  jobValue: unknown
): CiRunStep {
  // Spread rather than an `id: undefined` assignment, so a step carrying no `id:` carries no key
  // and its shape stays exactly what it was before this walk read the key at all.
  const step = { command, ...(id !== undefined ? { id } : {}) };
  // The step's own key is named ahead of its job's because it is the nearer one to delete;
  // either alone is enough to sever the step, so this decides the message and not the verdict.
  if (!vouchesForTheStep(ownValue)) {
    return {
      ...step,
      abortsJob: false,
      continuesOnError: { carriedBy: "step", value: String(ownValue) },
    };
  }
  if (!vouchesForTheStep(jobValue)) {
    return {
      ...step,
      abortsJob: false,
      continuesOnError: { carriedBy: "job", value: String(jobValue) },
    };
  }
  return { ...step, abortsJob: true };
}

/**
 * The `run:` steps of ONE job. A job-level `continue-on-error` reaches every one of them, which
 * is why the job's own key is read here rather than left to the step loop to miss.
 */
function runStepsOfJob(job: unknown): CiRunStep[] {
  if (!isRecord(job)) return [];
  const steps = job["steps"];
  if (!Array.isArray(steps)) return [];
  const jobValue = job[CONTINUE_ON_ERROR];
  const runSteps: CiRunStep[] = [];
  for (const step of steps) {
    if (!isRecord(step)) continue;
    const run = step["run"];
    if (typeof run !== "string") continue;
    runSteps.push(stepOf(run, idOf(step["id"]), step[CONTINUE_ON_ERROR], jobValue));
  }
  return runSteps;
}

/**
 * Every CI `run:` step of ONE config source, walked STRUCTURALLY from the parsed document
 * (jobs → steps → run). A malformed config that fails to parse yields no steps — the SAFE
 * direction: it reports static checks as unenforced (flagged), never falsely enforced (hidden).
 */
function runStepsOf(ciSource: string): CiRunStep[] {
  let doc: unknown;
  try {
    doc = parse(ciSource);
  } catch {
    return [];
  }
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.values(jobs).flatMap(runStepsOfJob);
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
 * @SCN-LAD-008 — features/local-ladder.feature.
 */
export function ciRunSteps(ciSources: readonly string[]): CiRunStep[] {
  return ciSources.flatMap(runStepsOf);
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
