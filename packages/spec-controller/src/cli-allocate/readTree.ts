/**
 * The tree half of the allocator's read: every line of every text file that mentions the part.
 *
 * In a repository, git says which files are the tree and allocate reads each of them itself. Git
 * skips a file or directory it cannot read and still exits 0, so a code carried only there would be
 * handed out again; reading the files here, and listing every directory git had to list, turns each
 * such path into a refusal instead. Which words on a line are scenario codes is core's question,
 * answered with the shared grammar.
 */
import { spawnSync } from "node:child_process";
import { accessSync, constants, lstatSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ScnSighting } from "@3f-consulting/spec-controller-core";
import { readOrRefuse, refuse, UnreadableInput } from "./unreadable.js";

/** Git's listing can be large on a big repository; the default buffer would truncate it. */
const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

/** How far into a file git looks for a NUL before it calls the file binary and searches none of it. */
const BINARY_PROBE_BYTES = 8000;

/**
 * Every line in the repository's tree carrying `SCN-<part>-`, with its path from `top`. The tree is
 * what git lists: tracked files, and untracked files the repository does not ignore, since an author
 * allocates because they have just written a scenario, and it is not committed yet.
 */
export function readTree(top: string, part: string): ScnSighting[] {
  const listed = gitListing(top, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  const ignored = gitListing(top, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory"]);
  proveListable(top, "", new Set(ignored.filter(isDirectoryEntry).map((entry) => entry.slice(0, -1))));
  return listed.filter((entry) => !isDirectoryEntry(entry)).flatMap((path) => sightingsInListed(top, path, `SCN-${part}-`));
}

/** The paths a `git ls-files -z` run lists, or the refusal when git could not list them. */
function gitListing(top: string, args: readonly string[]): string[] {
  const result = spawnSync("git", args, { cwd: top, encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES });
  if (result.error !== undefined) refuse("the tree", top, result.error);
  if (result.status !== 0) {
    const said = result.stderr.split("\n")[0] ?? "";
    throw new UnreadableInput("the tree", top, `git ls-files exited ${result.status}: ${said}`);
  }
  return result.stdout.split("\0").filter((entry) => entry !== "");
}

/** A listed directory rather than a file: a repository nested in the tree, or a wholly ignored one. */
function isDirectoryEntry(entry: string): boolean {
  return entry.endsWith("/");
}

/**
 * Every directory git had to list to answer, listed and entered here too, so one it could not list
 * is refused rather than skipped. Ignored directories and nested repositories are not the tree.
 */
function proveListable(top: string, dir: string, ignored: ReadonlySet<string>): void {
  const path = dir === "" ? top : join(top, dir);
  const entries = readOrRefuse("a directory in the tree", path, () => listedAndEntered(path));
  if (dir !== "" && entries.some((entry) => entry.name === ".git")) return;
  for (const entry of entries) {
    const child = dir === "" ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory() && entry.name !== ".git" && !ignored.has(child)) proveListable(top, child, ignored);
  }
}

/** A directory's entries, when it may be both listed and entered. */
function listedAndEntered(path: string): Dirent[] {
  accessSync(path, constants.R_OK | constants.X_OK);
  return readdirSync(path, { withFileTypes: true });
}

/** The sightings in one file git lists: none when it has left the working tree or is not a file. */
function sightingsInListed(top: string, path: string, needle: string): ScnSighting[] {
  const file = join(top, path);
  const kind = readOrRefuse("a file in the tree", file, () => lstatSync(file, { throwIfNoEntry: false }));
  if (kind === undefined || !kind.isFile()) return [];
  return linesCarrying(path, readOrRefuse("a file in the tree", file, () => readFileSync(file)), needle);
}

/** The lines of a file's content that carry `needle`; a binary file, by git's rule, carries none. */
function linesCarrying(path: string, content: Buffer, needle: string): ScnSighting[] {
  if (content.subarray(0, BINARY_PROBE_BYTES).includes(0)) return [];
  return content
    .toString("utf8")
    .split("\n")
    .flatMap((line, i) => (line.includes(needle) ? [{ path, line: i + 1, text: line }] : []));
}

/**
 * Whether a walk without git enters a directory: never a package store, never a hidden directory.
 * An installed package carries its own codes (spec-controller's own dist carries hundreds), which
 * would retire a consumer's numbers with a package's.
 */
export function isWalkedDirectory(name: string): boolean {
  return name !== "node_modules" && !name.startsWith(".");
}

/** Every line carrying `SCN-<part>-` in the text files under `root`, found by walking it without git. */
export function walkTree(root: string, part: string): ScnSighting[] {
  return filesUnder(root).flatMap((file) => {
    const content = readOrRefuse("a file in the tree", file, () => readFileSync(file));
    return linesCarrying(relative(root, file).split(sep).join("/"), content, `SCN-${part}-`);
  });
}

/** Every file under `dir`, entering only the directories a walk enters; a refusal for one it cannot list. */
function filesUnder(dir: string): string[] {
  const entries = readOrRefuse("a directory in the tree", dir, () => readdirSync(dir, { withFileTypes: true }));
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return isWalkedDirectory(entry.name) ? filesUnder(path) : [];
    return entry.isFile() ? [path] : [];
  });
}
