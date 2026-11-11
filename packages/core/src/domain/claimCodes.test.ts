import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { allocateIn, expectAnsweredEnding, gitExited, refusalReason, type Answered } from "../../../spec-controller/src/commands/answered.test-utils.js";
import {
  expectAnsweredWithHistoryUnreadBeforeItsFirstCommit,
  expectAnsweredWithNoHistoryRead,
} from "../../../spec-controller/src/repository/historyBoundary.test-utils.js";
import {
  commitAll,
  commitAllReturningHash,
  freshDirectory,
  git,
  gitsOwnRefusal,
  runsAsRoot,
  taken,
  withhold,
  writeInto,
} from "../../../spec-controller/src/repository/repository.test-utils.js";
import { message } from "../../../spec-controller/src/messages/appText.js";
import { AppError, AppMessage } from "../../../spec-controller/src/messages/messages.js";
import { printedRefusal } from "../../../spec-controller/src/messages/shownText.test-utils.js";
import { parsedFeatures } from "../inputs/parsedFeatures.test-utils.js";
import { claimCodeErrorsOf, claimCodeFrom, featureCodeOfFile, isFeatureCode, retiredScenarioCodeFrom, type ClaimCodeError } from "./claimCodes.js";

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  process.exitCode = undefined;
});

describe("a feature code is two to five uppercase letters or digits", () => {
  it.each([
    ["CLM-STG-037", "AB", true],
    ["CLM-STG-038", "ABCDE", true],
    ["CLM-STG-039", "A1", true],
    ["CLM-STG-040", "A", false],
    ["CLM-STG-041", "ABCDEF", false],
    ["CLM-STG-042", "abc", false],
  ])("[%s] the id %s", (_clm, code, isOne) => {
    expect(isFeatureCode(code)).toBe(isOne);
  });
});

describe("a tag above Feature: will be the feature code of that file", () => {
  it("[CLM-STG-043] the tag @ONE above Feature:", () => {
    const [feature] = parsedFeatures(["@ONE\nFeature: one\n\n  Scenario: a claim\n    Given a step\n"], ["one.feature"]);

    expect(featureCodeOfFile(feature!)).toBe("ONE");
  });
});

describe("a claim code is CLM, a feature code and a number", () => {
  it.each([
    ["CLM-STG-044", "CLM-ONE-001", { featureCode: "ONE", number: "001" }],
    ["CLM-STG-045", "CLM-ONE-7", { featureCode: "ONE", number: "7" }],
    ["CLM-STG-046", "CLM-ONE-1000", { featureCode: "ONE", number: "1000" }],
    ["CLM-STG-047", "CLM-A-001", undefined],
    ["CLM-STG-048", "CLM-ONE-", undefined],
  ])("[%s] the id %s", (_clm, id, code) => {
    expect(claimCodeFrom(id)).toEqual(code);
  });
});

describe("a retired scenario code is SCN, a feature code and a number", () => {
  it.each([
    ["CLM-STG-049", "SCN-ONE-001", { featureCode: "ONE", number: "001" }],
    ["CLM-STG-050", "SCN-ONE-7", { featureCode: "ONE", number: "7" }],
    ["CLM-STG-051", "SCN-ONE-1000", { featureCode: "ONE", number: "1000" }],
    ["CLM-STG-052", "SCN-A-001", undefined],
    ["CLM-STG-053", "SCN-ONE-", undefined],
  ])("[%s] the id %s", (_clm, id, code) => {
    expect(retiredScenarioCodeFrom(id)).toEqual(code);
  });
});

const scenarioTagged = (tags: string): string => `  ${tags}\n  Scenario: a claim\n    Given a step\n`;

const featureFile = (header: string, body: string): string => `${header}\nFeature: a feature\n\n${body}`;

const OUTLINE_WITH_CLM_COLUMN = (outlineTags: string, examplesTags: string): string =>
  `  ${outlineTags}\n  Scenario Outline: an outline\n    Given a <x>\n\n    ${examplesTags}\n    Examples:\n      | clm         | x |\n      | CLM-ONE-001 | y |\n`;

const outlineWhoseClmCellIs = (code: string): string =>
  `  @unit\n  Scenario Outline: an outline\n    Given a <x>\n\n    Examples:\n      | clm | x |\n      | ${code} | y |\n`;

