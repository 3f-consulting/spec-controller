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

interface UsgFixture {
  features: string;
  ci: string;
  packageJson: string;
}

const USG_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg/features",
  ci: "tests/fixtures/usg/ci.yml",
  packageJson: "tests/fixtures/usg/package.json",
};

// @SCN-USG-004 — a second fixture target whose CI runs a guard:* script (guard:domain-purity)
// declared by NO @lint at all (an adopter's repository-shaped case). Distinct from USG_FIXTURE so the
// exact counts USG-001/002/003 assert over the lint:* fixture stay intact.
const USG_GUARD_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard/features",
  ci: "tests/fixtures/usg-guard/ci.yml",
  packageJson: "tests/fixtures/usg-guard/package.json",
};

// @SCN-USG-005 — a third fixture target whose CI runs the SAME guard:* script (guard:domain-purity)
// but which ALSO declares it via @lint=guard:domain-purity (the boundary keeping USG-004 honest).
// Distinct from USG_GUARD_FIXTURE (which declares nothing) so the attributed vs unattributed
// counts stay separable: here the guard is demanded → 1 run, 0 unattributed.
const USG_GUARD_DECLARED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard-declared/features",
  ci: "tests/fixtures/usg-guard-declared/ci.yml",
  packageJson: "tests/fixtures/usg-guard-declared/package.json",
};

// The active fixture + its tmp target dir + the rendered report — set by each Given, so the
// one shared "When ... rendered for the target" step drives whichever fixture the scenario picked.
let activeFixture: UsgFixture;
let activeDir: string;
let activeMd: string;

Given("a target whose CI runs the lint:foo and lint:bar guards", function () {
  activeFixture = USG_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg001-"));
});

Given("only lint:foo is declared by an @lint scenario", function () {
  // The fixture's target.feature declares @lint=lint:foo on @SCN-TGT-001; lint:bar is
  // invoked in the fixture ci.yml but no @lint declares it — the unattributed evidence observation one.
});

// @SCN-USG-004
Given("a target whose CI runs the guard:domain-purity script", function () {
  activeFixture = USG_GUARD_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg004-"));
});

// @SCN-USG-004
Given("no @lint scenario declares guard:domain-purity", function () {
  // The usg-guard fixture's target.feature declares NO @lint at all; guard:domain-purity is
  // invoked in the fixture ci.yml but nothing declares it — the unattributed guard:* one.
});

// @SCN-USG-005
Given("a target whose CI runs the guard:domain-purity script it declares", function () {
  activeFixture = USG_GUARD_DECLARED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg005-"));
});

// @SCN-USG-005
Given("an @lint scenario declares guard:domain-purity", function () {
  // The usg-guard-declared fixture's target.feature declares @lint=guard:domain-purity on
  // @SCN-TGD-001; the same guard:* script is invoked in the fixture ci.yml — so it is a
  // DEMANDED running guard, attributed to its scenario, not folded onto the suspense row.
});

When("the reconciliation report is rendered for the target", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const reportPath = join(activeDir, "spec-reconciliation.md");
  const argv = [
    join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
    "--features", abs(activeFixture.features),
    "--ci", abs(activeFixture.ci),
    "--package-json", abs(activeFixture.packageJson),
    "--target", "usg-fixture",
    "--format", `md:${reportPath}`,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: activeDir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(
    result.status,
    0,
    `expected exit 0 writing the report; got ${result.status}\nstderr:\n${result.stderr}`
  );
  activeMd = readFileSync(reportPath, "utf8");
});

Then(
  "the Static guards section reports lint:bar as an unattributed static-guard",
  function () {
    // The Static guards section keeps the summary-level COUNTS line (ruling Q4);
    // the per-guard DETAIL re-homed to the suspense-scenario row, where lint:bar surfaces as
    // a cites-no-scenario credit item (with its guard handle). Both are asserted.
    assert.match(
      activeMd,
      /### Static guards/,
      `expected a Static guards section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 guard(s) run, 1 unattributed static-guard(s)"),
      `expected the guard counts "2 guard(s) run, 1 unattributed static-guard(s)"; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("lint ❓ cites-no-scenario (lint:bar)"),
      `expected lint:bar re-homed onto the suspense row as a cites-no-scenario credit; got:\n${activeMd}`
    );
  }
);

// @SCN-USG-004 — a guard:-prefixed CI script (guard:domain-purity) that no @lint declares
// surfaces as an unattributed static-guard, exactly as a lint:* one does. The report's Static
// guards section reports 1 running guard / 1 unattributed, and the suspense row carries the
// guard:domain-purity handle as a cites-no-scenario credit under the "lint" axis (the axis name
// is unchanged — it is the static-guard axis, not the script prefix).
Then(
  "the Static guards section reports guard:domain-purity as an unattributed static-guard",
  function () {
    assert.match(
      activeMd,
      /### Static guards/,
      `expected a Static guards section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 guard(s) run, 1 unattributed static-guard(s)"),
      `expected the guard counts "1 guard(s) run, 1 unattributed static-guard(s)"; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("lint ❓ cites-no-scenario (guard:domain-purity)"),
      `expected guard:domain-purity re-homed onto the suspense row as a cites-no-scenario credit; got:\n${activeMd}`
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
      !activeMd.includes("cites-no-scenario (lint:foo)"),
      `lint:foo is @lint-declared; it must not surface as an unattributed static-guard credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 guard(s) run, 1 unattributed static-guard(s)"),
      `expected lint:foo folded into the running volume (2 run, 1 unattributed static-guard(s)); got:\n${activeMd}`
    );
  }
);

// @SCN-USG-005 — the declared guard:* is attributed, not an unattributed static-guard. The
// usg-guard-declared fixture runs guard:domain-purity in CI AND declares @lint=guard:domain-purity:
// the demanded-guard filter (reconcile's !demandedGuardSet.has(o.guard)) removes it from the
// running-observation stream so it is not folded onto the suspense row, and the counter attributes
// it (1 run, 0 unattributed) — never double-counted as both demanded and unattributed. The guard:*
// mirror of USG-002, keeping the USG-004 broadening honest.
Then(
  "guard:domain-purity is not reported as an unattributed static-guard",
  function () {
    assert.ok(
      !activeMd.includes("cites-no-scenario (guard:domain-purity)"),
      `guard:domain-purity is @lint-declared; it must not surface as an unattributed static-guard credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 guard(s) run, 0 unattributed static-guard(s)"),
      `expected guard:domain-purity attributed (1 run, 0 unattributed static-guard(s)); got:\n${activeMd}`
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
      activeMd.includes("2 guard(s) run, 1 unattributed static-guard(s)"),
      `expected exactly 2 running guards (test/cucumber excluded); got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("(test)") && !activeMd.includes("(cucumber)"),
      `test/cucumber must not surface as static-guard credits; got:\n${activeMd}`
    );
  }
);

After({ tags: "@USG" }, function () {
  if (activeDir && existsSync(activeDir)) rmSync(activeDir, { recursive: true, force: true });
});
