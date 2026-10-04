import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
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

const taken: Array<() => void> = [];

function withhold(path: string, mode: number): void {
  const before = statSync(path).mode & 0o7777;
  chmodSync(path, mode);
  taken.push(() => chmodSync(path, before));
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

function allocateFrom(cwd: string): Answered {
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
    runAllocate(["ONE"]);
  } finally {
    vi.restoreAllMocks();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
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

const asRoot = process.getuid?.() === 0;

describe("[SCN-ALC-022] a repository git cannot open is refused, never read as no repository", () => {
  it.skipIf(asRoot)("refuses ONE when its .git directory is not permitted to be read, naming the .git in git's own words", () => {
    const repo = repositoryCarryingOneCode();
    const gitEntry = join(repo, ".git");
    withhold(gitEntry, 0o000);

    expectRefusedNaming(allocateFrom(repo), gitEntry, gitsOwnRefusal(repo));
  });

  it.skipIf(asRoot)("refuses ONE when its object store is not permitted to be read, naming the .git in git's own words", () => {
    const repo = repositoryCarryingOneCode();
    withhold(join(repo, ".git", "objects"), 0o000);

    expectRefusedNaming(allocateFrom(repo), join(repo, ".git"), gitsOwnRefusal(repo));
  });

  it.skipIf(asRoot)("refuses ONE when its HEAD is not permitted to be read, naming the .git in git's own words", () => {
    const repo = repositoryCarryingOneCode();
    withhold(join(repo, ".git", "HEAD"), 0o000);

    expectRefusedNaming(allocateFrom(repo), join(repo, ".git"), gitsOwnRefusal(repo));
  });

  it("refuses ONE when its .git is a file pointing to a directory that is not there, naming the .git file", () => {
    const repo = repositoryCarryingOneCode();
    const gitEntry = join(repo, ".git");
    rmSync(gitEntry, { recursive: true });
    writeFileSync(gitEntry, `gitdir: ${join(repo, "nowhere")}\n`);

    expectRefusedNaming(allocateFrom(repo), gitEntry, gitsOwnRefusal(repo));
  });

  it.skipIf(asRoot)("refuses ONE from a directory below the top, naming the .git it found above", () => {
    const repo = repositoryCarryingOneCode();
    withhold(join(repo, ".git", "HEAD"), 0o000);
    const below = join(repo, "docs");

    expectRefusedNaming(allocateFrom(below), join(repo, ".git"), gitsOwnRefusal(below));
  });

  it("answers ONE from a directory below the top as it would from the top", () => {
    const repo = repositoryCarryingOneCode();

    const fromBelow = allocateFrom(join(repo, "docs"));
    process.exitCode = undefined;
    const fromTop = allocateFrom(repo);

    expect(fromBelow.exitCode).toBeUndefined();
    expect(fromBelow.stdout).toBe("SCN-ONE-004\n");
    expect(fromBelow).toEqual(fromTop);
  });
});
