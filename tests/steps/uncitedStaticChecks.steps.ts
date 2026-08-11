/**
 * @SCN-USG-001 step defs — the uncited-static-check @integration arm.
 * Drives the REAL CLI over the usg fixture target (ci.yml runs lint:foo + lint:bar +
 * test + cucumber; the target registers BOTH handles and its corpus carries a stepless
 * fitness scenario for lint:foo alone) and asserts the persisted spec-reconciliation.md
 * carries the "### Static checks" cut reporting lint:bar as an uncited static check —
 * proving the registry → corpus → runningStaticChecks → reconcile → staticObservationTally
 * → render → disk wiring over real files, not an in-memory re-run (the anti-watermelon rule).
 *
 * WHAT MAKES A CHECK UNCITED HERE IS THE CITATION SEAM, not a lookup against an @lint=
 * spelling: lint:bar reaches no @SCN because nothing carries its bare check tag, so its
 * credit cites no scenario and lands on the suspense row. Both handles being registered is
 * what isolates that — an unregistered lint:bar would land in the same place for a reason
 * the retired rule could also produce.
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
// that its own registry maps to the bare check domain-purity and its corpus carries nowhere
// (an adopter's repository-shaped case). Distinct from USG_FIXTURE so the exact counts USG-001/002/003
// assert over the lint:* fixture stay intact.
const USG_GUARD_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard/features",
  ci: "tests/fixtures/usg-guard/ci.yml",
  packageJson: "tests/fixtures/usg-guard/package.json",
};

// @SCN-USG-005 — a third fixture target whose CI runs the SAME guard:* script (guard:domain-purity)
// and whose registry maps it to the SAME bare check (domain-purity), but whose corpus CARRIES that
// tag on a stepless fitness scenario. That carried tag is the only difference from
// USG_GUARD_FIXTURE, which registers the handle and carries it nowhere — so the pair isolates the
// citation as the thing moving the verdict, and the counts stay separable: here 1 run, 0 uncited.
const USG_GUARD_NAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard-named/features",
  ci: "tests/fixtures/usg-guard-named/ci.yml",
  packageJson: "tests/fixtures/usg-guard-named/package.json",
};

// @SCN-USG-006 — a fourth fixture target whose pipeline is SPLIT: ci.yml runs the suites and
// no static check, nightly.yml runs lint:nightly, and the target CITES lint:nightly — its
// registry maps the handle to the bare check nightly and its corpus carries that tag on a
// stepless scenario. Its `ci` is a DIRECTORY, which is what makes it distinct from the three
// above — every one of those supplies a single file, so none of them can tell whether the
// reader is reading one source or many. Kept under workflows/ rather than .github/workflows/
// so the fixture pins a directory rather than GitHub's layout.
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

// @SCN-USG-001
// @SCN-USG-002
//
// ONE PREMISE SHARED BY THE PAIR, which is the point rather than a saving. @SCN-USG-002 is
// @SCN-USG-001's control over this same target, and a control is only one if the two runs
// differ in nothing: giving each its own sentence would let the two premises drift apart and
// leave neither scenario able to say the citation was the thing that moved the verdict.
Given("only lint:foo is cited by a fitness scenario", function () {
  // The fixture registers BOTH lint:foo → foo and lint:bar → bar, and its target.feature
  // carries a stepless fitness scenario for foo alone on @SCN-TGT-001. So the seam resolves
  // lint:foo to that scenario and reaches nothing for lint:bar — the uncited static check.
});

// @SCN-USG-003
//
// THE PREMISE THIS SCENARIO IS ABOUT, said out loud rather than left to the fixture's own
// comment. tests/fixtures/usg/ci.yml runs `pnpm test` and `pnpm cucumber` beside the two checks
// and package.json defines both scripts, so both are visible to every reader on this axis — and
// a scenario asserting "not test or cucumber" over a target that never ran them asserts nothing.
Given("its CI also runs the test and cucumber suites", function () {});

// @SCN-USG-004
Given("a target whose CI runs the guard:domain-purity script", function () {
  activeFixture = USG_GUARD_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg004-"));
});

// @SCN-USG-004
Given("no fitness scenario cites guard:domain-purity", function () {
  // The usg-guard fixture registers guard:domain-purity → the bare check domain-purity, and
  // its target.feature carries no scenario tagged with that check. So the seam resolves the
  // tag and then reaches no @SCN for it: the credit cites nothing, and the handle CI runs
  // lands on the suspense row. Registered-but-uncarried is what keeps the citation the only
  // fact separating this target from its cited twin.
});

// @SCN-USG-005
Given("a target whose CI runs the guard:domain-purity script it cites", function () {
  activeFixture = USG_GUARD_NAMED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg005-"));
});

// @SCN-USG-005
Given("a fitness scenario cites guard:domain-purity", function () {
  // The usg-guard-named fixture registers guard:domain-purity → the bare check domain-purity, and
  // its target.feature carries that tag on the stepless @SCN-TGD-001. So the seam resolves the
  // handle to a scenario, and the handle CI runs is attributed to that scenario's row instead of
  // folding onto suspense. Registered-and-carried is the shape only the one posting rule can
  // produce, and it is one tag apart from its uncited twin.
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

/**
 * The `## Scenario Reconciliations` ledger row whose FIRST cell is `scnId`, split into cells.
 *
 * Row-scoped rather than a bare search of the report, because "posts to the suspense row" is a
 * claim about WHERE the credit landed, and a whole-report `includes` cannot tell the suspense
 * row from any other row that happens to mention the handle. Scoped to the ledger section for
 * the reason `lintReconciliation.steps.ts` scopes its own reader: the summary cuts above the
 * ledger also carry a scnId in a first cell.
 *
 * Cells are read from the END (`items` last, `verdict` before it) rather than by index from the
 * start: this arm runs with both axis gates ON, so the ledger carries a `Lint` column the
 * gates-off shape does not, and a positional read from the left silently returns the wrong cell.
 */
