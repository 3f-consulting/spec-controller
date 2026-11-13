import type { RunIdentity } from "@3f-consulting/spec-controller-core";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

// What git answers, or nothing when it cannot.
function gitAnswer(folder: string, args: readonly string[]): string | undefined {
  const { status, stdout } = spawnSync("git", args, { cwd: folder, encoding: "utf8" });
  return status === 0 ? stdout.trim() : undefined;
}

// The tool's own checkout holds it under packages/spec-controller; a copy inside another repository is not one.
function ownCheckoutHead(toolFolder: string): string | undefined {
  const top = gitAnswer(toolFolder, ["rev-parse", "--show-toplevel"]);
  return top !== undefined && toolFolder.startsWith(join(top, "packages", "spec-controller") + sep) ? gitAnswer(toolFolder, ["rev-parse", "HEAD"]) : undefined;
}

// The version the nearest package.json above the folder gives, if it gives one.
function versionAbove(folder: string): string | undefined {
  const manifest = join(folder, "package.json");
  if (existsSync(manifest)) {
    const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version?: unknown };
    return typeof version === "string" ? version : undefined;
  }
  return dirname(folder) === folder ? undefined : versionAbove(dirname(folder));
}

type ToolIdentity = Pick<RunIdentity, "toolSha" | "toolInstalledAsPackage" | "toolVersion">;

// The tool's own checkout and version, read from the folder it runs from.
export function toolIdentityIn(toolFolder: string): ToolIdentity {
  return {
    toolSha: ownCheckoutHead(toolFolder),
    toolInstalledAsPackage: toolFolder.split(sep).includes("node_modules"),
    toolVersion: versionAbove(toolFolder),
  };
}

// HEAD, the origin and the top level of the repository balance runs in; the tool's own checkout and version; the clock to the second.
// As read: which of them wins is the domain's.
export function runIdentityIn(folder: string, given: { readonly target?: string; readonly sourceSha?: string }): RunIdentity {
  return {
    givenTarget: given.target,
    givenSourceSha: given.sourceSha,
    head: gitAnswer(folder, ["rev-parse", "HEAD"]),
    origin: gitAnswer(folder, ["remote", "get-url", "origin"]),
    gitTopLevel: gitAnswer(folder, ["rev-parse", "--show-toplevel"]),
    ...toolIdentityIn(dirname(fileURLToPath(import.meta.url))),
    runTime: `${new Date().toISOString().slice(0, 19)}Z`,
  };
}
