import type { ClaimCodeOccurrence, HistoryBoundary } from "@3f-consulting/spec-controller-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Refusal } from "../runEnding/runEnding.js";
import { gitIn } from "./git.js";

// What a read gave, or why it could not be made: a failed read stops allocate.
export type Read<Value> = { readonly read: Value } | { readonly refusal: Refusal };

export type Standing = { readonly in: "repository"; readonly top: string } | { readonly in: "folder"; readonly top: string };

// Where allocate reads from: the top of the repository the developer stands in, or the folder itself outside git.
export function standingOf(folder: string): Read<Standing> {
  const { status, stdout, stderr } = gitIn(folder, ["rev-parse", "--show-toplevel"]);
  if (status === 0) return { read: { in: "repository", top: stdout.trim() } };
  if (stderr.includes("not a git repository")) return { read: { in: "folder", top: folder } };
  return { refusal: { key: "damaged-repository", values: { said: stderr.trim() } } };
}

// git names a file or folder it could not read on its error stream, whatever its exit status says.
const UNREADABLE = /(?:error: failed to stat '(.+)'|warning: could not open directory '(.+)'):.*/;

const codesOf = (featureCode: string): string => `(CLM|SCN)-${featureCode}-[0-9]`;

// Every line in the tree that may write one of the feature code's codes, from git: tracked and new files, ignored ones left out.
export function treeLines({ in: where, top }: Standing, featureCode: string): Read<ClaimCodeOccurrence[]> {
  const { status, stdout, stderr } = gitIn(top, ["grep", "-n", "-z", "-I", where === "repository" ? "--untracked" : "--no-index", "-E", codesOf(featureCode)]);
  const unreadable = UNREADABLE.exec(stderr);
  if (unreadable !== null) return { refusal: { key: "unreadable-in-tree", values: { path: unreadable[1] ?? unreadable[2]!, said: unreadable[0] } } };
  // git grep exits 1 for no line found; anything else is a failure to read.
  if (status !== 0 && status !== 1) return { refusal: { key: "unreadable-in-tree", values: { path: top, said: stderr.trim() } } };
  // git ends each line found with a newline and parts it with NULs; it reads no file it takes for binary, so no text has one.
  const lines = stdout.split("\n").slice(0, -1).map((record) => {
    const [path, line, text] = record.split("\0") as [string, string, string];
    return { text, path, line: Number(line) };
  });
  return { read: lines };
}

const HUNK = /^@@ -\S+ \+(\d+)/;

// Every line history has added that may write one of the feature code's codes, with its file, line and commit; a merge
// is read against its first parent, so a line written in its resolution counts. Messages are not read.
export function historyLines(top: string, featureCode: string): Read<ClaimCodeOccurrence[]> {
  const { status, stdout, stderr } = gitIn(top, [
    "log",
    "--all",
    "--diff-merges=first-parent",
    "-G",
    codesOf(featureCode),
    "-p",
    "--unified=0",
    "--no-prefix",
    "--format=commit:%H",
    "--no-color",
    "--no-ext-diff",
  ]);
  if (status !== 0) return { refusal: { key: "unreadable-history", values: { said: stderr.trim() } } };
  const occurrences: ClaimCodeOccurrence[] = [];
  let commit!: string;
  let path!: string;
  // Until a file's first hunk, it is in its header, where +++ starts its new name. An added line keeps its +, no code's part.
  let line: number | undefined;
  for (const text of stdout.split("\n")) {
    if (text.startsWith("commit:")) commit = text.slice("commit:".length);
    else if (text.startsWith("diff ")) line = undefined;
    else if (line === undefined && text.startsWith("+++ ")) path = text.slice("+++ ".length);
    else if (HUNK.test(text)) line = Number(HUNK.exec(text)![1]);
    else if (line !== undefined && text.startsWith("+")) occurrences.push({ text, path, line: line++, commit });
  }
  return { read: occurrences };
}

// How much history there was to read: none outside git, and in a shallow clone nothing before its first commit.
export function historyBoundaryOf({ in: where, top }: Standing): HistoryBoundary {
  if (where === "folder") return { kind: "not-a-repository" };
  if (gitIn(top, ["rev-parse", "--is-shallow-repository"]).stdout.trim() !== "true") return { kind: "complete" };
  const shallow = resolve(top, gitIn(top, ["rev-parse", "--git-path", "shallow"]).stdout.trim());
  return { kind: "shallow", before: readFileSync(shallow, "utf8").split("\n")[0]! };
}
