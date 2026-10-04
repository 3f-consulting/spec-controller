import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
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

const made: string[] = [];

function freshDirectory(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  made.push(dir);
  return dir;
}

function writeInto(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function scenarioBlock(code: string, n: number): string {
  return `  @${code} @unit\n  Scenario: scenario ${n}\n    Given a step\n`;
}

function repositoryWhoseHistoryOnceCarried(live: string, retired: string): string {
  const repo = freshDirectory("allocate-boundary-");
  git(repo, ["init", "-q", "-b", "main"]);
  const feature = join(repo, "features", "one.feature");
  writeInto(repo, "features/one.feature", `@ONE\nFeature: part ONE\n\n${scenarioBlock(live, 1)}\n${scenarioBlock(retired, 5)}`);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  writeFileSync(feature, readFileSync(feature, "utf8").split("\n\n").filter((block) => !block.includes(`@${retired} `)).join("\n\n"));
  git(repo, ["commit", "-q", "-a", "-m", "retire a scenario"]);
  return repo;
}

function copyWithoutGit(repo: string, mentioned: string): string {
  const copy = freshDirectory("allocate-copy-");
  cpSync(repo, copy, { recursive: true, filter: (source) => basename(source) !== ".git" });
  writeInto(copy, "node_modules/some-package/README.md", `Cites ${mentioned}.\n`);
  writeInto(copy, ".hidden/notes.md", `Cites ${mentioned}.\n`);
  return copy;
}

function cloneOneCommitDeep(repo: string): string {
  const clone = join(freshDirectory("allocate-clone-"), "clone");
  git(repo, ["clone", "-q", "--depth", "1", `file://${repo}`, clone]);
  return clone;
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

describe("[SCN-ALC-004] With no history to read, a code is still offered and the boundary is stated on stderr", () => {
  let repo = "";

  beforeAll(() => {
    repo = repositoryWhoseHistoryOnceCarried("SCN-ONE-001", "SCN-ONE-005");
  });

  it("in a copy without git, whose packages and hidden directories mention SCN-ONE-900, answers SCN-ONE-002 and states no history was read", () => {
    const copy = copyWithoutGit(repo, "SCN-ONE-900");
    expect(spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy }).status).not.toBe(0);

    const answered = allocateIn(copy, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-002\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(
      "history: not a git repository — none read; a code above SCN-ONE-001 may have been used before\n" +
        "highest seen: SCN-ONE-001, features/one.feature:4\n",
    );
  });

  it("in a clone one commit deep, answers SCN-ONE-002 and states history before the clone's first commit was not read", () => {
    const clone = cloneOneCommitDeep(repo);
    expect(git(clone, ["rev-list", "--count", "HEAD"]).trim()).toBe("1");
    const edge = git(clone, ["rev-parse", "--short", "HEAD"]).trim();

    const answered = allocateIn(clone, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-002\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr.split("\n")[0]).toBe(
      `history: shallow clone — history before ${edge} unread; a code above SCN-ONE-001 may have been used before`,
    );
  });
});
