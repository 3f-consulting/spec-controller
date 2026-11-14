import { appendFileSync, chmodSync, realpathSync, rmSync } from "node:fs";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { allocate, type AllocateOutcome } from "../../../spec-controller/src/commands/allocate.js";
import appCatalogue from "../../../spec-controller/src/messages/messages.en.json" with { type: "json" };
import { noteText } from "../../../spec-controller/src/output/allocateNotes.js";
import allocateVariants from "../../../spec-controller/src/commands/allocate.variants.json" with { type: "json" };
import { main } from "../../../spec-controller/src/commands/main.js";
import { featureFile, folderForTest, nestedCheckoutIn, repositoryForTest, shallowCloneOf, type TestRepository } from "../../../spec-controller/src/repository/repository.test-utils.js";
import { textFor } from "../messages/catalogue.js";

const answerAndHighest = (outcome: AllocateOutcome) =>
  "answer" in outcome ? { answer: outcome.answer, highest: outcome.notes.find(({ note }) => note === "highest-seen") } : outcome;

// The notes as the developer reads them beside the answer.
const notesWritten = (outcome: AllocateOutcome): readonly string[] => ("notes" in outcome ? outcome.notes.map(noteText) : []);

// A note's words, as the catalogue gives them, followed by what it is about.
const noted = (note: string, about?: string): string => (about === undefined ? textFor(appCatalogue, note) : `${textFor(appCatalogue, note)}: ${about}`);

const ONE = { featureCode: "ONE", asNewFeatureCode: false };

// A code seen, where it was, and the commit that had it, if it was seen in history; and where the developer stood.
interface Seen {
  readonly code: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
  readonly standIn?: string;
}

// Each variant's repository, beside a feature file tagged @ONE whose scenario is tagged with a claim code under it.
const SEEN_IN_A_FILE_NOW: Readonly<Record<string, (repository: TestRepository) => Seen>> = {
  "a file git tracks": (repository) => {
    repository.write(".github/workflows/ci.yml", "jobs: {}\n# CLM-ONE-005\n");
    repository.commit("first");
    return { code: "CLM-ONE-005", path: ".github/workflows/ci.yml", line: 2 };
  },
  "a new file git does not ignore": (repository) => {
    repository.commit("first");
    repository.write("new.test.ts", "// CLM-ONE-005\n");
    return { code: "CLM-ONE-005", path: "new.test.ts", line: 1 };
  },
  "a file at the top seen from a subfolder": (repository) => {
    repository.write("top.txt", "CLM-ONE-005\n");
    repository.write("deep/down/empty.txt", "nothing here\n");
    repository.commit("first");
    return { code: "CLM-ONE-005", path: "top.txt", line: 1, standIn: `${repository.top}/deep/down` };
  },
  "a retired SCN code in a tracked file": (repository) => {
    repository.write("retired.txt", "SCN-ONE-005\n");
    repository.commit("first");
    return { code: "SCN-ONE-005", path: "retired.txt", line: 1 };
  },
};

// A line holding the code, committed and then deleted: the file and line it was in, and the commit that had it. A line
// above it begins "++ ", which history shows as "+++ ", as it shows a file's name.
function deletedLine(repository: TestRepository, code: string): Seen {
  repository.write("old.txt", `kept\n++ added\n${code}\n`);
  const commit = repository.commit("first");
  repository.write("old.txt", "kept\n");
  repository.commit("second");
  return { code, path: "old.txt", line: 3, commit };
}

const SEEN_IN_HISTORY: Readonly<Record<string, (repository: TestRepository) => Seen>> = {
  "a line since deleted": (repository) => deletedLine(repository, "CLM-ONE-005"),
  "a merge's resolution that neither side had": (repository) => {
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
    const commit = repository.commit("merged");
    repository.write("clash.txt", "gone\n");
    repository.commit("after");
    return { code: "CLM-ONE-005", path: "clash.txt", line: 1, commit };
  },
  "a retired SCN code in a deleted line": (repository) => deletedLine(repository, "SCN-ONE-005"),
};

// What each variant leaves for allocate not to count, as files and a commit message.
const NOT_COUNTED: Readonly<Record<string, readonly [files: Readonly<Record<string, string>>, message: string]>> = {
  "a malformed retired code": [{ "partial.txt": "SCN-ONE-\n" }, "first"],
  "a code only in a commit message": [{}, "first CLM-ONE-900"],
  "a code only in a file git ignores": [{ ".gitignore": "ignored.txt\n", "ignored.txt": "CLM-ONE-900\n" }, "first"],
};

function repositoryWithTheFeatureFile(): TestRepository {
  const repository = repositoryForTest();
  repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
  return repository;
}

