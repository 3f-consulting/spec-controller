import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateRecording, refusalReason } from "./answered.test-utils.js";

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

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("[SCN-ALC-017] a path allocate reads that is not the kind it reads is refused, naming the path", () => {
  it.each(WRONG_KINDS)("refuses ONE at the usage status, naming $path, where it is $kind", ({ path, make, subject, reason }) => {
    const repo = repositoryHeadedOneCarrying003("allocate-not-the-kind-");
    make(join(repo, path));

    const answered = allocateRecording(() => repo, ["ONE"]);

    expect(answered.thrown).toBeUndefined();
    expect(refusalReason(answered, subject, join(repo, path))).toMatch(reason);
  });

  it("refuses nothing, and gives no code, when what fails is not a path it reads", () => {
    const fault = new Error("not a fault reading any path");

    const answered = allocateRecording(() => {
      throw fault;
    }, ["ONE"]);

    expect(answered.thrown).toBe(fault);
    expect(answered.stdout).toBe("");
    expect(answered.stderr).toBe("");
    expect(answered.exitCode).toBeUndefined();
  });
});
