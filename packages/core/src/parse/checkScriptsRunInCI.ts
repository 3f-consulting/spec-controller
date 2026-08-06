/**
 * The CI-parse primitive — the shared static-evidence reader machinery BOTH guard
 * observers import: walk the CI config STRUCTURALLY to its `run:` commands (`ciRunCommands`), and
 * test whether a command invokes a given npm script by an EXACT package-manager invocation
 * (`commandInvokesScript`). `checkStaticEvidenceObligations` (the named-guard observer, `ingest/guard`) and
 * `runningStaticChecks` (the running-guard observer, `ingest/ciGuards`) both read a guard's
 * enforcement off these, so the watermelon-critical parse lives in ONE place — a mis-read could
 * itself HIDE a watermelon (read a wired static check as unwired, or the reverse).
 *
 * The CI config is parsed with the reputable `yaml` parser (jobs → steps → run, including
 * block-scalar `run:` and `if:`/matrix steps) — never line-scanned. A static check's
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

/**
 * Every CI `run:` step command of ONE config source, walked STRUCTURALLY from the parsed
 * document (jobs → steps → run). A malformed config that fails to parse yields no commands
 * — the SAFE direction: it reports static checks as unenforced (flagged), never falsely
 * enforced (hidden).
 */
function runCommandsOf(ciSource: string): string[] {
  let doc: unknown;
  try {
    doc = parse(ciSource);
  } catch {
    return [];
  }
  const commands: string[] = [];
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return commands;
  for (const job of Object.values(jobs)) {
    const steps = isRecord(job) ? job["steps"] : undefined;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const run = isRecord(step) ? step["run"] : undefined;
      if (typeof run === "string") commands.push(run);
    }
  }
  return commands;
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
  return ciSources.flatMap(runCommandsOf);
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