describe("a misplaced or clashing claim code will be a claim code error", () => {
  it.each<[string, string, () => Readonly<Record<string, string>>, ClaimCodeError]>([
    [
      "CLM-STG-054",
      "a code under another file's feature code",
      () => ({ "one.feature": featureFile("@ONE", scenarioTagged("@CLM-TWO-001")), "two.feature": featureFile("@TWO", "") }),
      {
        kind: "foreign-claim-code",
        files: ["one.feature"],
        featureCode: "ONE",
        claimCode: "CLM-TWO-001",
        namedFeatureCode: "TWO",
        namedFeatureFiles: ["two.feature"],
      },
    ],
    [
      "CLM-STG-054",
      "a code in a clm column under another file's feature code",
      () => ({ "one.feature": featureFile("@ONE", outlineWhoseClmCellIs("CLM-TWO-001")), "two.feature": featureFile("@TWO", "") }),
      {
        kind: "foreign-claim-code",
        files: ["one.feature"],
        featureCode: "ONE",
        claimCode: "CLM-TWO-001",
        namedFeatureCode: "TWO",
        namedFeatureFiles: ["two.feature"],
      },
    ],
    [
      "CLM-STG-055",
      "a code under a feature code no file has",
      () => ({ "one.feature": featureFile("@ONE", scenarioTagged("@CLM-ZZZ-001")) }),
      {
        kind: "foreign-claim-code",
        files: ["one.feature"],
        featureCode: "ONE",
        claimCode: "CLM-ZZZ-001",
        namedFeatureCode: "ZZZ",
        namedFeatureFiles: [],
      },
    ],
    [
      "CLM-STG-056",
      "a code in a file with no feature code",
      () => ({ "three.feature": featureFile("", scenarioTagged("@CLM-ONE-002")) }),
      { kind: "no-feature-code", files: ["three.feature"] },
    ],
    [
      "CLM-STG-056",
      "a code in a clm column in a file with no feature code",
      () => ({ "three.feature": featureFile("", outlineWhoseClmCellIs("CLM-ONE-002")) }),
      { kind: "no-feature-code", files: ["three.feature"] },
    ],
    [
      "CLM-STG-057",
      "two files with one feature code",
      () => ({ "one.feature": featureFile("@ONE", ""), "uno.feature": featureFile("@ONE", "") }),
      { kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "uno.feature"] },
    ],
    [
      "CLM-STG-058",
      "two codes on one scenario",
      () => ({ "one.feature": featureFile("@ONE", scenarioTagged("@CLM-ONE-001 @CLM-ONE-002")) }),
      { kind: "several-claim-codes", files: ["one.feature"], scenario: "a claim", codes: ["CLM-ONE-001", "CLM-ONE-002"] },
    ],
    [
      "CLM-STG-059",
      "a code beside a clm column",
      () => ({ "one.feature": featureFile("@ONE", OUTLINE_WITH_CLM_COLUMN("@CLM-ONE-009", "")) }),
      { kind: "claim-code-beside-clm-column", files: ["one.feature"], scenario: "an outline", codes: ["CLM-ONE-009"] },
    ],
    [
      "CLM-STG-060",
      "a code on an Examples block, with a clm column",
      () => ({ "one.feature": featureFile("@ONE", OUTLINE_WITH_CLM_COLUMN("", "@CLM-ONE-009")) }),
      { kind: "claim-code-beside-clm-column", files: ["one.feature"], scenario: "an outline", codes: ["CLM-ONE-009"] },
    ],
  ])("[%s] %s", (_clm, _files, sourcesOf, error) => {
    const sources = sourcesOf();
    const features = parsedFeatures(Object.values(sources), Object.keys(sources));

    expect(claimCodeErrorsOf(features)).toEqual([error]);
  });
});

const FEATURE_PATH = "features/one.feature";

const featureCarrying = (code: string): string => `@ONE\nFeature: part ONE\n\n  @${code} @unit\n  Scenario: scenario 1\n    Given a step\n`;

function repositoryCarrying(code: string): string {
  const repo = freshDirectory("claim-codes-");
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, FEATURE_PATH, featureCarrying(code));
  commitAll(repo, "the corpus");
  return repo;
}

