import { afterEach, describe, it, vi } from "vitest";
import { commitAll, freshDirectory, git, scenarioBlock, writeInto } from "./repository.test-utils.js";
import { allocateIn, expectAnsweredEnding } from "./answered.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const HEAD = "@ONE\nFeature: part ONE\n\n";

function featureFileCarrying(...codes: string[]): string {
  return HEAD + codes.map((code, n) => scenarioBlock(code, n + 1)).join("\n");
}

function repositoryCommitting(...codes: string[]): string {
  const repo = freshDirectory("allocate-either-prefix-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", featureFileCarrying(...codes));
  commitAll(repo, "the corpus");
  return repo;
}

// Each code is written after the last commit, so the tree is the only place that carries it.
function repositoryWhoseTreeCarries(...codes: string[]): string {
  const repo = repositoryCommitting();
  writeInto(repo, "features/one.feature", featureFileCarrying(...codes));
  return repo;
}

// The code is added in a commit of its own, so no line beside it in history carries the other prefix.
function repositoryWhoseLaterCommitDeleted(code: string): string {
  const repo = repositoryCommitting("SCN-ONE-001");
  writeInto(repo, "features/one.feature", featureFileCarrying("SCN-ONE-001", code));
  commitAll(repo, `add ${code}`);
  writeInto(repo, "features/one.feature", featureFileCarrying("SCN-ONE-001"));
  commitAll(repo, `retire ${code}`);
  return repo;
}

function copyWithoutGitCarrying(...codes: string[]): string {
  const copy = freshDirectory("allocate-either-prefix-no-git-");
  writeInto(copy, "features/one.feature", featureFileCarrying(...codes));
  return copy;
}

describe("[CLM-ALC-025] allocate counts the highest number wherever a code appears, under either prefix", () => {
  it.each([
    { case: "SCN highest", where: () => repositoryWhoseTreeCarries("SCN-ONE-004", "CLM-ONE-002") },
    { case: "CLM highest", where: () => repositoryWhoseTreeCarries("SCN-ONE-002", "CLM-ONE-004") },
    { case: "the same number", where: () => repositoryWhoseTreeCarries("SCN-ONE-004", "CLM-ONE-004") },
    { case: "in git's history only", where: () => repositoryWhoseLaterCommitDeleted("CLM-ONE-004") },
    { case: "in a copy without git", where: () => copyWithoutGitCarrying("CLM-ONE-004") },
  ])("$case: answers a claim code ending ONE-005", ({ where }) => {
    expectAnsweredEnding(allocateIn(where(), ["ONE"]), "ONE-005");
  });
});
