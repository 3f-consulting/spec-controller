import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { git, writeInto, freshDirectory, taken, withhold, runsAsRoot } from "./repository.test-utils.js";
import { allocateFrom, expectAnsweredWith } from "./answered.test-utils.js";
import type { Answered } from "./answered.test-utils.js";

const HEADED_ONE_CARRYING_003 = "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n";

function repository(): string {
  const repo = freshDirectory("allocate-not-permitted-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", HEADED_ONE_CARRYING_003);
  writeInto(repo, "features/nested/two.feature", "@TWO\nFeature: part TWO\n");
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

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
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

interface Withheld {
  copy: "repository" | "copy without git";
  path: string;
  subject: string;
}

const EXAMPLES: readonly Withheld[] = [
  { copy: "repository", path: "features/one.feature", subject: "a feature file" },
  { copy: "repository", path: "features", subject: "the feature corpus" },
  { copy: "repository", path: "features/nested", subject: "the feature corpus" },
  { copy: "copy without git", path: "docs/notes.md", subject: "a file in the tree" },
  { copy: "copy without git", path: "docs", subject: "a directory in the tree" },
];

describe("[SCN-ALC-018] a path allocate is not permitted to read is refused, naming the path and saying it was not permitted", () => {
  beforeEach(({ skip }) => {
    skip(runsAsRoot());
  });

  it.each(EXAMPLES)("refuses ONE in a $copy whose $path it may not read, naming it", ({ copy, path, subject }) => {
    const root = copy === "repository" ? repository() : copyWithoutGit();
    withhold(join(root, path), 0o000);

    expectRefusedNaming(allocateFrom(root), subject, join(root, path));
  });

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
