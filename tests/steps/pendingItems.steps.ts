/**
 * Step definitions for features/pending-items.feature — the @SCN-PND-001 @integration
 * arm: a `<quality-check>pending` tag flows through the REAL `parseScenarios` and
 * derives a pending evidence obligation.
 *
 * @SCN-PND-001 — bidirectional evidence marker (Evidence Manifesto §9). The @unit arm
 * (packages/core/src/parse/scenarios.test.ts) proves the `pendingQualityCheck` helper in
 * isolation; this @integration arm proves the flag flows through `parseScenarios` over a
 * PLANTED tests/fixtures/ feature-string — never a real `@<qc>pending` scenario in the
 * scanned features/ corpus (fixture policy, evidence-manifesto §11B).
 *
 * The fixture is read once via readFileSync (IO in the test layer, not the pure core) and
 * parsed by the pure `parseScenarios`. For each Examples row the assertion scopes to the
 * pending obligation at the row's quality-check: it reds if `parseScenarios` does not derive
 * a `{ qualityCheck, pending: true }` obligation from the row's tag.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScenarios, reconcile, isBalanced, renderMarkdown } from "@3f-consulting/spec-controller-core";
import type {
  Scenario,
  EvidenceObligation,
  EvidenceObservation,
  EvidenceReconciliation,
  RunContext,
} from "@3f-consulting/spec-controller-core";

const FIXTURE = join(process.cwd(), "tests/fixtures/pending-tags/features/target.feature");
const SUFFIX_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/suffix-significance.feature"
);
const UNKNOWN_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/unknown-pending.feature"
);

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let pendingTag: string;
let obligations: EvidenceObligation[];
// @SCN-PND-002 — the parsed suffix-significance fixture scenarios, keyed by @SCN id.
let suffixScenarios: Scenario[];
// @SCN-PND-003 — the parsed unknown-pending fixture scenarios (@foopending / @pending / @foo).
let unknownScenarios: Scenario[];
// @SCN-PND-004 — the quality-check under test + the reconciliation of the planted fixture.
let pendingCheck: string;
let reconciliation: EvidenceReconciliation;

// @SCN-PND-001
Given("a planted fixture scenario tagged {string}", function (tag: string) {
  // Record the tag under test; the parse happens in the When over the planted fixture.
  pendingTag = tag;
});

// @SCN-PND-001
When("the parser derives its evidence obligations", function () {
  // Feed the PLANTED tests/fixtures/ feature-string to the pure parser — the fixture
  // carries a scenario per `<qc>pending` tag, so its parsed obligations are the derivation
  // under test. (pendingTag is asserted-against in the Then; the fixture is the source.)
  assert.ok(pendingTag, "expected a pending tag to have been recorded");
  const source = readFileSync(FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  obligations = scenarios.flatMap((s) => s.evidenceObligations);
});

// @SCN-PND-001
Then("it declares a pending {string} obligation", function (qualityCheck: string) {
  // Scope to the pending obligation at this row's quality-check: parseScenarios must have
  // derived exactly one `{ qualityCheck, pending: true }` obligation from the planted
  // fixture. Reds before the parser recognises `<qc>pending` (no obligation carries pending).
  const pendingAtCheck = obligations.filter(
    (o) => o.qualityCheck === qualityCheck && o.pending === true
  );
  assert.equal(
    pendingAtCheck.length,
    1,
    `expected exactly one pending "${qualityCheck}" obligation derived from the planted fixture; got ${
      pendingAtCheck.length
    } (all obligations: ${JSON.stringify(obligations)})`
  );
  // A pending obligation is one-sided: no guard payload (the guard doesn't exist yet).
  assert.equal(
    pendingAtCheck[0]!.guard,
    undefined,
    `a pending obligation carries no guard payload; got guard="${pendingAtCheck[0]!.guard}"`
  );
});

// @SCN-PND-002 — the `pending` suffix makes `@integrationpending` a SEPARATE recognition
// from `@integration`: the two never collide. Proved through the REAL parseScenarios over a
// PLANTED tests/fixtures/ feature-string (the bare-integration scenario @SCN-PDS-001 and the
// integration-pending scenario @SCN-PDS-002) — never a real `@<qc>pending` scenario in the
// scanned features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/parse/scenarios.test.ts, [SCN-PND-002]) proves the same non-collision
// over inline strings in isolation.
Given(
  "the planted suffix-significance fixture — a bare `@integration` scenario alongside an `@integrationpending` one",
  function () {
    // The fixture (both scenarios) is the source; the parse happens in the When.
  }
);

When("the parser derives each scenario's evidence obligations", function () {
  const source = readFileSync(SUFFIX_FIXTURE, "utf8");
  suffixScenarios = parseScenarios(source);
});

Then(
  "the bare `@integration` scenario declares a plain {string} obligation and no pending one",
  function (qualityCheck: string) {
    const scenario = suffixScenarios.find((s) => s.scnId === "SCN-PDS-001");
    assert.ok(scenario, "expected the bare-integration fixture scenario (SCN-PDS-001)");
    const atCheck = scenario.evidenceObligations.filter((o) => o.qualityCheck === qualityCheck);
    assert.equal(
      atCheck.length,
      1,
      `expected exactly one "${qualityCheck}" obligation on the bare scenario; got ${
        atCheck.length
      } (${JSON.stringify(scenario.evidenceObligations)})`
    );
    // The bare tier tag gains NO pending obligation — the suffix is significant.
    assert.equal(
      atCheck[0]!.pending,
      undefined,
      `a bare @integration must NOT gain a pending obligation; got ${JSON.stringify(atCheck[0])}`
    );
  }
);

Then(
  "the `@integrationpending` scenario declares a pending {string} obligation and no plain one",
  function (qualityCheck: string) {
    const scenario = suffixScenarios.find((s) => s.scnId === "SCN-PDS-002");
    assert.ok(scenario, "expected the integration-pending fixture scenario (SCN-PDS-002)");
    const atCheck = scenario.evidenceObligations.filter((o) => o.qualityCheck === qualityCheck);
    assert.equal(
      atCheck.length,
      1,
      `expected exactly one "${qualityCheck}" obligation on the pending scenario; got ${
        atCheck.length
      } (${JSON.stringify(scenario.evidenceObligations)})`
    );
    // The pending tag gains a pending obligation and NOT a plain (non-pending) one.
    assert.equal(
      atCheck[0]!.pending,
      true,
      `an @integrationpending must gain a pending obligation; got ${JSON.stringify(atCheck[0])}`
    );
  }
);

// @SCN-PND-003 — a tag OUTSIDE the recognised `<quality-check>pending` lexicon is passed
// through / ignored, exactly like any unrecognised tag: it contributes NO evidence
// obligation. Proved through the REAL parseScenarios over a PLANTED tests/fixtures/
// feature-string (the unknown `@foopending` @SCN-PDU-001, the bare `@pending` @SCN-PDU-002,
// and the plain unknown `@foo` @SCN-PDU-003) — never a real `@<x>pending` scenario in the
// scanned features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/parse/scenarios.test.ts, [SCN-PND-003]) proves the same passthrough
// over inline strings + the pendingQualityCheck helper in isolation.
Given(
  "the planted unknown-pending fixture — an `@foopending` scenario, a bare `@pending` scenario, and a plain unknown `@foo` scenario",
  function () {
    // The fixture (all three scenarios) is the source; the parse happens in the When.
  }
);

When("the parser derives each unknown scenario's evidence obligations", function () {
  const source = readFileSync(UNKNOWN_FIXTURE, "utf8");
  unknownScenarios = parseScenarios(source);
});

// @SCN-PND-004 — a `<quality-check>pending` obligation reconciles as a one-sided Pending
// Item (owed IOU), never a Reconciling Item. Proved through the REAL parse→reconcile
// pipeline over the PLANTED tests/fixtures/pending-tags/target.feature (one only-pending
// scenario per `<qc>pending` tag, @SCN-PDG-001..005) — never a real `@<qc>pending` scenario
// in the scanned features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/reconcile/reconcile.test.ts, [SCN-PND-004]) proves the same partition
// over the reconcile function in isolation.
Given(
  "a planted fixture scenario declaring a pending {string} obligation",
  function (qualityCheck: string) {
    // Record the quality-check under test; the parse+reconcile happens in the When over the
    // planted fixture (which carries a scenario per `<qc>pending` tag).
    pendingCheck = qualityCheck;
  }
);

When("the reconciler reconciles it against no observation", function () {
  // Feed the PLANTED tests/fixtures/ feature-string through the REAL parse→reconcile
  // pipeline: parse derives the pending obligations, reconcile partitions them into
  // pendingItems. No observation is supplied — a Pending Item is one-sided (no observation
  // is sought). Reds before reconcile partitions pending obligations off (no pendingItems;
  // an only-pending scenario posts a both-missing row instead).
  assert.ok(pendingCheck, "expected a pending quality-check to have been recorded");
  const source = readFileSync(FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  reconciliation = reconcile(scenarios, []);
});

Then(
  "the scenario raises exactly one Pending Item for {string}",
  function (qualityCheck: string) {
    // Exactly one Pending Item at this quality-check across the reconciled rows — the
    // fixture carries one only-pending scenario per `<qc>pending` tag, so the row that
    // declared `<qc>pending` raises exactly one Pending Item for it. Reds before reconcile
    // populates pendingItems.
    const pendingAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      (s.pendingItems ?? []).filter((p) => p.qualityCheck === qualityCheck)
    );
    assert.equal(
      pendingAtCheck.length,
      1,
      `expected exactly one Pending Item for "${qualityCheck}" across the reconciled fixture; got ${
        pendingAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

// @SCN-PND-005 — the pending declaration governs EVEN WHEN a matching observation exists.
// A Pending Item is one-sided: the tag's existence alone raises it — no observation is sought.
// Proved through the REAL parse→reconcile pipeline over the PLANTED
// tests/fixtures/pending-tags/pending-with-observation.feature (an `@integrationpending`
// scenario, @SCN-PDM-001) fed a hand-built MATCHING integration observation citing that very
// scenario — never a real `@<qc>pending` scenario in the scanned features/ corpus (fixture
// policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/reconcile/reconcile.test.ts, [SCN-PND-005]) proves the same partition +
// pair-stays-demanded invariant over the reconcile function in isolation.
const MATCH_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/pending-with-observation.feature"
);

Given(
  "a planted fixture scenario declaring a pending {string} obligation, with a matching integration observation citing it",
  function (qualityCheck: string) {
    // Record the check under test; the parse+reconcile (with the matching observation)
    // happens in the When over the planted fixture.
    pendingCheck = qualityCheck;
  }
);

When("the reconciler reconciles the fixture against that matching observation", function () {
  // Feed the PLANTED fixture through the REAL parse→reconcile pipeline, supplying a MATCHING
  // integration observation citing the fixture scenario (@SCN-PDM-001) at the very check the
  // pending obligation declares. A non-pending obligation would reconcile this to `satisfied`;
  // the pending declaration must ignore it (partition-before-match) AND keep the pair demanded
  // (so the observation is not flagged `undemanded`).
  assert.ok(pendingCheck, "expected a pending quality-check to have been recorded");
  const source = readFileSync(MATCH_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const matchingObservation: EvidenceObservation = {
    qualityCheck: "integration",
    scnId: "SCN-PDM-001",
    status: "passed",
  };
  reconciliation = reconcile(scenarios, [matchingObservation]);
});

Then(
  "the matching observation is not flagged undemanded — the pending pair stays demanded",
  function () {
    // The pending obligation keeps its (scnId, quality-check) pair DEMANDED (in
    // evidenceObligationPairs), so the matching observation is NOT posted as an `undemanded`
    // credit anywhere in the reconciliation. Reds if the pending pair were dropped from the
    // demanded set (the observation would then red as undemanded on the scenario's row).
    const undemanded = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "undemanded")
    );
    assert.equal(
      undemanded.length,
      0,
      `the matching observation must NOT be flagged undemanded — the pending pair stays demanded; got ${
        undemanded.length
      } undemanded item(s) (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

Then(
  "the scenario posts no both-missing reconciling item — nothing is reconciled",
  function () {
    // A one-sided Pending Item is NOT a Reconciling Item: an only-pending scenario is
    // balanced-with-pending, never the degenerate both-missing row. Reds before the
    // both-missing guard is fixed (an only-pending scenario currently posts both-missing,
    // because the pending obligation partitions to zero reconciled rows).
    const bothMissing = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.evidenceObligations.filter((o) => o.outcome === "both-missing")
    );
    assert.equal(
      bothMissing.length,
      0,
      `an only-pending scenario must post NO both-missing row; got ${
        bothMissing.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

// @SCN-PND-006 — a Pending Item is a structurally DISTINCT category: it is never a
// Reconciling Item (never in `reconcilingItems`) and never a `QualityCheckReconciliation`
// outcome (never in `evidenceObligations`), so it is never counted among, or rendered as, an
// error/discrepancy. Proved through the REAL parse→reconcile pipeline over the PLANTED
// tests/fixtures/pending-tags/pending-with-error.feature — a MIXED scenario (@SCN-PDE-001)
// declaring BOTH a bare `@unit` obligation (which reconciles to a genuine `missing` error)
// AND an `@integrationpending` one (which partitions to a one-sided Pending Item). The error
// list carries ONLY the missing unit; the pending integration stays out of it. Never a real
// `@<qc>pending` scenario in the scanned features/ corpus (fixture policy, evidence-manifesto
// §11B). The @unit arm (packages/core/src/reconcile/reconcile.test.ts, [SCN-PND-006]) proves
// the same category-distinctness over the reconcile function in isolation.
const ERROR_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/pending-with-error.feature"
);

// The pending + missing quality-checks under test, recorded by the Given.
let pendingCheckMixed: string;
let missingCheckMixed: string;

Given(
  "a planted fixture scenario declaring a pending {string} obligation alongside a genuinely missing {string} obligation",
  function (pendingCheck: string, missingCheck: string) {
    // Record the two checks under test; the parse+reconcile happens in the When over the
    // planted mixed fixture (one scenario tagged `@unit @integrationpending`).
    pendingCheckMixed = pendingCheck;
    missingCheckMixed = missingCheck;
  }
);

When("the reconciler reconciles the mixed fixture against no observation", function () {
  // Feed the PLANTED mixed fixture through the REAL parse→reconcile pipeline. No observation
  // is supplied: the bare `@unit` obligation reconciles to `missing` (a genuine error, a
  // reconciling item), while the `@integrationpending` obligation partitions to a one-sided
  // Pending Item. Reds if reconcile ever leaked the pending item into the reconciling/error
  // list (it would show up as a second reconciling item or an evidence-obligation outcome at
  // the pending check).
  assert.ok(pendingCheckMixed, "expected a pending quality-check to have been recorded");
  assert.ok(missingCheckMixed, "expected a missing quality-check to have been recorded");
  const source = readFileSync(ERROR_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  reconciliation = reconcile(scenarios, []);
});

Then(
  "the missing {string} obligation is the scenario's only reconciling item — its one error",
  function (missingCheck: string) {
    // Exactly one reconciling item across the reconciled fixture — the missing unit — and it
    // is the genuine error. Reds if the pending item leaked in (there would be two).
    const reconcilingItems = reconciliation.scenarioReconciliations.flatMap(
      (s) => s.reconcilingItems
    );
    assert.equal(
      reconcilingItems.length,
      1,
      `expected exactly one reconciling item (the missing "${missingCheck}" error); got ${
        reconcilingItems.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    assert.deepEqual(
      reconcilingItems[0],
      { qualityCheck: missingCheck, outcome: "missing" },
      `the one reconciling item must be the missing "${missingCheck}" obligation; got ${JSON.stringify(
        reconcilingItems[0]
      )}`
    );
  }
);

Then(
  "the pending {string} check names no reconciling item and no evidence-obligation outcome — the Pending Item is a structurally distinct category, never counted as an error",
  function (pendingCheck: string) {
    // The pending check appears in NEITHER the reconciling items NOR the evidence-obligation
    // outcomes: a Pending Item is never a QualityCheckReconciliation. Reds if the pending
    // obligation were reconciled (it would post a `missing`/`satisfied` outcome at this check).
    const reconcilingAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.qualityCheck === pendingCheck)
    );
    assert.equal(
      reconcilingAtCheck.length,
      0,
      `the pending "${pendingCheck}" check must name NO reconciling item; got ${
        reconcilingAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    const outcomeAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.evidenceObligations.filter((r) => r.qualityCheck === pendingCheck)
    );
    assert.equal(
      outcomeAtCheck.length,
      0,
      `the pending "${pendingCheck}" check must name NO evidence-obligation outcome; got ${
        outcomeAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    // Positive confirmation the deferred obligation IS in the pending category (not silently
    // dropped): exactly one Pending Item at the pending check.
    const pendingAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      (s.pendingItems ?? []).filter((p) => p.qualityCheck === pendingCheck)
    );
    assert.equal(
      pendingAtCheck.length,
      1,
      `the deferred "${pendingCheck}" obligation must be exactly one Pending Item; got ${
        pendingAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

Then(
  "every scenario declares no evidence obligation — the unknown `<x>pending` and bare `@pending` are ignored exactly like the plain unknown tag",
  function () {
    // All three fixture scenarios are emitted (each carries an @SCN id), and every one
    // derives an EMPTY obligation set: the unknown `@foopending` and bare `@pending` are
    // ignored EXACTLY like the plain unknown `@foo`. Reds if the parser derives any
    // obligation from a tag outside the recognised lexicon.
    assert.equal(
      unknownScenarios.length,
      3,
      `expected all three planted unknown-tag scenarios; got ${unknownScenarios.length} (${JSON.stringify(
        unknownScenarios
      )})`
    );
    for (const scenario of unknownScenarios) {
      assert.deepEqual(
        scenario.evidenceObligations,
        [],
        `${scenario.scnId} carries a tag outside the recognised lexicon and must derive NO obligation; got ${JSON.stringify(
          scenario.evidenceObligations
        )}`
      );
    }
    // Passthrough PARITY: the unknown `@foopending` (SCN-PDU-001) derives exactly what the
    // plain unknown `@foo` (SCN-PDU-003) does — nothing. The `pending` suffix buys an unknown
    // prefix no special treatment.
    const foopending = unknownScenarios.find((s) => s.scnId === "SCN-PDU-001");
    const foo = unknownScenarios.find((s) => s.scnId === "SCN-PDU-003");
    assert.ok(foopending && foo, "expected the @foopending and @foo fixture scenarios");
    assert.deepEqual(
      foopending.evidenceObligations,
      foo.evidenceObligations,
      "an unknown `@foopending` must derive exactly what a plain unknown `@foo` derives (both empty)"
    );
  }
);

// @SCN-PND-007 — a Pending Item is VERDICT-NEUTRAL: a scenario whose only non-satisfied
// element is a Pending Item has verdict `balanced`. Proved through the REAL parse→reconcile
// pipeline over the PLANTED tests/fixtures/pending-tags/only-pending-balanced.feature, which
// carries the two shapes the behaviour names: a scenario whose SOLE obligation is deferred
// (@SCN-PDB-001 — reconciles to zero rows on both sides, yet balanced-with-pending, not
// both-missing: the verdict fix) and a scenario carrying a PASSING unit obligation alongside a
// deferred integration one (@SCN-PDB-002 — the unit reconciles satisfied, the pending
// integration partitions off). A passing unit observation citing @SCN-PDB-002 is hand-built so
// its unit obligation is satisfied. Both rows have verdict balanced and no reconciling item.
// Never a real `@<qc>pending` scenario in the scanned features/ corpus (fixture policy,
// evidence-manifesto §11B). The @unit arm
// (packages/core/src/reconcile/reconcile.test.ts, [SCN-PND-007]) proves the same
// verdict-neutrality over the reconcile function in isolation, plus the both-missing
// non-regression guard.
const BALANCED_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/only-pending-balanced.feature"
);

Given(
  "a planted fixture — one scenario whose sole obligation is pending, and one carrying a passing unit obligation alongside a pending integration one",
  function () {
    // The fixture (both scenarios) is the source; the parse+reconcile happens in the When.
  }
);

When("the reconciler reconciles the fixture, the passing unit observation supplied", function () {
  // Feed the PLANTED fixture through the REAL parse→reconcile pipeline. The only observation
  // supplied is a PASSING unit observation citing @SCN-PDB-002, so its bare `@unit` obligation
  // reconciles to `satisfied` while its `@integrationpending` one partitions to a Pending Item.
  // @SCN-PDB-001 (sole `@integrationpending`) is reconciled against no observation — one-sided.
  // Reds before the verdict fix: @SCN-PDB-001 reconciles to zero rows on both sides, so
  // `verdictFor([])` returns `out-of-balance` (the vacuous verdict over an empty list).
  const source = readFileSync(BALANCED_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const passingUnit: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-PDB-002",
    status: "passed",
  };
  reconciliation = reconcile(scenarios, [passingUnit]);
});

Then(
  "both scenarios have verdict balanced — the Pending Item is verdict-neutral",
  function () {
    // Both fixture rows have verdict `balanced`: the sole-pending scenario (@SCN-PDB-001) and
    // the passing-unit-plus-pending one (@SCN-PDB-002). The Pending Item contributes no
    // reconciling item, so it never tips the verdict out of balance. Reds on the sole-pending
    // row before the verdict fix (its empty evidence-obligation list reads as out-of-balance).
    const sole = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-001");
    const mixed = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-002");
    assert.ok(sole, "expected the sole-pending fixture scenario (SCN-PDB-001)");
    assert.ok(mixed, "expected the passing-unit-plus-pending fixture scenario (SCN-PDB-002)");
    assert.equal(
      sole.verdict,
      "balanced",
      `a scenario whose sole obligation is pending must be balanced; got "${sole.verdict}" (row: ${JSON.stringify(
        sole
      )})`
    );
    assert.equal(
      mixed.verdict,
      "balanced",
      `a scenario carrying a passing unit obligation + a pending integration one must be balanced; got "${mixed.verdict}" (row: ${JSON.stringify(
        mixed
      )})`
    );
    // Positive confirmation each carries its Pending Item (the exception is genuinely present,
    // not silently dropped — the verdict is balanced DESPITE it).
    assert.deepEqual(sole.pendingItems ?? [], [{ qualityCheck: "integration" }]);
    assert.deepEqual(mixed.pendingItems ?? [], [{ qualityCheck: "integration" }]);
  }
);

Then("neither scenario names any reconciling item", function () {
  // Both rows carry an EMPTY reconciling-item list — the balanced verdict is honest (no error
  // hidden behind it). The passing unit obligation on @SCN-PDB-002 is satisfied, not a
  // reconciling item; the pending integration obligations are one-sided, never reconciling
  // items.
  const sole = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-001");
  const mixed = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-002");
  assert.deepEqual(
    sole?.reconcilingItems,
    [],
    `the sole-pending scenario must name no reconciling item; got ${JSON.stringify(
      sole?.reconcilingItems
    )}`
  );
  assert.deepEqual(
    mixed?.reconcilingItems,
    [],
    `the passing-unit-plus-pending scenario must name no reconciling item; got ${JSON.stringify(
      mixed?.reconcilingItems
    )}`
  );
});

// @SCN-PND-008 — a Pending Item is RUN-NEUTRAL: the WHOLE Evidence Reconciliation whose only
// exceptions are Pending Items does not fail. `isBalanced` reads each row's `reconcilingItems`
// — a Pending Item lives in `pendingItems`, never in `reconcilingItems`, so the whole-run
// predicate finds no reconciling item anywhere and returns true (the run passes). Proved
// through the REAL parse→reconcile→isBalanced pipeline over the PLANTED
// tests/fixtures/pending-tags/run-neutral-pending.feature (two only-pending scenarios
// @SCN-PDR-001/002 and a passing-unit-plus-pending one @SCN-PDR-003), a passing unit
// observation citing @SCN-PDR-003 supplied so its bare `@unit` obligation is satisfied. Never a
// real `@<qc>pending` scenario in the scanned features/ corpus (fixture policy,
// evidence-manifesto §11B). The @unit arm
// (packages/core/src/reconcile/isBalanced.test.ts, [SCN-PND-008]) proves the same whole-run
// neutrality over reconcile→isBalanced in isolation. Green-first on the sibling partition
// (PND-004..007); teeth proven by an isBalanced-fails-on-pending mutation (reverted).
const RUN_NEUTRAL_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/run-neutral-pending.feature"
);

// The whole-run balance verdict of the reconciled run-neutral fixture.
let wholeRunBalanced: boolean;

Given(
  "a planted fixture whose scenarios' only exceptions are Pending Items — two only-pending scenarios and one carrying a passing unit obligation alongside a deferred integration one",
  function () {
    // The fixture (all three scenarios) is the source; the parse+reconcile happens in the When.
  }
);

When("the reconciler reconciles the whole fixture, the passing unit observation supplied", function () {
  // Feed the PLANTED fixture through the REAL parse→reconcile→isBalanced pipeline. The only
  // observation supplied is a PASSING unit observation citing @SCN-PDR-003, so its bare `@unit`
  // obligation reconciles to `satisfied`; every deferred `<qc>pending` obligation partitions to
  // a one-sided Pending Item. `isBalanced` over the WHOLE reconciliation is the predicate under
  // test.
  const source = readFileSync(RUN_NEUTRAL_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const passingUnit: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-PDR-003",
    status: "passed",
  };
  reconciliation = reconcile(scenarios, [passingUnit]);
  wholeRunBalanced = isBalanced(reconciliation);
});

Then(
  "the whole Evidence Reconciliation is balanced — isBalanced is true, the run does not fail",
  function () {
    // The whole-run predicate: `isBalanced` finds no reconciling item on ANY row (the Pending
    // Items live in `pendingItems`, never `reconcilingItems`), so the run does not fail. Reds
    // under the isBalanced-fails-on-pending mutation (a row's Pending Item would tip the run
    // out-of-balance).
    assert.equal(
      wholeRunBalanced,
      true,
      `a run whose only exceptions are Pending Items must not fail — isBalanced true; got ${wholeRunBalanced} (rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations
      )})`
    );
  }
);

Then(
  "the run genuinely carries Pending Items, yet no row names a reconciling item",
  function () {
    // The balance is NOT vacuous: three Pending Items are genuinely carried across the run
    // (@SCN-PDR-001/002/003), and yet NO row names a single reconciling item anywhere — the
    // Pending Item is a structurally distinct category that never reaches the whole-run
    // predicate.
    const pendingCount = reconciliation.scenarioReconciliations.flatMap(
      (s) => s.pendingItems ?? []
    ).length;
    assert.equal(
      pendingCount,
      3,
      `the run must genuinely carry three Pending Items (the balance is not vacuous); got ${pendingCount} (rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations
      )})`
    );
    const reconcilingCount = reconciliation.scenarioReconciliations.flatMap(
      (s) => s.reconcilingItems
    ).length;
    assert.equal(
      reconcilingCount,
      0,
      `no row may name a reconciling item; got ${reconcilingCount} (rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations
      )})`
    );
  }
);

// @SCN-PND-009 — the COMPOSITION case: a `@unit @integrationpending` scenario with a passing
// unit observation reconciles to a satisfied unit obligation AND a one-sided integration
// Pending Item, verdict balanced, no reconciling item. The pending and non-pending obligations
// coexist on the same scenario WITHOUT interference — the pending partition does not swallow the
// unit obligation, and the unit reconcile does not swallow the pending one. Proved through the
// REAL parse→reconcile pipeline over the PLANTED
// tests/fixtures/pending-tags/composition.feature (@SCN-PDC-001) fed a hand-built PASSING unit
// observation citing that very scenario — never a real `@<qc>pending` scenario in the scanned
// features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/reconcile/reconcile.test.ts, [SCN-PND-009]) proves the same composition
// over the reconcile function in isolation. Green-first on the sibling partition (PND-004..007);
// teeth proven by a pending-partition-swallows-unit mutation (reverted).
const COMPOSITION_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/composition.feature"
);

Given(
  "a planted fixture scenario declaring `@unit @integrationpending`, with a passing unit observation citing it",
  function () {
    // The fixture (@SCN-PDC-001) is the source; the parse+reconcile (with the passing unit
    // observation) happens in the When.
  }
);

When(
  "the reconciler reconciles the composition fixture against that passing unit observation",
  function () {
    // Feed the PLANTED composition fixture through the REAL parse→reconcile pipeline, supplying a
    // PASSING unit observation citing @SCN-PDC-001 at the very check the bare `@unit` obligation
    // declares. The unit obligation reconciles `satisfied`; the `@integrationpending` one
    // partitions to a one-sided Pending Item BEFORE the observation match.
    const source = readFileSync(COMPOSITION_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDC-001",
      status: "passed",
    };
    reconciliation = reconcile(scenarios, [passingUnit]);
  }
);

Then(
  "the unit obligation reconciles satisfied — a genuine reconciling-side balance",
  function () {
    // The bare `@unit` obligation is discharged by the passing observation: it appears among the
    // reconciled evidence-obligation outcomes as `satisfied` — a genuine reconciling-side balance,
    // NOT partitioned off. Reds if the pending partition swallowed the unit obligation too (the
    // scenario would then carry no reconciled evidence obligation at all).
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDC-001");
    assert.ok(scenario, "expected the composition fixture scenario (SCN-PDC-001)");
    assert.deepEqual(
      scenario.evidenceObligations,
      [{ qualityCheck: "unit", outcome: "satisfied" }],
      `the unit obligation must reconcile satisfied as the scenario's sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.evidenceObligations
      )}`
    );
  }
);

Then(
  "the deferred integration obligation is the scenario's one Pending Item, partitioned off",
  function () {
    // The `@integrationpending` obligation partitions to EXACTLY one one-sided Pending Item for
    // integration — and it stays OUT of the reconciled evidence-obligation outcomes (never a
    // `satisfied`/`missing` row). Reds if the pending one were reconciled instead of partitioned,
    // or if it were dropped (zero Pending Items).
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDC-001");
    assert.ok(scenario, "expected the composition fixture scenario (SCN-PDC-001)");
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the deferred integration obligation must be the scenario's one Pending Item; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
    // The pending integration check names NO reconciled evidence-obligation outcome — it is a
    // structurally distinct category, never reconciled.
    const integrationOutcomes = scenario.evidenceObligations.filter(
      (o) => o.qualityCheck === "integration"
    );
    assert.equal(
      integrationOutcomes.length,
      0,
      `the deferred integration obligation must name NO reconciled outcome (it is partitioned off); got ${JSON.stringify(
        integrationOutcomes
      )}`
    );
  }
);

Then(
  "the scenario has verdict balanced and names no reconciling item — the pending and non-pending obligations coexist without interference",
  function () {
    // The composition is balanced: the satisfied unit contributes no reconciling item, the
    // Pending Item is verdict-neutral, so the verdict is `balanced` with an empty reconciling-item
    // list. The two obligations coexist without interference — neither swallows the other.
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDC-001");
    assert.ok(scenario, "expected the composition fixture scenario (SCN-PDC-001)");
    assert.equal(
      scenario.verdict,
      "balanced",
      `the composition scenario must have verdict balanced; got "${scenario.verdict}" (row: ${JSON.stringify(
        scenario
      )})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `the composition scenario must name no reconciling item; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
  }
);

// @SCN-PND-010 — the Pending Item SURFACES on the rendered report: a scenario's Pending
// Item(s) show on its rendered Scenario Reconciliation row with a label VISIBLY DISTINCT from
// a reconciling item, never mixed into the reconciling-item list. Proved through the REAL
// parse→reconcile→renderMarkdown (assemble→render) pipeline over the PLANTED
// tests/fixtures/pending-tags/render-pending.feature — a balanced-with-pending scenario
// (@SCN-PDL-001) and a MIXED one declaring `@unit @integrationpending` (@SCN-PDL-002 — the
// bare unit reconciles to a `missing` error, a reconciling item; the integration one
// partitions to a Pending Item). Never a real `@<qc>pending` scenario in the scanned features/
// corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/render/markdown.test.ts, [SCN-PND-010]) proves the same render distinction
// over renderReport in isolation; the JSON side stays glue-free consistent
// (packages/core/src/render/json.test.ts, [SCN-PND-010]).
const RENDER_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/render-pending.feature"
);

// The rendered markdown report of the reconciled render fixture.
let renderedReport: string;

/** The rendered Scenario Reconciliation row (the markdown table line) for a scnId. */
function rowFor(md: string, scnId: string): string {
  const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
  assert.ok(row, `expected a rendered Scenario Reconciliation row for ${scnId} in:\n${md}`);
  return row;
}

