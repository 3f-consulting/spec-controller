/**
 * The CI-parse primitive — the shared static-evidence reader machinery BOTH guard
 * observers import: walk the CI config STRUCTURALLY to its `run:` steps (`ciRunSteps`, of which
 * `ciRunCommands` is the projection to their command strings), and test whether a command invokes
 * a given npm script by an EXACT package-manager invocation (`commandInvokesScript`). `checkStaticEvidenceObligations` (the named-guard observer, `ingest/guard`) and
 * `runningStaticChecks` (the running-guard observer, `ingest/ciGuards`) both read a guard's
 * enforcement off these, so the watermelon-critical parse lives in ONE place — a mis-read could
 * itself HIDE a watermelon (read a wired static check as unwired, or the reverse).
 *
 * The CI config is parsed with the reputable `yaml` parser (jobs → steps → run, including
 * block-scalar `run:` and `if:`/matrix steps) — never line-scanned. The step mapping is read
 * for its `continue-on-error` as well as its `run:`, because a step whose red the job would
 * swallow is a check that reports without enforcing (3F-3042, @SCN-LAD-008). A static check's
 * command counts as enforced only on an EXACT
 * package-manager invocation of its script name (`pnpm <guard>` / `pnpm run <guard>` /
 * `npm run <guard>` / `yarn <guard>`), so a sibling static check's run step never falsely enforces it.
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
 * One CI `run:` step: the command, and whether its red is the job's verdict.
 *
 * A UNION RATHER THAN AN OPTIONAL FIELD, so the invariant is unrepresentable rather than
 * commented. A step that does not abort the job always names the key that severs it — a reader
 * has to know WHICH key to delete, and the two live in two different places — and a step that
 * does abort it carries no such key to go stale beside the flag.
 *
 * @SCN-LAD-008 — features/local-ladder.feature.
 */
export type CiRunStep = { readonly command: string } & (
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

/** One `run:` step, read with its own `continue-on-error` and its job's. */
function stepOf(command: string, ownValue: unknown, jobValue: unknown): CiRunStep {
  // The step's own key is named ahead of its job's because it is the nearer one to delete;
  // either alone is enough to sever the step, so this decides the message and not the verdict.
  if (!vouchesForTheStep(ownValue)) {
    return {
      command,
      abortsJob: false,
      continuesOnError: { carriedBy: "step", value: String(ownValue) },
    };
  }
  if (!vouchesForTheStep(jobValue)) {
    return {
      command,
      abortsJob: false,
      continuesOnError: { carriedBy: "job", value: String(jobValue) },
    };
  }
  return { command, abortsJob: true };
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
    runSteps.push(stepOf(run, step[CONTINUE_ON_ERROR], jobValue));
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
 * Every CI `run:` step across ALL of a target's config sources — the command, and whether the
 * step's red would abort the job.
 *
 * THE SAME WALK `ciRunCommands` READS, WIDENED — never a second one. `continue-on-error` is a key
 * of the step mapping this walk already visits and used to discard, and a second walk to pick it
 * up would be a second thing to get wrong, disagreeing silently with the first about which steps
 * a workflow even runs. `ciRunCommands` is this function's projection, so the two cannot disagree.
 *
 * WHY A CALLER WANTS IT (3F-3042). A green CI run is evidence that every unconditional step ran,
 * because a `run:` step that reds aborts the job. `continue-on-error` is the one attribute that
 * falsifies that: the step runs, reds, and leaves the job green. A reader that cannot see it
 * cannot tell a gate from a gate in name only.
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
