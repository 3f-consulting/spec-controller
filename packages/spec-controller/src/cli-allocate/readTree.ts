import { spawnSync } from "node:child_process";
import { accessSync, constants, lstatSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { join, relative, sep } from "node:path";
import { ALLOCATION_COUNTED_PREFIXES, type ClaimCodeOccurrence } from "@3f-consulting/spec-controller-core";
import { AppMessage } from "../messages.js";
import { gitExited, readOrRefuse, refuse, UnreadableInput } from "./unreadable.js";

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

const BINARY_PROBE_BYTES = 8000;

export function readTree(top: string, part: string): ClaimCodeOccurrence[] {
  const listed = gitListing(top, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  const ignored = gitListing(top, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory"]);
  proveListable(top, "", new Set(ignored.filter(isDirectoryEntry).map((entry) => entry.slice(0, -1))));
  return listed.flatMap((path) => occurrencesInListed(top, path, needlesFor(part)));
}

function gitListing(top: string, args: readonly string[]): string[] {
  const result = spawnSync("git", args, { cwd: top, encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES });
  if (result.error !== undefined) refuse(AppMessage.Tree, top, result.error);
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

function needlesFor(part: string): string[] {
  return ALLOCATION_COUNTED_PREFIXES.map((prefix) => `${prefix}-${part}-`);
}

function occurrencesInListed(top: string, path: string, needles: readonly string[]): ClaimCodeOccurrence[] {
  const file = join(top, path);
  const kind = readOrRefuse(AppMessage.TreeFile, file, () => lstatSync(file, { throwIfNoEntry: false }));
  if (kind === undefined || !kind.isFile()) return [];
  return linesCarrying(path, readOrRefuse(AppMessage.TreeFile, file, () => readFileSync(file)), needles);
}

function linesCarrying(path: string, content: Buffer, needles: readonly string[]): ClaimCodeOccurrence[] {
  if (content.subarray(0, BINARY_PROBE_BYTES).includes(0)) return [];
  return content
    .toString("utf8")
    .split("\n")
    .flatMap((line, i) => (needles.some((needle) => line.includes(needle)) ? [{ path, line: i + 1, text: line }] : []));
}

export function isWalkedDirectory(name: string): boolean {
  return name !== "node_modules" && !name.startsWith(".");
}

export function walkTree(root: string, part: string): ClaimCodeOccurrence[] {
  return filesUnder(root).flatMap((file) => {
    const content = readOrRefuse(AppMessage.TreeFile, file, () => readFileSync(file));
    return linesCarrying(relative(root, file).split(sep).join("/"), content, needlesFor(part));
  });
}

function filesUnder(dir: string): string[] {
  const entries = readOrRefuse(AppMessage.TreeDirectory, dir, () => readdirSync(dir, { withFileTypes: true }));
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return isWalkedDirectory(entry.name) ? filesUnder(path) : [];
    return entry.isFile() ? [path] : [];
  });
}
