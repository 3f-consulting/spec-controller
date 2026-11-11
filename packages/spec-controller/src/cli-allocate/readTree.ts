import { spawnSync } from "node:child_process";
import { accessSync, constants, lstatSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ClaimCodeOccurrence } from "@3f-consulting/spec-controller-core";
import { AppMessage } from "../messages.js";
import { gitExited, readOrRefuse, UnreadableInput } from "./unreadable.js";

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

export function readTree(top: string, marks: readonly string[]): ClaimCodeOccurrence[] {
  const listed = gitListing(top, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  const ignored = gitListing(top, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory"]);
  proveListable(top, "", new Set(ignored.filter(isDirectoryEntry).map((entry) => entry.slice(0, -1))));
  return listed.flatMap((path) => occurrencesInListed(top, path, marks));
}

function gitListing(top: string, args: readonly string[]): string[] {
  const result = spawnSync("git", args, { cwd: top, encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES });
  if (result.status !== 0) {
    throw new UnreadableInput(AppMessage.Tree, top, gitExited(args, result.status, result.stderr));
  }
  return result.stdout.split("\0");
}

function isDirectoryEntry(entry: string): boolean {
  return entry.endsWith("/");
}

function proveListable(top: string, dir: string, ignored: ReadonlySet<string>): void {
  const path = join(top, dir);
  const entries = readOrRefuse(AppMessage.TreeDirectory, path, () => listedAndEntered(path));
  if (dir !== "" && entries.some((entry) => entry.name === ".git")) return;
  for (const entry of entries) {
    const child = dir === "" ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory() && entry.name !== ".git" && !ignored.has(child)) proveListable(top, child, ignored);
  }
}

function listedAndEntered(path: string): Dirent[] {
  accessSync(path, constants.R_OK | constants.X_OK);
  return readdirSync(path, { withFileTypes: true });
}

function occurrencesInListed(top: string, path: string, marks: readonly string[]): ClaimCodeOccurrence[] {
  const file = join(top, path);
  const kind = readOrRefuse(AppMessage.TreeFile, file, () => lstatSync(file, { throwIfNoEntry: false }));
  if (kind === undefined || !kind.isFile()) return [];
  return linesCarrying(path, readOrRefuse(AppMessage.TreeFile, file, () => readFileSync(file)), marks);
}

function linesCarrying(path: string, content: Buffer, marks: readonly string[]): ClaimCodeOccurrence[] {
  return content
    .toString("utf8")
    .split("\n")
    .flatMap((line, i) => (marks.some((mark) => line.includes(mark)) ? [{ path, line: i + 1, text: line }] : []));
}

export function walkTree(root: string, marks: readonly string[]): ClaimCodeOccurrence[] {
  return filesUnder(root).flatMap((file) => {
    const content = readOrRefuse(AppMessage.TreeFile, file, () => readFileSync(file));
    return linesCarrying(relative(root, file).split(sep).join("/"), content, marks);
  });
}

function filesUnder(dir: string): string[] {
  const entries = readOrRefuse(AppMessage.TreeDirectory, dir, () => readdirSync(dir, { withFileTypes: true }));
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}
