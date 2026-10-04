import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { runAllocate } from "./cli.js";

const created: string[] = [];

function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

function freshDirectory(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  created.push(dir);
  return dir;
}

function writeInto(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function scenarioBlock(code: string, n: number): string {
  return `  @${code} @unit\n  Scenario: scenario ${n}\n    Given a step\n`;
}

function corpusCarrying(code: string): string {
  return `@ONE\nFeature: part ONE\n\n${scenarioBlock(code, 1)}`;
}

function copyWithoutGitLinkingTo(target: string): string {
  const copy = freshDirectory("allocate-linked-copy-");
  writeInto(copy, "features/one.feature", corpusCarrying("SCN-ONE-001"));
  symlinkSync(target, join(copy, "features", "elsewhere.feature"));
  return copy;
}

function linkedWorktreeOfShallowClone(): string {
  const repo = freshDirectory("allocate-worktree-origin-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", corpusCarrying("SCN-ONE-001"));
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  writeInto(repo, "features/one.feature", `${readFileSync(join(repo, "features/one.feature"), "utf8")}\n`);
  git(repo, ["commit", "-q", "-a", "-m", "a later commit"]);
  const home = freshDirectory("allocate-worktree-");
  const clone = join(home, "clone");
  git(repo, ["clone", "-q", "--depth", "1", `file://${repo}`, clone]);
  const worktree = join(home, "worktree");
  git(clone, ["worktree", "add", "-q", worktree]);
  return worktree;
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
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-004] With no history to read, a code is still offered and the boundary is stated on stderr", () => {
  it("in a copy without git holding a symlink to a file that mentions SCN-ONE-900, answers SCN-ONE-002 and states no history was read", () => {
    const outside = freshDirectory("allocate-link-target-");
    writeInto(outside, "far.feature", corpusCarrying("SCN-ONE-900"));
    const copy = copyWithoutGitLinkingTo(join(outside, "far.feature"));
    expect(spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy }).status).not.toBe(0);

    const answered = allocateIn(copy, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-002\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(
      "history: not a git repository — none read; a code above SCN-ONE-001 may have been used before\n" +
        "highest seen: SCN-ONE-001, features/one.feature:4\n",
    );
  });

  it("in a linked worktree of a clone one commit deep, where git names the shallow record by absolute path, states history before the clone's first commit was not read", () => {
    const worktree = linkedWorktreeOfShallowClone();
    expect(git(worktree, ["rev-parse", "--is-shallow-repository"]).trim()).toBe("true");
    expect(isAbsolute(git(worktree, ["rev-parse", "--git-path", "shallow"]).trim())).toBe(true);
    const edge = git(worktree, ["rev-parse", "--short", "HEAD"]).trim();

    const answered = allocateIn(worktree, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-002\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr.split("\n")[0]).toBe(
      `history: shallow clone — history before ${edge} unread; a code above SCN-ONE-001 may have been used before`,
    );
  });
});
