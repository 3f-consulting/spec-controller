import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, realpathSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { readHistory } from "./readHistory.js";
import { git, writeInto, commitAll, taken, withhold, runsAsRoot } from "./repository.test-utils.js";
import { allocateFrom } from "./answered.test-utils.js";
import type { Answered } from "./answered.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function resolvedTemporaryDirectory(): string {
  return realpathSync(temporaryDirectory("allocate-unreadable-history-"));
}

function scenarioBlock(code: string): string {
  return `  @${code} @unit\n  Scenario: scenario ${code}\n    Given a step\n`;
}

function repositoryWithADeletedCode(): string {
  const repo = resolvedTemporaryDirectory();
  git(repo, ["init", "-q", "-b", "main"]);
  const path = "features/one.feature";
  writeInto(repo, path, `@ONE\nFeature: part ONE\n\n${scenarioBlock("SCN-ONE-001")}\n${scenarioBlock("SCN-ONE-005")}`);
  commitAll(repo, "the corpus");
  writeInto(repo, path, `@ONE\nFeature: part ONE\n\n${scenarioBlock("SCN-ONE-001")}`);
  commitAll(repo, "retire a scenario");
  return repo;
}

function looseObjectDirectories(repo: string): string[] {
  const objects = join(repo, ".git", "objects");
  const loose = readdirSync(objects).filter((name) => /^[0-9a-f]{2}$/.test(name));
  expect(loose.length).toBeGreaterThan(0);
  return loose.map((name) => join(objects, name));
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function historyRefusalReason(answered: Answered, path: string): string {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  const opening = `spec-controller allocate: usage error — the repository's history could not be read: ${path} (`;
  expect(answered.stderr.startsWith(opening)).toBe(true);
  expect(answered.stderr.endsWith(")\n")).toBe(true);
  expect(answered.stderr.split("\n")).toHaveLength(2);
  return answered.stderr.slice(opening.length, -2);
}

const NOT_PERMITTED = /^(EACCES|EPERM): /;
const GIT_LOG_FAILED = /^git log exited 128: \S/;

describe("[SCN-ALC-021] history git cannot read is refused, never answered below a code it carries", () => {
  it("refuses ONE when its loose objects are not permitted to be read, in git's own words", ({ skip }) => {
    skip(runsAsRoot());
    const repo = repositoryWithADeletedCode();
    for (const dir of looseObjectDirectories(repo)) withhold(dir, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), repo)).toMatch(GIT_LOG_FAILED);
  });

  it("refuses ONE when its branch refs are not permitted to be read, naming them", ({ skip }) => {
    skip(runsAsRoot());
    const repo = repositoryWithADeletedCode();
    const heads = join(repo, ".git", "refs", "heads");
    withhold(heads, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), heads)).toMatch(NOT_PERMITTED);
  });

  it("refuses ONE when a branch ref nested below refs/heads is not permitted to be read, naming it", ({ skip }) => {
    skip(runsAsRoot());
    const repo = repositoryWithADeletedCode();
    git(repo, ["branch", "topic/later"]);
    const ref = join(repo, ".git", "refs", "heads", "topic", "later");
    withhold(ref, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), ref)).toMatch(NOT_PERMITTED);
  });

  it("answers ONE past the deleted code when a ref store holds a link to nowhere, which git passes over", () => {
    const repo = repositoryWithADeletedCode();
    symlinkSync("nowhere", join(repo, ".git", "refs", "heads", "dangling"));

    const answered = allocateFrom(repo);

    expect(answered.exitCode).toBeUndefined();
    expect(answered.stdout).toBe("SCN-ONE-006\n");
  });

  it("refuses the history, naming git, when there is no git to ask", () => {
    const repo = repositoryWithADeletedCode();
    const path = process.env.PATH;
    process.env.PATH = "";
    let thrown: unknown;
    try {
      readHistory(repo, "ONE");
    } catch (err) {
      thrown = err;
    } finally {
      process.env.PATH = path;
    }

    expect(thrown).toMatchObject({ name: "UnreadableInput", subject: "the repository's history", path: "git" });
  });
});
