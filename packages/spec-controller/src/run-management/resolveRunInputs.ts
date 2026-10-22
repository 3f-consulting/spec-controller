import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSourceSha(opts: { sourceSha?: string; targetDir?: string }): string | null {
  if (opts.sourceSha !== undefined && opts.sourceSha.trim() !== "") {
    return opts.sourceSha.trim();
  }
  return readGit(targetDirOf(opts.targetDir), ["rev-parse", "HEAD"]);
}

export function resolveTargetOrigin(targetDir: string | undefined): string | null {
  const remote = readGit(targetDirOf(targetDir), ["remote", "get-url", "origin"]);
  return remote === null ? null : targetOriginName(remote);
}

const URL_REMOTE = /^(?:https|ssh):\/\/[^/]+\/([^?#]+)/;
const SCP_REMOTE = /^[^/]+@[^/@:]+:([^?#]+)/;
const URL_USERINFO = /(:\/\/)[^/?#]*@/;
const SCP_BARE = /^(?:[^/]*@)?([^/@:]+:[^?#]*).*/;

/**
 * Names a remote URL by its last two path segments, owner/repo. A remote of any other
 * shape is named as given, less any user, password, query and fragment, which the report must not print.
 */
function targetOriginName(remote: string): string {
  const path = (URL_REMOTE.exec(remote) ?? SCP_REMOTE.exec(remote))?.[1];
  const segments = path === undefined ? [] : (path.endsWith(".git") ? path.slice(0, -".git".length) : path).split("/");
  return segments.length >= 2 ? segments.slice(-2).join("/") : remote.replace(URL_USERINFO, "$1").replace(SCP_BARE, "$1");
}

function targetDirOf(targetDir: string | undefined): string | undefined {
  return targetDir !== undefined && targetDir.trim() !== "" ? targetDir : undefined;
}

export interface ToolIdentity {
  toolSha: string | null;
  toolVersion: string;
}

export function resolveToolIdentity(opts: { toolDir?: string; packageJsonPath?: string } = {}): ToolIdentity {
  const toolDir = opts.toolDir !== undefined && opts.toolDir.trim() !== ""
    ? opts.toolDir
    : dirname(fileURLToPath(import.meta.url));
  return {
    toolSha: resolveToolSha(toolDir),
    toolVersion: resolveToolVersion(opts.packageJsonPath ?? findPackageJson(toolDir)),
  };
}

function resolveToolSha(toolDir: string): string | null {
  if (toolDir.split(sep).includes("node_modules")) return null;
  return readGit(toolDir, ["rev-parse", "HEAD"]);
}

function resolveToolVersion(packageJsonPath: string | null): string {
  if (packageJsonPath === null) return "unknown";
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
    return typeof pkg.version === "string" && pkg.version !== "" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

function findPackageJson(fromDir: string): string | null {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, "package.json");
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
}

export function resolveTargetRoot(opts: { features?: string }): string {
  if (opts.features === undefined || opts.features.trim() === "") {
    return process.cwd();
  }
  const targetDir = dirname(opts.features);
  return readGit(targetDir, ["rev-parse", "--show-toplevel"]) ?? targetDir;
}

// An undefined dir means the working directory. It is read inside the try because
// process.cwd() throws once that directory is removed, which must read as no output.
function readGit(dir: string | undefined, args: readonly string[]): string | null {
  try {
    const out = execFileSync("git", ["-C", dir ?? process.cwd(), ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}
