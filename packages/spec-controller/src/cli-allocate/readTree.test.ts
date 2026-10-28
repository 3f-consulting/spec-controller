import { afterEach, describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isWalkedDirectory, readTree } from "./readTree.js";
import { runGit as git, freshUnresolvedDirectory as freshDirectory, taken, withholdDirectory as withhold } from "./repository.test-utils.js";
import { thrownBy } from "./answered.test-utils.js";

describe("[SCN-ALC-004] with no history to read, a code is still offered and the boundary is stated", () => {
  it.each([
    ["walks the corpus's own directories", ["features", "src", "doc"], [true, true, true]],
    ["never walks a hidden directory", [".git", ".hidden", ".cache"], [false, false, false]],
  ] as const)("%s", (_title, names, walked) => {
    expect(names.map(isWalkedDirectory)).toEqual(walked);
  });
});

function repositoryWithDraft(): string {
  const repo = freshDirectory("allocate-tree-");
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "docs"));
  writeFileSync(join(repo, "docs", "notes.md"), "Cites SCN-ONE-003.\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "notes"]);
  mkdirSync(join(repo, "drafts"));
  writeFileSync(join(repo, "drafts", "new.md"), "Cites SCN-ONE-016.\n");
  return repo;
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
});

describe("[SCN-ALC-020] a file in the repository git cannot read is refused, never left out of the answer", () => {
  it.each([
    ["refuses an untracked file it may not read, naming it", ["drafts", "new.md"]],
    ["refuses a tracked file it may not read, naming it", ["docs", "notes.md"]],
  ] as const)("%s", (_title, file) => {
    const repo = repositoryWithDraft();
    withhold(join(repo, ...file), 0o000);
    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", path: join(repo, ...file) });
  });

  it("reads tracked and untracked files alike when it may read them all", () => {
    const texts = readTree(repositoryWithDraft(), "ONE").map((occurrence) => `${occurrence.path}:${occurrence.line}`);
    expect(texts.sort()).toEqual(["docs/notes.md:1", "drafts/new.md:1"]);
  });

  it("reads neither an ignored directory nor a repository nested in the tree", () => {
    const repo = repositoryWithDraft();
    writeFileSync(join(repo, ".gitignore"), "build/\n");
    mkdirSync(join(repo, "build"));
    writeFileSync(join(repo, "build", "out.md"), "Cites SCN-ONE-900.\n");
    withhold(join(repo, "build"), 0o000);
    mkdirSync(join(repo, "inner"));
    git(join(repo, "inner"), ["init", "-q"]);
    writeFileSync(join(repo, "inner", "x.md"), "Cites SCN-ONE-901.\n");
    const paths = readTree(repo, "ONE").map((occurrence) => occurrence.path);
    expect(paths.sort()).toEqual(["docs/notes.md", "drafts/new.md"]);
  });
});
