/**
 * CLI entry point for the no-committed-reports static check. Run via
 * `pnpm lint:no-committed-reports` in CI: it reads the repo's TRACKED files
 * under `runs/` (via `git ls-files -- runs/`, the precise in-repo leak vector),
 * and exits non-zero — naming every offending path — if any is tracked. Over a
 * clean tree (nothing tracked under runs/) it exits 0.
 *
 * Mirrors `lint:feature-codes` / `lint:scn-subissues`: a pure function of the
 * checked-out tree. The static check is @lint-cited (`@lint=lint:no-committed-reports`
 * on @SCN-NCR-001) so the tool's own ledger reconciles it — not an
 * uncited static-check (the Uncited-static-checks increment).
 */

import { execFileSync } from "node:child_process";
import { findCommittedReports } from "./noCommittedReports.js";

/** The repo's tracked files under runs/ (the in-repo leak vector). */
function trackedRunsFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "--", "runs/"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const offenders = findCommittedReports(trackedRunsFiles());

if (offenders.length === 0) {
  console.log(
    "no-committed-reports lint: OK — no report artefact is tracked under runs/ (reports live in the outside store, ~/spec-controller-runs/)."
  );
  process.exit(0);
}

console.error(
  `no-committed-reports lint: FAILED — ${offenders.length} report artefact(s) tracked in the repo (reports must live OUTSIDE the repo, in the run store):`
);
for (const path of offenders) {
  console.error(`  ${path}`);
}
process.exit(1);
