/**
 * Resolve a run's git-derived inputs — the target's source SHA and repo root. The
 * IMPURE half of the old run/runContext.ts: both shell out to `git` over the
 * target tree, so they live in the app's run-management layer, apart from the pure
 * provenance projection (packages/core/src/provenance/provenance.ts) they feed. The
 * CLI (cli-balance/cli.ts) calls these once to build the RunContext.
 *
 * Scenarios: @SCN-RPT-001 (the run-provenance slice); the --source-sha override;
 * @SCN-RPT-016 (target-root derivation); @SCN-RPT-026 / @SCN-RPT-029 (the tool's own identity).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the target's source SHA (project design §4). An explicit non-empty
 * `sourceSha` wins — the override for non-git / zip / detached-HEAD targets (the
 * --source-sha flag). Otherwise `git -C <targetDir> rev-parse HEAD` (trimmed) as a
 * READ-ONLY pure read. On any throw —
 * a non-git target, git absent, an empty answer — resolve to `null` ("unknown")
 * rather than crashing. `targetDir` = dirname(--features) when given, else cwd.
 */
export function resolveSourceSha(opts: { sourceSha?: string; targetDir?: string }): string | null {
  if (opts.sourceSha !== undefined && opts.sourceSha.trim() !== "") {
    return opts.sourceSha.trim();
  }
  try {
    const dir = opts.targetDir !== undefined && opts.targetDir.trim() !== ""
      ? opts.targetDir
      : process.cwd();
    const out = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const sha = out.trim();
    return sha === "" ? null : sha;
  } catch {
    return null;
  }
}

/** The tool's own identity — which spec-controller produced a run (3F-1916). */
export interface ToolIdentity {
  /** The tool's own git HEAD, or null when the tool is not a git checkout (an installed package). */
  toolSha: string | null;
  /** The tool's package version — always present (read from the tool's own package.json). */
  toolVersion: string;
}

/**
 * Resolve the TOOL's own identity (3F-1916) — which spec-controller produced this run,
 * distinct from the TARGET's `sourceSha`. Two facts, one call, threaded to both the
 * report provenance (RunContext) and the run.yaml manifest.
 *
 * **TWO TRAPS, AND THIS DOCBLOCK ONLY NAMED THE FIRST FOR ELEVEN WEEKS** (@SCN-RPT-029,
 * 3F-3418). Nothing typechecks a comment, and the sentence below — true, and the whole of
 * what was written here — is what made the second trap read as already-handled.
 *
 * **Trap one, cwd:** at run time the process cwd is the TARGET repo (reconcile runs
 * there), so a bare `git rev-parse HEAD` would re-record the TARGET's SHA. So the SHA is
 * read `git -C <the tool's OWN dir>`, derived from `import.meta.url`, never cwd (3F-1916).
 *
 * **Trap two, which the `-C` guard could not see:** the tool's own dir is ITSELF inside the
 * target. For an installed package that dir is `<consumer>/node_modules/…`, which is inside
 * the consumer's worktree, so `git -C` walks up to the consumer's `.git` and answers with
 * the consumer's HEAD — being `.gitignore`d makes no difference, git does not stop at
 * ignored directories. That is not an absent tool SHA, it is a WRONG one, and nothing on
 * the rendered report distinguishes it from a genuine one. It is also the only case a
 * consumer ever sees: every adopter installs into a git repository. `resolveToolSha`
 * therefore answers a `node_modules` SEGMENT before it asks git at all.
 *
 * `toolSha` is `null` for a tool resolved out of `node_modules`, and otherwise
 * `git -C <toolDir> rev-parse HEAD` (trimmed) or `null` on any throw — no `.git` above the
 * tool, git absent, or an empty answer — mirroring `resolveSourceSha`'s fail-soft.
 * `toolVersion` is read from the tool's own `package.json` (walked up from `toolDir`), or
 * `"unknown"` when none is found — so a run stays attributable by version even when no SHA
 * can be read. `toolDir` / `packageJsonPath` are injectable for the `@unit` teeth
 * (@SCN-RPT-026, @SCN-RPT-029).
 */
