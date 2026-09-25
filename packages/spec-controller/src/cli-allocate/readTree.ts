/**
 * The tree half of the allocator's read: every line of every text file that mentions the part.
 *
 * Git is handed a fixed string only. Which words on those lines are scenario codes is core's
 * question, answered with the shared grammar, because git's own regex dialect has no `\d` and
 * matches nothing when given one, silently.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ScnSighting } from "@3f-consulting/spec-controller-core";

/** Git's output can be large on a big repository; the default buffer would truncate it. */
const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

/**
 * Every line in the whole repository's tree carrying `SCN-<part>-`, with its path from the top, wherever
 * in the repository it is asked from: `:/` is the top, since git grep otherwise reads only the cwd's subtree.
 * Untracked files the repository does not ignore count too: an author allocates because they have just
 * written a scenario, and it is not committed yet.
 */
export function readTree(cwd: string, part: string): ScnSighting[] {
  const result = spawnSync("git", ["grep", "-z", "-n", "-I", "--full-name", "--untracked", "-F", "-e", `SCN-${part}-`, "--", ":/"], {
    cwd,
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  return result.stdout.split("\n").flatMap(sightingOf);
}

/** One `path\0line\0text` record of `git grep -z -n`, or nothing for a blank line. */
function sightingOf(record: string): ScnSighting[] {
  const [path, line, text] = record.split("\0");
  if (path === undefined || line === undefined || text === undefined) return [];
  return [{ path, line: Number(line), text }];
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
  return filesUnder(root).flatMap((file) => sightingsIn(root, file, `SCN-${part}-`));
}

/** Every file under `dir`, entering only the directories a walk enters. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return isWalkedDirectory(entry.name) ? filesUnder(path) : [];
    return entry.isFile() ? [path] : [];
  });
}

/** The lines of a text file that carry `needle`; a binary file carries none. */
function sightingsIn(root: string, file: string, needle: string): ScnSighting[] {
  const text = readFileSync(file, "utf8");
  if (text.includes("\0")) return [];
  const path = relative(root, file).split(sep).join("/");
  return text.split("\n").flatMap((line, i) => (line.includes(needle) ? [{ path, line: i + 1, text: line }] : []));
}
