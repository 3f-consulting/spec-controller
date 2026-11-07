import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { git, writeInto, taken, withhold, runsAsRoot, repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateFrom, expectAnsweredEnding, gitExited, refusalReason } from "./answered.test-utils.js";
import { AppMessage, Unreadable } from "../messages.js";
import { message } from "../appText.js";

function repository(): string {
  const repo = repositoryHeadedOneCarrying003("allocate-unreadable-file-", { "docs/notes.md": "Cites SCN-ONE-003.\n" });
  mkdirSync(join(repo, "src"));
  return repo;
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function writeAnUntrackedDraft(repo: string): void {
  writeInto(repo, "drafts/new.md", "Cites SCN-ONE-016.\n");
}

function editTheTrackedNotes(repo: string): void {
  writeInto(repo, "docs/notes.md", "Cites SCN-ONE-016.\n");
}

function editTheFeatureFile(repo: string): void {
  const path = join(repo, "features", "one.feature");
  writeFileSync(path, `${readFileSync(path, "utf8")}\n  @SCN-ONE-016 @unit\n  Scenario: a new scenario\n    Given a step\n`);
}

const CARRIERS = {
  "an untracked file, drafts/new.md": { path: "drafts/new.md", write: writeAnUntrackedDraft },
  "a tracked file with an edit not yet committed, docs/notes.md": {
    path: "docs/notes.md",
    write: editTheTrackedNotes,
  },
  "the feature file, with an edit not yet committed": {
    path: "features/one.feature",
    write: editTheFeatureFile,
  },
} as const;

interface Row {
  file: keyof typeof CARRIERS;
  unreadable: string;
  withheld: (repo: string, file: string) => [path: string, mode: number];
  where: "its top" | "a subdirectory";
  named: (repo: string) => string;
  subject: Unreadable;
}

function theFile(repo: string, file: string): [path: string, mode: number] {
  return [join(repo, file), 0o000];
}

function itsDirectory(repo: string, file: string): [path: string, mode: number] {
  return [dirname(join(repo, file)), 0o000];
}

function itsDirectoryListedButNotEntered(repo: string, file: string): [path: string, mode: number] {
  return [dirname(join(repo, file)), 0o600];
}

function theDraft(repo: string): string {
  return join(repo, "drafts", "new.md");
}

function theDraftsDirectory(repo: string): string {
  return join(repo, "drafts");
}

function theNotes(repo: string): string {
  return join(repo, "docs", "notes.md");
}

const EXAMPLES: readonly Row[] = [
  {
    file: "an untracked file, drafts/new.md",
    unreadable: "allocate is not permitted to read it",
    withheld: theFile,
    where: "its top",
    named: theDraft,
    subject: Unreadable.TreeFile,
  },
  {
    file: "an untracked file, drafts/new.md",
    unreadable: "allocate is not permitted to list its directory",
    withheld: itsDirectory,
    where: "its top",
    named: theDraftsDirectory,
    subject: Unreadable.TreeDirectory,
  },
  {
    file: "an untracked file, drafts/new.md",
    unreadable: "allocate may list its directory but not enter it",
    withheld: itsDirectoryListedButNotEntered,
    where: "its top",
    named: theDraftsDirectory,
    subject: Unreadable.TreeDirectory,
  },
  {
    file: "a tracked file with an edit not yet committed, docs/notes.md",
    unreadable: "allocate is not permitted to read it",
    withheld: theFile,
    where: "its top",
    named: theNotes,
    subject: Unreadable.TreeFile,
  },
  {
    file: "the feature file, with an edit not yet committed",
    unreadable: "allocate is not permitted to list the repository's top",
    withheld: (repo) => [repo, 0o100],
    where: "a subdirectory",
    named: (repo) => repo,
    subject: Unreadable.TreeDirectory,
  },
];

describe("[SCN-ALC-020] a file in the repository git cannot read is refused, never left out of the answer", () => {
  // On macOS, git resolving a working directory beneath a top it may not list scans every ancestor, so a crowded temporary directory can take seconds.
  it.for(EXAMPLES)(
    "refuses ONE when $file carries a higher code and $unreadable, standing in $where, naming it",
    { timeout: 30_000 },
    ({ file, withheld, where, named, subject }, { skip }) => {
      skip(runsAsRoot());
      const repo = repository();
      const carrier = CARRIERS[file];
      carrier.write(repo);
      const [path, mode] = withheld(repo, carrier.path);
      withhold(path, mode);

      const answered = allocateFrom(where === "its top" ? repo : join(repo, "src"));

      expect(refusalReason(answered, message(subject), named(repo))).toMatch(/^(EACCES|EPERM): /);
    },
  );

  it("refuses ONE, naming the tree, when git cannot list the repository's files", () => {
    const repo = repository();
    writeFileSync(join(repo, ".git", "index"), "not an index\n");

    expect(refusalReason(allocateFrom(repo), message(AppMessage.Tree), repo)).toMatch(gitExited("ls-files", 128));
  });

  it("answers ONE past a code in the last of a listing many kilobytes long, read whole", () => {
    const repo = repository();
    const stem = "a-file-whose-name-is-long-enough-that-two-hundred-of-them-list-to-many-kilobytes";
    for (let n = 0; n < 200; n++) writeInto(repo, `notes/${stem}-${String(n).padStart(3, "0")}.md`, "No code here.\n");
    writeInto(repo, `notes/${stem}-199.md`, "Cites SCN-ONE-016.\n");
    expect(git(repo, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).length).toBeGreaterThan(16 * 1024);

    expectAnsweredEnding(allocateFrom(repo), "ONE-017");
  });

  it("reads no code from a tracked binary file, answering past the codes in text alone", () => {
    const repo = repository();
    writeInto(repo, "assets/logo.bin", Buffer.concat([Buffer.from("Cites SCN-ONE-016.\n"), Buffer.from([0, 1, 2, 3])]));
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-q", "-m", "a binary asset"]);

    expectAnsweredEnding(allocateFrom(repo), "ONE-004");
  });
});
