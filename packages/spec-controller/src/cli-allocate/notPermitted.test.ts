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

function freshDirectory(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  made.push(dir);
  return dir;
}

const HEADED_ONE_CARRYING_003 = "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n";

function repository(): string {
  const repo = freshDirectory("allocate-not-permitted-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", HEADED_ONE_CARRYING_003);
  writeInto(repo, "docs/deep/notes.md", "Cites SCN-ONE-002.\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

function copyWithoutGit(): string {
  const copy = freshDirectory("allocate-not-permitted-plain-");
  writeInto(copy, "features/one.feature", HEADED_ONE_CARRYING_003);
  writeInto(copy, "docs/notes.md", "Cites SCN-ONE-002.\n");
  return copy;
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

function expectRefusedNaming(answered: Answered, subject: string, path: string): void {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  const opening = `spec-controller allocate: usage error — ${subject} could not be read: ${path} (`;
  expect(answered.stderr.startsWith(opening)).toBe(true);
  expect(answered.stderr.endsWith(")\n")).toBe(true);
  expect(answered.stderr.split("\n")).toHaveLength(2);
  expect(answered.stderr.slice(opening.length, -2)).toMatch(/^(EACCES|EPERM): /);
}

function expectAnsweredWith(answered: Answered, code: string): void {
  expect(answered.exitCode).toBeUndefined();
  expect(answered.stderr).not.toContain("usage error");
  expect(answered.stdout).toBe(`${code}\n`);
}

interface Withheld {
  copy: "repository" | "copy without git";
  path: string;
  subject: string;
}

const EXAMPLES: readonly Withheld[] = [
  { copy: "repository", path: "features/one.feature", subject: "a feature file" },
  { copy: "repository", path: "features", subject: "the feature corpus" },
  { copy: "copy without git", path: "docs/notes.md", subject: "a file in the tree" },
  { copy: "copy without git", path: "docs", subject: "a directory in the tree" },
];

const asRoot = process.getuid?.() === 0;

describe.skipIf(asRoot)("[SCN-ALC-018] a path allocate is not permitted to read is refused, naming the path and saying it was not permitted", () => {
  it.each(EXAMPLES)("refuses ONE in a $copy whose $path it may not read, naming it", ({ copy, path, subject }) => {
    const root = copy === "repository" ? repository() : copyWithoutGit();
    withhold(join(root, path), 0o000);

    expectRefusedNaming(allocateFrom(root), subject, join(root, path));
  });

  // On macOS, git resolving a working directory it may not list scans every ancestor, so a crowded temporary directory can take seconds.
  it("refuses ONE in a copy without git whose working directory it may enter but not list, naming it", () => {
    const copy = copyWithoutGit();
    withhold(copy, 0o311);

    expectRefusedNaming(allocateFrom(copy), "a directory in the tree", copy);
  }, 30_000);

  it.each(["docs", "docs/deep"])("refuses ONE in a repository whose directory %s it may not enter, naming it", (dir) => {
    const repo = repository();
    withhold(join(repo, dir), 0o000);

    expectRefusedNaming(allocateFrom(repo), "a directory in the tree", join(repo, dir));
  });

  it("refuses a directory git does not ignore, though an ignored file is named as it is with one character more", () => {
    const repo = repository();
    writeInto(repo, ".gitignore", "*~\n");
    writeInto(repo, "docs~", "a backup\n");
    withhold(join(repo, "docs"), 0o000);

    expectRefusedNaming(allocateFrom(repo), "a directory in the tree", join(repo, "docs"));
  });

  it("answers ONE, refusing nothing, when the directory it may not enter is one git ignores", () => {
    const repo = repository();
    writeInto(repo, ".gitignore", "build/\n");
    writeInto(repo, "build/out.md", "Cites SCN-ONE-900.\n");
    withhold(join(repo, "build"), 0o000);

    expectAnsweredWith(allocateFrom(repo), "SCN-ONE-004");
  });

  it("answers ONE, refusing nothing, when the directory it may not enter lies in a repository nested in the tree", () => {
    const repo = repository();
    writeInto(repo, "vendor/inner/withheld/notes.md", "Cites SCN-ONE-900.\n");
    git(join(repo, "vendor", "inner"), ["init", "-q"]);
    withhold(join(repo, "vendor", "inner", "withheld"), 0o000);

    expectAnsweredWith(allocateFrom(repo), "SCN-ONE-004");
  });

  it("answers ONE, refusing nothing, when the directory it may not enter lies in git's own store", () => {
    const repo = repository();
    mkdirSync(join(repo, ".git", "withheld"));
    withhold(join(repo, ".git", "withheld"), 0o000);

    expectAnsweredWith(allocateFrom(repo), "SCN-ONE-004");
  });
});
