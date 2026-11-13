import { appendFileSync, chmodSync, realpathSync, rmSync } from "node:fs";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { allocate, type AllocateOutcome } from "../../../spec-controller/src/commands/allocate.js";
import appCatalogue from "../../../spec-controller/src/messages/messages.en.json" with { type: "json" };
import { noteText } from "../../../spec-controller/src/output/allocateNotes.js";
import { featureFile, folderForTest, nestedCheckoutIn, repositoryForTest, shallowCloneOf } from "../../../spec-controller/src/repository/repository.test-utils.js";
import { textFor } from "../messages/catalogue.js";

const answerAndHighest = (outcome: AllocateOutcome) =>
  "answer" in outcome ? { answer: outcome.answer, highest: outcome.notes.find(({ note }) => note === "highest-seen") } : outcome;

// The notes as the developer reads them beside the answer.
const notesWritten = (outcome: AllocateOutcome): readonly string[] => ("notes" in outcome ? outcome.notes.map(noteText) : []);

// A note's words, as the catalogue gives them, followed by what it is about.
const noted = (note: string, about?: string): string => (about === undefined ? textFor(appCatalogue, note) : `${textFor(appCatalogue, note)}: ${about}`);

const ONE = { featureCode: "ONE", asNewFeatureCode: false };

describe("the answer is one past the highest code the repository has contained", () => {
  it("[CLM-STG-061] a file git tracks, such as a workflow or a test, contained CLM-ONE-005: the answer is CLM-ONE-006, noting that file and line", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write(".github/workflows/ci.yml", "jobs: {}\n# CLM-ONE-005\n");
    repository.commit("first");

    const outcome = allocate(ONE, repository.top);

    expect({ ...answerAndHighest(outcome), written: notesWritten(outcome) }).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "CLM-ONE-005", path: ".github/workflows/ci.yml", line: 2 },
      written: [noted("highest-seen", "CLM-ONE-005, .github/workflows/ci.yml:2")],
    });
  });

  it("[CLM-STG-066] a new file git does not ignore contained CLM-ONE-005: the answer is CLM-ONE-006, noting that file and line", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.commit("first");
    repository.write("new.test.ts", "// CLM-ONE-005\n");

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "CLM-ONE-005", path: "new.test.ts", line: 1 },
    });
  });

  it("[CLM-STG-067] a file at the repository's top contained CLM-ONE-005, and the developer stood in a subdirectory containing no code: the answer is CLM-ONE-006", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("top.txt", "CLM-ONE-005\n");
    repository.write("deep/down/empty.txt", "nothing here\n");
    repository.commit("first");

    expect(answerAndHighest(allocate(ONE, `${repository.top}/deep/down`))).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "CLM-ONE-005", path: "top.txt", line: 1 },
    });
  });

  it.each([
    ["CLM-STG-062", "CLM-ONE-005"],
    ["CLM-STG-064", "SCN-ONE-005"],
  ] as const)("[%s] a line in git history, since deleted, had %s: the answer is CLM-ONE-006, noting the file and line it was in, and the commit", (_clm, code) => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("old.txt", `kept\n${code}\n`);
    const commit = repository.commit("first");
    repository.write("old.txt", "kept\n");
    repository.commit("second");

    const outcome = allocate(ONE, repository.top);

    expect({ ...answerAndHighest(outcome), written: notesWritten(outcome) }).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code, path: "old.txt", line: 2, commit },
      written: [noted("highest-seen", `${code}, old.txt:2@${commit}`)],
    });
  });

  it("[CLM-STG-063] a file git tracks contained SCN-ONE-005: the answer is CLM-ONE-006", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("retired.txt", "SCN-ONE-005\n");
    repository.commit("first");

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "SCN-ONE-005", path: "retired.txt", line: 1 },
    });
  });

  it.each([
    ["CLM-STG-065", "a file git tracks contained SCN-ONE-", { "partial.txt": "SCN-ONE-\n" }, "first"],
    ["CLM-STG-068", "only a commit's message contained CLM-ONE-900", {}, "first CLM-ONE-900"],
    ["CLM-STG-069", "only a file git ignores contained CLM-ONE-900", { ".gitignore": "ignored.txt\n", "ignored.txt": "CLM-ONE-900\n" }, "first"],
  ] as const)("[%s] %s: the answer is CLM-ONE-002, noting the feature file and line", (_clm, _what, files, message) => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    Object.entries(files).forEach(([path, text]) => repository.write(path, text));
    repository.commit(message);

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-002",
      highest: { note: "highest-seen", code: "CLM-ONE-001", path: "features/one.feature", line: 4 },
    });
  });

  it.each([
    ["CLM-STG-070", "CLM-ONE-7", "CLM-ONE-008"],
    ["CLM-STG-071", "CLM-ONE-999", "CLM-ONE-1000"],
  ] as const)("[%s] the feature file's scenario was tagged @%s and nothing else contained a ONE code: the answer is %s", (_clm, code, answer) => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", code));
    repository.commit("first");

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer,
      highest: { note: "highest-seen", code, path: "features/one.feature", line: 4 },
    });
  });
});

