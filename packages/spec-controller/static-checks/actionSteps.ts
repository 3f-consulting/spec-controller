/**
 * THE STEP-COMMAND RULE — a composite action's step runs a file that travels with it, never a bin
 * out of the caller's workspace (@SCN-ACT-002).
 *
 * THIS IS THE ROUTE THE DEFECT CAME IN BY. Three actions were written to be imported by another
 * repository, took every project-owned term as an input so nobody would have to fork them, and then
 * reached their CLI as `npx --no -- spec-controller-<name>` — which resolves a bin out of the
 * CALLER's `node_modules`, from a `dist/` that is build output and is not committed. A cross-repo
 * `uses:` checks the action out into a workspace that has neither, so the step dies before it runs.
 * Every one of them was well-formed. None of them worked.
 *
 * TWO WAYS OF REACHING OUTSIDE, AND THE SECOND IS THE ONE THAT LOOKS LIKE THE FIX. A bin name is
 * the obvious offence; swapping `npx` for `node` and a sibling-repository path is the near-miss
 * that reads as having addressed it, and is just as absent from a caller's checkout. So the rule
 * knows both, and a red says which.
 *
 * IT READS COMMANDS, NEVER PROSE, AND THE DISTINCTION IS NOT THE ONE IT LOOKS LIKE. Reading the
 * PARSED `run:` blocks rather than the file's raw text is only half of it: a `run:` block IS a
 * shell script, and this repository's own three spend paragraphs INSIDE theirs arguing about the
 * very route this forbids — one of them explains at length what the `--` after `npx` was doing.
 * A rule matching the block's text would red every one of those paragraphs, which is a
 * spell-checker and not a check (the scope argument `lint:anemic-domain` already makes about
 * domain directories versus the word). So a line whose first character is `#` is prose, and prose
 * is not read.
 *
 * WHAT A GREEN HERE DOES NOT ESTABLISH. It reads the command a step names. It says nothing about
 * whether the file that command points at exists, matches its source, or does the right thing —
 * those are @SCN-ACT-003 and @SCN-ACT-001 — and nothing about a step shelling out to a tool the
 * runner happens to provide (`gh`, `node` itself). It fences the reach, and no more.
 */

import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

/** One action's file, as read — its directory name, and the bytes of its `action.yml`. */
export interface ActionSource {
  /** The action's own directory name under `.github/actions/`. */
  readonly action: string;
  /** The `action.yml`'s own bytes. */
  readonly yaml: string;
}

/** One step reaching outside the action it travels with. */
export interface StepCommandFault {
  /** The action the step belongs to. */
  readonly action: string;
  /** The step's own name, or its position where it is unnamed. */
  readonly step: string;
  /** The command line objected to, as the step spells it. */
  readonly command: string;
  /** What is wrong with it, in the sentence its reader gets. */
  readonly why: string;
}

/**
 * What `${{ github.action_path }}` is rewritten to before a command is read.
 *
 * BECAUSE THE EXPRESSION HAS SPACES IN IT and a command line is read in words. Left as written, the
 * one path that IS allowed arrives as three unrelated words and the file at the end of it looks
 * like a path to nowhere in particular — which is the reading that would red the correct form and
 * pass nothing.
 */
const TRAVELS_WITH_IT = "<action-path>";

/** The expression naming the one directory a composite action can rely on having. */
const ACTION_PATH = /\$\{\{\s*github\.action_path\s*\}\}/g;

/** The extensions a command word has to end in to be a file this rule has an opinion about. */
const RUNNABLE = [".mjs", ".cjs", ".js"];

