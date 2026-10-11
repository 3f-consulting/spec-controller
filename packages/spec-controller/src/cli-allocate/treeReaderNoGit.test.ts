import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTree } from "./readTree.js";
import { thrownBy } from "./answered.test-utils.js";

function git(cwd: string, args: readonly string[]): void {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

const made: string[] = [];

function temporaryDirectory(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "allocate-tree-no-git-")));
  made.push(dir);
  return dir;
}

function repositoryWithACode(): string {
  const repo = temporaryDirectory();
  git(repo, ["init", "-q"]);
  writeFileSync(join(repo, "one.feature"), "  @SCN-ONE-001 @unit\n  Scenario: one\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "one"]);
  return repo;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-020] a file in the repository git cannot read is refused, never left out of the answer", () => {
  it("refuses the tree, naming git, when there is no git to ask", () => {
    const repo = repositoryWithACode();
    vi.stubEnv("PATH", temporaryDirectory());

    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", subject: "the tree", path: "git" });
  });
});
