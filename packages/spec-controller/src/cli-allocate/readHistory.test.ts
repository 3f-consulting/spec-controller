import { afterEach, beforeAll, describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diffLineSightings, readHistory, repositoryTop } from "./readHistory.js";

const LOG_WITH_MESSAGE = [
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

describe("[SCN-ALC-015] a code that appears only in a commit message is not retired", () => {
  it("sights the added and removed lines of a patch and nothing else", () => {
    const texts = diffLineSightings(LOG_WITH_MESSAGE).map((sighting) => sighting.text);
    expect(texts).toEqual(["-  @SCN-ONE-001 @unit", "+  @SCN-ONE-001 @unit @smoke"]);
  });

  it("never sights a message line, whatever it mentions", () => {
    const texts = diffLineSightings(LOG_WITH_MESSAGE).map((sighting) => sighting.text);
    expect(texts.some((text) => text.includes("SCN-ONE-900"))).toBe(false);
  });

  it("never sights a file header, even one whose path carries a code", () => {
    const log = ["diff --git a/SCN-ONE-800.md b/SCN-ONE-800.md", "--- a/SCN-ONE-800.md", "+++ b/SCN-ONE-800.md", "@@ -0,0 +1 @@", "+prose"].join("\n");
    expect(diffLineSightings(log).map((sighting) => sighting.text)).toEqual(["+prose"]);
  });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  const log = [
    "\u0001abc1234",
    "",
    "diff --git a/features/one.feature b/features/one.feature",
    "index 1111111..2222222 100644",
    "--- a/features/one.feature",
    "+++ b/features/one.feature",
    "@@ -8,3 +7,0 @@ Feature: part ONE",
    "-  @SCN-ONE-005 @unit",
    "-  Scenario: scenario 2",
    "\u0001def5678",
    "",
    "diff --git a/features/one.feature b/features/one.feature",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/features/one.feature",
    "@@ -0,0 +4,2 @@",
    "+  @SCN-ONE-001 @unit",
    "+  Scenario: scenario 1",
  ].join("\n");

  it("places a removed line at its old line, in the commit that removed it", () => {
    expect(diffLineSightings(log)[0]).toEqual({ text: "-  @SCN-ONE-005 @unit", path: "features/one.feature", line: 8, commit: "abc1234" });
  });

  it("counts on within a hunk", () => {
    expect(diffLineSightings(log)[1]).toMatchObject({ line: 9, commit: "abc1234" });
  });

  it("places an added line at its new line, in the commit that added it", () => {
    expect(diffLineSightings(log)[2]).toEqual({ text: "+  @SCN-ONE-001 @unit", path: "features/one.feature", line: 4, commit: "def5678" });
  });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen — a removed line that looks like a header", () => {
  it("reads a removed line whose own text starts with -- as a removed line, not as a file header", () => {
    const log = [
      "\u0001abc1234",
      "diff --git a/doc/a.sql b/doc/a.sql",
      "--- a/doc/a.sql",
      "+++ b/doc/a.sql",
      "@@ -3 +2,0 @@",
      "--- SCN-ONE-005 retired",
    ].join("\n");
    expect(diffLineSightings(log)).toEqual([{ text: "--- SCN-ONE-005 retired", path: "doc/a.sql", line: 3, commit: "abc1234" }]);
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

function templateRepository(): string {
  const repo = mkdtempSync(join(tmpdir(), "allocate-history-"));
  git(repo, ["init", "-q", "-b", "main"]);
  writeFileSync(join(repo, "one.md"), "SCN-ONE-001\nSCN-ONE-005\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "both"]);
  writeFileSync(join(repo, "one.md"), "SCN-ONE-001\n");
  git(repo, ["commit", "-q", "-am", "retire 005"]);
  return repo;
}

let template = "";

beforeAll(() => {
  template = templateRepository();
});

function repositoryWithHistory(): string {
  const repo = mkdtempSync(join(tmpdir(), "allocate-history-"));
  cpSync(template, repo, { recursive: true });
  return repo;
}

const taken: Array<() => void> = [];

function withhold(path: string, mode: number): void {
  const before = statSync(path).mode & 0o7777;
  chmodSync(path, mode);
  taken.push(() => chmodSync(path, before));
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
});

function thrownBy(read: () => unknown): unknown {
  try {
    read();
  } catch (err) {
    return err;
  }
  throw new Error("expected the read to be refused, and it read");
}

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

  it("reads a history it may read, the deleted code included", () => {
    const texts = readHistory(repositoryWithHistory(), "ONE").map((sighting) => sighting.text);
    expect(texts).toContain("-SCN-ONE-005");
  });
});

describe("[SCN-ALC-022] a repository git cannot open is refused, never read as no repository", () => {
  it("refuses a repository whose .git it may not read, naming the .git", () => {
    const repo = repositoryWithHistory();
    withhold(join(repo, ".git"), 0o000);
    expect(thrownBy(() => repositoryTop(repo))).toMatchObject({ name: "UnreadableInput", subject: "the repository", path: join(repo, ".git") });
  });

  it("refuses a repository whose .git names a directory that is not there", () => {
    const repo = mkdtempSync(join(tmpdir(), "allocate-history-"));
    writeFileSync(join(repo, ".git"), `gitdir: ${join(repo, "nowhere")}\n`);
    expect(thrownBy(() => repositoryTop(repo))).toMatchObject({ name: "UnreadableInput", subject: "the repository", path: join(repo, ".git") });
  });

  it("finds the .git git would have found from a subdirectory", () => {
    const repo = repositoryWithHistory();
    mkdirSync(join(repo, "src"));
    withhold(join(repo, ".git", "HEAD"), 0o000);
    expect(thrownBy(() => repositoryTop(join(repo, "src")))).toMatchObject({ name: "UnreadableInput", path: join(repo, ".git") });
  });

  it("still reads a directory with no .git at or above it as no repository", () => {
    expect(repositoryTop(mkdtempSync(join(tmpdir(), "allocate-plain-")))).toBeNull();
  });

  it("still reads a repository with no git to ask as no repository", () => {
    const path = process.env.PATH;
    process.env.PATH = "";
    try {
      expect(repositoryTop(repositoryWithHistory())).toBeNull();
    } finally {
      process.env.PATH = path;
    }
  });
});