function ledgerRowCells(md: string, scnId: string): string[] {
  const start = md.indexOf("## Scenario Reconciliations");
  const ledger = start >= 0 ? md.slice(start) : md;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    return line.split("|").map((c) => c.trim())[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for "${scnId}"; got:\n${md}`);
  return row.split("|").map((c) => c.trim());
}

Then(
  "the Static checks section reports lint:bar as an uncited static check",
  function () {
    // The Static checks section keeps the summary-level COUNTS line (ruling Q4);
    // the per-check DETAIL re-homed to the suspense-scenario row, where lint:bar surfaces as
    // a cites-no-scenario credit item (with its script handle). Both are asserted.
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected the counts "2 static check(s) run, 1 uncited static check(s)" — BOTH checks run, ` +
        `and exactly the one no fitness scenario cites is uncited. A reader that resolved no ` +
        `citation at all reports 2 uncited here, which is what the retired rule does over this ` +
        `target: nothing in it carries an @lint= tag any more. Got:\n${activeMd}`
    );

    // THE LANDING, ROW-SCOPED. `(no scenario)` is the suspense row, and the credit has to be ON
    // it — not merely somewhere in the report — because the whole claim is that an unplaceable
    // credit is banked visibly rather than dropped.
    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("lint ❓ Evidence Observation cites no Scenario (lint:bar)"),
      `expected the suspense row to carry lint:bar as a cites-no-scenario credit naming the ` +
        `handle that ran; got "${items}" in:\n${activeMd}`
    );

    // NEVER DROPPED, NEVER SMEARED — lint:bar reaches the books on exactly one row. A rule that
    // let an unresolved citation fall back to the handle would post it to a scenario's row as
    // well; one that dropped it leaves the report silent about a gate nobody owns, which is the
    // comfortable failure this axis exists to refuse.
    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(lint:bar)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected lint:bar's credit on the suspense row and on no other; got ${JSON.stringify(bearing)} in:\n${activeMd}`
    );
  }
);

