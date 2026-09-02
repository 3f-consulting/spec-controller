/**
 * The no-committed-reports static check logic (the @unit-testable core).
 *
 * A spec-controller reconciliation report enumerates a codebase's gaps, dangling
 * anchors and watermelons — more sensitive than the code itself — so it lives
 * OUTSIDE the repo (~/spec-controller-runs/), never committed. The precise,
 * false-positive-free rule: any TRACKED file under `runs/` (the in-repo leak
 * vector) is an offence. Fixtures live in temp dirs, not the repo tree, so the
 * runs/-tracked rule has no false positives.
 *
 * The tracked-file LIST is INJECTED (not shelled from git here) so the logic is
 * unit-tested in isolation; the CLI (hygieneNoCommittedReportsCli.ts) provides the
 * real list from `git ls-files -- runs/` over the real tree.
 *
 * @SCN-NCR-001 — features/no-committed-reports.feature.
 */

/** The in-repo leak vector: the run-output directory. */
export const RUNS_PREFIX = "runs/";

/**
 * Given the repo's tracked files, return those that are committed report
 * artefacts — any path under `runs/`. An empty result means the tree is clean
 * and the static check passes; a non-empty result names every offending path.
 */
export function findCommittedReports(trackedFiles: readonly string[]): string[] {
  return trackedFiles.filter((path) => path.startsWith(RUNS_PREFIX));
}
