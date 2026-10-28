import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readTree } from "./readTree.js";
import { thrownBy } from "./answered.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function git(cwd: string, args: readonly string[]): void {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

function resolvedTemporaryDirectory(): string {
  return realpathSync(temporaryDirectory("allocate-tree-no-git-"));
}

function repositoryWithACode(): string {
  const repo = resolvedTemporaryDirectory();
  git(repo, ["init", "-q"]);
  writeFileSync(join(repo, "one.feature"), "  @SCN-ONE-001 @unit\n  Scenario: one\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "one"]);
  return repo;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("[SCN-ALC-020] a file in the repository git cannot read is refused, never left out of the answer", () => {
  it("refuses the tree, naming git, when there is no git to ask", () => {
    const repo = repositoryWithACode();
    vi.stubEnv("PATH", resolvedTemporaryDirectory());

    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", subject: "the tree", path: "git" });
  });
});
