/**
 * @SCN-USG-001 step defs — the uncited-static-check @integration arm.
 * Drives the REAL CLI over the usg fixture target (ci.yml runs lint:foo + lint:bar +
 * test + cucumber; the target configures ONE fitnessChecks row for lint:foo and its
 * lint:foo step carries that row's code as its own `id:`) and asserts the persisted
 * spec-reconciliation.md carries the "### Static checks" cut reporting lint:bar as an
 * uncited static check — proving the citedRow → runningStaticChecks → reconcile →
 * staticObservationTally → render → disk wiring over real files, not an in-memory
 * re-run (the anti-watermelon rule).
 *
 * WHAT MAKES A CHECK UNCITED HERE IS THE CITATION SEAM, not a lookup against an @lint=
 * spelling: lint:bar reaches no @SCN because its step carries no `id:` and no configured
 * row answers it, so its credit cites no scenario and lands on the suspense row. lint:foo
 * carrying an `id:` and lint:bar carrying none is what isolates that — a step whose `id:`
 * named no configured row would land in the same place for a reason the retired rule
 * could also produce.
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

// @SCN-USG-004 — a second fixture target whose CI runs a script under NO convention of ours
// (domain-purity) that its own registry maps to the bare check domain-purity and its corpus
// carries nowhere. Distinct from USG_FIXTURE so the exact counts USG-001/002/003 assert over
// that target stay intact.
//
// ITS MANIFEST NAMES ITS RUNNERS AND ITS INSTALL STEP, because under the inverted rule those
// steps are candidates like any other and an unconfigured target reports four uncited checks
// rather than one. That is the `new-client` report and it is correct; what this fixture is for
// is the ONE unprefixed check, so the other three are taken out the way a consumer takes them
// out. The check itself is named by nothing — which is the whole scenario.
const USG_GUARD_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard/features",
  ci: "tests/fixtures/usg-guard/ci.yml",
  packageJson: "tests/fixtures/usg-guard/package.json",
};

// @SCN-USG-005 — a third fixture target whose corpus CARRIES a configured row for the check
// USG_GUARD_FIXTURE's own CI script runs (domain-purity), and whose CI step states that row's
// code as its own `id:`. USG_GUARD_FIXTURE still answers through the registry (a sibling
// sub-issue's fixture); the pair isolates the citation as the thing moving the verdict, and a
// second difference nobody meant has nowhere to drift in. The counts stay separable — here 1 run,
// 0 uncited; there 1 run, 1 uncited — because the citation is what separates them.
const USG_GUARD_NAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard-named/features",
  ci: "tests/fixtures/usg-guard-named/ci.yml",
  packageJson: "tests/fixtures/usg-guard-named/package.json",
};

// @SCN-USG-006 — a fourth fixture target whose pipeline is SPLIT: ci.yml runs the suites and
// no static check, nightly.yml runs lint:nightly, and the target CITES lint:nightly — its
// specController.fitnessChecks configures one row for it and the lint:nightly step in
// nightly.yml states that row's code as its own `id:`. Its `ci` is a DIRECTORY, which is what
// makes it distinct from the three above — every one of those supplies a single file, so none
// of them can tell whether the reader is reading one source or many. Kept under workflows/
// rather than .github/workflows/ so the fixture pins a directory rather than GitHub's layout.
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

// The SECOND target's tmp dir + report (@SCN-USG-016), which reads two targets in one scenario:
// a tier stated to have no runner and a tier never named are one claim, and a single-target
// reading of either half is satisfied by the reader that collapses them.
let secondDir: string;
let secondMd: string;

// The vocabulary transition is complete: @SCN-USG-001, @SCN-USG-002 and (as of 3F-2294)
// @SCN-USG-003 all say "checks", so the Cucumber-expression alternation ("guards/checks")
// that spanned the flip has been dropped — this is plain step text again. (@SCN-USG-004 /
// @SCN-USG-005 drive their own Givens over their own fixtures and never used it.)
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
  // The fixture configures ONE fitnessChecks row (SCN-TGT-001, characteristic foo) and only
  // the lint:foo step carries that row's code as its own `id:` — lint:bar's step carries none.
  // So the running-check observer reads lint:foo's citation off the step and reaches nothing
  // for lint:bar — the uncited static check.
});

// @SCN-USG-003
//
// THE PREMISE THIS SCENARIO IS ABOUT, said out loud rather than left to the fixture's own
// comment. tests/fixtures/usg/ci.yml runs `pnpm test` and `pnpm cucumber` beside the two checks
// and package.json defines both scripts, so both are visible to every reader on this axis — and
// a scenario asserting "not test or cucumber" over a target that never ran them asserts nothing.
Given("its CI also runs the test and cucumber suites", function () {});

// @SCN-USG-003
//
// AND WHAT TAKES THOSE TWO STEPS OUT — the fact the exclusion now rests on, and the one this
// Update added. tests/fixtures/usg/package.json names vitest for the unit tier and cucumber-js
// for the integration tier, and its `test` and `cucumber` scripts run exactly those, so rule D
// reaches both binaries through the manifest hop and recognises each step as its tier's runner.
//
// THE REPORT IS WHERE THAT IS READABLE, not this sentence: the run renders a "Behavioural
// runners" cut naming `pnpm test` and `pnpm cucumber` against the tiers they were named for. So
// a fixture that stopped naming them would not leave this premise merely unstated — it would
// leave it visibly false in the artefact the Then reads.
//
// IT MOVES NO VERDICT YET, AND THE SCENARIO SAYS SO HONESTLY. Discovery still finds a check by
// its script prefix, so these two steps were never counted and this Given cannot be what keeps
// them out until 3F-3360 inverts the membership rule. Writing it now is what stops that switch
// redding this scenario as collateral — the premise is in place before the mechanism needs it.
Given("its manifest names the unit and integration runners those suites run", function () {});

// @SCN-USG-004
Given(
  "a target whose CI runs the domain-purity script, a name matching no convention of ours",
  function () {
    // domain-purity carries neither lint: nor guard: nor any other prefix this tool has ever
    // recognised, so nothing about its NAME can find it. What finds it is that it is a step of
    // the pipeline the manifest did not name a runner and did not name a non-check.
    activeFixture = USG_GUARD_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg004-"));
  }
);

// @SCN-USG-004
Given("no fitness scenario cites domain-purity", function () {
  // The usg-guard fixture registers domain-purity → the bare check domain-purity, and its
  // target.feature carries no scenario tagged with that check. So the seam resolves the tag
  // and then reaches no @SCN for it: the credit cites nothing, and the handle CI runs lands
  // on the suspense row. Registered-but-uncarried is what keeps the citation the only fact
  // separating this target from its cited twin.
});

// @SCN-USG-005
Given("a target whose CI runs the domain-purity script under no convention of ours", function () {
  // The SAME script the twin's Given picks, in a target whose corpus configures a row for it
  // and whose CI step states that row's code. Two Givens rather than one shared step because
  // the two pick different corpora, which is the whole of what they pick.
  activeFixture = USG_GUARD_NAMED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg005-"));
});

// @SCN-USG-005
Given("a fitness scenario cites domain-purity", function () {
  // The usg-guard-named fixture configures one fitnessChecks row for domain-purity
  // (SCN-TGD-001), and its CI step carries that row's code as its own `id:`. So the
  // running-check observer reads the citation off the step, and the handle CI runs is
  // attributed to that row instead of folding onto suspense. Coded-and-configured is the shape
  // only the one posting rule can produce, and it is one `id:` apart from its uncited twin.
});

/**
 * Drive the REAL CLI over ONE fixture target in one tmp dir, and return the report it wrote.
 *
 * Extracted from the shared When below when @SCN-USG-016 arrived needing TWO targets read in one
 * scenario — a tier stated to have no runner and a tier never named, whose reports carry the claim
 * only side by side. One body rather than two, so the pair cannot come to be driven differently:
 * a control read through a second code path is not a control.
 */
