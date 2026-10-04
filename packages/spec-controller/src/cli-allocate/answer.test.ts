import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAllocate } from "./cli.js";

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

const made: string[] = [];

function repositoryHeaded(part: string, code: string): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-answer-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features", `${part.toLowerCase()}.feature`), `@${part}\nFeature: part ${part}\n\n  @${code} @unit\n  Scenario: scenario 1\n    Given a step\n`);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
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

describe("[SCN-ALC-008] The code is printed alone on stdout, zero-padded to three digits", () => {
  let repo = "";

  beforeAll(() => {
    repo = repositoryHeaded("ONE", "SCN-ONE-7");
  });

  it("answers SCN-ONE-008 alone on stdout and succeeds", () => {
    const answered = allocateIn(repo, ["ONE"]);
    expect(answered.stdout).toBe("SCN-ONE-008\n");
    expect(answered.exitCode).toBeUndefined();
  });

  it("names on stderr where the highest code was seen, and nothing more", () => {
    const answered = allocateIn(repo, ["ONE"]);
    expect(answered.stderr).toBe("highest seen: SCN-ONE-7, features/one.feature:4\n");
  });
});
