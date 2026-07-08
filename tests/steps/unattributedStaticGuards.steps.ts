/**
 * @SCN-USG-001 step defs — the unattributed-static-guard @integration arm.
 * Drives the REAL CLI over the usg fixture target (ci.yml runs lint:foo + lint:bar +
 * test + cucumber; only lint:foo is @lint-declared) and asserts the persisted
 * spec-reconciliation.md carries the "### Static guards" cut reporting lint:bar as an
 * unattributed static-guard (reconcile folds the undemanded running guard to the suspense row) —
 * proving the runningStaticGuards → reconcile → countStaticEvidenceObservationKinds → render → disk
 * wiring over real files, not an in-memory re-run (the anti-watermelon rule).
 * // @SCN-USG-001
 */
import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const USG_FIXTURE = {
  features: "tests/fixtures/usg/features",
  ci: "tests/fixtures/usg/ci.yml",
  packageJson: "tests/fixtures/usg/package.json",
};
let usgDir: string;
let usgMd: string;

Given("a target whose CI runs the lint:foo and lint:bar guards", function () {
  usgDir = mkdtempSync(join(tmpdir(), "spec-controller-usg001-"));
});

Given("only lint:foo is declared by an @lint scenario", function () {
  // The fixture's target.feature declares @lint=lint:foo on @SCN-TGT-001; lint:bar is
  // invoked in the fixture ci.yml but no @lint declares it — the unattributed evidence observation one.
});

When("the reconciliation report is rendered for the target", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const reportPath = join(usgDir, "spec-reconciliation.md");
  const argv = [
    join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
    "--features", abs(USG_FIXTURE.features),
    "--ci", abs(USG_FIXTURE.ci),
    "--package-json", abs(USG_FIXTURE.packageJson),
    "--target", "usg-fixture",
    "--format", `md:${reportPath}`,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: usgDir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(
    result.status,
    0,
    `expected exit 0 writing the report; got ${result.status}\nstderr:\n${result.stderr}`
  );
  usgMd = readFileSync(reportPath, "utf8");
});

Then(
  "the Static guards section reports lint:bar as an unattributed static-guard",
  function () {
    // The Static guards section keeps the summary-level COUNTS line (ruling Q4);
    // the per-guard DETAIL re-homed to the suspense-scenario row, where lint:bar surfaces as
    // a cites-no-scenario credit item (with its guard handle). Both are asserted.
    assert.match(
      usgMd,
      /### Static guards/,
      `expected a Static guards section; got:\n${usgMd}`
    );
    assert.ok(
      usgMd.includes("2 guard(s) run, 1 unattributed static-guard(s)"),
      `expected the guard counts "2 guard(s) run, 1 unattributed static-guard(s)"; got:\n${usgMd}`
    );
    assert.ok(
      usgMd.includes("lint ❓ cites-no-scenario (lint:bar)"),
      `expected lint:bar re-homed onto the suspense row as a cites-no-scenario credit; got:\n${usgMd}`
    );
  }
);

// @SCN-USG-002 — the declared guard is attributed, not an unattributed static-guard. Same fixture (lint:foo
// is @lint-declared): it must NOT surface as an unattributed static-guard credit, and the
// counts fold it into the running volume (not the unattributed count).
Then(
  "lint:foo is not reported as an unattributed static-guard",
  function () {
    assert.ok(
      !usgMd.includes("cites-no-scenario (lint:foo)"),
      `lint:foo is @lint-declared; it must not surface as an unattributed static-guard credit; got:\n${usgMd}`
    );
    assert.ok(
      usgMd.includes("2 guard(s) run, 1 unattributed static-guard(s)"),
      `expected lint:foo folded into the running volume (2 run, 1 unattributed static-guard(s)); got:\n${usgMd}`
    );
  }
);

// @SCN-USG-003 — non-lint CI steps are not derived as guards. The usg fixture ci.yml runs
// pnpm test + pnpm cucumber alongside the two lint guards; runningStaticGuards includes only
// lint:* → exactly 2 running guards, and test/cucumber never surface as static guards.
Then(
  "only lint:foo and lint:bar are counted as CI guards, not test or cucumber",
  function () {
    assert.ok(
      usgMd.includes("2 guard(s) run, 1 unattributed static-guard(s)"),
      `expected exactly 2 running guards (test/cucumber excluded); got:\n${usgMd}`
    );
    assert.ok(
      !usgMd.includes("(test)") && !usgMd.includes("(cucumber)"),
      `test/cucumber must not surface as static-guard credits; got:\n${usgMd}`
    );
  }
);

After({ tags: "@USG" }, function () {
  if (usgDir && existsSync(usgDir)) rmSync(usgDir, { recursive: true, force: true });
});