function committedThenDeleted(repo: string, path: string, content: string): string {
  writeInto(repo, path, content);
  commitAll(repo, "a file that did not last");
  git(repo, ["rm", "-q", path]);
  return commitAllReturningHash(repo, "retire the file");
}

const inTree = (code: string, path: string, line: number): string => message(AppMessage.HighestSeenInTree, { code, path, line });

const inCommit = (code: string, path: string, line: number, commit: string): string =>
  message(AppMessage.HighestSeenInCommit, { code, path, line, commit });

interface Asked {
  readonly answered: Answered;
  readonly seen: string;
}

function askedIn(repo: string, seen: string, cwd: string = repo): Asked {
  return { answered: allocateIn(cwd, ["ONE"]), seen };
}

function trackedFileContaining(text: string, code: string): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, ".github/workflows/ci.yml", `on: push\n      - run: echo ${text}\n`);
  commitAll(repo, "a workflow");
  return askedIn(repo, inTree(code, ".github/workflows/ci.yml", 2));
}

function deletedLineHad(text: string): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  const retiring = committedThenDeleted(repo, "docs/old.md", `${text} is retired\n`);
  return askedIn(repo, inCommit(text, "docs/old.md", 1, retiring));
}

function trackedFileContainingNoNumber(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "docs/notes.md", "SCN-ONE- had no number\n");
  commitAll(repo, "the notes");
  return askedIn(repo, inTree("CLM-ONE-001", FEATURE_PATH, 4));
}

function newFileContaining(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "docs/draft.md", "CLM-ONE-005 is drafted\n");
  return askedIn(repo, inTree("CLM-ONE-005", "docs/draft.md", 1));
}

function topFileFromASubdirectory(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "notes.md", "CLM-ONE-005 is noted\n");
  writeInto(repo, "sub/readme.md", "nothing here\n");
  commitAll(repo, "the notes");
  return askedIn(repo, inTree("CLM-ONE-005", "notes.md", 1), join(repo, "sub"));
}

function commitMessageContaining(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  git(repo, ["commit", "-q", "--allow-empty", "-m", "CLM-ONE-900 in a message"]);
  return askedIn(repo, inTree("CLM-ONE-001", FEATURE_PATH, 4));
}

function ignoredFileContaining(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, ".gitignore", "ignored.md\n");
  commitAll(repo, "an ignore list");
  writeInto(repo, "ignored.md", "CLM-ONE-900 is ignored\n");
  return askedIn(repo, inTree("CLM-ONE-001", FEATURE_PATH, 4));
}

function ignoredFolderWithheld(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, ".gitignore", "build/\n");
  commitAll(repo, "an ignore list");
  writeInto(repo, "build/out.md", "CLM-ONE-900 is built\n");
  withhold(join(repo, "build"), 0o000);
  return askedIn(repo, inTree("CLM-ONE-001", FEATURE_PATH, 4));
}

function deletedLineInUnprefixedDiffs(): Asked {
  const repo = repositoryCarrying("CLM-ONE-001");
  git(repo, ["config", "diff.noprefix", "true"]);
  const retiring = committedThenDeleted(repo, "lib/old.md", "CLM-ONE-005 is retired\n");
  return askedIn(repo, inCommit("CLM-ONE-005", "lib/old.md", 1, retiring));
}

function featureFileAlone(code: string): Asked {
  return askedIn(repositoryCarrying(code), inTree(code, FEATURE_PATH, 4));
}