// @SCN-USG-004 — a guard:-prefixed CI script (guard:domain-purity) no fitness scenario cites
// surfaces as an uncited static check, exactly as a lint:-prefixed one does. The prefix is what
// FOUND it — guard: sits in the discovery set beside lint: — and the citation seam is what left
// it uncited: the registry resolves the handle to the bare check domain-purity and the corpus
// carries that tag nowhere, so the credit cites nothing. It lands on the suspense row under the
// `lint` quality-check (that VALUE is unchanged — it names the static-check axis, not the prefix).
// `guard:domain-purity` itself is a CI script NAME — a value the derivation matches on, not
// vocabulary — so the handle is deliberately untouched by the static-check rename (3F-1929;
// 3F-1852 owns script names).
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
      `expected the counts "1 static check(s) run, 1 uncited static check(s)" — the guard:* ` +
        `script is FOUND by its prefix, so it runs, and the seam reaches no scenario for it, so ` +
        `it is uncited. A reader whose discovery keyed on the spelling lint rather than on the ` +
        `prefix set reports 0 run here while the lint:-prefixed twin stays green. Got:\n${activeMd}`
    );

    // THE LANDING, ROW-SCOPED — the same reading @SCN-USG-001 gives the lint:-prefixed case.
    // "Posts to suspense" is a claim about WHERE the credit went, and a whole-report `includes`
    // cannot tell the suspense row from any other row that happens to carry the handle.
    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("lint ❓ Evidence Observation cites no Scenario (guard:domain-purity)"),
      `expected the suspense row to carry guard:domain-purity as a cites-no-scenario credit ` +
        `naming the handle that ran; got "${items}" in:\n${activeMd}`
    );

    // NEVER DROPPED, NEVER SMEARED. The handle is REGISTERED here — the seam can resolve
    // domain-purity for it and simply finds nothing carrying that tag — so a reader that took a
    // registry entry for an attribution would post this credit to a scenario's row as well, and
    // one that fell back to the handle on an unresolved citation would do the same. Exactly one
    // row bears it, and that row is suspense.
    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(guard:domain-purity)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected guard:domain-purity's credit on the suspense row and on no other; got ${JSON.stringify(bearing)} in:\n${activeMd}`
    );
  }
);

