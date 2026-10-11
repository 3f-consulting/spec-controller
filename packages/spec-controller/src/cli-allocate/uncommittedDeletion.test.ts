import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, writeInto, lines } from "./repository.test-utils.js";
import { allocateInGuarded as allocateIn } from "./answered.test-utils.js";

const made: string[] = [];

function newRepository(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-uncommitted-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-001] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("answers one past the deleted code when the file that carried it is deleted from the working copy but not yet committed", () => {
    const repo = newRepository();
    const retired = "features/retired.feature";
    writeInto(repo, "features/one.feature", lines("@ONE", "Feature: part ONE", "  @SCN-ONE-001 @unit", "  Scenario: scenario 1"));
    writeInto(repo, retired, lines("@ONE", "Feature: part ONE, retired", "  @SCN-ONE-005 @unit", "  Scenario: scenario 5"));
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-q", "-m", "the corpus"]);
    rmSync(join(repo, retired));
    expect(existsSync(join(repo, retired))).toBe(false);
    expect(git(repo, ["ls-files", "--cached"])).toBe(`features/one.feature\n${retired}\n`);

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-006\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).not.toContain("spec-controller allocate:");
    expect(answered.stderr).toMatch(/^highest seen: SCN-ONE-005, features\/retired\.feature:/);
  });
});
