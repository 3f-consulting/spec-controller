import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runAllocate } from "./cli.js";

function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

const repositories: string[] = [];

function newRepository(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-added-")));
  repositories.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

function writeInto(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function commitAll(repo: string, message: string): string {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
  return git(repo, ["log", "-1", "--format=%h"]).trim();
}

function lines(...texts: string[]): string {
  return texts.map((text) => `${text}\n`).join("");
}

// Ten lines, so a line appended after them starts the patch's new side at a two-digit line.
const CORPUS = [
  "@ONE",
  "Feature: part ONE",
  "  @SCN-ONE-001 @unit",
  "  Scenario: scenario 1",
  "    Given a step",
  "",
  "  @SCN-ONE-002 @unit",
  "  Scenario: scenario 2",
  "    Given a step",
  "    And a step",
];

/** Commits `branchContent` on a branch never merged into main, then returns to main: only `git log --all` sees it. */
function commitOnUnmergedBranch(repo: string, path: string, branchContent: string): string {
  git(repo, ["switch", "-q", "-c", "unmerged"]);
  writeInto(repo, path, branchContent);
  const commit = commitAll(repo, "an unmerged scenario");
  git(repo, ["switch", "-q", "main"]);
  return commit;
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

function allocateIn(cwd: string, argv: string[]): Answered {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  try {
    runAllocate(argv);
  } finally {
    vi.restoreAllMocks();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  for (const repo of repositories.splice(0)) rmSync(repo, { recursive: true, force: true });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  it("added only on an unmerged branch, below another added line, names the line it was added at and the commit that added it", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...CORPUS));
    commitAll(repo, "the corpus");
    const adding = commitOnUnmergedBranch(repo, "features/one.feature", lines(...CORPUS, "", "  @SCN-ONE-007 @unit", "  Scenario: scenario 7"));
    expect(git(repo, ["show", "--format=", "-U0", adding]).match(/^@@ .*$/gm)).toEqual(["@@ -10,0 +11,3 @@ Feature: part ONE"]);

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-008\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(`highest seen: SCN-ONE-007, features/one.feature:12 in ${adding}\n`);
  });

  it("added only on an unmerged branch to a file that ended without a newline, still names the line it was added at", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...CORPUS).slice(0, -1));
    commitAll(repo, "the corpus, no final newline");
    const adding = commitOnUnmergedBranch(repo, "features/one.feature", lines(...CORPUS, "  @SCN-ONE-007 @unit"));
    expect(git(repo, ["show", "--format=", "-U0", adding])).toContain(
      "@@ -10 +10,2 @@ Feature: part ONE\n-    And a step\n\\ No newline at end of file\n+    And a step\n+  @SCN-ONE-007 @unit\n",
    );

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-008\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(`highest seen: SCN-ONE-007, features/one.feature:11 in ${adding}\n`);
  });
});
