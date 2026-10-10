import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, writeInto, taken, withhold } from "./repository.testkit.js";
import { allocateFrom } from "./answered.testkit.js";
import type { Answered } from "./answered.testkit.js";

const made: string[] = [];

function temporaryDirectory(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "allocate-unopenable-repository-")));
  made.push(dir);
  return dir;
}

function repositoryCarryingOneCode(): string {
  const repo = temporaryDirectory();
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario SCN-ONE-003\n    Given a step\n");
  writeInto(repo, "docs/readme.md", "a directory below the top\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  while (made.length > 0) rmSync(made.pop() ?? "", { recursive: true, force: true });
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
  expect(answered.stderr).toBe(
    `spec-controller allocate: usage error — the repository could not be read: ${gitEntry} (git rev-parse exited ${git.status}: ${git.said})\n`,
  );
}

const runsAsRoot = (): boolean => process.getuid?.() === 0;

describe("[SCN-ALC-022] a repository git cannot open is refused, never read as no repository", () => {
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
