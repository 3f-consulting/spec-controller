import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { OriginAsWritten } from "@3f-consulting/spec-controller-core";

// The commit the target's folder has checked out, if it is in a git repository.
export function readTargetHead(targetDir: string | undefined): string | undefined {
  return readGit(targetDir, ["rev-parse", "HEAD"]);
}

export function readTargetOrigin(targetDir: string | undefined): OriginAsWritten | undefined {
  const remote = readGit(targetDir, ["remote", "get-url", "origin"]);
  return remote === undefined ? undefined : originPartsOf(remote);
}

const URL_SCHEME = /^(https|ssh):\/\//;
const OTHER_SCHEME_OR_TRANSPORT = /^[A-Za-z0-9+.-]+:(:|\/\/)/;
const UNREAD: OriginAsWritten = { form: "unread" };

// Reads a local path, a file: URL, an https or ssh URL, or the scp form. Any other scheme, a transport prefix, and a
// remote whose user part's end can only be guessed are not read.
function originPartsOf(remote: string): OriginAsWritten {
  if (isLocalPath(remote)) return { form: "path", path: remote, carriesUser: false };
  if (remote.startsWith("file:")) return { form: "path", path: remote, carriesUser: remote.includes("@") };
  const scheme = URL_SCHEME.exec(remote);
  if (scheme !== null) return urlParts(scheme, remote.slice(scheme[0].length));
  return OTHER_SCHEME_OR_TRANSPORT.test(remote) ? UNREAD : scpParts(remote);
}

// Git's own test: a remote with a / before its first :, or with no : at all, is a local path.
function isLocalPath(remote: string): boolean {
  return remote.split(":", 1)[0]!.includes("/") || !remote.includes(":");
}

// The authority runs to the first /, ? or #, and its host follows its last @. An @ after it means a password or a
// query holds one, so where the user part ends can only be guessed.
function urlParts(scheme: RegExpExecArray, rest: string): OriginAsWritten {
  const authority = rest.split(/[/?#]/, 1)[0]!;
  const afterAuthority = rest.slice(authority.length);
  const at = authority.lastIndexOf("@");
  const host = authority.slice(at + 1);
  if (afterAuthority.includes("@") || host === "") return UNREAD;
  return { form: "address", lead: scheme[0], host, separator: "", path: pathOf(afterAuthority) };
}

// The scp form's host and path follow its last @, split at their first :.
function scpParts(address: string): OriginAsWritten {
  const at = address.lastIndexOf("@");
  const hostPath = address.slice(at + 1);
  const colon = hostPath.indexOf(":");
  if (colon <= 0) return UNREAD;
  const host = hostPath.slice(0, colon);
  return { form: "address", lead: "", host, separator: ":", path: pathOf(hostPath.slice(colon + 1)) };
}

function pathOf(rest: string): string {
  return rest.split(/[?#]/, 1)[0]!;
}

// The tool's install as written: its folder joined by "/", the commit of its checkout, and its package.json's version.
export interface ToolInstall {
  readonly toolFolder: string;
  readonly toolHead: string | undefined;
  readonly toolVersion: unknown;
}

const toolFolder = (): string => dirname(fileURLToPath(import.meta.url));

export function readToolInstall(toolDir: string = toolFolder()): ToolInstall {
  return { toolFolder: toolDir.split(sep).join("/"), toolHead: readGit(toolDir, ["rev-parse", "HEAD"]), toolVersion: readToolVersion(toolDir) };
}

// The version field, as written, of the nearest package.json at or above the folder that reads as JSON, if any.
export function readToolVersion(fromDir: string = toolFolder()): unknown {
  let dir = fromDir;
  for (;;) {
    try {
      const { version } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version?: unknown };
      return version;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }
}

export function readWorkingFolder(): string {
  return process.cwd();
}

// The top of the git repository a folder is in, if it is in one.
export function readRepositoryTop(folder: string): string | undefined {
  return readGit(folder, ["rev-parse", "--show-toplevel"]);
}

// No dir means the working directory, read inside the try: process.cwd() throws once it is removed, read as no output.
function readGit(dir: string | undefined, args: readonly string[]): string | undefined {
  try {
    const out = execFileSync("git", ["-C", dir ?? process.cwd(), ...args], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return out.trim() || undefined;
  } catch {
    // No git, or no repository there: nothing is read.
  }
  return undefined;
}