function renderReportFor(fixture: UsgFixture, dir: string): string {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const reportPath = join(dir, "spec-reconciliation.md");
  const argv = [
    join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
    "--features", abs(fixture.features),
    "--ci", abs(fixture.ci),
    "--package-json", abs(fixture.packageJson),
    "--target", "usg-fixture",
    "--format", `md:${reportPath}`,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: dir,
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
  return readFileSync(reportPath, "utf8");
}

When("the reconciliation report is rendered for the target", function () {
  activeMd = renderReportFor(activeFixture, activeDir);
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

/**
 * The body rows of the report's `### Behavioural runners` table.
 *
 * SECTION-SCOPED, for the reason `ledgerRowCells` above is row-scoped, and measured rather than
 * foreseen: `### Test volume` also opens its rows with a tier name (`| unit | 0 |`), so a
 * whole-report scan for a row starting `| unit |` answers a question about a different table.
 * The unscoped read failed on exactly those rows.
 *
 * Returns the rows rather than asserting over them, so a caller can say "these and no others" —
 * the claim that matters here is a SET, since a reader recognising one step too many and a reader
 * recognising nothing at all both satisfy any single-row `includes`.
 */
function behaviouralRunnerRows(md: string): string[] {
  return behaviouralRunnersSectionLines(md).filter(
    (line) => line.startsWith("| ") && !line.startsWith("| Tier |") && !line.startsWith("| --- |")
  );
}

/**
 * Every line of the report's `### Behavioural runners` section, the recognised-runner table
 * included — the one slice both cuts of that section are read from.
 *
 * Extracted from `behaviouralRunnerRows` at @SCN-USG-016, which reads the OTHER cut: what the
 * report says about the tiers it recognised nothing at. Two readers slicing the section for
 * themselves would be two chances to scope it differently, and the scoping is the part that was
 * already measured wrong once — `### Test volume` opens its rows with a tier name too.
 */
function behaviouralRunnersSectionLines(md: string): string[] {
  return reportSectionLines(md, "### Behavioural runners");
}

/**
 * Every line of ONE `###` section of the report, from its heading to the next one.
 *
 * The scoping rule itself, stated once. @SCN-USG-015 reads a second section the same way, and two
 * readers each slicing the report for themselves would be two chances to get the scoping wrong —
 * which is the part already measured wrong once, when a whole-report scan for a row opening with a
 * tier name answered a question about `### Test volume`.
 */
function reportSectionLines(md: string, heading: string): string[] {
  const start = md.indexOf(heading);
  if (start < 0) return [];
  const cut = md.slice(start);
  const end = cut.indexOf("\n###", 1);
  return (end >= 0 ? cut.slice(0, end) : cut).split("\n");
}

/**
 * The `### Behavioural runners` lines that are NOT the recognised-runner table — the account of
 * the tiers no runner was recognised for, which is where a stated absence and a silence are told
 * apart (@SCN-USG-016).
 */
function behaviouralRunnerAccountLines(md: string): string[] {
  return behaviouralRunnersSectionLines(md).filter((line) => line.startsWith("- "));
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

// @SCN-USG-004 — a CI script under no convention of ours (domain-purity) that no fitness scenario
// cites surfaces as an uncited static check. NOTHING FOUND IT BY ITS NAME: it is discovered
// because it is a step the manifest named neither a runner nor a non-check, which is the whole of
// the inverted rule. The citation seam is what left it uncited — the registry resolves the handle
// to the bare check domain-purity and the corpus carries that tag nowhere, so the credit cites
// nothing. It lands on the suspense row under the `lint` quality-check (that VALUE is unchanged —
// it names the static-check axis, and never a script convention).
// `domain-purity` itself is a CI script NAME — a value the derivation matches on, not vocabulary —
// so the handle is deliberately untouched by the static-check rename (3F-1929; 3F-1852 owns
// script names).
Then(
  "the Static checks section reports domain-purity as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected the counts "1 static check(s) run, 1 uncited static check(s)" — domain-purity ` +
        `is FOUND because nothing takes it out, so it runs, and the seam reaches no scenario ` +
        `for it, so it is uncited. A reader still finding checks by a prefix set reports 0 run ` +
        `here, because this target's script matches no convention of ours. Got:\n${activeMd}`
    );

    // THE LANDING, ROW-SCOPED — the same reading @SCN-USG-001 gives the lint:-prefixed case.
    // "Posts to suspense" is a claim about WHERE the credit went, and a whole-report `includes`
    // cannot tell the suspense row from any other row that happens to carry the handle.
    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("lint ❓ Evidence Observation cites no Scenario (domain-purity)"),
      `expected the suspense row to carry domain-purity as a cites-no-scenario credit ` +
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
      .filter((line) => line.startsWith("|") && line.includes("(domain-purity)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected domain-purity's credit on the suspense row and on no other; got ${JSON.stringify(bearing)} in:\n${activeMd}`
    );
  }
);

// @SCN-USG-002 — the CITED check is attributed, not an uncited static check. Same target as
// @SCN-USG-001, one fact apart: lint:foo's CI step carries the code of the configured row
// (SCN-TGT-001) as its `id:`, and lint:bar's step carries none. So lint:foo must reach that
// row and fold into the running volume, while its twin lands in suspense.
Then(
  "lint:foo is attributed to the scenario citing it, not reported uncited",
  function () {
    // ATTRIBUTED, ASSERTED POSITIVELY — the row, not the absence of a different row. The lint
    // cut names the BARE characteristic the configured row states (foo), against the @SCN its
    // step's `id:` names. Both hops are visible in that one line, and neither is readable from
    // a negative: a run under name-match holds only the handle lint:foo, the obligation the
    // row states is foo, and those two spellings never meet.
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

// @SCN-USG-005 — the CITED script under no convention of ours is attributed, not an uncited
// static check. The usg-guard-named fixture runs domain-purity in CI, configures one row for it
// (SCN-TGD-001, characteristic domain-purity), and the domain-purity step's `id:` states that
// row's code directly. So the running-check observer reads the citation off the step, and the
// credit arrives carrying @SCN-TGD-001 and posts there.
//
// THIS ARM IS NOT DISCOVERY'S READER, and the comment says so because the pair invites the
// opposite assumption. Its twin @SCN-USG-004 reaches the axis through DISCOVERY, which since
// 3F-3343 reads every step that is not a runner the manifest names, the reconciler, or a step the
// consumer named a non-check. The plant that used to state the asymmetry — narrow the prefix set
// to ["lint:"] (3F-2579) — has no prefix set left to narrow; narrowing DISCOVERY is what plays its
// part, and it was run rather than reasoned (3F-3362): adding this target's own step to its
// notChecks reds the twin's Then and leaves this one green.
//
// AND THE SPELLING CANNOT BE WHAT DECIDES, which the pair now shows rather than argues. This
// target's ci.yml and package.json are no longer byte-identical to usg-guard's — usg-guard still
// answers through the registry (a sibling sub-issue's fixture) — so what is left to answer from
// is the citation each carries, which is the one posting rule.
//
// That handle itself is a CI script NAME — a value the derivation matches on, not
// vocabulary — so it is deliberately untouched by the static-check rename (3F-1929; 3F-1852
// owns script names).
Then(
  "domain-purity is attributed to the scenario citing it, not reported uncited",
  function () {
    // ATTRIBUTED, ASSERTED POSITIVELY — the row, not the absence of a different row, on the terms
    // @SCN-USG-002 reads its own cited twin. The lint cut names the bare characteristic the
    // configured row states, against the @SCN its step's `id:` names; both hops are visible in
    // that one line and neither is readable from a negative.
    assert.ok(
      activeMd.includes(
        "| SCN-TGD-001 | domain-purity | ✓ Evidence Observation satisfies its Evidence Obligation |"
      ),
      `expected domain-purity's credit posted to SCN-TGD-001 — the attribution the citation seam ` +
        `produces. Asserting only that no uncited credit names the handle is the weaker claim, ` +
        `and a reader that dropped the credit satisfies it too. Got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (domain-purity)"),
      `a fitness scenario cites domain-purity; it must not surface as an uncited ` +
        `static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 0 uncited static check(s)"),
      `expected domain-purity folded into the running volume and attributed ` +
        `(1 run, 0 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

// @SCN-USG-003 — test and cucumber CI steps are not candidate fitness checks, because the
// manifest names their runners. The usg fixture's ci.yml runs pnpm test + pnpm cucumber beside
// the two checks, its package.json names vitest for unit and cucumber-js for integration, and
// its test and cucumber scripts run exactly those — so both steps are this target's behavioural
// runners rather than gates, and the axis counts the two registered checks alone.
Then(
  "only lint:foo and lint:bar are counted as fitness checks, not test or cucumber",
  function () {
    // THE TALLY IS THE TRIPWIRE, AND IT IS THE ONE THAT COVERS EVERY WAY IN. Measured by plant
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
  // ONE DOOR NOW, WHERE THERE USED TO BE TWO. Widening ciSourcePathsOf so a file resolves to
  // its parent directory's workflows reads nightly.yml, and DISCOVERY finds lint:sweep there —
  // that is the door this arm still guards. A SECOND door — the manifest's own registry,
  // opened in `observedCheckHandles` so every registered handle was asked about regardless of
  // carriage — used to reach lint:sweep without reading nightly.yml at all; this fixture's
  // checkRegistry entry was kept for @SCN-USG-007's registered-but-uncarried shape (3F-2582)
  // and doubled as that second door's guard. The registry route it opened retired whole
  // (3F-3395), taking `observedCheckHandles` with it, so there is no second door left for this
  // arm to guard against — the single remaining reading is discovery, scoped to the named file.
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
    // THE ROW, UNDER THE BARE TAG. The run holds the handle lint:nightly and the obligation
    // the stepless scenario raises is nightly; the step's own `id:` is what joins them —
    // stating SCN-TGS-001 directly — so the cut names SCN-TGS-001 against `nightly`. Those two
    // spellings never meet, which is why the retired name-match rule cannot settle this
    // obligation at all.
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
// @SCN-USG-011 — the BEHAVIOURAL RUNNER, recognised through the manifest. Its own fixture
// because every other @USG target is here to be DISCOVERED, and this one is here to be
// recognised as the thing discovery is not about: sharing a target would leave the two
// readings' fixtures free to answer for each other.
//
// THE FIXTURE'S LOAD-BEARING PROPERTY IS AN ABSENCE, so the arm asserts it rather than
// trusting it. `vitest` is written in package.json's `test` script and NOWHERE in ci.yml,
// which is what makes the manifest hop the only route to the recognition: a reader matching
// the step's command alone has nothing to match. That is the measured shape of all five real
// portfolio pipelines — 113 run: steps, zero of them naming their runner in the workflow.
// ---------------------------------------------------------------------------
const USG_RUNNERS_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runners/features",
  ci: "tests/fixtures/usg-runners/ci.yml",
  packageJson: "tests/fixtures/usg-runners/package.json",
};

// @SCN-USG-011
Given("a target that names vitest its unit runner and runs pnpm test in CI", function () {
  activeFixture = USG_RUNNERS_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg011-"));
  // THE ABSENCE, ASSERTED IN THE GIVEN, because it is a premise and not a finding: if a later
  // edit writes vitest into this workflow, the Then below would pass over a target that no
  // longer poses the question, and nothing else in the suite would notice.
  const workflow = readFileSync(join(process.cwd(), USG_RUNNERS_FIXTURE.ci), "utf8");
  assert.ok(
    !workflow.includes("vitest"),
    `the usg-runners fixture must not name vitest in its workflow — the manifest hop is the ` +
      `only route to the recognition this scenario is about. Got:\n${workflow}`,
  );
});

// @SCN-USG-011
Then(
  "the report names vitest the unit runner, recognised at the step that runs it",
  function () {
    assert.match(
      activeMd,
      /### Behavioural runners/,
      `expected the report to account for the steps it recognised as behavioural runners. A ` +
        `step this reader recognises must leave it NAMED rather than silent — the whole ` +
        `argument for a recognition rule this simple is that what it gets wrong is visible. ` +
        `Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("| unit | vitest | Unit tests |"),
      `expected the unit tier's runner named as vitest, recognised at the step GitHub itself ` +
        `displays as "Unit tests". The recognition can only have come through the manifest: ` +
        `ci.yml runs "pnpm test" and never writes the word vitest, so a reader matching the ` +
        `step's command alone reports nothing here. Got:\n${activeMd}`,
    );
    // ONE ROW, because this target names one tier. A reader crediting the same step to every
    // tier it was asked about, or naming a tier the manifest never wrote, satisfies the line
    // above and not this one.
    const rows = behaviouralRunnerRows(activeMd);
    assert.deepEqual(
      rows,
      ["| unit | vitest | Unit tests |"],
      `expected exactly one recognised runner over a target naming exactly one; got ` +
        `${JSON.stringify(rows)} in:\n${activeMd}`,
    );
    // AND NO VERDICT MOVED. Discovery is untouched by this sub-issue — the runner step is
    // outside the static axis for the reason it always was, the prefix rule's silence — so the
    // recognition must not have put `test` onto the books as a check as a side effect.
    assert.ok(
      !activeMd.includes("(test)"),
      `expected the runner step NOT to reach the static-check books: this scenario adds a ` +
        `reader and a report line, and moves no verdict. Got:\n${activeMd}`,
    );
  },
);

// ---------------------------------------------------------------------------
// @SCN-USG-012 — THE RULE'S TEETH over the whole reader. Its own fixture, because the two
// steps have to sit in ONE pipeline for the claim to mean anything: the check that names the
// runner out of position and the suite step that runs it, read together.
//
// THE CHECK STEP IS AN ORDINARY ONE. The reconciler's own step is excluded too, and by
// construction rather than by this rule, so a shared fixture would let a green be silent about
// which exclusion did the work.
// ---------------------------------------------------------------------------
const USG_OUT_OF_POSITION_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-out-of-position/features",
  ci: "tests/fixtures/usg-runner-out-of-position/ci.yml",
  packageJson: "tests/fixtures/usg-runner-out-of-position/package.json",
};

// @SCN-USG-012
Given(
  "a target that names vitest its unit runner, runs its unit suite, and runs a check whose command writes a report named after that runner",
  function () {
    activeFixture = USG_OUT_OF_POSITION_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg012-"));
    // THE TWO PREMISES, ASSERTED RATHER THAN TRUSTED, because both are properties of a file a
    // later edit is free to change: the check step must carry the runner's name (or this target
    // poses no question at all) and it must carry it OUT of command position (or the recognition
    // would be right to make it). Neither is visible in the Then.
    const workflow = readFileSync(join(process.cwd(), USG_OUT_OF_POSITION_FIXTURE.ci), "utf8");
    const checkCommand = workflow
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("run: pnpm lint:rules"));
    assert.ok(
      checkCommand !== undefined && checkCommand.includes("vitest"),
      `the usg-runner-out-of-position fixture's check step must name the unit runner, or this ` +
        `target poses none of this scenario's question. Got:\n${workflow}`,
    );
    assert.ok(
      !checkCommand.split(/\s+/).includes("vitest"),
      `the check step must name the runner OUT of command position — as a path, a flag or an ` +
        `=-joined argument. A whole token would make the recognition correct. Got: ${checkCommand}`,
    );
  },
);

// @SCN-USG-012
Then(
  "the report names the unit suite step its runner and no other, and the check is on the books as an uncited static check",
  function () {
    // THE EXCLUSION THAT MUST NOT HAPPEN, stated as the row set rather than as an absence: a
    // reader that recognised the check step as well posts a second row here, and a reader blind
    // to both posts none. Only the runner step's row satisfies this.
    const rows = behaviouralRunnerRows(activeMd);
    assert.deepEqual(
      rows,
      ["| unit | vitest | Unit tests |"],
      `expected the unit runner recognised at the suite step and NOWHERE else. The check step ` +
        `writes a file named after the runner and runs eslint; recognising it would delete a ` +
        `fitness check from this report and say nothing, which is the one direction this axis ` +
        `cannot tolerate. Got ${JSON.stringify(rows)} in:\n${activeMd}`,
    );
    // AND THE CHECK REACHED THE BOOKS. The row above is an absence from one section; this is the
    // presence it is worth having. A step excluded as the runner would not be counted here, and
    // the census would read 0 run over a pipeline running one.
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected the check step counted as a running static check and reported uncited. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("Evidence Observation cites no Scenario (lint:rules)"),
      `expected lint:rules banked on the suspense row — a candidate that cites nothing is ` +
        `surfaced, never dropped. Got:\n${activeMd}`,
    );
  },
);

// ---------------------------------------------------------------------------
// @SCN-USG-016 — A STATED ABSENCE AND A SILENCE, READ SIDE BY SIDE. Two fixture targets, and
// the pair is the scenario: usg-runner-none's manifest says `"performance": null` and
// usg-runner-unnamed's carries no performance key, and NOTHING ELSE about the two targets
// differs. Their corpora and workflows are byte-identical and their scripts are the same, which
// is what lets the difference between the two reports be attributed to the one place they differ.
//
// WHY IT TAKES TWO. A reader that folded null into absent, or absent into null, prints the same
// sentence over both — and every single-target arm in this file is satisfied by that reader,
// because neither state recognises a step or excludes one. The claim is the DISTINCTION, so the
// evidence is a comparison.
// ---------------------------------------------------------------------------
const USG_RUNNER_NONE_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-none/features",
  ci: "tests/fixtures/usg-runner-none/ci.yml",
  packageJson: "tests/fixtures/usg-runner-none/package.json",
};

const USG_RUNNER_UNNAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-unnamed/features",
  ci: "tests/fixtures/usg-runner-unnamed/ci.yml",
  packageJson: "tests/fixtures/usg-runner-unnamed/package.json",
};