describe("the answer is one past the highest code the repository has contained", () => {
  it.each<[string, string, () => Asked, string]>([
    ["CLM-STG-061", "a file git tracks, such as a workflow or a test, contained CLM-ONE-005", () => trackedFileContaining("CLM-ONE-005", "CLM-ONE-005"), "CLM-ONE-006"],
    ["CLM-STG-062", "a line in git history, since deleted, had CLM-ONE-005", () => deletedLineHad("CLM-ONE-005"), "CLM-ONE-006"],
    ["CLM-STG-062", "a line in git history, since deleted from lib/, had CLM-ONE-005, where git diffs name no a/ and b/", deletedLineInUnprefixedDiffs, "CLM-ONE-006"],
    ["CLM-STG-063", "a file git tracks contained SCN-ONE-005", () => trackedFileContaining("SCN-ONE-005", "SCN-ONE-005"), "CLM-ONE-006"],
    ["CLM-STG-064", "a line in git history, since deleted, had SCN-ONE-005", () => deletedLineHad("SCN-ONE-005"), "CLM-ONE-006"],
    ["CLM-STG-065", "a file git tracks contained SCN-ONE-", trackedFileContainingNoNumber, "CLM-ONE-002"],
    ["CLM-STG-066", "a new file git does not ignore contained CLM-ONE-005", newFileContaining, "CLM-ONE-006"],
    ["CLM-STG-067", "a file at the repository's top contained CLM-ONE-005, from a subdirectory containing no code", topFileFromASubdirectory, "CLM-ONE-006"],
    ["CLM-STG-068", "only a commit's message contained CLM-ONE-900", commitMessageContaining, "CLM-ONE-002"],
    ["CLM-STG-069", "only a file git ignores contained CLM-ONE-900", ignoredFileContaining, "CLM-ONE-002"],
    ["CLM-STG-069", "only a file in a folder git ignores, and it cannot read, contained CLM-ONE-900", ignoredFolderWithheld, "CLM-ONE-002"],
    ["CLM-STG-070", "CLM-ONE-7 in the file", () => featureFileAlone("CLM-ONE-7"), "CLM-ONE-008"],
    ["CLM-STG-071", "CLM-ONE-999 in the file", () => featureFileAlone("CLM-ONE-999"), "CLM-ONE-1000"],
  ])("[%s] %s", (_clm, _elsewhere, ask, answer) => {
    const { answered, seen } = ask();

    expect(answered.stdout).toBe(`${answer}\n`);
    expect(answered.stderr).toBe(`${seen}\n`);
  });
});

function withheldFile(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "docs/notes.md", "CLM-ONE-003\n");
  commitAll(repo, "the notes");
  const notes = join(repo, "docs", "notes.md");
  withhold(notes, 0o000);

  expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.TreeFile), notes)).toMatch(/^(EACCES|EPERM): /);
}

function withheldFolder(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "docs/notes.md", "CLM-ONE-009\n");
  const docs = join(repo, "docs");
  withhold(docs, 0o000);

  expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.TreeDirectory), docs)).toMatch(/^(EACCES|EPERM): /);
}

function withheldFolderTwoDown(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "docs/deep/notes.md", "CLM-ONE-009\n");
  const deep = join(repo, "docs", "deep");
  withhold(deep, 0o000);

  expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.TreeDirectory), deep)).toMatch(/^(EACCES|EPERM): /);
}

function withheldFolderBesideItsIgnoredBackup(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, ".gitignore", "*~\n");
  commitAll(repo, "an ignore list");
  writeInto(repo, "docs~", "a backup\n");
  writeInto(repo, "docs/notes.md", "CLM-ONE-009\n");
  const docs = join(repo, "docs");
  withhold(docs, 0o000);

  expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.TreeDirectory), docs)).toMatch(/^(EACCES|EPERM): /);
}

function withheldFeaturesSubfolder(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "features/more/two.feature", "@TWO\nFeature: part TWO\n");
  const more = join(repo, "features", "more");
  withhold(more, 0o000);

  expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.FeatureCorpus), more)).toMatch(/^(EACCES|EPERM): /);
}

function withheldHistory(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  committedThenDeleted(repo, "docs/old.md", "CLM-ONE-005\n");
  const objects = join(repo, ".git", "objects");
  for (const dir of readdirSync(objects).filter((name) => /^[0-9a-f]{2}$/.test(name))) withhold(join(objects, dir), 0o000);

  expect(refusalReason(allocateIn(repo, ["ONE"]), message(AppMessage.History), repo)).toMatch(gitExited("log", 128));
}

function damagedRepository(): void {
  const repo = repositoryCarrying("CLM-ONE-001");
  const gitEntry = join(repo, ".git");
  withhold(gitEntry, 0o000);
  const { status, said } = gitsOwnRefusal(repo);
  const reason = message(AppMessage.GitExited, { command: "rev-parse", status: String(status), said });

  const answered = allocateIn(repo, ["ONE"]);

  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  expect(answered.stderr).toContain(message(AppError.CouldNotBeRead, { subject: message(AppMessage.Repository), path: gitEntry, reason }));
}

