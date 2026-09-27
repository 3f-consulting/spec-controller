/**
 * The refs the history read starts from, proved readable before git is asked for the history.
 *
 * Git walks history from every ref, and a ref store it cannot read is not an error to git: with
 * `refs/heads` unreadable, `git log --all` exits 0, writes nothing to stderr, and simply walks from
 * fewer refs, so a deleted code only an unread branch reaches would be handed out again. Reading the
 * store here is the only way that case is ever seen. It reads, and never interprets: whether the
 * store is loose files, `packed-refs` or a reftable, every one of them git would read is read here.
 */
import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readOrRefuse } from "./unreadable.js";

/** Where each ref store lives under a git directory, whichever format the repository keeps. */
const REF_STORES = ["refs", "packed-refs", "reftable"] as const;

/** Refuse, as history allocate cannot read, a ref store under the repository at `cwd` it may not read. */
export function proveRefsReadable(cwd: string): void {
  for (const gitDir of gitDirsOf(cwd)) {
    for (const store of REF_STORES) readEveryEntry(join(gitDir, store));
  }
}

/** The repository's common git directory and its own, which differ only in a linked worktree. */
function gitDirsOf(cwd: string): string[] {
  const result = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir", "--git-dir"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) return [];
  return [...new Set(result.stdout.split("\n").filter((line) => line !== ""))];
}

/** Read `path` whole: a file's content, or every entry under a directory; nothing when it is not there. */
function readEveryEntry(path: string): void {
  const kind = readOrRefuse("the repository's history", path, () => lstatSync(path, { throwIfNoEntry: false }));
  if (kind === undefined) return;
  if (kind.isDirectory()) {
    const names = readOrRefuse("the repository's history", path, () => readdirSync(path));
    for (const name of names) readEveryEntry(join(path, name));
  } else if (kind.isFile()) {
    readOrRefuse("the repository's history", path, () => readFileSync(path));
  }
}