// @SCN-USG-016
Given("a target that says it has no performance runner", function () {
  activeFixture = USG_RUNNER_NONE_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg016-none-"));
  // THE PREMISE, ASSERTED RATHER THAN TRUSTED, and asserted for its SHAPE: a null value, not a
  // missing key. JSON.parse collapses nothing, so `hasOwn` and `=== null` together are the only
  // reading that tells this manifest from its twin — which is the whole subject of the scenario,
  // and would be silently lost if a later edit deleted the key instead of nulling it.
  const runners = runnersBlockOf(USG_RUNNER_NONE_FIXTURE);
  assert.ok(
    Object.hasOwn(runners, "performance") && runners["performance"] === null,
    `the usg-runner-none fixture must say performance is null — a target that omits the key ` +
      `poses the twin's question, not this one. Got: ${JSON.stringify(runners)}`,
  );
});

// @SCN-USG-016
Given("a second target, alike but for saying nothing about performance", function () {
  secondDir = mkdtempSync(join(tmpdir(), "spec-controller-usg016-unnamed-"));
  const runners = runnersBlockOf(USG_RUNNER_UNNAMED_FIXTURE);
  assert.ok(
    !Object.hasOwn(runners, "performance"),
    `the usg-runner-unnamed fixture must carry no performance key at all. Got: ` +
      `${JSON.stringify(runners)}`,
  );
  // ALIKE, ASSERTED. A control is only a control if the two targets differ in one place, and
  // three of the four things this run reads are files a later edit is free to change on one side
  // only. The fourth — the runner block — is compared with its performance entry removed, which
  // is the one difference the scenario is allowed to have.
  for (const part of ["ci.yml", "features/target.feature"] as const) {
    assert.equal(
      readFileSync(join(process.cwd(), "tests/fixtures/usg-runner-none", part), "utf8"),
      readFileSync(join(process.cwd(), "tests/fixtures/usg-runner-unnamed", part), "utf8"),
      `the pair's ${part} must be byte-identical, or the difference between their two reports ` +
        `cannot be attributed to the runner block`,
    );
  }
  assert.deepEqual(
    manifestOf(USG_RUNNER_NONE_FIXTURE)["scripts"],
    manifestOf(USG_RUNNER_UNNAMED_FIXTURE)["scripts"],
    `the pair's scripts must be identical — the runner is recognised through them`,
  );
  const { performance: _stated, ...rest } = runnersBlockOf(USG_RUNNER_NONE_FIXTURE);
  assert.deepEqual(
    rest,
    runners,
    `the pair's runner blocks must differ in the performance entry and nowhere else. Got ` +
      `${JSON.stringify(rest)} against ${JSON.stringify(runners)}`,
  );
});

/** A fixture target's manifest, parsed. */
function manifestOf(fixture: UsgFixture): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), fixture.packageJson), "utf8")) as Record<
    string,
    unknown
  >;
}

/** A fixture target's `specController.runners` block, as written. */
function runnersBlockOf(fixture: UsgFixture): Record<string, unknown> {
  const specController = manifestOf(fixture)["specController"] as Record<string, unknown>;
  return specController["runners"] as Record<string, unknown>;
}

// @SCN-USG-016
When("the reconciliation report is rendered for both targets", function () {
  activeMd = renderReportFor(activeFixture, activeDir);
  secondMd = renderReportFor(USG_RUNNER_UNNAMED_FIXTURE, secondDir);
});

// @SCN-USG-016
Then("the first target's report says it has no performance runner", function () {
  // THE RECOGNITION IS UNTOUCHED, first. A null in the block must not cost the target the tier it
  // DID name: a reader that threw on the null, or matched it against a command, either reports
  // nothing here or reports a tier the target never asked about.
  assert.deepEqual(
    behaviouralRunnerRows(activeMd),
    ["| unit | vitest | Unit tests |"],
    `expected the unit runner still recognised beside a tier stated to have none; got:\n${activeMd}`,
  );
  // AND THE ACCOUNT SAYS WHAT THE TARGET SAID. The whole set rather than one line, because a
  // reader that says this of every tier it did not recognise has not read the block at all.
  assert.deepEqual(
    behaviouralRunnerAccountLines(activeMd),
    [
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — no runner: the target names none.",
    ],
    `expected the performance tier reported as HAVING NONE — the target said so — and the two ` +
      `tiers it said nothing about reported unnamed. Got:\n${activeMd}`,
  );
});

// @SCN-USG-016
Then("the second target's report says its performance runner is unnamed", function () {
  assert.deepEqual(
    behaviouralRunnerAccountLines(secondMd),
    [
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — unnamed: the target has not said.",
    ],
    `expected the performance tier reported UNNAMED over a target that carries no performance ` +
      `key. Got:\n${secondMd}`,
  );
  // THE COMPARISON, WHICH IS THE CLAIM. Either arm alone is satisfied by a reader that prints one
  // sentence for both states — that reader passes the first arm by printing "no runner"
  // everywhere, or the second by printing "unnamed" everywhere. Only the two sections differing,
  // in exactly the one line the two manifests differ over, rules both of them out.
  const first = behaviouralRunnersSectionLines(activeMd);
  const second = behaviouralRunnersSectionLines(secondMd);
  assert.deepEqual(
    first.filter((line) => !second.includes(line)),
    ["- performance — no runner: the target names none."],
    `expected the two reports' runner sections to differ in the performance line ALONE. A ` +
      `difference anywhere else means something other than the runner block moved; no ` +
      `difference at all is the collapse this scenario exists to catch.\nfirst:\n${activeMd}` +
      `\nsecond:\n${secondMd}`,
  );
  assert.deepEqual(
    second.filter((line) => !first.includes(line)),
    ["- performance — unnamed: the target has not said."],
    `expected the silent target's report to carry the unnamed line and nothing else the stated ` +
      `absence's report does not.\nfirst:\n${activeMd}\nsecond:\n${secondMd}`,
  );
});

// ---------------------------------------------------------------------------
// @SCN-USG-019 — THE KEY SET'S CLOSURE. Its own fixture, and the fixture's whole shape is that
// the bogus key is NOT inert: `"lint": "eslint"` sits beside `"unit": "vitest"`, and the
// pipeline runs `pnpm lint:rules` whose script body is `eslint`. A reader honouring any key
// resolves that step through the manifest exactly as it resolves the unit suite's, and takes a
// real fitness check out of the report on the strength of a word the consumer invented.
//
// A FIXTURE WHOSE BOGUS KEY MATCHED NOTHING WOULD PROVE NOTHING. The absence of a row is
// satisfied by a reader that recognises nothing anywhere, so the unit row beside it is the
// control, and the check reaching the books is the presence that makes the absence mean
// something.
// ---------------------------------------------------------------------------
const USG_NOT_A_TIER_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-not-a-tier/features",
  ci: "tests/fixtures/usg-runner-not-a-tier/ci.yml",
  packageJson: "tests/fixtures/usg-runner-not-a-tier/package.json",
};

/**
 * The four canon runtime tiers, written out HERE rather than read from the ledger the reader
 * derives them from. The production rule must not restate them — a second list is the drift this
 * axis exists to remove — but a test that took its expectation from the same constant could only
 * ever agree with itself, whatever that constant said. So the literal lives on this side alone.
 */
const CANON_TIERS = ["unit", "integration", "e2e", "performance"] as const;

