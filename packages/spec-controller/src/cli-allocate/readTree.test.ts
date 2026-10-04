import { afterAll, afterEach, beforeAll, describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isWalkedDirectory, readTree } from "./readTree.js";

describe("[SCN-ALC-004] with no history to read, a code is still offered and the boundary is stated", () => {
  it("walks the corpus's own directories", () => {
    expect(["features", "src", "doc"].map(isWalkedDirectory)).toEqual([true, true, true]);
  });

  it("never walks a package store, whose packages carry their own codes", () => {
    expect(isWalkedDirectory("node_modules")).toBe(false);
  });

  it("never walks a hidden directory", () => {
    expect([".git", ".hidden", ".cache"].map(isWalkedDirectory)).toEqual([false, false, false]);
  });
});

function git(repo: string, args: readonly string[]): void {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

const made: string[] = [];

function freshDirectory(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}

function templateRepository(): string {
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

let template = "";

beforeAll(() => {
  template = templateRepository();
});

function repositoryWithDraft(): string {
  const repo = freshDirectory("allocate-tree-");
  cpSync(template, repo, { recursive: true });
  return repo;
}

const taken: Array<() => void> = [];

function withhold(path: string, mode: number): void {
  chmodSync(path, mode);
  taken.push(() => chmodSync(path, 0o755));
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function thrownBy(read: () => unknown): unknown {
  try {
    read();
  } catch (err) {
    return err;
  }
  throw new Error("expected the read to be refused, and it read");
}

describe("[SCN-ALC-020] a file in the repository git cannot read is refused, never left out of the answer", () => {
  it("refuses an untracked file it may not read, naming it", () => {
    const repo = repositoryWithDraft();
    withhold(join(repo, "drafts", "new.md"), 0o000);
    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", path: join(repo, "drafts", "new.md") });
  });

  it("refuses a directory it may not list, naming it", () => {
    const repo = repositoryWithDraft();
    withhold(join(repo, "drafts"), 0o000);
    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", path: join(repo, "drafts") });
  });

  it("refuses a directory it may list but not enter, naming it", () => {
    const repo = repositoryWithDraft();
    withhold(join(repo, "drafts"), 0o600);
    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", path: join(repo, "drafts") });
  });

  it("refuses a tracked file it may not read, naming it", () => {
    const repo = repositoryWithDraft();
    withhold(join(repo, "docs", "notes.md"), 0o000);
    expect(thrownBy(() => readTree(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", path: join(repo, "docs", "notes.md") });
  });

  it("reads tracked and untracked files alike when it may read them all", () => {
    const texts = readTree(repositoryWithDraft(), "ONE").map((sighting) => `${sighting.path}:${sighting.line}`);
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
    const paths = readTree(repo, "ONE").map((sighting) => sighting.path);
    expect(paths.sort()).toEqual(["docs/notes.md", "drafts/new.md"]);
  });
});
