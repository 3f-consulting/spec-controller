/**
 * Resolve a run's git-derived inputs — the target's source SHA and repo root. The
 * IMPURE half of the old run/runContext.ts: both shell out to `git` over the
 * target tree, so they live in the app's run-management layer, apart from the pure
 * provenance projection (reconciliation-engine/provenance/provenance.ts) they feed. The
 * CLI (cli-balance/cli.ts) calls these once to build the RunContext.
 *
 * Scenarios: @SCN-RPT-001 (the run-provenance slice); the --source-sha override;
 * @SCN-RPT-016 (target-root derivation).
 */

import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

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