// Environment variables set for one test, as they stood again when it finishes.
function environmentForTest(variables: Readonly<Record<string, string>>): void {
  Object.entries(variables).forEach(([name, value]) => vi.stubEnv(name, value));
  onTestFinished(() => {
    vi.unstubAllEnvs();
  });
}

describe("the answer is one past the highest code the repository has contained, by what git reads", () => {
  it("[CLM-STG-069] only a file the developer's own git configuration ignores contained CLM-ONE-900: the answer is CLM-ONE-002, noting the feature file and line", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.commit("first");
    repository.write("ignored.txt", "CLM-ONE-900\n");
    const own = folderForTest();
    own.write("ignore", "ignored.txt\n");
    own.write("config", `[core]\n\texcludesFile = ${own.top}/ignore\n`);
    environmentForTest({ GIT_CONFIG_GLOBAL: `${own.top}/config` });

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-002",
      highest: { note: "highest-seen", code: "CLM-ONE-001", path: "features/one.feature", line: 4 },
    });
  });

  it("[CLM-STG-062] a line in git history, since deleted, that read @@ -1 +1 @@ CLM-ONE-005 on line 12: the answer is CLM-ONE-006, noting the file and line it was in, and the commit", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("old.txt", "kept\n".repeat(11));
    repository.commit("first");
    repository.write("old.txt", `${"kept\n".repeat(11)}@@ -1 +1 @@ CLM-ONE-005\n`);
    const commit = repository.commit("second");
    repository.write("old.txt", "kept\n".repeat(11));
    repository.commit("third");

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "CLM-ONE-005", path: "old.txt", line: 12, commit },
    });
  });
});

