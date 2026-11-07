import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { taken, withhold, runsAsRoot, repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateFrom } from "./answered.test-utils.js";
import type { Answered } from "./answered.test-utils.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";

function repositoryCarryingOneCode(): string {
  return repositoryHeadedOneCarrying003("allocate-unopenable-repository-", { "docs/readme.md": "a directory below the top\n" });
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function gitsOwnRefusal(cwd: string): { status: number | null; said: string } {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
  expect(result.status).not.toBe(0);
  return { status: result.status, said: result.stderr.split("\n")[0] ?? "" };
}

function expectRefusedNaming(answered: Answered, gitEntry: string, git: { status: number | null; said: string }): void {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  expect(git.said).toMatch(/\S/);
  const reason = message(AppMessage.GitExited, { command: "rev-parse", status: String(git.status), said: git.said });
  expect(answered.stderr).toContain(message(AppError.CouldNotBeRead, { subject: message(AppMessage.Repository), path: gitEntry, reason }));
}

describe("[CLM-ALC-022] a repository git cannot open is refused, never read as no repository", () => {
  it("refuses ONE when its .git directory is not permitted to be read, naming the .git in git's own words", ({ skip }) => {
    skip(runsAsRoot());
    const repo = repositoryCarryingOneCode();
    const gitEntry = join(repo, ".git");
    withhold(gitEntry, 0o000);

    expectRefusedNaming(allocateFrom(repo), gitEntry, gitsOwnRefusal(repo));
  });

  it("refuses ONE from a directory below the top, naming the .git it found above", ({ skip }) => {
    skip(runsAsRoot());
    const repo = repositoryCarryingOneCode();
    withhold(join(repo, ".git", "HEAD"), 0o000);
    const below = join(repo, "docs");

    expectRefusedNaming(allocateFrom(below), join(repo, ".git"), gitsOwnRefusal(below));
  });
});