describe("allocate names what it could not read, and gives no code", () => {
  it.for([
    ["CLM-STG-072", "a file git cannot read", withheldFile],
    ["CLM-STG-073", "history git failed to read", withheldHistory],
    ["CLM-STG-074", "a damaged repository", damagedRepository],
    ["CLM-STG-085", "a folder in the tree it cannot read", withheldFolder],
    ["CLM-STG-085", "a folder two down in the tree it cannot read", withheldFolderTwoDown],
    ["CLM-STG-085", "a folder in the tree it cannot read, beside an ignored backup file named for it", withheldFolderBesideItsIgnoredBackup],
    ["CLM-STG-085", "a folder in the features folder it cannot read", withheldFeaturesSubfolder],
  ] as const)("[%s] %s", ([, , stopsUnread], { skip }) => {
    skip(runsAsRoot());
    stopsUnread();
  });
});

function repositoryWhoseHistoryOnceCarried005(): string {
  const repo = repositoryCarrying("CLM-ONE-001");
  committedThenDeleted(repo, "docs/old.md", "CLM-ONE-005\n");
  return repo;
}

function copyWithoutGit(): void {
  const copy = freshDirectory("claim-codes-copy-");
  cpSync(repositoryWhoseHistoryOnceCarried005(), copy, { recursive: true, filter: (source) => basename(source) !== ".git" });
  expectAnsweredWithNoHistoryRead(copy);
}

function shallowClone(): void {
  const repo = repositoryWhoseHistoryOnceCarried005();
  const clone = join(freshDirectory("claim-codes-clone-"), "clone");
  git(repo, ["clone", "-q", "--depth", "1", `file://${repo}`, clone]);
  expectAnsweredWithHistoryUnreadBeforeItsFirstCommit(clone);
}

describe("with no history to read, it answers and says what it did not read", () => {
  it.each([
    ["CLM-STG-075", "not a git repository", copyWithoutGit],
    ["CLM-STG-076", "a shallow clone from after that line", shallowClone],
  ])("[%s] %s", (_clm, _copy, answersInCopy) => {
    answersInCopy();
  });
});

function headedOneAndTwo(): string {
  const repo = repositoryCarrying("CLM-ONE-001");
  writeInto(repo, "features/two.feature", "@TWO\nFeature: part TWO\n\n  @CLM-TWO-001 @unit\n  Scenario: scenario 1\n    Given a step\n");
  commitAll(repo, "a second feature");
  return repo;
}

function fixtureHeadedZzz(repo: string): void {
  writeInto(repo, "tests/fixtures/sample/features/zzz.feature", "@ZZZ\nFeature: part ZZZ\n");
  commitAll(repo, "a test fixture");
}

function featureFileWithNoFeatureCode(repo: string): void {
  writeInto(repo, "features/untagged.feature", "Feature: a feature file with no feature code\n");
  commitAll(repo, "an untagged feature file");
}

function deletedFeatureHeadedZzz(repo: string): void {
  committedThenDeleted(repo, "features/zzz.feature", "@ZZZ\nFeature: part ZZZ\n");
}

describe("a feature code no feature file has stops it, listing those that do", () => {
  it.each([
    ["CLM-STG-077", "no file mentions ZZZ", (): void => {}],
    ["CLM-STG-077", "no file mentions ZZZ, and a feature file has no feature code", featureFileWithNoFeatureCode],
    ["CLM-STG-078", "a test fixture's feature file is tagged @ZZZ", fixtureHeadedZzz],
    ["CLM-STG-079", "a feature file tagged @ZZZ was deleted by a later commit", deletedFeatureHeadedZzz],
  ])("[%s] %s", (_clm, _where, arrange) => {
    const repo = headedOneAndTwo();
    arrange(repo);

    const answered = allocateIn(repo, ["ZZZ"]);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    const listed = message(AppError.UnknownPartRefused, { part: "ZZZ", parts: "ONE, TWO" });
    expect(answered.stderr).toBe(`${printedRefusal(AppError.UnknownPartRefused, listed, "allocate")}\n`);
  });
});

function repositoryOnceCarryingOld(): { repo: string; retiring: string } {
  const repo = repositoryCarrying("CLM-ONE-003");
  return { repo, retiring: committedThenDeleted(repo, "docs/old.md", "CLM-OLD-007\n") };
}