describe("allocate takes only a feature code a feature file has", () => {
  it("[CLM-STG-083] a feature code on a feature file in a subdirectory is found", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("features/deep/er/nest.feature", featureFile("NEST", "CLM-NEST-004"));
    repository.commit("first");

    expect(answerAndHighest(allocate({ featureCode: "NEST", asNewFeatureCode: false }, repository.top))).toMatchObject({ answer: "CLM-NEST-005" });
  });

  it.each([
    ["CLM-STG-077", "no file mentions ZZZ", false],
    ["CLM-STG-078", "a test fixture's feature file is tagged @ZZZ", true],
  ] as const)("[%s] the features folder held files tagged @ONE and @TWO, where %s: a request for ZZZ stops as an unknown feature code, gives no code, and lists ONE and TWO", (_clm, _where, withFixture) => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("features/two.feature", featureFile("TWO", "CLM-TWO-001"));
    if (withFixture) repository.write("tests/fixtures/zzz.feature", featureFile("ZZZ", "CLM-ZZZ-001"));
    repository.commit("first");

    expect(allocate({ featureCode: "ZZZ", asNewFeatureCode: false }, repository.top)).toEqual({
      stop: "unknown-feature-code",
      refusal: { key: "unknown-feature-code", values: { featureCode: "ZZZ", featureCodes: "ONE, TWO" } },
    });
  });

  it("[CLM-STG-079] a feature file tagged @ZZZ was deleted by a later commit: a request for ZZZ stops as an unknown feature code, listing ONE and TWO", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("features/two.feature", featureFile("TWO", "CLM-TWO-001"));
    repository.write("features/zzz.feature", featureFile("ZZZ", "CLM-ZZZ-001"));
    repository.commit("first");
    repository.git("rm", "--quiet", "features/zzz.feature");
    repository.commit("second");

    expect(allocate({ featureCode: "ZZZ", asNewFeatureCode: false }, repository.top)).toEqual({
      stop: "unknown-feature-code",
      refusal: { key: "unknown-feature-code", values: { featureCode: "ZZZ", featureCodes: "ONE, TWO" } },
    });
  });

  it("[CLM-STG-084] a request that is not a feature code stops as a usage error, and gives no code", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.commit("first");

    expect(allocate({ featureCode: "one", asNewFeatureCode: false }, repository.top)).toEqual({
      stop: "usage-error",
      refusal: { key: "not-a-feature-code", values: { given: "one" } },
    });
  });

  it.each([
    ["CLM-STG-080", "ZZ", "CLM-ZZ-001", []],
    ["CLM-STG-081", "ONE", "CLM-ONE-004", [{ note: "feature-code-on-a-file", featureCode: "ONE" }]],
    ["CLM-STG-082", "OLD", "CLM-OLD-008", []],
  ] as const)("[%s] --new gives the next code for %s, as a new feature code: the answer is %s, with only the notes the claim names", (_clm, featureCode, answer, notes) => {
    const repository = repositoryForTest();
    repository.write("old.txt", "CLM-OLD-007\n");
    repository.commit("old");
    repository.write("old.txt", "gone\n");
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-003"));
    repository.commit("first");

    const outcome = allocate({ featureCode, asNewFeatureCode: true }, repository.top);

    expect({ outcome, written: notesWritten(outcome) }).toEqual({ outcome: { answer, notes }, written: notes.map(({ note, featureCode: about }) => noted(note, about)) });
  });

  it("[CLM-STG-086] --new in a repository with no features folder gives the feature code's first claim code", () => {
    const repository = repositoryForTest();
    repository.write("README.md", "nothing\n");
    repository.commit("first");

    expect(allocate({ featureCode: "ZZ", asNewFeatureCode: true }, repository.top)).toEqual({ answer: "CLM-ZZ-001", notes: [] });
  });
});

// A repository whose history once held a higher ONE code, and its shallow clone from after that line: the clone and its first commit.
function shallowCloneAfterTheLine(): { readonly top: string; readonly firstCommit: string } {
  const original = repositoryForTest();
  original.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
  original.write("old.txt", "CLM-ONE-005\n");
  original.commit("first");
  original.write("old.txt", "gone\n");
  original.commit("second");
  return shallowCloneOf(original);
}

// A copy of a repository whose history once held a higher ONE code, with no git: only its files.
function copyWithNoGit(): string {
  const copy = folderForTest();
  copy.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
  return copy.top;
}