Given(
  "a planted render fixture — a balanced-with-pending scenario and one mixing a genuinely-missing unit error with a deferred integration obligation",
  function () {
    // The fixture (both scenarios) is the source; the parse+reconcile+render happens in the When.
  }
);

When("the report is rendered from the reconciled fixture", function () {
  // Feed the PLANTED render fixture through the REAL parse→reconcile→renderMarkdown pipeline.
  // No observation is supplied: @SCN-PDL-001 (sole `@integrationpending`) is balanced with one
  // Pending Item; @SCN-PDL-002 (`@unit @integrationpending`) reconciles its bare unit to a
  // `missing` error (a reconciling item) while the integration one partitions to a Pending
  // Item. renderMarkdown internally assembles the report and renders it — the assemble→render
  // surface under test. Reds before the renderer emits the Pending Item (today the pending
  // items are ignored: the balanced-with-pending row renders as a clean `—`, and the mixed
  // row shows only its `unit ∅ missing` error, with no pending label anywhere).
  const source = readFileSync(RENDER_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const reconciliation = reconcile(scenarios, []);
  const ctx: RunContext = {
    target: "pending-render-fixture",
    inputs: {},
    runStart: new Date("2026-07-10T00:00:00.000Z"),
    sourceSha: null,
  };
  renderedReport = renderMarkdown(reconciliation, ctx);
});

Then(
  "the balanced scenario's row shows its deferred integration obligation as a Pending Item, labelled distinct from a reconciling item",
  function () {
    // The @SCN-PDL-001 row (sole deferred obligation) is balanced, and its exceptions cell
    // shows the deferred integration obligation as a Pending Item — the ⏳ pending marker —
    // NOT the em-dash a clean-balanced row shows, and NOT a reconciling-item error rendering.
    const row = rowFor(renderedReport, "SCN-PDL-001");
    assert.match(
      row,
      /⏳ pending: integration/,
      `the balanced-with-pending row must show the Pending Item's ⏳ pending: integration label; got: ${row}`
    );
    assert.match(row, /✓ balanced/, `the sole-pending row must read balanced; got: ${row}`);
    // The Pending Item is NOT a reconciling item: the integration check never renders as an
    // error outcome on this row.
    assert.doesNotMatch(
      row,
      /integration ∅ missing|integration ✗ failing/,
      `a Pending Item must never render as a reconciling-item error; got: ${row}`
    );
  }
);

Then(
  "the mixed scenario's row shows the missing unit error and the deferred integration Pending Item as separate, distinctly-labelled categories",
  function () {
    // The @SCN-PDL-002 row carries BOTH categories, visibly apart: the genuine `unit ∅ missing`
    // reconciling item (the error) AND the `⏳ pending: integration` Pending Item (the deferred
    // IOU), each with its own distinct label.
    const row = rowFor(renderedReport, "SCN-PDL-002");
    assert.match(
      row,
      /unit ∅ missing/,
      `the mixed row must render the genuine unit error as a reconciling item; got: ${row}`
    );
    assert.match(
      row,
      /⏳ pending: integration/,
      `the mixed row must render the deferred obligation as a distinct Pending Item; got: ${row}`
    );
    assert.match(row, /✗ out-of-balance/, `the mixed row is out-of-balance via its unit error; got: ${row}`);
  }
);

Then(
  "no Pending Item is rendered as a reconciling item — the deferred integration check never appears as a missing or failing error",
  function () {
    // Across the WHOLE rendered report, the deferred integration check is only ever the Pending
    // Item marker — it never surfaces as an `integration ∅ missing` / `integration ✗ failing`
    // reconciling-item error. This is the structural distinctness the label buys.
    assert.doesNotMatch(
      renderedReport,
      /integration ∅ missing|integration ✗ failing/,
      `no deferred integration obligation may render as a reconciling-item error in:\n${renderedReport}`
    );
  }
);
