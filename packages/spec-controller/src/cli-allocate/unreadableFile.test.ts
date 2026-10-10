import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { git, taken, withhold } from "./repository.testkit.js";
import { allocateFrom, expectAnsweredWith } from "./answered.testkit.js";
import type { Answered } from "./answered.testkit.js";

function writeInto(root: string, path: string, content: string | Buffer): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const made: string[] = [];

function repository(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-unreadable-file-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
  writeInto(repo, "docs/notes.md", "Cites SCN-ONE-003.\n");
  mkdirSync(join(repo, "src"));
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  while (made.length > 0) rmSync(made.pop() ?? "", { recursive: true, force: true });
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function refusalReason(answered: Answered, subject: string, path: string): string {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  const opening = `spec-controller allocate: usage error — ${subject} could not be read: ${path} (`;
  expect(answered.stderr.startsWith(opening)).toBe(true);
  expect(answered.stderr.endsWith(")\n")).toBe(true);
  expect(answered.stderr.split("\n")).toHaveLength(2);
  return answered.stderr.slice(opening.length, -2);
}

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
  subject: string;
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
    subject: "a file in the tree",
  },
  {
    file: "an untracked file, drafts/new.md",
    unreadable: "allocate is not permitted to list its directory",
    withheld: itsDirectory,
    where: "its top",
    named: theDraftsDirectory,
    subject: "a directory in the tree",
  },
  {
    file: "an untracked file, drafts/new.md",
    unreadable: "allocate may list its directory but not enter it",
    withheld: itsDirectoryListedButNotEntered,
    where: "its top",
    named: theDraftsDirectory,
    subject: "a directory in the tree",
  },
  {
    file: "a tracked file with an edit not yet committed, docs/notes.md",
    unreadable: "allocate is not permitted to read it",
    withheld: theFile,
    where: "its top",
    named: theNotes,
    subject: "a file in the tree",
  },
  {
    file: "the feature file, with an edit not yet committed",
    unreadable: "allocate is not permitted to list the repository's top",
    withheld: (repo) => [repo, 0o100],
    where: "a subdirectory",
    named: (repo) => repo,
    subject: "a directory in the tree",
  },
];

const runsAsRoot = (): boolean => process.getuid?.() === 0;

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

      expect(refusalReason(answered, subject, named(repo))).toMatch(/^(EACCES|EPERM): /);
    },
  );

  it("refuses ONE, naming the tree, when git cannot list the repository's files", () => {
    const repo = repository();
    writeFileSync(join(repo, ".git", "index"), "not an index\n");

    expect(refusalReason(allocateFrom(repo), "the tree", repo)).toMatch(/^git ls-files exited 128: \S/);
  });

  it("answers ONE past a code in the last of a listing many kilobytes long, read whole", () => {
    const repo = repository();
    const stem = "a-file-whose-name-is-long-enough-that-two-hundred-of-them-list-to-many-kilobytes";
    for (let n = 0; n < 200; n++) writeInto(repo, `notes/${stem}-${String(n).padStart(3, "0")}.md`, "No code here.\n");
    writeInto(repo, `notes/${stem}-199.md`, "Cites SCN-ONE-016.\n");
    expect(git(repo, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).length).toBeGreaterThan(16 * 1024);

    expectAnsweredWith(allocateFrom(repo), "SCN-ONE-017");
  });

  it("reads no code from a tracked binary file, answering past the codes in text alone", () => {
    const repo = repository();
    writeInto(repo, "assets/logo.bin", Buffer.concat([Buffer.from("Cites SCN-ONE-016.\n"), Buffer.from([0, 1, 2, 3])]));
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-q", "-m", "a binary asset"]);

    expectAnsweredWith(allocateFrom(repo), "SCN-ONE-004");
  });
});
