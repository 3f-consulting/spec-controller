import { afterAll, afterEach, beforeEach, describe, it, expect } from "vitest";
import { mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { diffLineOccurrences, readHistory, repositoryTop } from "./readHistory.js";
import { runGit as git, made, freshUnresolvedDirectory as freshDirectory, taken, withhold } from "./repository.test-utils.js";
import { thrownBy } from "./answered.test-utils.js";

describe("[SCN-ALC-015] a code that appears only in a commit message is not retired", () => {
  let logWithMessage: string;

  beforeEach(() => {
    logWithMessage = [
      "commit 0123456789abcdef0123456789abcdef01234567",
      "Author: fixture <fixture@example.invalid>",
      "Date:   Thu Sep 25 12:00:00 2026 +0000",
      "",
      "    Retag the scenario",
      "",
      "    See SCN-ONE-900 for why.",
      "",
      "diff --git a/features/one.feature b/features/one.feature",
      "index 1111111..2222222 100644",
      "--- a/features/one.feature",
      "+++ b/features/one.feature",
      "@@ -4 +4 @@ Feature: part ONE",
      "-  @SCN-ONE-001 @unit",
      "+  @SCN-ONE-001 @unit @smoke",
    ].join("\n");
  });

  it("never sights a message line, whatever it mentions", () => {
    const texts = diffLineOccurrences(logWithMessage).map((occurrence) => occurrence.text);
    expect(texts.some((text) => text.includes("SCN-ONE-900"))).toBe(false);
  });
});

function repositoryWithHistory(): string {
  const repo = freshDirectory("allocate-history-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeFileSync(join(repo, "one.md"), "SCN-ONE-001\nSCN-ONE-005\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "both"]);
  writeFileSync(join(repo, "one.md"), "SCN-ONE-001\n");
  git(repo, ["commit", "-q", "-am", "retire 005"]);
  return repo;
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-021] history git cannot read is refused, never answered below a code it carries", () => {
  it("refuses history whose loose objects it may not read", () => {
    const repo = repositoryWithHistory();
    const objects = join(repo, ".git", "objects");
    for (const name of readdirSync(objects).filter((entry) => /^[0-9a-f]{2}$/.test(entry))) withhold(join(objects, name), 0o000);
    expect(thrownBy(() => readHistory(repo, "ONE"))).toMatchObject({ name: "UnreadableInput", subject: "the repository's history" });
  });

  it("refuses history whose branch refs it may not read, though git itself says nothing", () => {
    const repo = repositoryWithHistory();
    withhold(join(repo, ".git", "refs", "heads"), 0o000);
    expect(thrownBy(() => readHistory(repo, "ONE"))).toMatchObject({
      name: "UnreadableInput",
      subject: "the repository's history",
      path: join(realpathSync(repo), ".git", "refs", "heads"),
    });
  });
});

describe("[SCN-ALC-022] a repository git cannot open is refused, never read as no repository", () => {
  it("refuses a repository whose .git it may not read, naming the .git", () => {
    const repo = repositoryWithHistory();
    withhold(join(repo, ".git"), 0o000);
    expect(thrownBy(() => repositoryTop(repo))).toMatchObject({ name: "UnreadableInput", subject: "the repository", path: join(repo, ".git") });
  });

  it("finds the .git git would have found from a subdirectory", () => {
    const repo = repositoryWithHistory();
    mkdirSync(join(repo, "src"));
    withhold(join(repo, ".git", "HEAD"), 0o000);
    expect(thrownBy(() => repositoryTop(join(repo, "src")))).toMatchObject({ name: "UnreadableInput", path: join(repo, ".git") });
  });

  it("still reads a directory with no .git at or above it as no repository", () => {
    expect(repositoryTop(freshDirectory("allocate-plain-"))).toBeNull();
  });

  it("still reads a repository with no git to ask as no repository", () => {
    const repo = repositoryWithHistory();
    const path = process.env.PATH;
    process.env.PATH = "";
    try {
      expect(repositoryTop(repo)).toBeNull();
    } finally {
      process.env.PATH = path;
    }
  });
});