// @SCN-USG-019
Given("a target whose runner block names a key that is not one of the four tiers", function () {
  activeFixture = USG_NOT_A_TIER_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg019-"));
  const runners = runnersBlockOf(USG_NOT_A_TIER_FIXTURE);
  // THE PREMISE, ASSERTED FOR ITS SHAPE. Both halves: a key outside the four (or this target
  // poses none of this scenario's question) and a key INSIDE them (or the report below has no
  // control, and a reader that read the block not at all would satisfy every line of it).
  assert.deepEqual(
    Object.keys(runners).filter((key) => !(CANON_TIERS as readonly string[]).includes(key)),
    ["lint"],
    `the usg-runner-not-a-tier fixture must carry exactly one key outside the four canon tiers. ` +
      `Got: ${JSON.stringify(runners)}`,
  );
  assert.equal(
    runners["unit"],
    "vitest",
    `the fixture must also name a real tier — without it the report carries no recognition, and ` +
      `a reader blind to the whole block satisfies this scenario. Got: ${JSON.stringify(runners)}`,
  );
});

// @SCN-USG-019
Given("that key names the command of a check its CI runs", function () {
  // THE KEY IS NOT INERT, and that is the difference between this scenario and a typo. `eslint`
  // is reachable from the `Rule check` step through the manifest hop, so a reader honouring the
  // key would recognise that step as a runner and delete a fitness check from the report. A
  // fixture whose bogus key named nothing anybody runs would go green under that reader.
  const scripts = manifestOf(USG_NOT_A_TIER_FIXTURE)["scripts"] as Record<string, string>;
  const runners = runnersBlockOf(USG_NOT_A_TIER_FIXTURE);
  assert.ok(
    scripts["lint:rules"]?.split(/\s+/).includes(runners["lint"] as string),
    `the fixture's lint:rules script must run the command its bogus runner key names, or the ` +
      `key excludes nothing for a reason that has nothing to do with the closure. Got: ` +
      `${JSON.stringify(scripts)} against ${JSON.stringify(runners)}`,
  );
  const workflow = readFileSync(join(process.cwd(), USG_NOT_A_TIER_FIXTURE.ci), "utf8");
  assert.ok(
    workflow.includes("run: pnpm lint:rules"),
    `the fixture's CI must run that check, or no step is available to be wrongly excluded. ` +
      `Got:\n${workflow}`,
  );
});

// @SCN-USG-019
Then("the report names that key as one it does not recognise", function () {
  // THE WHOLE ACCOUNT, not one line of it. A reader that says this of every key, or that says it
  // while ALSO honouring the key, satisfies an `includes`; only the set rules both out.
  assert.deepEqual(
    behaviouralRunnerAccountLines(activeMd),
    [
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — unnamed: the target has not said.",
      "- lint — not a tier: the runner block is keyed by the four canon tiers, and this key excludes nothing.",
    ],
    `expected the bogus key NAMED on the report as one the tool does not recognise. Partitioning ` +
      `it out silently is the same class of fault as dropping a step silently: the consumer ` +
      `wrote something and believes it took effect. Got:\n${activeMd}`,
  );
  // AND IT WAS NOT HONOURED. The row set, because the failure this forecloses is a SECOND row —
  // `| lint | eslint | Rule check |` — which is a consumer taking their own check out of
  // discovery one key at a time, and the silence this axis exists to end.
  assert.deepEqual(
    behaviouralRunnerRows(activeMd),
    ["| unit | vitest | Unit tests |"],
    `expected the unit tier recognised and the bogus key recognising nothing. A row for lint ` +
      `means the key was honoured; no row at all means the reader is blind to the block and the ` +
      `line above passed for the wrong reason. Got:\n${activeMd}`,
  );
});

// @SCN-USG-019
Then("the check is on the books as an uncited static check", function () {
  // THE PRESENCE THAT MAKES THE ABSENCE MEAN SOMETHING, and the reason the run is not aborted:
  // an unrecognised key costs the target nothing but a line on the report it can correct from.
  assert.ok(
    activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
    `expected the check the bogus key names still counted as a running static check. A key that ` +
      `excluded it would read 0 run over a pipeline running one. Got:\n${activeMd}`,
  );
  assert.ok(
    activeMd.includes("Evidence Observation cites no Scenario (lint:rules)"),
    `expected lint:rules banked on the suspense row — surfaced, never dropped. Got:\n${activeMd}`,
  );
});

// ---------------------------------------------------------------------------
// @SCN-USG-021 — THE RETIRED KEY, NAMED. Its own fixture, and the fixture's whole shape is that
// `checkRegistry` is written CORRECTLY — a real CI step (`lint:foo`) mapped to a real bare check
// tag a scenario below carries (`foo`) — the same shape @SCN-STG-005's scn-tags-fitness fixture
// plants for the `tags` command. This arm is the reconciliation report's own side of the same
// fact: nothing reads the block any longer, so the report has to say so, the check has to reach
// the suspense row on its own, and the bare-tagged scenario has to reconcile like any other
// untagged one.
// ---------------------------------------------------------------------------
const USG_CHECK_REGISTRY_RETIRED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-check-registry-retired/features",
  ci: "tests/fixtures/usg-check-registry-retired/ci.yml",
  packageJson: "tests/fixtures/usg-check-registry-retired/package.json",
};

/** The `- <key> — retired: ...` lines of the report's `### Static checks` retired-key account. */
function retiredKeyLines(md: string): string[] {
  return reportSectionLines(md, "### Static checks").filter((line) => line.startsWith("- specController."));
}

// @SCN-USG-021
Given(
  "a target whose manifest registers a check through specController.checkRegistry, naming a check its CI runs",
  function () {
    activeFixture = USG_CHECK_REGISTRY_RETIRED_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg021-"));
    // THE PREMISE, ASSERTED FOR ITS SHAPE. The block names one entry, mapping a runnable handle
    // to a bare check tag, or the scenario poses no question about the retired route at all.
    const specController = manifestOf(USG_CHECK_REGISTRY_RETIRED_FIXTURE)[
      "specController"
    ] as Record<string, unknown>;
    assert.deepEqual(
      specController["checkRegistry"],
      { "lint:foo": "foo" },
      `the fixture must carry exactly the registry entry this scenario is about. Got: ` +
        `${JSON.stringify(specController)}`,
    );
    const workflow = workflowOf(USG_CHECK_REGISTRY_RETIRED_FIXTURE);
    assert.ok(
      workflow.includes("run: pnpm lint:foo"),
      `the fixture's CI must run the check the registry names, or nothing is available to reach ` +
        `the books at all. Got:\n${workflow}`,
    );
  },
);

// @SCN-USG-021
Given("that target's corpus carries a scenario tagged with the registry's bare check tag", function () {
  const source = readFileSync(
    join(process.cwd(), USG_CHECK_REGISTRY_RETIRED_FIXTURE.features, "target.feature"),
    "utf8",
  );
  assert.ok(
    /^\s*@foo\s*$/m.test(source) && source.includes("Scenario: the check the registry names is exercised"),
    `the fixture's corpus must carry a scenario tagged with the registry's own bare check tag ` +
      `("foo"), stepless, or the scenario poses no question about the join the registry used to ` +
      `make. Got:\n${source}`,
  );
});

// @SCN-USG-021
Then("the report names specController.checkRegistry as a key it no longer reads", function () {
  // THE NAME, NOT MERELY THE SILENCE. A reader that simply stopped reading the block satisfies
  // every OTHER line of this scenario; only this line catches one that stopped reading it
  // without saying so.
  assert.deepEqual(
    retiredKeyLines(activeMd),
    [
      "- specController.checkRegistry — retired: this reader no longer reads it, and none of its entries reach the books.",
    ],
    `expected the retired key NAMED on the report, the same duty @SCN-USG-019 gives an invented ` +
      `key. Got:\n${activeMd}`,
  );
});

// @SCN-USG-021
Then("the check is on the books as an uncited static check, citing no scenario", function () {
  // THE ROUTE IS GONE, NOT MERELY UNRESOLVED. Discovery finds the step by subtraction, exactly
  // as it would over a target naming no registry at all — nothing about the retirement takes the
  // check out of the books, and the retired key naming it changes nothing about where it lands.
  assert.ok(
    reportSectionLines(activeMd, "### Static checks").some((line) =>
      line.includes("1 static check(s) run, 1 uncited static check(s)"),
    ),
    `expected lint:foo counted as the one running, one uncited static check. Got:\n${activeMd}`,
  );
  assert.ok(
    suspenseRowCredits(activeMd).includes("lint:foo"),
    `expected lint:foo's credit banked on the suspense row — cited by nothing, because nothing ` +
      `resolves the registry that used to name its scenario. Got:\n${activeMd}`,
  );
});

// @SCN-USG-021
Then("the bare-tagged scenario raises no Evidence Obligation", function () {
  // NO-SCN-CODE, THE ORDINARY RULE (@SCN-LDG-021) — NOT A FITNESS OBLIGATION THE REGISTRY USED
  // TO RAISE. The scenario carries no @SCN, so with nothing left to resolve its bare tag it
  // reconciles exactly as any other untagged scenario does: named on the untagged census, never
  // as an answered — or even a missing — obligation.
  assert.ok(
    activeMd.includes("1 scenario(s) carry no @SCN tag:"),
    `expected the bare-tagged scenario counted among the corpus's untagged half, raising no ` +
      `obligation the registry no longer resolves. Got:\n${activeMd}`,
  );
  assert.ok(
    activeMd.includes("target.feature : the check the registry names is exercised"),
    `expected the bare-tagged scenario named by its own locator on the untagged census. Got:\n${activeMd}`,
  );
});

// ---------------------------------------------------------------------------
// @SCN-USG-022 — THE SECOND RETIRED KEY. Its own fixture: `specController.staticChecks` names
// `check:types` among two scripts (`check:format` declared first, `check:types` second) a single
// CI step invokes together — the tiebreak 3F-3396 deleted. This arm proves the report's two
// separate consequences of retiring it: the key is NAMED (the same account @SCN-USG-021 grafts),
// and the step it used to settle is now reported under the FIRST script it invokes rather than
// the one the list nominated.
// ---------------------------------------------------------------------------
const USG_STATIC_CHECKS_RETIRED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-static-checks-retired/features",
  ci: "tests/fixtures/usg-static-checks-retired/ci.yml",
  packageJson: "tests/fixtures/usg-static-checks-retired/package.json",
};

// @SCN-USG-022
Given("a target whose manifest carries a specController.staticChecks list", function () {
  activeFixture = USG_STATIC_CHECKS_RETIRED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg022-"));
  // THE PREMISE, ASSERTED FOR ITS SHAPE. The list must nominate exactly the script the second
  // Then's step invokes ALONGSIDE another, or the scenario poses no question about the tiebreak
  // at all.
  const specController = manifestOf(USG_STATIC_CHECKS_RETIRED_FIXTURE)[
    "specController"
  ] as Record<string, unknown>;
  assert.deepEqual(
    specController["staticChecks"],
    ["check:types"],
    `the fixture must carry exactly the staticChecks entry this scenario is about. Got: ` +
      `${JSON.stringify(specController)}`,
  );
});