describe("--new gives the next code for any well-formed feature code", () => {
  it.each<[string, string, string, (retiring: string) => string]>([
    ["CLM-STG-080", "ZZ", "CLM-ZZ-001", () => message(AppMessage.HighestSeenNone)],
    [
      "CLM-STG-081",
      "ONE",
      "CLM-ONE-004",
      () => `${inTree("CLM-ONE-003", FEATURE_PATH, 4)}\n${message(AppMessage.PartAlreadyHeaded, { part: "ONE" })}`,
    ],
    ["CLM-STG-082", "OLD", "CLM-OLD-008", (retiring) => inCommit("CLM-OLD-007", "docs/old.md", 1, retiring)],
  ])("[%s] %s", (_clm, code, answer, said) => {
    const { repo, retiring } = repositoryOnceCarryingOld();

    const answered = allocateIn(repo, [code, "--new"]);

    expect(answered.stdout).toBe(`${answer}\n`);
    expect(answered.stderr).toBe(`${said(retiring)}\n`);
  });
});

describe("a feature code on a feature file in a subdirectory is found", () => {
  it("[CLM-STG-083] the only file tagged @NEST, two folders down", () => {
    const repo = freshDirectory("claim-codes-nested-");
    git(repo, ["init", "-q", "-b", "main"]);
    mkdirSync(join(repo, "features", "outer", "inner"), { recursive: true });
    writeInto(repo, "features/outer/inner/nest.feature", "@NEST\nFeature: part NEST\n\n  @CLM-NEST-004 @unit\n  Scenario: scenario 1\n    Given a step\n");
    commitAll(repo, "the corpus");

    expect(allocateIn(repo, ["NEST"]).stdout).toBe("CLM-NEST-005\n");
  });
});

describe("a request that is not a feature code stops as a usage error", () => {
  it("[CLM-STG-084] something that is no feature code", () => {
    const answered = allocateIn(repositoryCarrying("CLM-ONE-001"), ["fit"]);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toBe(`${printedRefusal(AppError.NotAFeaturePart, message(AppError.NotAFeaturePart, { part: "fit" }), "allocate")}\n`);
  });
});

function newCodeInCopyWithoutGit(): Answered {
  const copy = freshDirectory("claim-codes-new-copy-");
  cpSync(repositoryCarrying("CLM-ONE-001"), copy, { recursive: true, filter: (source) => basename(source) !== ".git" });
  return allocateIn(copy, ["ZZ", "--new"]);
}

function newCodeInShallowClone(): Answered {
  const clone = join(freshDirectory("claim-codes-new-clone-"), "clone");
  git(repositoryCarrying("CLM-ONE-001"), ["clone", "-q", "--depth", "1", `file://${repositoryCarrying("CLM-ONE-001")}`, clone]);
  return allocateIn(clone, ["ZZ", "--new"]);
}

describe("with no history to read and no code seen, it answers and says what it did not read", () => {
  it("[CLM-STG-087] not a git repository", () => {
    const answered = newCodeInCopyWithoutGit();
    expect({ answer: answered.stdout, note: answered.stderr }).toEqual({
      answer: "CLM-ZZ-001\n",
      note: `${message(AppMessage.NoRepositoryRisksPartCode, { part: "ZZ" })}\n${message(AppMessage.HighestSeenNone)}\n`,
    });
  });

  it("[CLM-STG-088] a shallow clone", () => {
    const answered = newCodeInShallowClone();
    expect(answered.stdout).toBe("CLM-ZZ-001\n");
    expect(answered.stderr.split("\n")[0]).toMatch(new RegExp(`^${message(AppMessage.ShallowHistoryRisksPartCode, { before: "EDGE", part: "ZZ" }).split("EDGE").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[0-9a-f]+")}$`));
  });
});

describe("--new in a repository with no features folder gives the feature code's first claim code", () => {
  it("[CLM-STG-086] --new in a repository with no features folder gives the feature code's first claim code", () => {
    const repo = freshDirectory("claim-codes-no-features-");
    git(repo, ["init", "-q", "-b", "main"]);
    writeInto(repo, "README.md", "a repository with no features folder\n");
    commitAll(repo, "a readme");

    const answered = allocateIn(repo, ["ZZ", "--new"]);

    expectAnsweredEnding(answered, "ZZ-001");
    expect(answered.stderr).toBe(`${message(AppMessage.HighestSeenNone)}\n`);
  });
});