const highestNoted = ({ code, path, line, commit }: Seen) => ({ note: "highest-seen", code, path, line, ...(commit === undefined ? {} : { commit }) });

describe("the answer is one past the highest code in the feature file, a tracked file or history", () => {
  it.each(allocateVariants["CLM-STG-061"].variants)("[CLM-STG-061] the feature file's scenario was tagged @CLM-ONE-001, and %s contained a higher ONE code: the answer will be CLM-ONE-006, and nothing else, noting the highest code it saw, and that file and line", (variant) => {
    const repository = repositoryWithTheFeatureFile();
    const seen = SEEN_IN_A_FILE_NOW[variant]!(repository);

    const outcome = allocate(ONE, seen.standIn ?? repository.top);

    expect({ ...answerAndHighest(outcome), written: notesWritten(outcome) }).toEqual({
      answer: "CLM-ONE-006",
      highest: highestNoted(seen),
      written: [noted("highest-seen", `${seen.code}, ${seen.path}:${seen.line}`)],
    });
  });

  it.each(allocateVariants["CLM-STG-062"].variants)("[CLM-STG-062] the feature file's scenario was tagged @CLM-ONE-001, and git history had a higher ONE code in %s: the answer will be CLM-ONE-006, and nothing else, noting the highest code it saw, the file and line it was in, and the commit", (variant) => {
    const repository = repositoryWithTheFeatureFile();
    const seen = SEEN_IN_HISTORY[variant]!(repository);

    const outcome = allocate(ONE, repository.top);

    expect({ ...answerAndHighest(outcome), written: notesWritten(outcome) }).toEqual({
      answer: "CLM-ONE-006",
      highest: highestNoted(seen),
      written: [noted("highest-seen", `${seen.code}, ${seen.path}:${seen.line}@${seen.commit}`)],
    });
  });

  it.each(allocateVariants["CLM-STG-065"].variants)("[CLM-STG-065] the feature file's scenario was tagged @CLM-ONE-001, and the repository had %s: the answer will be CLM-ONE-002, and nothing else, noting the feature file and line", (variant) => {
    const repository = repositoryWithTheFeatureFile();
    const [files, message] = NOT_COUNTED[variant]!;
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
  ] as const)("[%s] the feature file's scenario was tagged @%s and nothing else contained a ONE code: the answer will be %s, and nothing else, noting the feature file and line", (_clm, code, answer) => {
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

describe("with no code seen, the answer is the feature code's first claim code", () => {
  it("[CLM-STG-098] a feature file tagged @ONE had no claim code, and nothing else contained a ONE code: the answer will be CLM-ONE-001, and nothing else, with no note", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", "@ONE\nFeature: one\n");
    repository.commit("first");

    expect(allocate(ONE, repository.top)).toEqual({ answer: "CLM-ONE-001", notes: [] });
  });
});

describe("the answer is one past the highest code in the feature file, a tracked file or history, by what git reads", () => {
  it("[CLM-STG-065] a code only in a file the developer's own git configuration ignores: the answer will be CLM-ONE-002, and nothing else, noting the feature file and line", () => {
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

  it("[CLM-STG-062] a line in git history, since deleted, had CLM-ONE-005 in a file whose name holds a space: the answer is CLM-ONE-006, noting the file and line it was in, and the commit", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("old notes.txt", "kept\nCLM-ONE-005\n");
    const commit = repository.commit("first");
    repository.write("old notes.txt", "kept\n");
    repository.commit("second");

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "CLM-ONE-005", path: "old notes.txt", line: 2, commit },
    });
  });

  it("[CLM-STG-062] a line in git history, since deleted, had CLM-ONE-005 in the second of two files one commit changed: the answer is CLM-ONE-006, noting the file and line it was in, and the commit", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("a.txt", "CLM-ONE-003\n");
    repository.write("b.txt", "kept\nCLM-ONE-005\n");
    const commit = repository.commit("first");
    repository.write("a.txt", "gone\n");
    repository.write("b.txt", "kept\n");
    repository.commit("second");

    expect(answerAndHighest(allocate(ONE, repository.top))).toEqual({
      answer: "CLM-ONE-006",
      highest: { note: "highest-seen", code: "CLM-ONE-005", path: "b.txt", line: 2, commit },
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

describe("allocate gives a code only under a feature code a feature file has, unless asked for a new one", () => {
  it("[CLM-STG-083] the only feature file tagged @NEST, two folders down, had a scenario tagged @CLM-NEST-004: the answer for NEST will be CLM-NEST-005, and nothing else", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("features/deep/er/nest.feature", featureFile("NEST", "CLM-NEST-004"));
    repository.commit("first");

    expect(answerAndHighest(allocate({ featureCode: "NEST", asNewFeatureCode: false }, repository.top))).toMatchObject({ answer: "CLM-NEST-005" });
  });

  // What each variant leaves of ZZZ, beside feature files tagged @ONE and @TWO.
  const ZZZ_LEFT: Readonly<Record<string, (repository: TestRepository) => void>> = {
    "mentioned nowhere": (repository) => {
      repository.commit("first");
    },
    "only on a test fixture's feature file": (repository) => {
      repository.write("tests/fixtures/zzz.feature", featureFile("ZZZ", "CLM-ZZZ-001"));
      repository.commit("first");
    },
    "only on a feature file a later commit deleted": (repository) => {
      repository.write("features/zzz.feature", featureFile("ZZZ", "CLM-ZZZ-001"));
      repository.commit("first");
      repository.git("rm", "--quiet", "features/zzz.feature");
      repository.commit("second");
    },
  };

  const UNKNOWN_ZZZ = { stop: "unknown-feature-code", refusal: { key: "unknown-feature-code", values: { featureCode: "ZZZ", featureCodes: "ONE, TWO" } } };

  it.each(allocateVariants["CLM-STG-077"].variants)("[CLM-STG-077] feature files were tagged @ONE and @TWO, and ZZZ was %s: the next code for ZZZ will stop as an unknown feature code, give no code, and list ONE and TWO, in alphabetical order", (variant) => {
    const repository = repositoryForTest();
    repository.write("features/two.feature", featureFile("TWO", "CLM-TWO-001"));
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    ZZZ_LEFT[variant]!(repository);

    expect(allocate({ featureCode: "ZZZ", asNewFeatureCode: false }, repository.top)).toEqual(UNKNOWN_ZZZ);
  });

  it("[CLM-STG-077] feature files were tagged @ONE and @TWO, one had no feature code, and none was tagged @ZZZ: the next code for ZZZ will stop as an unknown feature code, give no code, and list ONE and TWO", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.write("features/two.feature", featureFile("TWO", "CLM-TWO-001"));
    repository.write("features/plain.feature", "Feature: plain\n");
    repository.commit("first");

    expect(allocate({ featureCode: "ZZZ", asNewFeatureCode: false }, repository.top)).toEqual(UNKNOWN_ZZZ);
  });

  it("[CLM-CLI-202] a command line had a request to allocate that is not a feature code: the run will stop, give no verdict and exit 2, and complain, naming the request, as not a feature code", () => {
    const repository = repositoryForTest();
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    repository.commit("first");
    const written = { output: "", error: "" };

    const exitCode = main(["allocate", "one"], repository.top, {
      output: { fd: 1, write: (text) => (written.output += text) },
      error: { fd: 2, write: (text) => (written.error += text) },
    });

    expect({ exitCode, output: written.output, complaint: ["one", "[not-a-feature-code]"].filter((fact) => !written.error.includes(fact)) }).toEqual({
      exitCode: 2,
      output: "",
      complaint: [],
    });
  });

  it.each([
    ["CLM-STG-080", "ZZ", "CLM-ZZ-001", []],
    ["CLM-STG-081", "ONE", "CLM-ONE-004", [{ note: "feature-code-on-a-file", featureCode: "ONE" }]],
    ["CLM-STG-082", "OLD", "CLM-OLD-008", []],
  ] as const)("[%s] a feature file tagged @ONE had a scenario tagged @CLM-ONE-003, and history once contained CLM-OLD-007: the next code for %s, as a new feature code, will be %s, and nothing else, with only the note the claim names", (_clm, featureCode, answer, notes) => {
    const repository = repositoryForTest();
    repository.write("old.txt", "CLM-OLD-007\n");
    repository.commit("old");
    repository.write("old.txt", "gone\n");
    repository.write("features/one.feature", featureFile("ONE", "CLM-ONE-003"));
    repository.commit("first");

    const outcome = allocate({ featureCode, asNewFeatureCode: true }, repository.top);

    expect({ outcome, written: notesWritten(outcome) }).toEqual({ outcome: { answer, notes }, written: notes.map(({ note, featureCode: about }) => noted(note, about)) });
  });

  it("[CLM-STG-086] the repository had no features folder: the next code for ZZ, as a new feature code, will be CLM-ZZ-001, and nothing else", () => {
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

// Each variant's repository or copy, beside a feature file tagged @ONE, and the refusal that names what could not be read.
const UNREADABLE_BY_GIT: Readonly<Record<string, () => readonly [top: string, refusal: unknown]>> = {
  "a file": () => {
    const repository = repositoryOfOne();
    repository.write("secret.txt", "kept\n");
    repository.commit("second");
    chmodSync(`${repository.top}/secret.txt`, 0o000);
    return [repository.top, stoppedOn("unreadable-in-tree", { path: "secret.txt", said: expect.stringContaining("Permission denied") })];
  },
  "a damaged repository": () => {
    const repository = repositoryOfOne();
    appendFileSync(`${repository.top}/.git/config`, "[[[\n");
    return [repository.top, stoppedOn("damaged-repository", { said: expect.stringContaining("config") })];
  },
};

const UNREADABLE: Readonly<Record<string, () => readonly [top: string, refusal: unknown]>> = {
  history: () => {
    const repository = repositoryOfOne();
    const blob = repository.git("rev-parse", "HEAD:features/one.feature");
    rmSync(`${repository.top}/.git/objects/${blob.slice(0, 2)}/${blob.slice(2)}`);
    return [repository.top, stoppedOn("unreadable-history", { said: expect.stringContaining(blob) })];
  },
  "a folder in the tree": () => {
    const copy = folderForTest();
    copy.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    copy.write("locked/inside.txt", "kept\n");
    chmodSync(`${copy.top}/locked`, 0o000);
    return [copy.top, stoppedOn("unreadable-in-tree", { path: "locked/", said: expect.stringContaining("Permission denied") })];
  },
  "a file in the tree": () => {
    const copy = folderForTest();
    copy.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    copy.write("locked.txt", "kept\n");
    chmodSync(`${copy.top}/locked.txt`, 0o000);
    return [copy.top, stoppedOn("unreadable-in-tree", { path: "locked.txt", said: expect.stringContaining("Permission denied") })];
  },
  "a feature file that does not parse": () => {
    const repository = repositoryOfOne();
    repository.write("features/broken.feature", "@TWO\nnot a feature at all\n");
    repository.commit("second");
    return [repository.top, stoppedOn("feature-file-does-not-parse", { file: "features/broken.feature" })];
  },
};

describe("allocate stops when something it must read cannot be read", () => {
  it.each(allocateVariants["CLM-STG-072"].variants)("[CLM-STG-072] there was %s git cannot read: allocate will stop, naming what it could not read, and what git said, and it will give no code", (variant) => {
    const [top, refusal] = UNREADABLE_BY_GIT[variant]!();

    const outcome = allocate(ONE, top);

    expect({ outcome, asWords: whatGitSaid(outcome).asWords }).toEqual({ outcome: refusal, asWords: true });
  });

  it("[CLM-STG-072] there was a repository whose configuration gives searching a value git cannot read: allocate will stop, naming what it could not read, and what git said, and it will give no code", () => {
    const repository = repositoryOfOne();
    repository.git("config", "grep.lineNumber", "not-a-boolean");

    const outcome = allocate(ONE, repository.top);

    expect({ outcome, asWords: whatGitSaid(outcome).asWords }).toEqual({
      outcome: stoppedOn("unreadable-in-tree", { path: realpathSync(repository.top), said: expect.stringContaining("grep.linenumber") }),
      asWords: true,
    });
  });

  it.each(allocateVariants["CLM-STG-073"].variants)("[CLM-STG-073] there was %s that allocate could not read: allocate will stop, naming what it could not read, and it will give no code", (variant) => {
    const [top, refusal] = UNREADABLE[variant]!();

    expect(allocate(ONE, top)).toEqual(refusal);
  });

  it("[CLM-STG-073] there was a folder in the features folder that allocate could not read: allocate will stop, naming what it could not read, and it will give no code", () => {
    const copy = folderForTest();
    copy.write("features/one.feature", featureFile("ONE", "CLM-ONE-001"));
    copy.write("features/locked/two.feature", featureFile("TWO", "CLM-TWO-001"));
    chmodSync(`${copy.top}/features/locked`, 0o000);

    expect(allocate(ONE, copy.top)).toEqual(stoppedOn("unreadable-in-tree", { path: "features/locked", said: expect.stringContaining("permission denied") }));
  });

  it("[CLM-STG-090] a nested checkout, such as a submodule, had a folder in it that allocate could not read: the answer for ONE will be CLM-ONE-002, and nothing else", () => {
    const repository = repositoryOfOne();
    nestedCheckoutIn(repository, "nested");
    repository.write("nested/locked/inside.txt", "kept\n");
    chmodSync(`${repository.top}/nested/locked`, 0o000);

    expect(allocate(ONE, repository.top)).toMatchObject({ answer: "CLM-ONE-002" });
  });
});
