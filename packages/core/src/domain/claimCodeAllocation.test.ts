import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { message } from "../../../spec-controller/src/messages/appText.js";
import { AppError, AppMessage } from "../../../spec-controller/src/messages/messages.js";
import { allocateIn, gitExited, refusalReason, type Answered } from "../../../spec-controller/src/commands/answered.test-utils.js";
import {
  commitAll,
  commitAllReturningHash,
  gitsOwnRefusal,
  repositoryHeadedOneCarrying003,
  runsAsRoot,
  taken,
  withhold,
  writeInto,
} from "../../../spec-controller/src/repository/repository.test-utils.js";

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  process.exitCode = undefined;
});

// So many numbered lines, with the given lines replaced and dropped, each ending in a newline.
function numberedLines(count: number, replaced: Readonly<Record<number, string>>, dropped: readonly number[] = []): string {
  const lines: string[] = [];
  for (let line = 1; line <= count; line++) if (!dropped.includes(line)) lines.push(replaced[line] ?? `line ${line}`);
  return `${lines.join("\n")}\n`;
}

function expectAnswer(answered: Answered, answer: string, seen: string): void {
  expect(answered.stdout).toBe(`${answer}\n`);
  expect(answered.stderr).toBe(`${seen}\n`);
}

const inTree = (code: string, path: string, line: number): string => message(AppMessage.HighestSeenInTree, { code, path, line });

const inCommit = (code: string, path: string, line: number, commit: string): string =>
  message(AppMessage.HighestSeenInCommit, { code, path, line, commit });

describe("the answer is one past the highest code the repository has contained", () => {
  it("[CLM-STG-061] a file git tracks, one of a hundred, contained CLM-ONE-005", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-many-files-");
    for (let n = 100; n < 200; n++) writeInto(repo, `docs/a-note-of-the-repository-${n}.md`, "nothing here\n");
    writeInto(repo, "docs/a-note-of-the-repository-200.md", "CLM-ONE-005 is noted\n");
    commitAll(repo, "the notes");

    expectAnswer(allocateIn(repo, ["ONE"]), "CLM-ONE-006", inTree("CLM-ONE-005", "docs/a-note-of-the-repository-200.md", 1));
  });

  it("[CLM-STG-061] a file git tracks, one of fifteen hundred whose paths fill more than a mebibyte, contained CLM-ONE-005", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-long-listing-");
    const folder = "notes-of-the-repository-".repeat(10);
    const longName = (n: number): string => `docs/${folder}/${folder}/${folder}${n}.md`;
    for (let n = 1000; n < 2500; n++) writeInto(repo, longName(n), "nothing here\n");
    writeInto(repo, longName(2500), "CLM-ONE-005 is noted\n");
    commitAll(repo, "the notes");

    expectAnswer(allocateIn(repo, ["ONE"]), "CLM-ONE-006", inTree("CLM-ONE-005", longName(2500), 1));
  });

  it("[CLM-STG-062] a line in git history, since deleted with others around it, had CLM-ONE-005", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-deleted-lines-");
    const carried = { 2: "CLM-ONE-002 is noted", 11: "CLM-ONE-004 is noted", 12: "CLM-ONE-005 is noted" };
    writeInto(repo, "docs/old.md", numberedLines(200, carried));
    commitAll(repo, "the notes");
    writeInto(repo, "docs/old.md", numberedLines(200, carried, [2, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]));
    const retiring = commitAllReturningHash(repo, "retire a line, then a dozen more");

    expectAnswer(allocateIn(repo, ["ONE"]), "CLM-ONE-006", inCommit("CLM-ONE-005", "docs/old.md", 12, retiring));
  });

  it("[CLM-STG-062] a line in git history, since deleted from the working tree, had CLM-ONE-005", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-deleted-file-");
    writeInto(repo, "docs/old.md", numberedLines(200, { 12: "CLM-ONE-005 is noted" }));
    const adding = commitAllReturningHash(repo, "the notes");
    rmSync(join(repo, "docs", "old.md"));

    expectAnswer(allocateIn(repo, ["ONE"]), "CLM-ONE-006", inCommit("CLM-ONE-005", "docs/old.md", 12, adding));
  });

  it("[CLM-STG-062] a line in git history, written over the last line of a file with no final newline, had CLM-ONE-005", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-no-final-newline-");
    writeInto(repo, "docs/old.md", numberedLines(12, { 12: "CLM-ONE-004 is noted" }).trimEnd());
    commitAll(repo, "the notes");
    writeInto(repo, "docs/old.md", numberedLines(12, { 12: "CLM-ONE-005 is noted" }).trimEnd());
    const rewriting = commitAllReturningHash(repo, "rewrite the last line");
    rmSync(join(repo, "docs", "old.md"));

    expectAnswer(allocateIn(repo, ["ONE"]), "CLM-ONE-006", inCommit("CLM-ONE-005", "docs/old.md", 12, rewriting));
  });
});

describe("allocate names what it could not read, and gives no code", () => {
  it.skipIf(runsAsRoot())("[CLM-STG-072] a file git cannot read: its index", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-withheld-index-");
    withhold(join(repo, ".git", "index"), 0o000);

    expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.Tree), repo)).toMatch(gitExited("ls-files", 128));
  });

  it.skipIf(runsAsRoot())("[CLM-STG-074] a damaged repository, asked from a folder inside it", () => {
    const repo = repositoryHeadedOneCarrying003("allocate-damaged-");
    const folder = join(repo, "docs");
    mkdirSync(folder);
    const gitEntry = join(repo, ".git");
    withhold(gitEntry, 0o000);
    const { status, said } = gitsOwnRefusal(folder);
    const reason = message(AppMessage.GitExited, { command: "rev-parse", status: String(status), said });

    const answered = allocateIn(folder, ["ONE"]);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toContain(message(AppError.CouldNotBeRead, { subject: message(AppMessage.Repository), path: gitEntry, reason }));
  });
});
