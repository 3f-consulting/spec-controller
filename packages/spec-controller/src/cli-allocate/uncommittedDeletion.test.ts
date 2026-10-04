import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-uncommitted-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
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
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-001] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("answers one past the deleted code when the file that carried it is deleted from the working copy but not yet committed", () => {
    const repo = newRepository();
    const retired = "features/retired.feature";
    writeInto(repo, "features/one.feature", lines("@ONE", "Feature: part ONE", "  @SCN-ONE-001 @unit", "  Scenario: scenario 1"));
    writeInto(repo, retired, lines("@ONE", "Feature: part ONE, retired", "  @SCN-ONE-005 @unit", "  Scenario: scenario 5"));
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-q", "-m", "the corpus"]);
    rmSync(join(repo, retired));
    expect(existsSync(join(repo, retired))).toBe(false);
    expect(git(repo, ["ls-files", "--cached"])).toBe(`features/one.feature\n${retired}\n`);

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-006\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).not.toContain("spec-controller allocate:");
    expect(answered.stderr).toMatch(/^highest seen: SCN-ONE-005, features\/retired\.feature:/);
  });
});