describe("allocate says what history it did not read", () => {
  it("[CLM-STG-075] the developer's copy is not a git repository: the answer is CLM-ONE-002, noting that no history was read", () => {
    const outcome = allocate(ONE, copyWithNoGit());

    expect(outcome).toMatchObject({ answer: "CLM-ONE-002" });
    expect("notes" in outcome ? outcome.notes : []).toContainEqual({ note: "no-history-read" });
    expect(notesWritten(outcome)).toContain(noted("no-history-read"));
  });

  it("[CLM-STG-075] the developer's copy is not a git repository, and the developer's git speaks German: the answer is CLM-ONE-002, noting that no history was read", () => {
    environmentForTest({ LANG: "en_US.UTF-8", LANGUAGE: "de" });

    expect(allocate(ONE, copyWithNoGit())).toEqual({ answer: "CLM-ONE-002", notes: [{ note: "highest-seen", code: "CLM-ONE-001", path: "features/one.feature", line: 4 }, { note: "no-history-read" }] });
  });

  it("[CLM-STG-076] the developer's copy is a shallow clone from after that line: the answer is CLM-ONE-002, noting that history before the clone's first commit was not read", () => {
    const { top, firstCommit } = shallowCloneAfterTheLine();
    const outcome = allocate(ONE, top);

    expect(outcome).toMatchObject({ answer: "CLM-ONE-002" });
    expect("notes" in outcome ? outcome.notes : []).toContainEqual({ note: "history-before", commit: firstCommit });
    expect(notesWritten(outcome)).toContain(noted("history-before", firstCommit));
  });

  it("[CLM-STG-087] with no git repository and no code seen, --new ZZ answers CLM-ZZ-001, noting that no history was read", () => {
    expect(allocate({ featureCode: "ZZ", asNewFeatureCode: true }, copyWithNoGit())).toEqual({ answer: "CLM-ZZ-001", notes: [{ note: "no-history-read" }] });
  });

  it("[CLM-STG-088] in a shallow clone, with no code seen, --new ZZ answers CLM-ZZ-001, noting that history before the clone's first commit was not read", () => {
    const { top, firstCommit } = shallowCloneAfterTheLine();

    expect(allocate({ featureCode: "ZZ", asNewFeatureCode: true }, top)).toEqual({ answer: "CLM-ZZ-001", notes: [{ note: "history-before", commit: firstCommit }] });
  });
});

// A repository whose feature file holds the first ONE code, so an answer, where there is one, is the second.
function repositoryOfOne() {
  const repository = repositoryForTest();
  repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
  repository.commit("first");
  return repository;
}

const stoppedOn = (key: string, values: Readonly<Record<string, unknown>>) => ({ stop: "usage-error", refusal: { key, values } });

// What git said, as a refusal names it, and whether that is git's words without the newline git ends them with.
function whatGitSaid(outcome: AllocateOutcome): { readonly said: unknown; readonly asWords: boolean } {
  const said = "refusal" in outcome ? outcome.refusal.values["said"] : undefined;
  return { said, asWords: typeof said === "string" && said === said.trim() };
}

