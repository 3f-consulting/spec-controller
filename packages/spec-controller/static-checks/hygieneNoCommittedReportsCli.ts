/**
 * CLI entry point for the no-committed-reports static check. Run via
 * `pnpm hygiene:no-committed-reports` in CI: it reads the repo's TRACKED files
 * under `runs/` (via `git ls-files -- runs/`, the precise in-repo leak vector),
 * and exits non-zero — naming every offending path — if any is tracked. Over a
 * clean tree (nothing tracked under runs/) it exits 0.
 *
 * Mirrors `lint:feature-codes` / `lint:scn-subissues`: a pure function of the
 * checked-out tree, a full CI gate on every push.
 *
 * WHY THE NAME CARRIES `hygiene:` AND NOT `lint:`, WHICH IS NOT COSMETIC — IT IS THE
 * INVERSE OF THE REASONING EVERY SIBLING CLI CARRIES. `runningStaticChecks` observes a CI
 * script only when its name carries an observed prefix (`lint:` / `guard:`), so for
 * `lint:complexity-exceptions` the prefix is what keeps a real check ON the books. This one
 * belongs OFF them, and the prefix is how. It asserts a property of what is COMMITTED —
 * repository hygiene, a `.gitignore` concern — not of the evidence this build produced, so
 * no fitness scenario reconciles it and none is owed: under the Freshness model the report
 * it holds to account is the one this build regenerated, which the ledger already covers.
 * Spelled `lint:` it would be observed, cite no scenario, post to the suspense row, and red
 * `balance:self` as an uncited static check. Ruled 2026-09-01; 3F-2994 / 3F-3003.
 *
 * NOT A DODGE, AND THE TEETH ARE THE TEST. Canon names "renaming a suite script to become
 * an uncited check" as a watermelon's hiding place, and the discriminator is not the rename
 * — it is whether anything still needs to reconcile the thing. Nothing does, and the check
 * is unweakened: `ci.yml` invokes it, and `pnpm verify`'s ladder is DERIVED from `ci.yml`
 * (`localLadder.ts`, prefix-agnostic by construction), so `pnpm ladder` still lists it and
 * `pnpm verify` still gates on it. A rename that quietly stopped it running would be the
 * dodge, which is why the teeth are named here rather than left to be inferred.
 *
 * `hygiene:` IS DELIBERATELY NOT `audit:` EITHER. `audit:vocab` reports and exits 0 however
 * much it finds, reserving its one non-zero exit for "I could not scan" (@SCN-VOC-009);
 * a red-capable check under that prefix would give the family two meanings.
 *
 * @SCN-NCR-001 — features/no-committed-reports.feature. The stepless @SCN-NCR-002 that used
 * to reconcile this check went with the ledger presence it stood for; the stepped scenario
 * stays, because the check is still specified — it is simply no longer reconciled.
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
