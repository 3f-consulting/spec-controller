import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, writeInto, commitAllReturningHash as commitAll, lines } from "./repository.test-utils.js";
import { allocateInGuarded as allocateIn } from "./answered.test-utils.js";

const repositories: string[] = [];

function newRepository(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-added-")));
  repositories.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

// Ten lines, so a line appended after them starts the patch's new side at a two-digit line.
const CORPUS = [
  "@ONE",
  "Feature: part ONE",
  "  @SCN-ONE-001 @unit",
  "  Scenario: scenario 1",
  "    Given a step",
  "",
  "  @SCN-ONE-002 @unit",
  "  Scenario: scenario 2",
  "    Given a step",
  "    And a step",
];

/** Commits `branchContent` on a branch never merged into main, then returns to main: only `git log --all` sees it. */
function commitOnUnmergedBranch(repo: string, path: string, branchContent: string): string {
  git(repo, ["switch", "-q", "-c", "unmerged"]);
  writeInto(repo, path, branchContent);
  const commit = commitAll(repo, "an unmerged scenario");
  git(repo, ["switch", "-q", "main"]);
  return commit;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  for (const repo of repositories.splice(0)) rmSync(repo, { recursive: true, force: true });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  it("added only on an unmerged branch, below another added line, names the line it was added at and the commit that added it", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...CORPUS));
    commitAll(repo, "the corpus");
    const adding = commitOnUnmergedBranch(repo, "features/one.feature", lines(...CORPUS, "", "  @SCN-ONE-007 @unit", "  Scenario: scenario 7"));
    expect(git(repo, ["show", "--format=", "-U0", adding]).match(/^@@ .*$/gm)).toEqual(["@@ -10,0 +11,3 @@ Feature: part ONE"]);

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-008\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(`highest seen: SCN-ONE-007, features/one.feature:12 in ${adding}\n`);
  });

  it("added only on an unmerged branch to a file that ended without a newline, still names the line it was added at", () => {
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...CORPUS).slice(0, -1));
    commitAll(repo, "the corpus, no final newline");
    const adding = commitOnUnmergedBranch(repo, "features/one.feature", lines(...CORPUS, "  @SCN-ONE-007 @unit"));
    expect(git(repo, ["show", "--format=", "-U0", adding])).toContain(
      "@@ -10 +10,2 @@ Feature: part ONE\n-    And a step\n\\ No newline at end of file\n+    And a step\n+  @SCN-ONE-007 @unit\n",
    );

    const answered = allocateIn(repo, ["ONE"]);

    expect(answered.stdout).toBe("SCN-ONE-008\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(`highest seen: SCN-ONE-007, features/one.feature:11 in ${adding}\n`);
  });
});
