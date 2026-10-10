import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runAllocate } from "./cli.js";
import { git, writeInto, commitAll, made, freshDirectory } from "./repository.testkit.js";

function headedOneCarrying003(): string {
  const repo = freshDirectory("allocate-not-the-kind-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
  commitAll(repo, "the corpus");
  return repo;
}

interface WrongKind {
  path: string;
  kind: string;
  make: (at: string) => void;
  subject: string;
  reason: RegExp;
}

function replaceWithARegularFile(at: string): void {
  rmSync(at, { recursive: true, force: true });
  writeFileSync(at, "not a directory\n");
}

function makeADirectory(at: string): void {
  mkdirSync(at);
}

function linkToAFileNotThere(at: string): void {
  symlinkSync(join(dirname(at), "nowhere.feature"), at);
}

const WRONG_KINDS: readonly WrongKind[] = [
  {
    path: "features",
    kind: "a regular file",
    make: replaceWithARegularFile,
    subject: "the feature corpus",
    reason: /^ENOTDIR: /,
  },
  {
    path: "features/two.feature",
    kind: "a directory",
    make: makeADirectory,
    subject: "a feature file",
    reason: /^EISDIR: /,
  },
  {
    path: "features/two.feature",
    kind: "a link to a file that is not there",
    make: linkToAFileNotThere,
    subject: "a feature file",
    reason: /^ENOENT: /,
  },
];

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
  thrown: unknown;
}

function allocateWith(cwd: () => string, argv: string[]): Answered {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockImplementation(cwd);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  let thrown: unknown;
  try {
    runAllocate(argv);
  } catch (err) {
    thrown = err;
  }
  const exitCode = process.exitCode;
  vi.restoreAllMocks();
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode, thrown };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-017] a path allocate reads that is not the kind it reads is refused, naming the path", () => {
  it.each(WRONG_KINDS)("refuses ONE at the usage status, naming $path, where it is $kind", ({ path, make, subject, reason }) => {
    const repo = headedOneCarrying003();
    make(join(repo, path));

    const answered = allocateWith(() => repo, ["ONE"]);

    expect(answered.thrown).toBeUndefined();
    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    const opening = `spec-controller allocate: usage error — ${subject} could not be read: ${join(repo, path)} (`;
    expect(answered.stderr.startsWith(opening)).toBe(true);
    expect(answered.stderr.endsWith(")\n")).toBe(true);
    expect(answered.stderr.split("\n")).toHaveLength(2);
    expect(answered.stderr.slice(opening.length, -2)).toMatch(reason);
  });

  it("refuses nothing, and gives no code, when what fails is not a path it reads", () => {
    const fault = new Error("not a fault reading any path");

    const answered = allocateWith(() => {
      throw fault;
    }, ["ONE"]);

    expect(answered.thrown).toBe(fault);
    expect(answered.stdout).toBe("");
    expect(answered.stderr).toBe("");
    expect(answered.exitCode).toBeUndefined();
  });
});
