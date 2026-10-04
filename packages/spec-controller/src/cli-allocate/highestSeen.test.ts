import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
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

function writeInto(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const made: string[] = [];

function newRepository(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-highest-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

function commitAll(repo: string, message: string): string {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
  return git(repo, ["log", "-1", "--format=%h"]).trim();
}

function lines(...texts: string[]): string {
  return texts.map((text) => `${text}\n`).join("");
}

const HEAD = ["@ONE", "Feature: part ONE"];
const SCENARIO_1 = ["  @SCN-ONE-001 @unit", "  Scenario: scenario 1", "    Given a step", ""];
const PADDING = ["# a", "# b", "# c", "# d"];
const SCENARIO_3 = ["  @SCN-ONE-003 @unit", "  Scenario: scenario 3", "    Given a step", "    And a step", "    And a step"];
const SCENARIO_5 = ["  @SCN-ONE-005 @unit", "  Scenario: scenario 5", "    Given a step", "    And a step", "    And a step"];

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
  runAllocate(argv);
  const exitCode = process.exitCode;
  vi.restoreAllMocks();
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  it("still carried by its feature file, names the file and line that carry it", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1, ...PADDING, ...SCENARIO_5));
    commitAll(repo, "the corpus");

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-006\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe("highest seen: SCN-ONE-005, features/one.feature:11\n");
  });

  it("deleted by a later commit, names the file and line that carried it, and the commit that did so", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...HEAD, "# kept until the retiring commit", ...SCENARIO_1, ...PADDING, ...SCENARIO_3, ...SCENARIO_5));
    commitAll(repo, "the corpus");
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1, ...PADDING));
    const retiring = commitAll(repo, "retire scenarios 3 and 5");
    expect(git(repo, ["show", "--format=", "-U0", retiring]).match(/^@@ .*$/gm)).toEqual(["@@ -3 +2,0 @@ Feature: part ONE", "@@ -12,10 +10,0 @@ Feature: part ONE"]);

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-006\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(`highest seen: SCN-ONE-005, features/one.feature:17 in ${retiring}\n`);
  });

  it("deleted by a later commit in a repository whose patches name paths without a/ and b/, names the path as the tree had it", () => {
    const repo = newRepository();
    git(repo, ["config", "diff.noprefix", "true"]);
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1));
    writeInto(repo, "notes/data/retired.md", lines("SCN-ONE-005 is parked here"));
    commitAll(repo, "the corpus");
    rmSync(join(repo, "notes"), { recursive: true });
    const retiring = commitAll(repo, "retire the note");
    expect(git(repo, ["show", "--format=", retiring])).toContain("--- notes/data/retired.md\n");

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-006\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(`highest seen: SCN-ONE-005, notes/data/retired.md:1 in ${retiring}\n`);
  });
});
