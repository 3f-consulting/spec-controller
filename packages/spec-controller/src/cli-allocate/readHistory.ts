/**
 * The history half of the allocator's read: the added and removed lines of every reachable commit
 * that touched the part, so a code that was deleted is still counted and never reissued.
 *
 * Only diff lines count, never commit messages. History is read so that a deleted scenario's number
 * is not reissued; a code that only ever appeared in a message was never a scenario, and a message
 * cannot be unwritten, so one stray mention would move the answer for good. The format asks git for
 * each commit's abbreviated hash and nothing else, so a sighting can name the commit that carried it.
 *
 * As with the tree read, git is handed a fixed string only.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { ScnSighting } from "@3f-consulting/spec-controller-core";

/** How much history the read could see: all of it, none (no repository), or back to a shallow clone's edge. */
export type HistoryBoundary = { kind: "complete" } | { kind: "not-a-repository" } | { kind: "shallow"; before: string };

/** A long history's patches can be large; the default buffer would truncate them. */
const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

/** The marker the format puts before each commit's hash, a byte no patch line starts with. */
const COMMIT_MARKER = "\u0001";

/** The added and removed lines of every reachable commit whose patch touched `SCN-<part>-`. */
export function readHistory(cwd: string, part: string): ScnSighting[] {
  const result = spawnSync(
    "git",
    ["log", "--all", "-p", "-U0", "--no-color", "--no-ext-diff", "--format=%x01%h", "-G", `SCN-${part}-`],
    { cwd, encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES },
  );
  return diffLineSightings(result.stdout);
}

/** Git's answer in `cwd`, trimmed, or null when git refuses (outside a repository, or no git at all). */
function gitAnswer(cwd: string, args: readonly string[]): string | null {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** The top of the repository `cwd` stands in, or null outside one. */
export function repositoryTop(cwd: string): string | null {
  return gitAnswer(cwd, ["rev-parse", "--show-toplevel"]);
}

/** Whether `cwd` stands in a git repository. */
export function isGitRepository(cwd: string): boolean {
  return gitAnswer(cwd, ["rev-parse", "--git-dir"]) !== null;
}

/** How far back the history read can see from `cwd`. */
export function historyBoundaryOf(cwd: string): HistoryBoundary {
  if (!isGitRepository(cwd)) return { kind: "not-a-repository" };
  if (gitAnswer(cwd, ["rev-parse", "--is-shallow-repository"]) !== "true") return { kind: "complete" };
  const shallowFile = gitAnswer(cwd, ["rev-parse", "--git-path", "shallow"]) ?? "";
  const edge = readFileSync(shallowFile.startsWith("/") ? shallowFile : `${cwd}/${shallowFile}`, "utf8").split("\n")[0] ?? "";
  return { kind: "shallow", before: gitAnswer(cwd, ["rev-parse", "--short", edge]) ?? edge };
}

/** Where the walk through the patch stands: the commit, each side's file, and each side's next line. */
interface PatchPosition {
  commit?: string;
  /** Between a file's `diff --git` line and its first hunk, where `---`/`+++` name files. */
  inFileHeader: boolean;
  oldPath: string;
  newPath: string;
  oldLine: number;
  newLine: number;
}

/** The added and removed lines of `git log -p` output, each with where it stands. */
export function diffLineSightings(logOutput: string): ScnSighting[] {
  const at: PatchPosition = { inFileHeader: false, oldPath: "", newPath: "", oldLine: 0, newLine: 0 };
  const sightings: ScnSighting[] = [];
  for (const line of logOutput.split("\n")) {
    const sighting = readLine(line, at);
    if (sighting !== undefined) sightings.push(sighting);
  }
  return sightings;
}

/** Move the position past one line of output, and return the sighting it is, if it is one. */
function readLine(line: string, at: PatchPosition): ScnSighting | undefined {
  if (line.startsWith(COMMIT_MARKER)) at.commit = line.slice(COMMIT_MARKER.length);
  else if (line.startsWith("diff --git ")) at.inFileHeader = true;
  else if (at.inFileHeader) readFileHeader(line, at);
  else if (line.startsWith("-")) return sightingAt(line, at.oldPath, at.oldLine++, at.commit);
  else if (line.startsWith("+")) return sightingAt(line, at.newPath, at.newLine++, at.commit);
  else if (line.startsWith("@@ ")) readHunkHeader(line, at);
  return undefined;
}

/** A file header's lines: `---`/`+++` name the two sides, and the first hunk ends the header. */
function readFileHeader(line: string, at: PatchPosition): void {
  if (line.startsWith("--- ")) at.oldPath = pathOf(line);
  else if (line.startsWith("+++ ")) at.newPath = pathOf(line);
  else if (line.startsWith("@@ ")) {
    at.inFileHeader = false;
    readHunkHeader(line, at);
  }
}

/** The path a `---`/`+++` header names, without git's `a/`/`b/` prefix. */
function pathOf(header: string): string {
  return header.slice(4).replace(/^[ab]\//, "");
}

/** A hunk header, `@@ -<old>[,n] +<new>[,n] @@`, gives each side's first line. */
function readHunkHeader(line: string, at: PatchPosition): void {
  const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
  at.oldLine = Number(match?.[1] ?? 0);
  at.newLine = Number(match?.[2] ?? 0);
}

function sightingAt(text: string, path: string, line: number, commit: string | undefined): ScnSighting {
  return commit === undefined ? { text, path, line } : { text, path, line, commit };
}