// @SCN-USG-022
Given("a CI step invoking two of that target's scripts, one of them on that list", function () {
  // THE ORDER IS THE POINT. `check:format` is declared BEFORE `check:types` in the fixture's own
  // scripts block, and the list nominates `check:types` — the two disagree, or the scenario
  // cannot tell "first invoked" apart from "list nominated".
  assert.deepEqual(
    Object.keys(scriptsOf(USG_STATIC_CHECKS_RETIRED_FIXTURE)),
    ["check:format", "check:types", "test", "cucumber"],
    `expected check:format declared before check:types, or the fixture cannot isolate "first ` +
      `invoked" from "list nominated". Got: ` +
      `${JSON.stringify(scriptsOf(USG_STATIC_CHECKS_RETIRED_FIXTURE))}`,
  );
  const workflow = workflowOf(USG_STATIC_CHECKS_RETIRED_FIXTURE);
  assert.ok(
    /run:\s*\|\s*\n\s*pnpm check:format\s*\n\s*pnpm check:types/.test(workflow),
    `the fixture's CI must run one step invoking BOTH scripts, or there is nothing for the ` +
      `tiebreak to have settled. Got:\n${workflow}`,
  );
});

// @SCN-USG-022
Then("the report names specController.staticChecks as a key it no longer reads", function () {
  assert.deepEqual(
    retiredKeyLines(activeMd),
    [
      "- specController.staticChecks — retired: this reader no longer reads it, and none of its entries reach the books.",
    ],
    `expected the retired key NAMED on the report, the same duty @SCN-USG-021 gives ` +
      `checkRegistry. Got:\n${activeMd}`,
  );
});

// @SCN-USG-022
Then(
  "that step is reported under the first script it invokes, not the one the list nominated",
  function () {
    // THE TIEBREAK'S REMOVAL, THE ONLY PLACE IT IS OBSERVABLE. The step's credit reaches no
    // citation either way (nothing cites either script), so both land in suspense — the fact
    // this line is about is WHICH HANDLE it lands under.
    const credits = suspenseRowCredits(activeMd);
    assert.ok(
      credits.includes("check:format"),
      `expected the step reported under check:format — the first script it invokes — not the ` +
        `list's nomination. Got suspense credits:\n${credits}\nfull report:\n${activeMd}`,
    );
    assert.ok(
      !credits.includes("check:types"),
      `expected check:types, the list's nomination, NOT naming the step now the tiebreak is ` +
        `gone. Got suspense credits:\n${credits}\nfull report:\n${activeMd}`,
    );
  },
);

// ---------------------------------------------------------------------------
// @SCN-USG-015 — THE CONSUMER'S OWN LIST. Its own fixture, and its shape is a pair plus a stale
// line: `Rule check` is named a non-check and must leave the books, `Sweep check` is named by
// nothing and must stay on them, and `Circular-import check` is the Sweep check's old name — an
// entry that now hides nothing at all.
//
// BOTH CHECK STEPS CARRY A PREFIX TODAY'S RULE ALREADY DISCOVERS, which is what makes the
// exclusion readable before the membership filter inverts: nothing else reaches the books yet, so
// an excluded step that was not discoverable could not be watched leaving them.
// ---------------------------------------------------------------------------
const USG_NOT_CHECKS_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-not-checks/features",
  ci: "tests/fixtures/usg-not-checks/ci.yml",
  packageJson: "tests/fixtures/usg-not-checks/package.json",
};

/** A fixture target's `specController.notChecks` list, as written. */
function notChecksOf(fixture: UsgFixture): string[] {
  const specController = manifestOf(fixture)["specController"] as Record<string, unknown>;
  return specController["notChecks"] as string[];
}

/** A fixture target's workflow bytes. */
function workflowOf(fixture: UsgFixture): string {
  return readFileSync(join(process.cwd(), fixture.ci), "utf8");
}

/** The `- <entry> — …` lines of the report's excluded-step section. */
function excludedStepLines(md: string): string[] {
  return reportSectionLines(md, "### Excluded steps").filter((line) => line.startsWith("- "));
}

// @SCN-USG-015
Given("a target that names one check step of its pipeline a non-check", function () {
  activeFixture = USG_NOT_CHECKS_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg015-"));
  // THE PREMISE, ASSERTED FOR ITS SHAPE. Fully qualified — file, job and the step's own name — or
  // the scenario poses a question about some looser form the tool does not have.
  assert.equal(
    notChecksOf(USG_NOT_CHECKS_FIXTURE)[0],
    "ci.yml:ci:Rule check",
    `the usg-not-checks fixture must name its excluded step fully qualified. Got: ` +
      `${JSON.stringify(notChecksOf(USG_NOT_CHECKS_FIXTURE))}`,
  );
  const workflow = workflowOf(USG_NOT_CHECKS_FIXTURE);
  assert.ok(
    workflow.includes("name: Rule check") && workflow.includes("run: pnpm lint:rules"),
    `the fixture's pipeline must run that step, or there is nothing for the entry to exclude. ` +
      `Got:\n${workflow}`,
  );
  // AND IT IS A STEP THE TREE DISCOVERS TODAY. An excluded step nothing observed in the first
  // place leaves the books unchanged, and the scenario would pass over a reader that ignored the
  // list entirely.
  const scripts = manifestOf(USG_NOT_CHECKS_FIXTURE)["scripts"] as Record<string, string>;
  assert.ok(
    Object.keys(scripts).includes("lint:rules"),
    `the excluded step must run a script the current discovery rule already finds. Got: ` +
      `${JSON.stringify(scripts)}`,
  );
});

// @SCN-USG-015
Given("a sibling check step no entry of its names", function () {
  const workflow = workflowOf(USG_NOT_CHECKS_FIXTURE);
  assert.ok(
    workflow.includes("name: Sweep check") && workflow.includes("run: pnpm lint:sweep"),
    `the fixture must run a SECOND check, or "the excluded one is off the books" is satisfied by ` +
      `a reader that discovers nothing at all. Got:\n${workflow}`,
  );
  assert.ok(
    !notChecksOf(USG_NOT_CHECKS_FIXTURE).includes("ci.yml:ci:Sweep check"),
    `the control must be named by no entry, or it is not a control. Got: ` +
      `${JSON.stringify(notChecksOf(USG_NOT_CHECKS_FIXTURE))}`,
  );
});

// @SCN-USG-015
Given("an entry that names no step its pipeline runs", function () {
  const entries = notChecksOf(USG_NOT_CHECKS_FIXTURE);
  const stale = entries[1];
  assert.equal(
    stale,
    "ci.yml:ci:Circular-import check",
    `the fixture must carry a second entry, the Sweep check's old name. Got: ${JSON.stringify(entries)}`,
  );
  // WELL-FORMED, AND THAT IS WHY IT IS WORTH REPORTING. The file and the job are the live entry's,
  // so the one thing this line gets wrong is the step name — a rename, which is exactly the case a
  // silent drop would hide. A malformed entry would match nothing for a second reason.
  assert.ok(
    stale.startsWith("ci.yml:ci:"),
    `the stale entry must be well-formed, or it names nothing for a reason other than the rename`,
  );
  assert.ok(
    !workflowOf(USG_NOT_CHECKS_FIXTURE).includes("Circular-import check"),
    `the fixture's pipeline must NOT run a step of that name, or the entry is not stale at all`,
  );
});

// @SCN-USG-015
Then(
  "the report names the excluded step, and its check is off the books while the sibling's is on them",
  function () {
    // THE STEP IS NAMED. The set of excluded lines rather than one of them, because a reader that
    // named every step it read would satisfy an `includes` while excluding the control too.
    //
    // TWO LINES SINCE THE MEMBERSHIP RULE INVERTED (@SCN-USG-004). The pipeline's install step is
    // a candidate like any other now, so this target names it a non-check beside the check step it
    // was already naming — and the report accounts for both. The scenario's subject is the CHECK
    // step; the plumbing line is here because leaving it off would mean deleting the plumbing from
    // a fixture that is meant to be a pipeline.
    assert.deepEqual(
      excludedStepLines(activeMd).filter((line) => line.includes("— excluded:")),
      [
        "- ci.yml:ci:Rule check — excluded: the target names this step a non-check.",
        "- ci.yml:ci:pnpm install --frozen-lockfile — excluded: the target names this step a non-check.",
      ],
      `expected the excluded step NAMED on the report. A step that simply vanished is the silence ` +
        `this axis exists to end, arriving with the consumer's own signature on it. Got:\n${activeMd}`,
    );
    // AND IT LEFT THE BOOKS — one of the two checks, not both and not neither.
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected one of the pipeline's two checks counted: the excluded one off the books and the ` +
        `sibling still on them. Two means the entry excluded nothing; nought means it took the ` +
        `control with it. Got:\n${activeMd}`,
    );
    assert.ok(
      !activeMd.includes("(lint:rules)"),
      `expected the excluded step's check off the books entirely — not merely uncounted. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("Evidence Observation cites no Scenario (lint:sweep)"),
      `expected the sibling check still banked on the suspense row. Without it the line above ` +
        `passes over a reader that discovered nothing. Got:\n${activeMd}`,
    );
  },
);

// @SCN-USG-015
Then("the report names the entry that matched no step", function () {
  // THE WHOLE SECTION, in order: the entry that matched a step and the entry that matched none,
  // each said differently. A reader printing one sentence for both has not told them apart, and a
  // reader printing only the first has dropped a line the consumer wrote.
  assert.deepEqual(
    excludedStepLines(activeMd),
    [
      "- ci.yml:ci:Rule check — excluded: the target names this step a non-check.",
      "- ci.yml:ci:pnpm install --frozen-lockfile — excluded: the target names this step a non-check.",
      "- ci.yml:ci:Circular-import check — matches no step: the entry names nothing this run read.",
    ],
    `expected the stale entry NAMED as matching nothing. It is a fact about the consumer's ` +
      `manifest only this run can see: they wrote a line, it hides nothing, and dropping it is ` +
      `the same fault as dropping a step. Got:\n${activeMd}`,
  );
});

// @SCN-USG-014 — THE RECONCILER, WHICH NOBODY CONFIGURES. Its own fixture, and the fixture's whole
// shape is what its manifest does NOT contain: there is no `specController` block in it at all, so
// nothing the consumer wrote can be doing the excluding. A pair of `notChecks` entries produces
// this same report over this same pipeline, and the state in which the two answers differ is the
// one every consumer's first run is in — nothing written.
//
// BOTH RECONCILER STEPS CARRY A PREFIX TODAY'S RULE ALREADY DISCOVERS, for the reason
// @SCN-USG-015's do: only a lint:-prefixed script a run: step invokes reaches the books right now,
// so a reconciler the current reader never saw could not be watched leaving them.
// ---------------------------------------------------------------------------
const USG_RECONCILER_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-reconciler/features",
  ci: "tests/fixtures/usg-reconciler/ci.yml",
  packageJson: "tests/fixtures/usg-reconciler/package.json",
};