describe("allocate names what it could not read, and gives no code", () => {
  it("[CLM-STG-072] a file git cannot read stops it as a usage error, naming what it could not read, and what git said", () => {
    const repository = repositoryOfOne();
    repository.write("secret.txt", "kept\n");
    repository.commit("second");
    chmodSync(`${repository.top}/secret.txt`, 0o000);

    expect(allocate(ONE, repository.top)).toEqual(stoppedOn("unreadable-in-tree", { path: "secret.txt", said: expect.stringContaining("Permission denied") }));
  });

  it("[CLM-STG-073] history git failed to read stops it as a usage error, naming what it could not read", () => {
    const repository = repositoryOfOne();
    const blob = repository.git("rev-parse", "HEAD:features/one.feature");
    rmSync(`${repository.top}/.git/objects/${blob.slice(0, 2)}/${blob.slice(2)}`);

    const outcome = allocate(ONE, repository.top);

    expect({ outcome, asWords: whatGitSaid(outcome).asWords }).toEqual({ outcome: stoppedOn("unreadable-history", { said: expect.stringContaining(blob) }), asWords: true });
  });

  it("[CLM-STG-074] a damaged repository stops it as a usage error, naming what it could not read, and what git said", () => {
    const repository = repositoryOfOne();
    appendFileSync(`${repository.top}/.git/config`, "[[[\n");

    const outcome = allocate(ONE, repository.top);

    expect({ outcome, asWords: whatGitSaid(outcome).asWords }).toEqual({ outcome: stoppedOn("damaged-repository", { said: expect.stringContaining("config") }), asWords: true });
  });

  it("[CLM-STG-074] a repository whose configuration gives searching a value git cannot read stops it as a usage error, naming what it could not read, and what git said", () => {
    const repository = repositoryOfOne();
    repository.git("config", "grep.lineNumber", "not-a-boolean");

    const outcome = allocate(ONE, repository.top);

    expect({ outcome, asWords: whatGitSaid(outcome).asWords }).toEqual({
      outcome: stoppedOn("unreadable-in-tree", { path: realpathSync(repository.top), said: expect.stringContaining("grep.linenumber") }),
      asWords: true,
    });
  });

  it("[CLM-STG-085] a folder in the tree it cannot read stops it as a usage error, naming what it could not read", () => {
    const copy = folderForTest();
    copy.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    copy.write("locked/inside.txt", "kept\n");
    chmodSync(`${copy.top}/locked`, 0o000);

    expect(allocate(ONE, copy.top)).toEqual(stoppedOn("unreadable-in-tree", { path: "locked/", said: expect.stringContaining("Permission denied") }));
  });

  it("[CLM-STG-093] a file in the tree it cannot read stops it as a usage error, naming what it could not read", () => {
    const copy = folderForTest();
    copy.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    copy.write("locked.txt", "kept\n");
    chmodSync(`${copy.top}/locked.txt`, 0o000);

    expect(allocate(ONE, copy.top)).toEqual(stoppedOn("unreadable-in-tree", { path: "locked.txt", said: expect.stringContaining("Permission denied") }));
  });

  it("[CLM-STG-089] a feature file that does not parse stops it as a usage error, naming what it could not read", () => {
    const repository = repositoryOfOne();
    repository.write("features/broken.feature", "@TWO\nnot a feature at all\n");
    repository.commit("second");

    expect(allocate(ONE, repository.top)).toEqual(stoppedOn("feature-file-does-not-parse", { file: "features/broken.feature" }));
  });

  it("[CLM-STG-090] allocate still answers when a nested checkout holds a folder it cannot read", () => {
    const repository = repositoryOfOne();
    nestedCheckoutIn(repository, "nested");
    repository.write("nested/locked/inside.txt", "kept\n");
    chmodSync(`${repository.top}/nested/locked`, 0o000);

    expect(allocate(ONE, repository.top)).toMatchObject({ answer: "CLM-ONE-002" });
  });
});

describe("history and the feature files, read whole", () => {
  it("[CLM-STG-062] a line in git history, since deleted, that read ++ CLM-ONE-005: the answer is CLM-ONE-006", () => {
    const repository = repositoryOfOne();
    repository.write("old.txt", "++ CLM-ONE-005\n");
    repository.commit("second");
    repository.write("old.txt", "gone\n");
    repository.commit("third");

    expect(allocate(ONE, repository.top)).toMatchObject({ answer: "CLM-ONE-006" });
  });

  it("[CLM-STG-062] a line in git history, written only in a merge's resolution and since deleted, had CLM-ONE-005: the answer is CLM-ONE-006", () => {
    const repository = repositoryOfOne();
    repository.write("clash.txt", "base\n");
    repository.commit("base");
    repository.git("checkout", "--quiet", "-b", "side");
    repository.write("clash.txt", "side\n");
    repository.commit("side");
    repository.git("checkout", "--quiet", "-");
    repository.write("clash.txt", "main\n");
    repository.commit("main");
    expect(() => repository.git("merge", "--quiet", "side")).toThrow();
    repository.write("clash.txt", "CLM-ONE-005\n");
    repository.commit("merged");
    repository.write("clash.txt", "gone\n");
    repository.commit("after");

    expect(allocate(ONE, repository.top)).toMatchObject({ answer: "CLM-ONE-006" });
  });

  it("[CLM-STG-093] a feature file in the features folder it cannot read stops it as a usage error, naming what it could not read", () => {
    const repository = repositoryOfOne();
    repository.write("features/two.feature", featureFile("TWO", "CLM-TWO-001"));
    repository.commit("second");
    chmodSync(`${repository.top}/features/two.feature`, 0o000);

    expect(allocate(ONE, repository.top)).toMatchObject({ stop: "usage-error", refusal: { key: "unreadable-in-tree", values: { path: "features/two.feature" } } });
  });
});
