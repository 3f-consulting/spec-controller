import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readOrRefuse } from "./unreadable.js";

const REF_STORES = ["refs", "packed-refs", "reftable"] as const;

export function proveRefsReadable(cwd: string): void {
  for (const gitDir of gitDirsOf(cwd)) {
    for (const store of REF_STORES) readEveryEntry(join(gitDir, store));
  }
}

function gitDirsOf(cwd: string): string[] {
  const result = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir", "--git-dir"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) return [];
  return [...new Set(result.stdout.split("\n").filter((line) => line !== ""))];
}

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