/** The `- <step> — …` lines of the report's reconciler section. */
function reconcilerStepLines(md: string): string[] {
  return reportSectionLines(md, "### The reconciler").filter((line) => line.startsWith("- "));
}

/** A fixture target's `scripts`, as written. */
function scriptsOf(fixture: UsgFixture): Record<string, string> {
  return manifestOf(fixture)["scripts"] as Record<string, string>;
}

// @SCN-USG-014
Given(
  "a target whose pipeline runs the reconciliation and dumps the step record it reads",
  function () {
    activeFixture = USG_RECONCILER_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg014-"));
    const workflow = workflowOf(USG_RECONCILER_FIXTURE);
    const scripts = scriptsOf(USG_RECONCILER_FIXTURE);
    // THE PREMISE, ASSERTED FOR ITS SHAPE. The reconciling step has to actually run the
    // reconciliation, or the scenario asks what the reader makes of some other step entirely.
    assert.ok(
      workflow.includes("name: Self-reconciliation balance") &&
        workflow.includes("run: pnpm lint:reconcile") &&
        scripts["lint:reconcile"]?.includes("spec-controller balance"),
      `the fixture's pipeline must invoke the reconciliation through its manifest. Got:\n${workflow}\n` +
        `${JSON.stringify(scripts)}`,
    );
    // AND THE DUMP HAS TO CARRY GITHUB'S OWN STEP-RECORD EXPRESSION, which is the only thing that
    // makes it the record this run reads rather than a step with a suggestive name.
    assert.ok(
      workflow.includes("name: Dump this run's step record") &&
        workflow.includes("toJSON(steps)") &&
        workflow.includes("run: pnpm lint:dump"),
      `the fixture must dump the step record through the expression that produces it. Got:\n${workflow}`,
    );
    // AND BOTH ARE STEPS THE TREE DISCOVERS TODAY. A reconciler nothing observed in the first
    // place leaves the books unchanged, and the scenario would pass over a reader that had never
    // looked at either step.
    assert.deepEqual(
      ["lint:reconcile", "lint:dump"].filter((name) => Object.keys(scripts).includes(name)),
      ["lint:reconcile", "lint:dump"],
      `both reconciler steps must run a script the current discovery rule already finds. Got: ` +
        `${JSON.stringify(scripts)}`,
    );
  },
);

// @SCN-USG-014
Given("a manifest that says nothing about either step", function () {
  // THE WHOLE DISTINCTION, ASSERTED RATHER THAN INTENDED. A `notChecks` pair would produce the
  // same report over this same pipeline, so if the fixture ever grew one this scenario would go on
  // passing while proving the opposite of what it says. There is no `specController` block here at
  // all — no exclusion list, no runner block, nothing.
  assert.ok(
    !Object.keys(manifestOf(USG_RECONCILER_FIXTURE)).includes("specController"),
    `the fixture must configure NOTHING, or "by construction" is untested: a consumer's own ` +
      `exclusions would produce the identical report. Got: ` +
      `${JSON.stringify(Object.keys(manifestOf(USG_RECONCILER_FIXTURE)))}`,
  );
});

// @SCN-USG-014
Given("an ordinary check step of the same pipeline", function () {
  const workflow = workflowOf(USG_RECONCILER_FIXTURE);
  assert.ok(
    workflow.includes("name: Sweep check") && workflow.includes("run: pnpm lint:sweep"),
    `the fixture must run a check that is NOT the reconciler, or "neither reaches the books" is ` +
      `satisfied by a reader that discovers nothing at all. Got:\n${workflow}`,
  );
});

// @SCN-USG-014
Then(
  "the report accounts for both steps as the reconciler, and neither is on the books while the ordinary check is",
  function () {
    // BOTH STEPS NAMED, AND EACH FOR ITS OWN REASON. The set rather than an `includes`, because a
    // reader naming every step it read satisfies the latter while taking the control out too; and
    // two sentences, because the run and the record it reads are different facts about a pipeline.
    assert.deepEqual(
      reconcilerStepLines(activeMd),
      [
        "- ci.yml:ci:Dump this run's step record — the reconciler: this step writes the step record the reconciliation reads.",
        "- ci.yml:ci:Self-reconciliation balance — the reconciler: this step runs the reconciliation this report is.",
      ],
      `expected both halves of the reconciler NAMED on the report. A step that simply vanished is ` +
        `the silence this axis exists to end, and the reconciler vanishing is that silence over ` +
        `the one step no consumer can be asked to account for. Got:\n${activeMd}`,
    );
    // AND NEITHER REACHED THE BOOKS — one of the pipeline's three checks, not three and not none.
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected only the ordinary check counted: the reconciler and its dump off the books and ` +
        `the sweep still on them. Three means the reconciler reconciles itself — its own citation ` +
        `unsatisfiable, so out of balance for ever; nought means the control went with it. ` +
        `Got:\n${activeMd}`,
    );
    for (const handle of ["lint:reconcile", "lint:dump"]) {
      assert.ok(
        !activeMd.includes(`(${handle})`),
        `expected ${handle} off the books entirely — not merely uncounted. Got:\n${activeMd}`,
      );
    }
    assert.ok(
      activeMd.includes("Evidence Observation cites no Scenario (lint:sweep)"),
      `expected the ordinary check still banked on the suspense row. Without it the line above ` +
        `passes over a reader that discovered nothing. Got:\n${activeMd}`,
    );
  },
);

// @SCN-USG-014
Then("the report names nothing the target excluded", function () {
  // THE DISCRIMINATOR. By construction and by configuration produce the same books, and this is
  // the one line of the report that tells them apart: the consumer's own exclusion section is what
  // a `notChecks` answer would have to print, and this target has written no such thing.
  assert.ok(
    !activeMd.includes("### Excluded steps"),
    `expected NO consumer-exclusion section: the reconciler is excluded by construction, and a ` +
      `report crediting the target's own configuration for it would be crediting a list that ` +
      `does not exist. Got:\n${activeMd}`,
  );
});

// @SCN-USG-013 — A QUALITY CHECK THAT IS AN ACTION. Its own fixture, and its whole shape is one
// action step beside one command check. The action is the subject: it invokes no script of the
// target's, so no handle can be read out of a command it does not have and nothing about a name
// can reach it — what puts it on the books is that it is a STEP. The command check is the control,
// because "the action is an uncited check" is satisfied by a reader that discovered nothing at all
// and equally by one that traded its `run:` half for its `uses:` half.
// ---------------------------------------------------------------------------
const USG_ACTION_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-action/features",
  ci: "tests/fixtures/usg-action/ci.yml",
  packageJson: "tests/fixtures/usg-action/package.json",
};

/** The action reference this fixture's pipeline runs — its identity, since the step carries no name. */
const USG_ACTION_REFERENCE = "github/codeql-action/analyze@v3";

/** The `(no scenario)` row's credits cell — where an uncited check's credit lands. */
function suspenseRowCredits(md: string): string {
  const cells = ledgerRowCells(md, "(no scenario)");
  return cells[cells.length - 2] ?? "";
}

// @SCN-USG-013
Given(
  "a target whose pipeline runs a quality check as an action rather than a command",
  function () {
    activeFixture = USG_ACTION_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg013-"));
    // THE PREMISE, ASSERTED FOR ITS SHAPE — the whole two-step block rather than the `uses:` line
    // alone, because what makes the action reference the step's identity is that the step carries
    // no `name:` of its own, and only the line AFTER it can say so.
    assert.ok(
      workflowOf(USG_ACTION_FIXTURE).includes(
        `      - uses: ${USG_ACTION_REFERENCE}\n      - run: pnpm domain-purity`,
      ),
      `the fixture must run its check as an UNNAMED action step, or the scenario poses no ` +
        `question about a step that carries no command and no name of its own. Got:\n` +
        `${workflowOf(USG_ACTION_FIXTURE)}`,
    );
    // AND NO SCRIPT OF THE TARGET'S CAN REACH IT. One script, and it is the control's — so nothing
    // about a manifest name can find the action, and being a step is the only thing left that can.
    assert.deepEqual(
      Object.keys(scriptsOf(USG_ACTION_FIXTURE)),
      ["domain-purity"],
      `the target must define no script for the action, or the action reaches the books through ` +
        `the manifest hop rather than by being a step`,
    );
  },
);

// @SCN-USG-013
Given("a check step of the same pipeline that runs a command", function () {
  const workflow = workflowOf(USG_ACTION_FIXTURE);
  assert.ok(
    workflow.includes("- run: pnpm domain-purity"),
    `the fixture must run a SECOND check as an ordinary command, or a reader that discovered ` +
      `nothing at all satisfies the claim below. Got:\n${workflow}`,
  );
  // CONFIGURED NOWHERE, so the control reaches the suspense row for the one reason the posting
  // rule allows — the shape usg-guard's own target states.
  const specController = manifestOf(USG_ACTION_FIXTURE)["specController"] as Record<string, unknown>;
  assert.deepEqual(
    specController["fitnessChecks"],
    undefined,
    `the control's handle must name no configured row, or its credit lands on the suspense row ` +
      `for a second reason and stops being a control for this one`,
  );
  assert.ok(
    !readFileSync(
      join(process.cwd(), USG_ACTION_FIXTURE.features, "target.feature"),
      "utf8",
    ).includes("@domain-purity"),
    `no scenario of the target's corpus may carry the control's bare check tag, or the control ` +
      `is attributed rather than uncited`,
  );
});

// @SCN-USG-013
Then(
  "the report posts the action to the suspense row, named by the action reference it uses",
  function () {
    // THE LANDING, ROW-SCOPED. "Posts to suspense" is a claim about WHERE the credit went, and a
    // whole-report `includes` cannot tell the suspense row from any other row naming the action.
    assert.ok(
      suspenseRowCredits(activeMd).includes(
        `lint ❓ Evidence Observation cites no Scenario (${USG_ACTION_REFERENCE})`,
      ),
      `expected the action on the books as an uncited static check, named by the action ` +
        `reference GitHub itself displays for a step carrying no name of its own. A reader that ` +
        `discards every uses: step drops a real check and says nothing — the silence this axis ` +
        `exists to end, arriving by a different route. Got "${suspenseRowCredits(activeMd)}" in:\n` +
        `${activeMd}`,
    );
    // AND ON THAT ROW ALONE — never smeared across a scenario's row by a reader that took the
    // action reference for an attribution.
    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes(`(${USG_ACTION_REFERENCE})`))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected the action's credit on the suspense row and on no other; got ` +
        `${JSON.stringify(bearing)} in:\n${activeMd}`,
    );
  },
);