export function resolveToolIdentity(opts: { toolDir?: string; packageJsonPath?: string } = {}): ToolIdentity {
  const toolDir = opts.toolDir !== undefined && opts.toolDir.trim() !== ""
    ? opts.toolDir
    : dirname(fileURLToPath(import.meta.url));
  return {
    toolSha: resolveToolSha(toolDir),
    toolVersion: resolveToolVersion(opts.packageJsonPath ?? findPackageJson(toolDir)),
  };
}

/**
 * The tool's own git HEAD, read `-C <toolDir>` (never cwd), null on any throw — and null
 * without asking at all for a tool resolved out of `node_modules` (@SCN-RPT-029).
 *
 * A SEGMENT, NEVER A SUBSTRING. A directory honestly named `my_node_modules_backup` is not an
 * install, and a checkout living under a directory literally named `node_modules` reporting null is
 * the pathological trade every tool making this distinction takes.
 *
 * `sep`, NOT A REGEX OVER BOTH SEPARATORS. `[/\\]` would carry a branch no arm on this platform can
 * reach, so a mutant deleting its second half would survive the mutation gate while nothing was
 * worse. `sep` is what `fileURLToPath` produces on each platform, which is the only thing `toolDir`
 * is ever built from.
 *
 * IT ANSWERS BEFORE THE `try`, NOT INSIDE IT. Returning null from a thrown git read and returning
 * null because the tool is an install are the same recorded answer and not the same fact, and only
 * the first of them is allowed to depend on git being present.
 *
 * WHAT IT DOES NOT CLAIM. Under `--preserve-symlinks` Node reports the symlink path rather than the
 * realpath, so a linked development checkout would carry a `node_modules` segment and report null.
 * That is a strictly safer wrong answer than today's, nothing in this repository passes the flag,
 * and no arm covers it — named rather than guarded.
 */
function resolveToolSha(toolDir: string): string | null {
  if (toolDir.split(sep).includes("node_modules")) return null;
  try {
    const out = execFileSync("git", ["-C", toolDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const sha = out.trim();
    return sha === "" ? null : sha;
  } catch {
    return null;
  }
}

/** Read the `version` from a package.json, or "unknown" when the path is null / unreadable / versionless. */
function resolveToolVersion(packageJsonPath: string | null): string {
  if (packageJsonPath === null) return "unknown";
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
    return typeof pkg.version === "string" && pkg.version !== "" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

/** Walk up from a dir to the nearest package.json, or null when the filesystem root is reached. */
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

/**
 * Resolve the TARGET repo root — the root the recorded input paths (`presentInputs`)
 * and the evidence-observation locators (`countRuntimeEvidenceObservationKinds`) are both made
 * portable against (@SCN-RPT-016). The bug it fixes: the prior CLI relativized
 * against `process.cwd()` — the TOOL's own repo — so a cross-repo reconcile
 * (cwd ≠ target) kept the target's absolute paths (they aren't under cwd → the
 * "absolute-not-under-root" branch of `relativizeToRoot` → leaked verbatim).
 *
 * The rule (mirrors `resolveSourceSha`'s targetDir derivation): the root is derived from
 * the TARGET, never the run cwd — the git top-level of `dirname(--features)` when the
 * target is a git repo (the robust case: `--features` may sit in a nested dir), else
 * `dirname(--features)` itself (a non-git target — a zip / extracted tree), else
 * `process.cwd()` for a self-reconcile with no `--features` (the legacy cwd = target
 * assumption, preserved as the fallback). A READ-ONLY `git -C … rev-parse --show-toplevel`
 * (read-only-target-safe); any throw falls back to `dirname(--features)`.
 */
export function resolveTargetRoot(opts: { features?: string }): string {
  if (opts.features === undefined || opts.features.trim() === "") {
    return process.cwd();
  }
  const targetDir = dirname(opts.features);
  try {
    const out = execFileSync("git", ["-C", targetDir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const root = out.trim();
    return root === "" ? targetDir : root;
  } catch {
    return targetDir;
  }
}