/** The lines of a `run:` block that are commands — prose dropped, continuations joined. */
function commandLinesIn(run: string): string[] {
  const joined = run.replace(/\\\n\s*/g, " ");
  return joined
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

/** The command's words, with the one allowed path collapsed into a single readable word. */
function wordsIn(command: string): string[] {
  return command
    .replace(ACTION_PATH, TRAVELS_WITH_IT)
    .split(/\s+/)
    .map((word) => word.replace(/^["']+|["']+$/g, ""))
    .filter((word) => word !== "");
}

/** True when this word names a file something would be asked to run. */
function isRunnableFile(word: string): boolean {
  return RUNNABLE.some((extension) => word.endsWith(extension));
}

/** What is wrong with this command line, or `undefined` where it reaches nowhere it should not. */
function faultInCommand(command: string, binNames: readonly string[]): string | undefined {
  const words = wordsIn(command);
  const bin = words.find((word) => binNames.includes(word));
  if (bin !== undefined) {
    return (
      `it names the bin \`${bin}\`, which resolves out of the CALLER's node_modules — a tree a ` +
      "cross-repository `uses:` does not have. Run the file committed beside the action, as " +
      '`node "${{ github.action_path }}/dist/<action>.mjs"`.'
    );
  }
  const strayFile = words.find(
    (word) => isRunnableFile(word) && !word.startsWith(`${TRAVELS_WITH_IT}/`),
  );
  if (strayFile !== undefined) {
    return (
      `it runs \`${strayFile}\`, which does not travel with the action. \`\${{ github.action_path }}\` ` +
      "is the only directory a composite action can rely on: the checkout beside it is the " +
      "CALLER's tree."
    );
  }
  return undefined;
}

/** One step of a composite action, as its `action.yml` files it. */
interface ActionStep {
  readonly name?: unknown;
  readonly run?: unknown;
}

/** The steps an action's parsed file holds, or none where it runs no steps of its own. */
function stepsIn(yaml: string): readonly ActionStep[] {
  const document = parse(yaml) as { runs?: { steps?: unknown } } | null;
  const steps = document?.runs?.steps;
  return Array.isArray(steps) ? (steps as readonly ActionStep[]) : [];
}

/** How a step is named in a red — its own name, or where it sits when it has none. */
function nameOf(step: ActionStep, at: number): string {
  return typeof step.name === "string" ? step.name : `step ${at + 1}`;
}

/** Every step of one action that reaches outside it. */
function faultsInAction(source: ActionSource, binNames: readonly string[]): StepCommandFault[] {
  return stepsIn(source.yaml).flatMap((step, at) => {
    // A step with no `run:` is a step that calls another action, which reaches nothing of its own.
    if (typeof step.run !== "string") return [];
    return commandLinesIn(step.run).flatMap((command) => {
      const why = faultInCommand(command, binNames);
      return why === undefined
        ? []
        : [{ action: source.action, step: nameOf(step, at), command, why }];
    });
  });
}

/**
 * Every step, across every action given, that reaches outside the action it travels with.
 *
 * An empty result is a set of actions a caller can `uses:` without installing anything; a non-empty
 * one names each offending step and what is wrong with it.
 *
 * THE SOURCES AND THE BIN NAMES ARE BOTH INJECTED, so the rule is held against planted trees in
 * isolation and against this repository's own actions by its CLI. Which names a project's bins are
 * is a fact about that project — read from wherever this module happened to be installed, the rule
 * would hold a consumer's actions against spec-controller's names.
 *
 * @param sources every action to read
 * @param binNames the bin names the actions' own package ships
 */
export function stepCommandFaultsIn(
  sources: readonly ActionSource[],
  binNames: readonly string[],
): StepCommandFault[] {
  return sources.flatMap((source) => faultsInAction(source, binNames));
}

/**
 * Read every composite action under a checkout's `.github/actions/`.
 *
 * SEPARATED FROM THE RULE, the split `noCommittedReports.ts` already draws between its logic and
 * its CLI's `git ls-files`: the rule is held against planted sources in isolation, and against a
 * real tree through this. It is the half where a rule right in isolation and pointed at the wrong
 * place reports a clean tree it never read, so it is exercised over a planted checkout rather than
 * assumed.
 *
 * A DIRECTORY WITHOUT AN `action.yml` IS NOT AN ACTION AND IS PASSED OVER, rather than refused: the
 * committed bundle each action carries lives under a `dist/` beside that file, and a reader walking
 * this tree meets those too.
 *
 * @param root the checkout to read — the caller's, never this module's own location
 */
export function readActionSources(root: string): ActionSource[] {
  const at = path.join(root, ".github", "actions");
  let entries: Dirent[];
  try {
    entries = readdirSync(at, { withFileTypes: true });
  } catch {
    // A checkout with no actions at all is a checkout with nothing for this rule to say.
    return [];
  }
  return entries.flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const file = path.join(at, entry.name, "action.yml");
    if (!existsSync(file)) return [];
    return [{ action: entry.name, yaml: readFileSync(file, "utf8") }];
  });
}
