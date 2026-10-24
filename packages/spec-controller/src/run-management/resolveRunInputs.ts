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

const TRANSPORT = /^[A-Za-z0-9+.-]+::/;
const URL_SCHEME = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//;
const OWNER_REPO_SCHEMES = new Set(["https", "ssh"]);

/**
 * Names a remote only in a form it reads, built only from the parts read as host, port and path: a URL, a transport
 * prefix followed by a URL, the scp form, or a local path. An https or ssh URL, and an scp-form remote with a user, name
 * owner/repo, the last two path segments, where they have them. A remote whose user part's end can only be guessed
 * names nothing, since any guess leaks for some remote, and so does any form not read, such as a transport to a command.
 * A local path, and a file: URL holding no user, are named as given: git sends them to no server, so they carry no credential.
 */
function targetOriginName(remote: string): string | null {
  if (isLocalPath(remote)) return remote;
  if (remote.startsWith("file:")) return remote.includes("@") ? null : remote;
  const transport = TRANSPORT.exec(remote)?.[0] ?? "";
  const address = remote.slice(transport.length);
  const scheme = URL_SCHEME.exec(address);
  if (scheme !== null) {
    return scheme[1] === "file" ? null : urlOriginName(transport, scheme[1]!, address.slice(scheme[0].length));
  }
  return transport === "" ? scpOriginName(address) : null;
}

// Git's own test: a remote with a / before its first :, or with no : at all, is a local path.
function isLocalPath(remote: string): boolean {
  return remote.split(":", 1)[0]!.includes("/") || !remote.includes(":");
}

// The authority runs to the first /, ? or #, and its host follows its last @. An @ after it means a password or a
// query holds one, so where the user part ends can only be guessed.
function urlOriginName(transport: string, scheme: string, rest: string): string | null {
  const authority = rest.split(/[/?#]/, 1)[0]!;
  const afterAuthority = rest.slice(authority.length);
  const host = authority.slice(authority.lastIndexOf("@") + 1);
  if (afterAuthority.includes("@") || host === "") return null;
  const path = pathOf(afterAuthority);
  const ownerRepo = transport === "" && OWNER_REPO_SCHEMES.has(scheme) ? ownerRepoOf(path) : null;
  return ownerRepo ?? `${transport}${scheme}://${host}${path}`;
}

// The scp form's host and path follow its last @, split at their first :.
function scpOriginName(address: string): string | null {
  const at = address.lastIndexOf("@");
  const hostPath = address.slice(at + 1);
  const colon = hostPath.indexOf(":");
  if (colon <= 0) return null;
  const path = pathOf(hostPath.slice(colon + 1));
  return (at !== -1 ? ownerRepoOf(path) : null) ?? `${hostPath.slice(0, colon)}:${path}`;
}

function pathOf(rest: string): string {
  return rest.split(/[?#]/, 1)[0]!;
}

function ownerRepoOf(path: string): string | null {
  const bare = path.replace(/^\//, "");
  const segments = (bare.endsWith(".git") ? bare.slice(0, -".git".length) : bare).split("/");
  return segments.length >= 2 ? segments.slice(-2).join("/") : null;
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
