import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ClaimCodeOccurrence } from "@3f-consulting/spec-controller-core";
import { proveRefsReadable } from "./refStore.js";
import { AppMessage } from "../messages.js";
import { gitExited, readOrRefuse, refuse, UnreadableInput } from "./unreadable.js";

export type HistoryBoundary = { kind: "complete" } | { kind: "not-a-repository" } | { kind: "shallow"; before: string };

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

const COMMIT_MARKER = "\u0001";

export function readHistory(cwd: string, marks: readonly string[]): ClaimCodeOccurrence[] {
  proveRefsReadable(cwd);
  const args = ["log", "--all", "-p", "-U0", "--no-color", "--no-ext-diff", "--format=%x01%h", "-G", `(${marks.join("|")})`];
  const result = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES });
  if (result.error !== undefined) refuse(AppMessage.History, cwd, result.error);
  if (result.status !== 0) {
    throw new UnreadableInput(AppMessage.History, cwd, gitExited(args, result.status, result.stderr));
  }
  return diffLineOccurrences(result.stdout);
}

function gitAnswer(cwd: string, args: readonly string[]): string | null {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function repositoryTop(cwd: string): string | null {
  const args = ["rev-parse", "--show-toplevel"];
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status === 0) return result.stdout.trim();
  const gitEntry = result.error === undefined ? gitEntryAtOrAbove(cwd) : null;
  if (gitEntry === null) return null;
  throw new UnreadableInput(AppMessage.Repository, gitEntry, gitExited(args, result.status, result.stderr));
}

function gitEntryAtOrAbove(dir: string): string | null {
  for (let at = dir; ; at = dirname(at)) {
    const entry = join(at, ".git");
    if (lstatSync(entry, { throwIfNoEntry: false }) !== undefined) return entry;
    if (dirname(at) === at) return null;
  }
}

function isGitRepository(cwd: string): boolean {
  return gitAnswer(cwd, ["rev-parse", "--git-dir"]) !== null;
}

export function historyBoundaryOf(cwd: string): HistoryBoundary {
  if (!isGitRepository(cwd)) return { kind: "not-a-repository" };
  if (gitAnswer(cwd, ["rev-parse", "--is-shallow-repository"]) !== "true") return { kind: "complete" };
  return shallowBoundaryOf(cwd);
}

function shallowBoundaryOf(cwd: string): HistoryBoundary {
  const shallowPath = shallowRecordPath(cwd);
  const record = readOrRefuse(AppMessage.History, shallowPath, () => readFileSync(shallowPath, "utf8"));
  const edge = record.slice(0, record.indexOf("\n"));
  return { kind: "shallow", before: gitAnswer(cwd, ["rev-parse", "--short", edge]) ?? edge };
}

function shallowRecordPath(cwd: string): string {
  return resolve(cwd, spawnSync("git", ["rev-parse", "--git-path", "shallow"], { cwd, encoding: "utf8" }).stdout.trim());
}

interface PatchPosition {
  commit?: string;
  inFileHeader: boolean;
  oldPath: string;
  newPath: string;
  oldLine: number;
  newLine: number;
}

function diffLineOccurrences(logOutput: string): ClaimCodeOccurrence[] {
  // Every field is set by the headers of a patch before any of its lines is read.
  const at = {} as PatchPosition;
  const occurrences: ClaimCodeOccurrence[] = [];
  for (const line of logOutput.split("\n")) {
    const occurrence = readLine(line, at);
    if (occurrence !== undefined) occurrences.push(occurrence);
  }
  return occurrences;
}

function readLine(line: string, at: PatchPosition): ClaimCodeOccurrence | undefined {
  if (line.startsWith(COMMIT_MARKER)) at.commit = line.slice(COMMIT_MARKER.length);
  else if (line.startsWith("diff --git ")) at.inFileHeader = true;
  else if (at.inFileHeader) readFileHeader(line, at);
  else if (line.startsWith("-")) return occurrenceAt(line, at.oldPath, at.oldLine++, at.commit);
  else if (line.startsWith("+")) return occurrenceAt(line, at.newPath, at.newLine++, at.commit);
  else if (line.startsWith("@@ ")) readHunkHeader(line, at);
  return undefined;
}

function readFileHeader(line: string, at: PatchPosition): void {
  if (line.startsWith("--- ")) at.oldPath = pathOf(line);
  else if (line.startsWith("+++ ")) at.newPath = pathOf(line);
  else if (line.startsWith("@@ ")) {
    at.inFileHeader = false;
    readHunkHeader(line, at);
  }
}

function pathOf(header: string): string {
  return header.slice(4).replace(/^[ab]\//, "");
}

function readHunkHeader(line: string, at: PatchPosition): void {
  const match = /@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
  at.oldLine = Number(match?.[1] ?? 0);
  at.newLine = Number(match?.[2] ?? 0);
}

function occurrenceAt(text: string, path: string, line: number, commit: string | undefined): ClaimCodeOccurrence {
  return { text, path, line, commit };
}
