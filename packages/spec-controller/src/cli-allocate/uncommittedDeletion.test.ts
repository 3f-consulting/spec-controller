import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { git, writeInto, lines } from "./repository.test-utils.js";
import { allocateIn, expectAnsweredEnding } from "./answered.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function newRepository(): string {
  const repo = realpathSync(temporaryDirectory("allocate-uncommitted-"));
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("[CLM-ALC-001] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("answers one past the deleted code when the file that carried it is deleted from the working copy but not yet committed", () => {
    const repo = newRepository();
    const retired = "features/retired.feature";
    writeInto(repo, "features/one.feature", lines("@ONE", "Feature: part ONE", "  @CLM-ONE-001 @unit", "  Scenario: scenario 1"));
    writeInto(repo, retired, lines("@ONE", "Feature: part ONE, retired", "  @CLM-ONE-005 @unit", "  Scenario: scenario 5"));
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-q", "-m", "the corpus"]);
    rmSync(join(repo, retired));
    expect(existsSync(join(repo, retired))).toBe(false);
    expect(git(repo, ["ls-files", "--cached"])).toBe(`features/one.feature\n${retired}\n`);

    const answered = allocateIn(repo, ["ONE"]);

    expectAnsweredEnding(answered, "ONE-006");
    expect(answered.stderr).not.toContain("spec-controller allocate:");
    expect(answered.stderr).toMatch(/^highest seen: CLM-ONE-005, features\/retired\.feature:/);
  });
});
