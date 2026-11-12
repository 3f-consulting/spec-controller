import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

export function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

// What git itself says when it cannot open the repository, as the allocate refusal quotes it.
export function gitsOwnRefusal(cwd: string): { status: number | null; said: string } {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
  return { status: result.status, said: result.stderr.split("\n")[0] ?? "" };
}

export function writeInto(root: string, path: string, content: string | Buffer): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

export function commitAll(repo: string, message: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
}

export function commitAllReturningHash(repo: string, message: string): string {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
  return git(repo, ["log", "-1", "--format=%h"]).trim();
}

const HEADED_ONE_CARRYING_003 = "@ONE\nFeature: feature code ONE\n\n  @CLM-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n";

export function repositoryHeadedOneCarrying003(prefix: string, files: Readonly<Record<string, string>> = {}): string {
  const repo = freshDirectory(prefix);
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", HEADED_ONE_CARRYING_003);
  for (const [path, content] of Object.entries(files)) writeInto(repo, path, content);
  commitAll(repo, "the corpus");
  return repo;
}

export function freshDirectory(prefix: string): string {
  return realpathSync(temporaryDirectory(prefix));
}

// The test file that withholds modes here restores them in its own hook.
export const taken: Array<() => void> = [];

export function withhold(path: string, mode: number): void {
  const before = statSync(path).mode & 0o7777;
  chmodSync(path, mode);
  taken.push(() => chmodSync(path, before));
}

export const runsAsRoot = (): boolean => process.getuid?.() === 0;