// @SCN-USG-002 — the CITED check is attributed, not an uncited static check. Same target as
// @SCN-USG-001, one fact apart: a stepless fitness scenario carries lint:foo's registered check
// tag and carries nothing for lint:bar. So lint:foo must reach that scenario's row and fold into
// the running volume, while its twin lands in suspense.
Then(
  "lint:foo is attributed to the scenario citing it, not reported uncited",
  function () {
    // ATTRIBUTED, ASSERTED POSITIVELY — the row, not the absence of a different row. The lint
    // cut names the BARE check tag the registry resolves lint:foo to (foo), against the @SCN
    // whose stepless scenario carries it. Both hops are visible in that one line, and neither
    // is readable from a negative: a run under name-match holds only the handle lint:foo, the
    // obligation the scenario raises is foo, and those two spellings never meet.
    assert.ok(
      activeMd.includes(
        "| SCN-TGT-001 | foo | ✓ Evidence Observation satisfies its Evidence Obligation |"
      ),
      `expected lint:foo's credit posted to SCN-TGT-001 under the bare check tag "foo" — the ` +
        `attribution the citation seam produces. Asserting only that no uncited credit names ` +
        `lint:foo is the weaker claim, and a reader posting the credit to a scenario the corpus ` +
        `never wrote satisfies it too. Got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (lint:foo)"),
      `a fitness scenario cites lint:foo; it must not surface as an uncited static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected lint:foo folded into the running volume (2 run, 1 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

// @SCN-USG-005 — the CITED guard:* script is attributed, not an uncited static check. The
// usg-guard-named fixture runs guard:domain-purity in CI, registers it to the bare check
// domain-purity, and carries that tag on a stepless fitness scenario. So the handle reaches this
// axis through the OBLIGATION-side door (observedCheckHandles admits a handle whose registered tag
// some scenario cites) and is filtered out of the running-check stream, which is what stops one
// run being observed twice; the credit arrives carrying @SCN-TGD-001 and posts there.
//
// THIS ARM IS NOT THE PREFIX SET'S READER, and the comment says so because the pair invites the
// opposite assumption. Its twin @SCN-USG-004 reaches the axis through DISCOVERY, where the prefix
// set is what finds a script at all; narrowing that set to ["lint:"] reds the twin and leaves this
// scenario green (measured, 3F-2579). What this arm holds is the other half: the seam is blind to
// the prefix — an opaque handle resolves through the registry whatever it is called.
//
// That handle itself is a CI script NAME — a value the derivation matches on, not
// vocabulary — so it is deliberately untouched by the static-check rename (3F-1929; 3F-1852
// owns script names).
Then(
  "guard:domain-purity is attributed to the scenario citing it, not reported uncited",
  function () {
    // ATTRIBUTED, ASSERTED POSITIVELY — the row, not the absence of a different row, on the terms
    // @SCN-USG-002 reads its own lint:-prefixed twin. The lint cut names the BARE check tag the
    // registry resolves guard:domain-purity to, against the @SCN whose stepless scenario carries
    // it; both hops are visible in that one line and neither is readable from a negative. The
    // retired rule cannot post this row at all: the run holds guard:domain-purity, the obligation
    // the scenario raises is domain-purity, and those two spellings never meet.
    assert.ok(
      activeMd.includes(
        "| SCN-TGD-001 | domain-purity | ✓ Evidence Observation satisfies its Evidence Obligation |"
      ),
      `expected guard:domain-purity's credit posted to SCN-TGD-001 under the bare check tag ` +
        `"domain-purity" — the attribution the citation seam produces. Asserting only that no ` +
        `uncited credit names the handle is the weaker claim, and a reader that dropped the ` +
        `credit satisfies it too. Got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (guard:domain-purity)"),
      `a fitness scenario cites guard:domain-purity; it must not surface as an uncited ` +
        `static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 0 uncited static check(s)"),
      `expected guard:domain-purity folded into the running volume and attributed ` +
        `(1 run, 0 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

// @SCN-USG-003 — the runtime axis's own CI steps are not derived as fitness checks. The usg
// fixture's ci.yml runs pnpm test + pnpm cucumber beside the two checks, and neither reaches
// this axis: no check prefix, nothing configured, and the target's registry names lint:foo and
// lint:bar and nothing else.
Then(
  "only lint:foo and lint:bar are counted as fitness checks, not test or cucumber",
  function () {
    // THE TALLY IS THE TRIPWIRE, AND IT IS THE ONE THAT COVERS THE NEW DOOR. Measured by plant
    // (3F-2578): registering `test` to the bare tag lint:foo already cites admits it through
    // observedCheckHandles, and the ONLY reader-visible trace is this line moving 2 -> 3 — the
    // credit is attributed, so it never reaches suspense, and it raises no obligation, so it
    // never reaches the `### Lint evidence obligations` cut either. A count is the whole of what
    // the report says about a wrongly-derived step, which is why it is asserted first.
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected exactly 2 running fitness checks — the two this target registers. test and ` +
        `cucumber run in the same CI, and deriving either re-counts a behavioural run as a ` +
        `gate nobody wrote a threshold for. Got:\n${activeMd}`
    );
    // THE SUSPENSE LANDING, named separately because the tally cannot say WHICH check inflated
    // it. A step found by a widened prefix or configuration cites nothing and falls here,
    // carrying its handle in parentheses — the shape a discovery-side fault takes.
    assert.ok(
      !activeMd.includes("(test)") && !activeMd.includes("(cucumber)"),
      `test/cucumber must not surface as uncited fitness credits; got:\n${activeMd}`
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
Given("a fitness scenario cites lint:nightly", function () {
  // The usg-sibling fixture registers lint:nightly → the bare check nightly, and its
  // target.feature carries that tag on the stepless @SCN-TGS-001. So the seam resolves the
  // handle to a scenario, and the script it resolves for is invoked in nightly.yml and
  // nowhere in ci.yml — which is the whole of what separates this target from a watermelon.
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
// nothing cites the check nightly.yml runs. Its manifest registers lint:sweep → the bare check
// sweep and its corpus carries that tag nowhere, so the seam is ASKED and answers nothing.
// Separate from USG_SIBLING_FIXTURE because an uncited check folds a suspense row on, and that
// target is asserted to exit 0.
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
Given("no fitness scenario cites lint:sweep", function () {
  // The usg-sibling-uncited fixture registers lint:sweep → the bare check sweep, and its
  // target.feature carries no scenario tagged with that check. So the seam resolves the tag
  // and then reaches no @SCN for it: the credit cites nothing, and the handle nightly.yml
  // invokes lands on the suspense row. Registered-but-uncarried is what keeps the citation
  // the only fact separating this target from its cited twin usg-sibling.
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

    // THE LANDING, ROW-SCOPED — the reading @SCN-USG-001 and @SCN-USG-004 give their own
    // targets. "Posts to suspense" is a claim about WHERE the credit went, and a whole-report
    // `includes` cannot tell the suspense row from any other row carrying the handle.
    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("lint ❓ Evidence Observation cites no Scenario (lint:sweep)"),
      `expected the suspense row to carry lint:sweep as a cites-no-scenario credit naming ` +
        `the handle that ran; got "${items}" in:\n${activeMd}`,
    );

    // NEVER DROPPED, NEVER SMEARED. The handle is REGISTERED here — the seam can resolve
    // sweep for it and simply finds nothing carrying that tag — so a reader that took a
    // registry entry for an attribution would post this credit to a scenario's row as well,
    // and one that fell back to the handle on an unresolved citation would do the same.
    // Exactly one row bears it, and that row is suspense.
    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(lint:sweep)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected lint:sweep's credit on the suspense row and on no other; got ` +
        `${JSON.stringify(bearing)} in:\n${activeMd}`,
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
  // BOTH DOORS, MEASURED BY PLANT — and they are not one fault seen twice. Widening
  // ciSourcePathsOf so a file resolves to its parent directory's workflows reads
  // nightly.yml, and DISCOVERY finds lint:sweep there. Opening the manifest door in
  // observedCheckHandles so every registered handle is asked about regardless of carriage
  // reaches lint:sweep without reading nightly.yml at all. Each reds the count below.
  //
  // The second only became reachable when this fixture gained its checkRegistry for
  // @SCN-USG-007's registered-but-uncarried shape (3F-2582), which recorded the entry as
  // inert for this arm. It is not: it is what stands the manifest door open over the very
  // handle the narrowing excludes. Removing it as decoration would leave this scenario
  // guarding one door of two, still green.
  assert.ok(
    activeMd.includes("0 static check(s) run, 0 uncited static check(s)"),
    `expected NOTHING observed: the caller named one workflow, and lint:sweep runs in ` +
      `another. Sweeping the parent directory off a file argument would widen a scope ` +
      `the caller chose deliberately, and so would admitting lint:sweep off its registry ` +
      `entry — an input that says nothing about which file was named. Got:\n${activeMd}`,
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
    // THE ROW, UNDER THE BARE TAG. The run holds the handle lint:nightly and the obligation
    // the stepless scenario raises is nightly; the registry is what joins them, so the cut
    // names SCN-TGS-001 against `nightly`. Those two spellings never meet, which is why the
    // retired name-match rule cannot settle this obligation at all.
    assert.ok(
      activeMd.includes("| SCN-TGS-001 | nightly | ✓ Evidence Observation satisfies its Evidence Obligation |"),
      `expected the nightly check SATISFIED — lint:nightly is invoked by nightly.yml, so the ` +
        `scenario citing it is telling the truth. Reading ci.yml alone is what makes the tool ` +
        `disagree. Report:\n${activeMd}`,
    );
    // THE SECOND HALF, NOT THE WHOLE. Measured by plant: resolving the citation to a scenario
    // the corpus never wrote leaves this line GREEN — the credit banks on a phantom row and no
    // watermelon is raised — so absence alone cannot carry the verdict, and the row read above
    // is what tells the two apart.
    assert.ok(
      !activeMd.includes("🍉"),
      `expected NO watermelon anywhere: a watermelon says a cited check is passing but ` +
        `fabricated, and this one genuinely runs. Accusing a real gate of being fake is ` +
        `worse than missing it. Report:\n${activeMd}`,
    );
    // NEVER SMEARED, read through the balance. Every other @USG target is deliberately
    // out-of-balance; this one owes nothing but its fitness obligation, so exit 0 is a claim
    // that the credit reached that obligation and no suspense or phantom row besides.
    assert.equal(
      siblingStatus,
      0,
      `expected the target to reconcile BALANCED once both workflows are read — its only ` +
        `obligation is the fitness one, and it is settled. Got exit ${siblingStatus}. ` +
        `Report:\n${activeMd}`,
    );
  },
);

// ---------------------------------------------------------------------------
// @SCN-USG-009 — the CONFIGURED static check. Its own fixture because every other @USG
// target is discovered by a PREFIX, and the whole claim here is that discovery no longer
// depends on one: sharing a fixture would let a prefix do the finding and leave the
// configuration proving nothing.
//
// The fixture registers the handle as well (typecheck → the bare check typecheck), which is
// what leaves the CITATION as the one fact holding the uncited verdict — an unregistered
// handle reaches nothing for a second reason, and the arm would then pass under a reader that
// took every registered handle for an attributed one. The fixture's own prose carries the
// measurement of what that entry is worth; it is not decoration.
// ---------------------------------------------------------------------------
const USG_CONFIGURED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-configured/features",
  ci: "tests/fixtures/usg-configured/ci.yml",
  packageJson: "tests/fixtures/usg-configured/package.json",
};

// @SCN-USG-009
Given("a target that configures typecheck a static check and runs it in CI", function () {
  activeFixture = USG_CONFIGURED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg009-"));
});

// @SCN-USG-009
Given("no fitness scenario cites typecheck", function () {
  // The usg-configured fixture registers typecheck → the bare check typecheck, and its
  // target.feature carries no scenario tagged with that check. So the seam resolves the tag
  // and then reaches no @SCN for it: the credit cites nothing, and the handle CI runs lands on
  // the suspense row. Registered-but-uncarried is what keeps the citation the only fact
  // separating this target from its cited twin — and it is also what stands the REGISTRY door
  // open over this handle, so the plant below can be planted at all.
});

// @SCN-USG-009
Then(
  "the Static checks section reports typecheck as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected typecheck counted as RUNNING and UNCITED. Three things hold this count, and a ` +
        `reader who reds it has broken one of them. DISCOVERY has to find a script no prefix ` +
        `recognises — before 3F-2495 tsc --noEmit reds the build on a violation, is static ` +
        `analysis by any reading, and was invisible for not being called lint:typecheck. The ` +
        `CITATION seam has to reach no @SCN for it, which is what leaves it uncited rather ` +
        `than attributed. And the two DOORS onto this axis have to yield one observation, not ` +
        `two: this target's registry names the handle, so the obligation-side observer can ` +
        `answer for it as well, and the ingest edge's no-double-observe filter is the only ` +
        `thing collapsing them. Got:\n${activeMd}`,
    );

    // THE LANDING, ROW-SCOPED. `(no scenario)` is the suspense row, and the credit has to be ON
    // it rather than merely somewhere in the report — the same reading @SCN-USG-001 takes over
    // its prefix-discovered twin, because a whole-report search cannot tell the suspense row
    // from any other row that happens to mention the handle.
    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("lint ❓ Evidence Observation cites no Scenario (typecheck)"),
      `expected the suspense row to carry typecheck as a cites-no-scenario credit naming the ` +
        `handle that ran — the same landing a prefix-discovered check gets, because a ` +
        `configuration buys no exemption; got "${items}" in:\n${activeMd}`,
    );

    // NEVER DROPPED, NEVER SMEARED — typecheck reaches the books on exactly one row. A rule
    // that let an unresolved citation fall back to the handle would post it to a scenario's row
    // as well; one that dropped it leaves the report silent about a gate nobody owns, which is
    // the comfortable failure this axis exists to refuse.
    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(typecheck)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected typecheck's credit on the suspense row and on no other; got ` +
        `${JSON.stringify(bearing)} in:\n${activeMd}`,
    );

    // test / cucumber run in this fixture's CI too. They pass through NEITHER door — no check
    // prefix, not in staticChecks, and the registry names typecheck and nothing else — so the
    // widened discovery must not drag the runtime axis's own sources onto this one.
    assert.ok(
      !activeMd.includes("(test)") && !activeMd.includes("(cucumber)"),
      `expected test/cucumber NOT counted as static checks; got:\n${activeMd}`,
    );
  },
);

// ---------------------------------------------------------------------------
// @SCN-USG-010 — the boundary keeping @SCN-USG-009 honest, and the one target on this axis where
// the DOUBLE-COUNT is reachable. Same script, same configuration, same registry entry; the ONLY
// difference from usg-configured is the bare @typecheck tag carried on its stepless scenario.
//
// WHICH IS WHAT PUTS THE DOUBLE-COUNT BACK IN RANGE. Both doors stand open over this handle, and
// here they disagree about where the credit lands — the obligation-side reader carries the
// citation and posts to SCN-TGN-001, the running-check reader carries none — so the ingest edge's
// no-double-observe filter is the only thing collapsing them. Over usg-configured the two doors
// AGREE, so the same plant costs it nothing worse than one verdict said twice.
//
// The comment this replaces recorded the opposite finding, and it was true of the fixture as it
// then stood: with the retired tag form and no registry entry, removing that filter left the
// report reading 1 run either way, because the by-name posting's per-handle `find` collapsed the
// second observation before it could reach the tally. Re-measured under the citing shape, the
// plant reds. (3F-2510 measured it honestly; 3F-2585 moved the target out from under the
// measurement; 3F-2590 then deleted the by-name posting entirely.)
// ---------------------------------------------------------------------------
const USG_CONFIGURED_NAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-configured-named/features",
  ci: "tests/fixtures/usg-configured-named/ci.yml",
  packageJson: "tests/fixtures/usg-configured-named/package.json",
};

