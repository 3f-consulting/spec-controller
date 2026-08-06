/**
 * @SCN-USG-001 step defs — the uncited-static-check @integration arm.
 * Drives the REAL CLI over the usg fixture target (ci.yml runs lint:foo + lint:bar +
 * test + cucumber; only lint:foo is @lint-cited) and asserts the persisted
 * spec-reconciliation.md carries the "### Static checks" cut reporting lint:bar as an
 * uncited static check (reconcile folds the no-evidence-obligation running guard to the suspense row) —
 * proving the runningStaticChecks → reconcile → staticObservationTally → render → disk
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
// NAMED by NO @lint at all (an adopter's repository-shaped case). Distinct from USG_FIXTURE so the
// exact counts USG-001/002/003 assert over the lint:* fixture stay intact.
const USG_GUARD_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard/features",
  ci: "tests/fixtures/usg-guard/ci.yml",
  packageJson: "tests/fixtures/usg-guard/package.json",
};

// @SCN-USG-005 — a third fixture target whose CI runs the SAME guard:* script (guard:domain-purity)
// but which ALSO NAMES it via @lint=guard:domain-purity (the boundary keeping USG-004 honest).
// Distinct from USG_GUARD_FIXTURE (which names nothing) so the attributed vs uncited
// counts stay separable: here the guard is named → 1 run, 0 uncited.
const USG_GUARD_NAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard-named/features",
  ci: "tests/fixtures/usg-guard-named/ci.yml",
  packageJson: "tests/fixtures/usg-guard-named/package.json",
};

// @SCN-USG-006 — a fourth fixture target whose pipeline is SPLIT: ci.yml runs the suites and
// no static check, nightly.yml runs lint:nightly, and the scenario NAMES lint:nightly. Its `ci`
// is a DIRECTORY, which is what makes it distinct from the three above — every one of those
// supplies a single file, so none of them can tell whether the reader is reading one source or
// many. Kept under workflows/ rather than .github/workflows/ so the fixture pins a directory
// rather than GitHub's layout.
const USG_SIBLING_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-sibling/features",
  ci: "tests/fixtures/usg-sibling/workflows",
  packageJson: "tests/fixtures/usg-sibling/package.json",
};

// The active fixture + its tmp target dir + the rendered report — set by each Given, so the
// one shared "When ... rendered for the target" step drives whichever fixture the scenario picked.
let activeFixture: UsgFixture;
let activeDir: string;
let activeMd: string;

// The vocabulary transition is complete: @SCN-USG-001, @SCN-USG-002 and (as of 3F-2294)
// @SCN-USG-003 all say "checks", so the Cucumber-expression alternation ("guards/checks")
// that spanned the flip has been dropped — this is plain step text again. (@SCN-USG-004 /
// @SCN-USG-005 drive a different Given over the guard:domain-purity fixture and never used it.)
Given("a target whose CI runs the lint:foo and lint:bar checks", function () {
  activeFixture = USG_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg001-"));
});

Given("only lint:foo is named by an @lint scenario", function () {
  // The fixture's target.feature NAMES @lint=lint:foo on @SCN-TGT-001; lint:bar is
  // invoked in the fixture ci.yml but no @lint cites it — the uncited static-check one.
});

// @SCN-USG-004
Given("a target whose CI runs the guard:domain-purity script", function () {
  activeFixture = USG_GUARD_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg004-"));
});

// @SCN-USG-004
Given("no @lint scenario names guard:domain-purity", function () {
  // The usg-guard fixture's target.feature carries NO @lint at all; guard:domain-purity is
  // invoked in the fixture ci.yml but nothing names it — the uncited guard:* one.
});

// @SCN-USG-005
Given("a target whose CI runs the guard:domain-purity script it names", function () {
  activeFixture = USG_GUARD_NAMED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg005-"));
});

// @SCN-USG-005
Given("an @lint scenario names guard:domain-purity", function () {
  // The usg-guard-named fixture's target.feature names @lint=guard:domain-purity on
  // @SCN-TGD-001; the same guard:* script is invoked in the fixture ci.yml — so it is a
  // NAMED running guard, attributed to its scenario, not folded onto the suspense row.
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
  // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
  // out-of-balance fixture (an uncited static-check in the suspense row) exits 1 —
  // the report is still written IN FULL first. Pure exit-expectation flip 0->1; every
  // rendered-content assertion is unchanged.
  assert.equal(
    result.status,
    1,
    `expected exit 1 (out-of-balance) writing the report; got ${result.status}\nstderr:\n${result.stderr}`
  );
  activeMd = readFileSync(reportPath, "utf8");
});

Then(
  "the Static checks section reports lint:bar as an uncited static check",
  function () {
    // The Static checks section keeps the summary-level COUNTS line (ruling Q4);
    // the per-check DETAIL re-homed to the suspense-scenario row, where lint:bar surfaces as
    // a cites-no-scenario credit item (with its guard handle). Both are asserted.
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected the counts "2 static check(s) run, 1 uncited static check(s)"; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("lint ❓ Evidence Observation cites no Scenario (lint:bar)"),
      `expected lint:bar re-homed onto the suspense row as a cites-no-scenario credit; got:\n${activeMd}`
    );
  }
);

// @SCN-USG-004 — a guard:-prefixed CI script (guard:domain-purity) that no @lint NAMES
// surfaces as an uncited static check, exactly as a lint:* one does. The report's Static
// checks section reports 1 running check / 1 uncited, and the suspense row carries the
// guard:domain-purity handle as a cites-no-scenario credit under the "lint" axis (the axis name
// is unchanged — it is the static-check axis, not the script prefix). `guard:domain-purity`
// itself is a CI script NAME — a value the derivation matches on, not vocabulary — so it is
// deliberately untouched by the static-check rename (3F-1929; 3F-1852 owns script names).
Then(
  "the Static checks section reports guard:domain-purity as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected the counts "1 static check(s) run, 1 uncited static check(s)"; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("lint ❓ Evidence Observation cites no Scenario (guard:domain-purity)"),
      `expected guard:domain-purity re-homed onto the suspense row as a cites-no-scenario credit; got:\n${activeMd}`
    );
  }
);

// @SCN-USG-002 — the NAMED check is attributed, not an uncited static check. Same fixture (lint:foo
// is @lint-cited): it must NOT surface as an uncited static-check credit, and the
// counts fold it into the running volume (not the uncited count).
Then(
  "lint:foo is not reported as an uncited static check",
  function () {
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (lint:foo)"),
      `lint:foo is @lint-cited; it must not surface as an uncited static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected lint:foo folded into the running volume (2 run, 1 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

// @SCN-USG-005 — the NAMED guard:* is attributed, not an uncited static check. The
// usg-guard-named fixture runs guard:domain-purity in CI AND names @lint=guard:domain-purity:
// the named-check filter (reconcile's !staticCheckEvidenceObligationSet.has(o.staticCheck)) removes it from the
// running-observation stream so it is not folded onto the suspense row, and the counter attributes
// it (1 run, 0 uncited) — never double-counted as both named and uncited. The guard:*
// mirror of USG-002, keeping the USG-004 broadening honest.
//
// That handle itself is a CI script NAME — a value the derivation matches on, not
// vocabulary — so it is deliberately untouched by the static-check rename (3F-1929; 3F-1852
// owns script names). This scenario exists to prove that prefix is recognised on the
// OBLIGATION side; renaming the handle would destroy exactly that.
Then(
  "guard:domain-purity is not reported as an uncited static check",
  function () {
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (guard:domain-purity)"),
      `guard:domain-purity is @lint-cited; it must not surface as an uncited static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 0 uncited static check(s)"),
      `expected guard:domain-purity attributed (1 run, 0 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

// @SCN-USG-003 — non-lint CI steps are not derived as static checks. The usg fixture ci.yml runs
// pnpm test + pnpm cucumber alongside the two lint checks; runningStaticChecks includes only
// lint:* → exactly 2 running static checks, and test/cucumber never surface as static checks.
Then(
  "only lint:foo and lint:bar are counted as CI checks, not test or cucumber",
  function () {
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected exactly 2 running static checks (test/cucumber excluded); got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("(test)") && !activeMd.includes("(cucumber)"),
      `test/cucumber must not surface as static-check credits; got:\n${activeMd}`
    );
  }
);

// ---------------------------------------------------------------------------
// @SCN-USG-006 — the split pipeline. Its own When, because this target is expected to
// reconcile BALANCED (exit 0) once the reader sees both workflows, where every other
// @USG fixture is deliberately out-of-balance; and because the exit code must be read
// rather than asserted at that point, so the red lands on the Then with a message.
// ---------------------------------------------------------------------------

// @SCN-USG-006
let siblingStatus: number | null;

// @SCN-USG-006
Given(
  "a target whose ci.yml runs no static check and whose nightly.yml runs lint:nightly",
  function () {
    activeFixture = USG_SIBLING_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg006-"));
  },
);

// @SCN-USG-006
Given("an @lint scenario names lint:nightly", function () {
  // The usg-sibling fixture's target.feature carries @lint=lint:nightly on @SCN-TGS-001;
  // the script it names is invoked in nightly.yml and nowhere in ci.yml.
});

// @SCN-USG-006
When(
  "the reconciliation report is rendered over the target's workflow directory",
  function () {
    const repoRoot = process.cwd();
    const abs = (p: string): string => join(repoRoot, p);
    const reportPath = join(activeDir, "spec-reconciliation.md");
    const result = spawnSync(
      join(repoRoot, "node_modules", ".bin", "tsx"),
      [
        join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
        "--features", abs(activeFixture.features),
        "--ci", abs(activeFixture.ci),
        "--package-json", abs(activeFixture.packageJson),
        "--target", "usg-sibling-fixture",
        "--format", `md:${reportPath}`,
      ],
      { cwd: activeDir, encoding: "utf8" },
    );
    assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
    assert.ok(
      existsSync(reportPath),
      `expected a report to be written; stderr:\n${result.stderr}`,
    );
    siblingStatus = result.status;
    activeMd = readFileSync(reportPath, "utf8");
  },
);

// @SCN-USG-007 — the credit-side mirror of the fixture above: the SAME split pipeline, but
// nothing names the check nightly.yml runs. Separate from USG_SIBLING_FIXTURE because an
// uncited check folds a suspense row on, and that target is asserted to exit 0.
const USG_SIBLING_UNCITED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-sibling-uncited/features",
  ci: "tests/fixtures/usg-sibling-uncited/workflows",
  packageJson: "tests/fixtures/usg-sibling-uncited/package.json",
};

// @SCN-USG-007
Given(
  "a target whose nightly.yml runs lint:sweep and whose ci.yml does not",
  function () {
    activeFixture = USG_SIBLING_UNCITED_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg007-"));
  },
);

// @SCN-USG-007
Given("no @lint scenario names lint:sweep", function () {
  // The usg-sibling-uncited fixture's target.feature carries no @lint at all; lint:sweep is
  // invoked in nightly.yml and named by nothing — the uncited-in-a-sibling-workflow case.
});

// @SCN-USG-007
Then(
  "the Static checks section reports lint:sweep as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected lint:sweep counted as RUNNING even though only nightly.yml invokes it — ` +
        `a check that leaves the books by moving between workflow files is a red that can ` +
        `be made to go away without fixing anything. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("lint ❓ Evidence Observation cites no Scenario (lint:sweep)"),
      `expected lint:sweep folded onto the suspense row as a cites-no-scenario credit; ` +
        `got:\n${activeMd}`,
    );
    assert.notEqual(
      siblingStatus,
      0,
      `expected the uncited check to red the run (3F-2306 made that verdict load-bearing); ` +
        `got exit ${siblingStatus}. Report:\n${activeMd}`,
    );
  },
);

// @SCN-USG-008 — the control. Same tree as @SCN-USG-007; only the invocation differs, which
// is the point: the widened default and the surviving narrowing are one flag apart.
// @SCN-USG-008
When("the reconciliation report is rendered for that target's ci.yml alone", function () {
  // Deliberately NOT sharing @SCN-USG-006's When by extracting a helper: that step block
  // is another scenario's evidence, and reshaping it to serve this one would put a
  // parameter between that scenario and its own proof.
  const repoRoot = process.cwd();
  const reportPath = join(activeDir, "spec-reconciliation.md");
  const result = spawnSync(
    join(repoRoot, "node_modules", ".bin", "tsx"),
    [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features", join(repoRoot, USG_SIBLING_UNCITED_FIXTURE.features),
      "--ci", join(repoRoot, USG_SIBLING_UNCITED_FIXTURE.ci, "ci.yml"),
      "--package-json", join(repoRoot, USG_SIBLING_UNCITED_FIXTURE.packageJson),
      "--target", "usg-narrowed-fixture",
      "--format", `md:${reportPath}`,
    ],
    { cwd: activeDir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(reportPath), `expected a report; stderr:\n${result.stderr}`);
  activeMd = readFileSync(reportPath, "utf8");
});

// @SCN-USG-008
Then("lint:sweep is not counted among the running static checks", function () {
  assert.ok(
    activeMd.includes("0 static check(s) run, 0 uncited static check(s)"),
    `expected NOTHING observed: the caller named one workflow, and lint:sweep runs in ` +
      `another. Sweeping the parent directory off a file argument would widen a scope ` +
      `the caller chose deliberately. Got:\n${activeMd}`,
  );
  assert.ok(
    !activeMd.includes("lint:sweep"),
    `expected lint:sweep absent from the report entirely; got:\n${activeMd}`,
  );
});

// @SCN-USG-006
Then(
  "lint:nightly reconciles satisfied, with no watermelon raised against it",
  function () {
    assert.ok(
      activeMd.includes("| SCN-TGS-001 | lint:nightly | ✓ Evidence Observation satisfies its Evidence Obligation |"),
      `expected lint:nightly SATISFIED — it is invoked by nightly.yml, so the scenario ` +
        `naming it is telling the truth. Reading ci.yml alone is what makes the tool ` +
        `disagree. Report:\n${activeMd}`,
    );
    assert.ok(
      !activeMd.includes("🍉"),
      `expected NO watermelon anywhere: a watermelon says a named check is passing but ` +
        `fabricated, and this one genuinely runs. Accusing a real gate of being fake is ` +
        `worse than missing it. Report:\n${activeMd}`,
    );
    assert.equal(
      siblingStatus,
      0,
      `expected the target to reconcile BALANCED once both workflows are read — its only ` +
        `obligation is the lint one, and it is settled. Got exit ${siblingStatus}. ` +
        `Report:\n${activeMd}`,
    );
  },
);

After({ tags: "@USG" }, function () {
  if (activeDir && existsSync(activeDir)) rmSync(activeDir, { recursive: true, force: true });
});
