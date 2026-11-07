import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, symlinkSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { freshDirectory, git, writeInto, scenarioBlock } from "./repository.test-utils.js";
import { expectAnsweredWithHistoryUnreadBeforeItsFirstCommit, expectAnsweredWithNoHistoryRead } from "./historyBoundary.test-utils.js";

function corpusCarrying(code: string): string {
  return `@ONE\nFeature: part ONE\n\n${scenarioBlock(code, 1)}`;
}

function copyWithoutGitLinkingTo(target: string): string {
  const copy = freshDirectory("allocate-linked-copy-");
  writeInto(copy, "features/one.feature", corpusCarrying("SCN-ONE-001"));
  symlinkSync(target, join(copy, "features", "elsewhere.feature"));
  return copy;
}

function linkedWorktreeOfShallowClone(): string {
  const repo = freshDirectory("allocate-worktree-origin-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", corpusCarrying("SCN-ONE-001"));
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  writeInto(repo, "features/one.feature", `${readFileSync(join(repo, "features/one.feature"), "utf8")}\n`);
  git(repo, ["commit", "-q", "-a", "-m", "a later commit"]);
  const home = freshDirectory("allocate-worktree-");
  const clone = join(home, "clone");
  git(repo, ["clone", "-q", "--depth", "1", `file://${repo}`, clone]);
  const worktree = join(home, "worktree");
  git(clone, ["worktree", "add", "-q", worktree]);
  return worktree;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("[SCN-ALC-004] With no history to read, a code is still offered and the boundary is stated on stderr", () => {
  it("in a copy without git holding a symlink to a file that mentions SCN-ONE-900, answers a claim code ending ONE-002 and states no history was read", () => {
    const outside = freshDirectory("allocate-link-target-");
    writeInto(outside, "far.feature", corpusCarrying("SCN-ONE-900"));

    expectAnsweredWithNoHistoryRead(copyWithoutGitLinkingTo(join(outside, "far.feature")));
  });

  it("in a linked worktree of a clone one commit deep, where git names the shallow record by absolute path, states history before the clone's first commit was not read", () => {
    const worktree = linkedWorktreeOfShallowClone();
    expect(git(worktree, ["rev-parse", "--is-shallow-repository"]).trim()).toBe("true");
    expect(isAbsolute(git(worktree, ["rev-parse", "--git-path", "shallow"]).trim())).toBe(true);

    expectAnsweredWithHistoryUnreadBeforeItsFirstCommit(worktree);
  });
});
