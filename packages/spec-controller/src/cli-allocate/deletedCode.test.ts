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
    maxBuffer: 64 * 1024 * 1024,
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
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-deleted-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

function commitAll(repo: string, message: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
}

function lines(...texts: string[]): string {
  return texts.map((text) => `${text}\n`).join("");
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

const HEAD = ["@ONE", "Feature: part ONE"];
const SCENARIO_1 = ["  @SCN-ONE-001 @unit", "  Scenario: scenario 1", "    Given a step", ""];
const LONG_STEPS = Array.from({ length: 200 }, (_, n) => `    And step ${n} of the scenario that SCN-ONE-005 once named`);
const SCENARIO_5 = ["  @SCN-ONE-005 @unit", "  Scenario: scenario 5", "    Given a step", ...LONG_STEPS];

describe("[SCN-ALC-001] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("answers one past the deleted code when the history that carries it runs to many kilobytes", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1, ...SCENARIO_5));
    commitAll(repo, "the corpus");
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1));
    commitAll(repo, "retire scenario 5");
    expect(git(repo, ["log", "--all", "-p", "-U0", "-G", "SCN-ONE-"]).length).toBeGreaterThan(16 * 1024);

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-006\n");
    expect(answered.exitCode).toBeUndefined();
  });
});