// @SCN-USG-013
Then("the command check is on the books beside it", function () {
  // TWO, NOT ONE AND NOT NONE. One says the reader found the command check and dropped the action,
  // or found the action and dropped the command check; none says it is blind.
  assert.ok(
    activeMd.includes("2 static check(s) run, 2 uncited static check(s)"),
    `expected BOTH steps of the pipeline counted — the action and the command check. One means ` +
      `the reader gained a half and lost a half; nought means it discovered nothing at all. ` +
      `Got:\n${activeMd}`,
  );
  assert.ok(
    suspenseRowCredits(activeMd).includes(
      "lint ❓ Evidence Observation cites no Scenario (domain-purity)",
    ),
    `expected the command check still banked on the suspense row. Without it the assertion ` +
      `above passes over a reader that discovered nothing. Got:\n${activeMd}`,
  );
});

After({ tags: "@USG" }, function () {
  if (activeDir && existsSync(activeDir)) rmSync(activeDir, { recursive: true, force: true });
  // @SCN-USG-016 reads a SECOND target in the same scenario; its dir is cleaned on the same hook.
  if (secondDir && existsSync(secondDir)) rmSync(secondDir, { recursive: true, force: true });
});

// @SCN-USG-017 — THE new-client STATE, which is what the free rung is sold on. Its own fixture,
// and the whole of what makes it one is that the manifest says NOTHING: no runners, no non-checks,
// no static checks, no registry. So no step of its pipeline is taken out of discovery by anything,
// and the report is the promise the product makes — every check the pipeline ran, listed.
//
// ITS OWN When, for the reason @SCN-USG-006's is its own: this scenario ASSERTS the exit code
// rather than taking it as a precondition of being handed a report, so the status has to be read
// and carried to a Then where a red can say what it was.
// ---------------------------------------------------------------------------
const USG_NEW_CLIENT_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-new-client/features",
  ci: "tests/fixtures/usg-new-client/ci.yml",
  packageJson: "tests/fixtures/usg-new-client/package.json",
};

/**
 * Every step of the new-client fixture's pipeline, by the handle the report names it with — the
 * script a `run:` step invokes where it invokes one, else the step's own identity.
 *
 * THE WHOLE SET, WRITTEN OUT, because the claim is about WHICH steps reached the books and a total
 * is reachable two ways: a reader that dropped the two action steps while gaining two elsewhere
 * reports the same seven. Sorted by handle, which is the order the observer emits in.
 */
const USG_NEW_CLIENT_CANDIDATES = [
  "actions/checkout@v4",
  "actions/setup-node@v4",
  "github/codeql-action/analyze@v3",
  "lint",
  "pnpm install --frozen-lockfile",
  "test",
  "typecheck",
];

/** The target's own unit suite, which under a manifest naming no runner is a candidate like any other. */
const USG_NEW_CLIENT_SUITE_HANDLE = "test";

// @SCN-USG-017
let newClientStatus: number | null;
let newClientStderr: string;

// @SCN-USG-017
Given("a target whose configuration names no runners and no non-checks", function () {
  activeFixture = USG_NEW_CLIENT_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg017-"));
  // THE PREMISE, ASSERTED AS AN EMPTY BLOCK RATHER THAN AS TWO ABSENT KEYS. An empty
  // specController is the shape the planted consumer in this axis's analysis had, and it says more
  // than the two absences do: nothing at all was configured, so no OTHER key can be quietly doing
  // the work a claim about "every step" would then be crediting to the absence of these two.
  assert.deepEqual(
    manifestOf(USG_NEW_CLIENT_FIXTURE)["specController"],
    {},
    `the fixture's manifest must configure NOTHING, or the report below is a report about ` +
      `whatever it configured instead of about a consumer who configured nothing`,
  );
});

// @SCN-USG-017
Given("a pipeline of ordinary steps, the target's own test suite among them", function () {
  const workflow = workflowOf(USG_NEW_CLIENT_FIXTURE);
  // BOTH FORMS, or the claim is about run: steps and says so nowhere.
  for (const step of ["- uses: actions/checkout@v4", "- uses: github/codeql-action/analyze@v3"]) {
    assert.ok(
      workflow.includes(step),
      `the pipeline must run steps in BOTH forms, or "every step" is a claim about half of one. ` +
        `Missing "${step}" in:\n${workflow}`,
    );
  }
  // AND THE SUITE STEP, which is the one the scenario is most pointedly about: it is a candidate
  // here, and a fixture that did not run its own suite could not say so.
  assert.ok(
    workflow.includes("      - name: Unit tests\n        run: pnpm test"),
    `the pipeline must run the target's own unit suite, or the arm asserting that a suite step ` +
      `is a candidate asserts nothing. Got:\n${workflow}`,
  );
  assert.equal(
    scriptsOf(USG_NEW_CLIENT_FIXTURE)[USG_NEW_CLIENT_SUITE_HANDLE],
    "vitest run",
    `the suite step must reach a real runner through the manifest, or naming one tier would not ` +
      `take it out and the false positive this scenario reports would have no remedy`,
  );
});

// @SCN-USG-017
When("the target's first reconciliation is rendered", function () {
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
      "--target", "usg-new-client-fixture",
      "--format", `md:${reportPath}`,
    ],
    { cwd: activeDir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(
    existsSync(reportPath),
    `expected a report to be written; stderr:\n${result.stderr}`,
  );
  // READ, NOT ASSERTED HERE. The exit code and anything the run said are two of this scenario's
  // three claims, and a claim asserted in a When reds without ever naming what it was about.
  newClientStatus = result.status;
  newClientStderr = result.stderr;
  activeMd = readFileSync(reportPath, "utf8");
});

// @SCN-USG-017
Then(
  "the report posts every step of that pipeline to the suspense row, the test suite among them",
  function () {
    const credits = suspenseRowCredits(activeMd);
    const banked = USG_NEW_CLIENT_CANDIDATES.filter((handle) =>
      credits.includes(`lint ❓ Evidence Observation cites no Scenario (${handle})`),
    );
    // THE EXACT SET, ROW-SCOPED. "Every step" is a claim about which steps reached the books and
    // where their credits landed; a whole-report `includes` cannot tell the suspense row from any
    // other row that happens to mention a handle, and a count cannot tell a reader that lost the
    // action steps from one that lost the commands.
    assert.deepEqual(
      banked,
      USG_NEW_CLIENT_CANDIDATES,
      `expected EVERY step of the pipeline on the suspense row. A consumer who has configured ` +
        `nothing has taken nothing out of discovery, so a step missing here is a check the tool ` +
        `saw and said nothing about — the silence this axis exists to end. Got ` +
        `"${credits}" in:\n${activeMd}`,
    );
    // AND NOTHING BESIDE THEM, so the set is the pipeline rather than a superset of it.
    assert.ok(
      activeMd.includes(
        `${USG_NEW_CLIENT_CANDIDATES.length} static check(s) run, ` +
          `${USG_NEW_CLIENT_CANDIDATES.length} uncited static check(s)`,
      ),
      `expected exactly the pipeline's ${USG_NEW_CLIENT_CANDIDATES.length} steps counted and ` +
        `every one of them uncited. Got:\n${activeMd}`,
    );
    // THE SUITE STEP, CALLED OUT. It is inside the set above, and it is named again here because
    // it is the one candidate a future reader would be most tempted to exempt — and an exemption
    // there is a rule about what a test step is called, which is a runner list of ours.
    assert.ok(
      banked.includes(USG_NEW_CLIENT_SUITE_HANDLE),
      `expected the target's own unit suite on the books as a candidate. With no runner named it ` +
        `is a step like any other: the false positive is the direction this axis chose, it is ` +
        `visible, and it is one line of the consumer's own configuration to correct. Got ` +
        `"${credits}"`,
    );
  },
);

// @SCN-USG-017
Then("the report asks the target to configure nothing", function () {
  // A MANIFEST THAT SAID NOTHING IS SUPPORTED, NOT INCOMPLETE — so the run says nothing on the
  // error channel at all. A first run that scolded its reader for the absence of a block would be
  // the prefix rule's demand in a different sentence.
  assert.equal(
    newClientStderr,
    "",
    `expected the run to say nothing: an unconfigured target is a supported state, not an ` +
      `incomplete one. Got stderr:\n${newClientStderr}`,
  );
  // AND NEITHER OF THE TWO SECTIONS A CONFIGURED TARGET EARNS. Both are written only when there is
  // something the consumer said to account for, so either one appearing here would credit this
  // target with configuration it does not have — and send a reader looking for entries that are
  // not in their manifest.
  for (const section of ["### Excluded steps", "### Behavioural runners"]) {
    assert.ok(
      !activeMd.includes(section),
      `expected no "${section}" section: this target configured nothing, so there is nothing ` +
        `for one to account for. Got:\n${activeMd}`,
    );
  }
});

// @SCN-USG-017
Then("the run does not balance", function () {
  // THE STATE AS IT STANDS, ASSERTED RATHER THAN WORKED AROUND. A candidate citing nothing posts
  // to suspense, so a consumer who has configured nothing is out of balance on their first run.
  // That is not this scenario's to soften — 3F-3100's reporter mode is what changes it — and a
  // fixture quietly arranged to balance would hide the one cost of the free rung's report.
  assert.equal(
    newClientStatus,
    1,
    `expected the first run to fail: every candidate cites nothing, so every one of them posts ` +
      `to suspense and the accounts do not agree. Got exit ${newClientStatus}. Report:\n${activeMd}`,
  );
  assert.ok(
    activeMd.includes("**OUT-OF-BALANCE**"),
    `expected the verdict to say so in the report as well as in the exit code. Got:\n${activeMd}`,
  );
});

// @SCN-USG-020 — THE SCOPE A RUN RANGED OVER. Its own fixture, and the whole of what makes it one
// is that its pipeline is not one file and not one job: ci.yml runs a single job, nightly.yml runs
// two, and the report has to name all three. Every other @USG fixture is one workflow or one job
// per workflow, so none of them can tell a reader that states its scope from one that states a
// total.
//
// ITS `ci` IS A DIRECTORY, like @SCN-USG-006's — the resolution `--ci` already does, and the sorted
// one, which is half of why the section below can be sorted at all.
// ---------------------------------------------------------------------------
const USG_SCOPE_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-scope/features",
  ci: "tests/fixtures/usg-scope/workflows",
  packageJson: "tests/fixtures/usg-scope/package.json",
};

/**
 * The scope the fixture's pipeline is, as the report states it — sorted by workflow and then by
 * job, which for nightly.yml is NOT the order that file writes its jobs in.
 *
 * WRITTEN OUT RATHER THAN COUNTED. The claim is about which files and which jobs the steps came
 * from, and a total is reachable two ways: a reader that flattened nightly.yml's two jobs into one
 * row reports the same seven steps.
 */
const USG_SCOPE_ROWS = [
  "| ci.yml | ci | 4 | 2 |",
  "| nightly.yml | audit | 1 | 1 |",
  "| nightly.yml | sweep | 2 | 2 |",
];

/** The body rows of the report's `### Discovery scope` table, section-scoped like every other. */
function discoveryScopeRows(md: string): string[] {
  return reportSectionLines(md, "### Discovery scope").filter(
    (line) => line.startsWith("| ") && !line.startsWith("| Workflow |") && !line.startsWith("| --- |")
  );
}