// @SCN-USG-010
Given("a target that configures typecheck a static check and cites it", function () {
  activeFixture = USG_CONFIGURED_NAMED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg010-"));
});

// @SCN-USG-010
Given("a fitness scenario cites typecheck", function () {
  // The usg-configured-named fixture registers typecheck → the bare check typecheck, and its
  // target.feature carries that tag on the stepless @SCN-TGN-001. So the seam resolves the handle
  // to a scenario and the credit posts to that row instead of folding onto suspense.
  // Registered-and-carried is the shape only the one posting rule can produce, and it is one tag
  // apart from the uncited twin @SCN-USG-009 drives.
});

// @SCN-USG-010
Then(
  "typecheck is attributed to the scenario citing it, counted once and not reported uncited",
  function () {
    // THE COUNT LEADS, because it is the only reading the double-count moves. Reconciliation is
    // per-OBLIGATION, so one obligation settled by either of two credits still reads satisfied and
    // the attributed row below says exactly what it says now. MEASURED: remove the ingest edge's
    // no-double-observe filter and this line reads 2 over a tree running one, while every other
    // assertion in this step stays green.
    assert.ok(
      activeMd.includes("1 static check(s) run, 0 uncited static check(s)"),
      `expected typecheck counted ONCE and attributed. Both doors onto this axis stand open ` +
        `over this handle — the manifest configures it, and the registry reaches it because a ` +
        `scenario carries the tag it resolves to — and the ingest edge's no-double-observe ` +
        `filter is what keeps one run from reaching the books twice. Reporting a gate the ` +
        `target does not have is an INVENTION, and this axis's worst failure. Got:\n${activeMd}`,
    );
    // ATTRIBUTED, ASSERTED POSITIVELY — the row, on the terms @SCN-USG-002 and @SCN-USG-005 read
    // their own twins. The lint cut names the BARE check tag the registry resolves typecheck to,
    // against the @SCN whose stepless scenario carries it; a reader that dropped the credit or
    // banked it on a scenario the corpus never wrote satisfies the negative below and not this.
    assert.ok(
      activeMd.includes(
        "| SCN-TGN-001 | typecheck | ✓ Evidence Observation satisfies its Evidence Obligation |",
      ),
      `expected typecheck attributed to the scenario citing it; got:\n${activeMd}`,
    );
    assert.ok(
      !activeMd.includes("cites no Scenario (typecheck)"),
      `expected NO uncited credit for typecheck: a fitness scenario cites it. Accusing an ` +
        `attributed gate of being uncited sends a consultant to fix something that is not ` +
        `broken. Got:\n${activeMd}`,
    );
  },
);

After({ tags: "@USG" }, function () {
  if (activeDir && existsSync(activeDir)) rmSync(activeDir, { recursive: true, force: true });
});