/** One of the fixture's workflow files, read from the directory its `ci` names. */
function scopeWorkflowOf(file: string): string {
  return readFileSync(join(process.cwd(), USG_SCOPE_FIXTURE.ci, file), "utf8");
}

// @SCN-USG-020
Given("a target whose pipeline is two workflows, the second of them running two jobs", function () {
  activeFixture = USG_SCOPE_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg020-"));
  // THE PREMISE, ASSERTED. One workflow, or one job per workflow, and every claim below is
  // satisfied by a reader that states a single total and calls it a scope.
  const nightly = scopeWorkflowOf("nightly.yml");
  for (const job of ["  sweep:", "  audit:"]) {
    assert.ok(
      nightly.includes(job),
      `the second workflow must run more than one job, or "names every job" is a claim about a ` +
        `pipeline that has one. Missing "${job}" in:\n${nightly}`,
    );
  }
  // AND IN THAT ORDER, which is what gives the sorting arm its teeth: sorted, the report has to
  // report them the other way round.
  assert.ok(
    nightly.indexOf("  sweep:") < nightly.indexOf("  audit:"),
    `the second workflow must write its jobs in an order sorting has to change, or a reader ` +
      `emitting them as it met them agrees with a reader that sorts. Got:\n${nightly}`,
  );
  // AND THE TWO FIGURES MUST PART COMPANY SOMEWHERE. A fixture whose every job read exactly as
  // many candidates as steps could not tell a report stating the pair from one stating either
  // twice: ci.yml's four steps hold the runner this manifest names and the step it calls a
  // non-check, so that job reads four and two.
  const specController = manifestOf(USG_SCOPE_FIXTURE)["specController"] as Record<string, unknown>;
  assert.deepEqual(
    specController["runners"],
    { unit: "vitest" },
    `the manifest must name a runner one step of ci.yml runs, or steps and candidates agree ` +
      `everywhere and the pair asserts nothing`,
  );
  assert.deepEqual(
    specController["notChecks"],
    ["ci.yml:ci:Install"],
    `the manifest must name one step of ci.yml a non-check, for the same reason`,
  );
});

// @SCN-USG-020
Then(
  "the report names every workflow and every job it read, with the steps it read from each and how many of them became candidates",
  function () {
    // THE EXACT SET, SECTION-SCOPED. A reader that flattened the jobs, dropped the workflow the
    // checks are not in, or reported one figure twice all report something — so the claim is the
    // rows themselves and not a count of them.
    assert.deepEqual(
      [...discoveryScopeRows(activeMd)].sort(),
      [...USG_SCOPE_ROWS].sort(),
      `expected the report to name each workflow, each job, the steps it read from each and how ` +
        `many became candidates. A bare total says nothing about how many jobs it came from, ` +
        `which is the half of the scope question a consumer cannot ask any other way. Got:\n` +
        `${activeMd}`,
    );
  },
);

// @SCN-USG-020
Then("the scope it names reads in one settled order", function () {
  // SORTED, and the fixture is built so that sorting is observable: nightly.yml writes `sweep`
  // before `audit`, so a reader emitting jobs as it met them reds here while passing the arm
  // above. Two runs over one tree cannot differ, and a diff of two reports never turns on the
  // order a directory happened to be handed back in.
  assert.deepEqual(
    discoveryScopeRows(activeMd),
    USG_SCOPE_ROWS,
    `expected the scope sorted by workflow and then by job. The fixture's nightly.yml writes ` +
      `sweep before audit, so this order is not the one the pipeline was read in. Got:\n${activeMd}`,
  );
});

// ---------------------------------------------------------------------------
// @SCN-USG-018 — THE ACCOUNTING IDENTITY. Its own fixture, and the whole of what makes it one is
// that its pipeline holds ALL FOUR dispositions at once: three steps the manifest calls
// non-checks, one running the runner it names, the reconciler's own pair, and four candidate
// checks with an action among them. Every other @USG fixture has at most three of the four, so
// none of them can hold a claim about the four adding up.
//
// FOUR FIGURES NOBODY CAN SWAP. Four, one, two and three — no two dispositions carry the same
// count, so a reader that attributed a step to the wrong one reds on the figures even where the
// total would have survived the mistake.
// ---------------------------------------------------------------------------
const USG_IDENTITY_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-identity/features",
  ci: "tests/fixtures/usg-identity/ci.yml",
  packageJson: "tests/fixtures/usg-identity/package.json",
};

/**
 * The pipeline's own figures, as the report states them: steps read, then the four dispositions,
 * then the total the reader accounted for.
 *
 * WRITTEN OUT RATHER THAN COUNTED HERE. Re-deriving the numbers from the fixture's YAML would be
 * this file re-implementing the walk and then reporting its own answer as the product's.
 */
const USG_IDENTITY_ROW = "| 10 | 4 | 1 | 2 | 3 | 10 |";

/** The body row of the report's `### Step accounting` table, section-scoped like every other. */
function stepAccountingRows(md: string): string[] {
  return reportSectionLines(md, "### Step accounting").filter(
    (line) =>
      line.startsWith("| ") && !line.startsWith("| Steps read |") && !line.startsWith("| --- |"),
  );
}

/** The `- …` verdict line under that table — the sentence naming a shortfall where there is one. */
function stepAccountingVerdict(md: string): string[] {
  return reportSectionLines(md, "### Step accounting").filter((line) => line.startsWith("- "));
}

/** The `Steps read` figures the scope section states, one per job — the report's OTHER reader. */
function scopeStepsRead(md: string): number[] {
  return discoveryScopeRows(md).map((row) => Number(row.split("|").map((c) => c.trim())[3]));
}

// @SCN-USG-018
Given(
  "a target whose pipeline holds every disposition this reader has — checks, the runner its manifest names, the reconciliation itself, and steps it calls non-checks",
  function () {
    activeFixture = USG_IDENTITY_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg018-"));
    const workflow = workflowOf(USG_IDENTITY_FIXTURE);
    const specController = manifestOf(USG_IDENTITY_FIXTURE)["specController"] as Record<
      string,
      unknown
    >;
    // ALL FOUR PRESENT, ASSERTED. An identity over a pipeline missing a disposition is satisfied
    // by a reader that has no idea the missing one exists, and three of the four are configuration
    // this fixture could lose without anything else in the run noticing.
    assert.deepEqual(
      specController["runners"],
      { unit: "vitest" },
      `the manifest must name exactly one runner, or the runner column is nought and the identity ` +
        `holds over a reader that cannot recognise one at all`,
    );
    assert.equal(
      (specController["notChecks"] as string[]).length,
      3,
      `the manifest must call three steps non-checks, or the excluded column is nought. Got: ` +
        `${JSON.stringify(specController["notChecks"])}`,
    );
    assert.ok(
      workflow.includes("run: pnpm lint:reconcile") && workflow.includes("toJSON(steps)"),
      `the pipeline must run the reconciliation and dump the step record it reads, or the ` +
        `reconciler column is nought. Got:\n${workflow}`,
    );
    assert.ok(
      workflow.includes("uses: github/codeql-action/analyze@v3"),
      `one candidate must be an action rather than a command: a run:-only reading is the ` +
        `historical shape of exactly the fault this identity is here to catch. Got:\n${workflow}`,
    );
    // AND NO TWO DISPOSITIONS MAY READ ALIKE. With two columns carrying the same figure, a reader
    // that attributed a step to the wrong disposition passes every arm below.
    const dispositions = USG_IDENTITY_ROW.split("|")
      .map((cell) => cell.trim())
      .slice(2, 6);
    assert.equal(
      new Set(dispositions).size,
      4,
      `the four dispositions must carry four different counts, or a swapped attribution is ` +
        `invisible. Got: ${JSON.stringify(dispositions)}`,
    );
  },
);

// @SCN-USG-018
Then(
  "the report states how many steps it read and how many of them it accounted for, and the two agree",
  function () {
    const [row] = stepAccountingRows(activeMd);
    assert.ok(
      row,
      `expected the report to state the steps it read and the steps it accounted for. Four ` +
        `exhaustive dispositions is a claim about code no reader can check by reading, and a step ` +
        `dropped on a branch nobody enumerated posts no row and reds nothing — only the count ` +
        `sees it. Got:\n${activeMd}`,
    );
    const cells = row.split("|").map((cell) => cell.trim());
    const stepsRead = Number(cells[1]);
    const accountedFor = Number(cells[6]);
    // THE SUM IS THE REPORT'S OWN. This arm reads the two totals it states; it does not add the
    // four dispositions up itself, because a reader doing that measures its own arithmetic and
    // would agree with any four numbers the report happened to print.
    //
    // ASSERTED AS A PREDICATE RATHER THAN AS AN EQUALITY, and that is diagnostics rather than
    // taste: handed two numbers, cucumber's formatter prints its own diff and drops the message,
    // so a shortfall reds as a bare `-9 +10` and the reader is told two figures and no subject.
    // The fault this arm exists to catch is a step that went missing in silence; a failure that
    // does not say so in words is that silence one layer along.
    if (accountedFor !== stepsRead) {
      assert.fail(
        `expected every step this run read to be accounted for. The report states ${stepsRead} ` +
          `step(s) read and ${accountedFor} accounted for, so ` +
          `${Math.abs(stepsRead - accountedFor)} ` +
          `step(s) of this pipeline reached none of the four dispositions — or reached two. That ` +
          `is a step seen and dropped in silence, which is the fault this whole axis exists to ` +
          `end, and no section naming what a step BECAME can see it. Got:\n${activeMd}`,
      );
    }
    // AND AGAINST THE REPORT'S OTHER READER, so a reader that read nothing cannot pass by
    // agreeing with itself: the scope section states the steps each job held, and this total is
    // the same pipeline seen from the other end.
    const scopeTotal = scopeStepsRead(activeMd).reduce((total, steps) => total + steps, 0);
    if (stepsRead !== scopeTotal) {
      assert.fail(
        `expected the steps accounted for to be the steps the scope section says were read; got ` +
          `${stepsRead} against ${scopeTotal}. Nought against nought satisfies the identity while ` +
          `proving nothing. Got:\n${activeMd}`,
      );
    }
    assert.deepEqual(
      stepAccountingVerdict(activeMd),
      ["- every step this run read is accounted for."],
      `expected the report to say so in words as well as figures, and to name the shortfall where ` +
        `there is one. Got:\n${activeMd}`,
    );
  },
);

// @SCN-USG-018
Then("each disposition carries the count that pipeline gives it", function () {
  // THE WHOLE ROW, not the total. A reader that attributed the action step to the excluded column
  // reports the same total and a different pipeline, and the identity alone cannot tell them
  // apart — which is why the four figures are four different numbers in this fixture.
  assert.deepEqual(
    stepAccountingRows(activeMd),
    [USG_IDENTITY_ROW],
    `expected four candidates, one runner, two reconciler steps and three the manifest calls ` +
      `non-checks, over ten steps read. Got:\n${activeMd}`,
  );
});
