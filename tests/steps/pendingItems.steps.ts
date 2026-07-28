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
import { parseScenarios, reconcile, isBalanced, renderMarkdown, assembleReport } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
// The starter community-deferral policy now lives in the APP, not the core barrel (@SCN-API-001).
// These @integration steps pass it explicitly into the pure `parseScenarios` — the same resolved
// set the `balance` pipeline hands the parser at the ingest edge — so the scenario-scope deferral
// path is exercised end-to-end (app policy → core parse), behaviour unchanged.
import { DEFAULT_DEFERRAL_TAGS } from "../../packages/spec-controller/src/deferralTags.js";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import type {
  Scenario,
  EvidenceObligation,
  EvidenceObservation,
  Ledger,
  ScenarioReconciliation,
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
// @SCN-PND-003 — the parsed unknown-pending fixture scenarios (@foopending / @foo).
let unknownScenarios: Scenario[];
// @SCN-PND-004 — the quality-check under test + the reconciliation of the planted fixture.
let pendingCheck: string;
let reconciliation: Ledger;

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
    pendingAtCheck[0]!.staticGuard,
    undefined,
    `a pending obligation carries no guard payload; got guard="${pendingAtCheck[0]!.staticGuard}"`
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
// feature-string (the unknown `@foopending` @SCN-PDU-001 and the plain unknown `@foo`
// @SCN-PDU-003) — never a real `@<x>pending` scenario in the scanned features/ corpus
// (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/parse/scenarios.test.ts, [SCN-PND-003]) proves the same passthrough
// over inline strings + the pendingQualityCheck helper in isolation.
//
// Bare `@pending` was formerly a third witness (@SCN-PDU-002) — but it is INSIDE the recognised
// community deferral lexicon (a DEFAULT_DEFERRAL_TAG), not an unknown tag: a bare `@pending`
// scenario declaring zero obligations synthesises a scenario-scope Pending Item (@SCN-PND-022),
// so it no longer belongs in this "outside the lexicon" set (its obligation-scope absence stays
// proven by the pendingQualityCheck helper unit test).
Given(
  "the planted unknown-pending fixture — an `@foopending` scenario and a plain unknown `@foo` scenario",
  function () {
    // The fixture (both scenarios) is the source; the parse happens in the When.
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
// (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-004]) proves the same partition
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
// (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-005]) proves the same
// partition-before-match + pending-demands-nothing rule over the reconcile function in isolation.
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
  // the pending declaration must ignore it (partition-before-match) AND demand nothing — so the
  // observation posts as an ordinary `undemanded` credit on the scenario's own row.
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
  "the matching observation IS flagged undemanded — a pending obligation demands nothing, so nothing is attributed to it",
  function () {
    // A pending obligation raises NO Evidence Obligation, so its (scnId, quality-check) pair is
    // NOT demanded and the citing credit posts as `undemanded` — "exactly as when nothing was
    // declared at all" (canon, Pending Item). Reds if the pending pair is kept in the demanded
    // set: the credit would then post NOWHERE — excluded from `undemanded` by the pair-check and
    // from the debit side by the pending partition — and the run would read balanced, exit 0.
    // That is the false-green 3F-1858 closes.
    const undemanded = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "undemanded")
    );
    assert.equal(
      undemanded.length,
      1,
      `the matching observation MUST be flagged undemanded — a pending obligation demands nothing; got ${
        undemanded.length
      } undemanded item(s) (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    assert.equal(
      undemanded[0]!.qualityCheck,
      "integration",
      "the undemanded credit must be the integration one citing the pending pair"
    );
  }
);

Then(
  "the scenario's row is out of balance and the run exits 1",
  function () {
    // THE DISTINCTION THE RULE TURNS ON. The Pending Item is verdict-neutral — never a
    // reconciling item, it flips nothing (@SCN-PND-006..008 pin that). This row is out of
    // balance because of the CREDIT, an ordinary `undemanded` reconciling item. Two different
    // things on one row; asserting both together is what keeps the Rule honest.
    const row = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDM-001");
    assert.ok(row, "expected an account for the planted fixture scenario SCN-PDM-001");
    assert.equal(row.verdict, "out-of-balance");
    // The Pending Item is still raised, and is still NOT among the reconciling items.
    assert.deepEqual(row.pendingItems, [{ qualityCheck: "integration" }]);
    assert.deepEqual(
      row.reconcilingItems.map((r) => r.outcome),
      ["undemanded"],
      `the row's ONLY reconciling item must be the undemanded credit — the Pending Item is never ` +
        `one; got ${JSON.stringify(row.reconcilingItems)}`
    );
    // The run reds: isBalanced walks the reconciling items, so the exit code is 1.
    assert.equal(
      isBalanced(reconciliation),
      false,
      "the run must NOT be balanced — canon says this run must fail, so exit 1"
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
      s.qualityCheckReconciliations.filter((o) => o.outcome === "both-missing")
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
// §11B). The @unit arm (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-006]) proves
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
      { qualityCheck: missingCheck, outcome: "missing", evidenceObligation: { qualityCheck: missingCheck } },
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
      s.qualityCheckReconciliations.filter((r) => r.qualityCheck === pendingCheck)
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
  "every scenario declares no evidence obligation — the unknown `<x>pending` is ignored exactly like the plain unknown tag",
  function () {
    // Both fixture scenarios are emitted (each carries an @SCN id), and every one derives an
    // EMPTY obligation set: the unknown `@foopending` is ignored EXACTLY like the plain unknown
    // `@foo`. Reds if the parser derives any obligation from a tag outside the recognised lexicon.
    assert.equal(
      unknownScenarios.length,
      2,
      `expected both planted unknown-tag scenarios; got ${unknownScenarios.length} (${JSON.stringify(
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
// (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-007]) proves the same
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
// (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-009]) proves the same composition
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
      scenario.qualityCheckReconciliations,
      [
        {
          qualityCheck: "unit",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "unit" },
          evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PDC-001", status: "passed" },
        },
      ],
      `the unit obligation must reconcile satisfied as the scenario's sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
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
    const integrationOutcomes = scenario.qualityCheckReconciliations.filter(
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
      /integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/,
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
      /unit ∅ Evidence Observation is missing/,
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
      /integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/,
      `no deferred integration obligation may render as a reconciling-item error in:\n${renderedReport}`
    );
  }
);

// @SCN-PND-011 — the Evidence Reconciliation SUMMARY tallies Pending Items SEPARATELY from the
// scenario balanced and out-of-balance counts. Proved through the REAL
// parse→reconcile→assemble→render (assemble→render) pipeline over the PLANTED
// tests/fixtures/pending-tags/summary-tally.feature — @SCN-PDT-001 (`@unitpending
// @integrationpending`, two Pending Items, balanced), @SCN-PDT-002 (`@unit @integrationpending`,
// one Pending Item, out-of-balance via a missing unit) and @SCN-PDT-003 (`@unit`, no Pending
// Item, out-of-balance). Reconciled against NO observations: the materialised summary tally
// counts 3 Pending Items (2 + 1 + 0) across 2 scenarios, apart from balanced (1) and
// out-of-balance (2). Never a real `@<qc>pending` scenario in the scanned features/ corpus
// (fixture policy, evidence-manifesto §11B). The @unit arm proves the summary materialisation
// (packages/core/src/assemble/report.test.ts, [SCN-PND-011]) and the render + JSON consistency
// (packages/core/src/render/markdown.test.ts + json.test.ts, [SCN-PND-011]) in isolation.
const SUMMARY_TALLY_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/summary-tally.feature"
);

// The assembled report + rendered markdown of the reconciled summary-tally fixture.
let summaryReport: EvidenceReconciliation;
let summaryRendered: string;

Given(
  "a planted summary-tally fixture — scenarios carrying Pending Items alongside a genuinely-missing error, spanning balanced and out-of-balance",
  function () {
    // The fixture (all three scenarios) is the source; the parse+reconcile+assemble+render
    // happens in the When.
  }
);

When("the report is assembled and rendered from the reconciled fixture", function () {
  // Feed the PLANTED summary-tally fixture through the REAL parse→reconcile→assemble→render
  // pipeline. No observation is supplied: @SCN-PDT-001 is balanced-with-pending (two Pending
  // Items), @SCN-PDT-002 reconciles its bare unit to a `missing` error (out-of-balance) while
  // its `@integrationpending` partitions to a Pending Item, and @SCN-PDT-003's bare unit is a
  // `missing` error (out-of-balance, no Pending Item). assembleReport materialises the summary
  // (the Pending Items tally under test) and renderMarkdown renders it. Reds before the tally is
  // materialised (summary.pending is undefined) and before the renderer emits its line.
  const source = readFileSync(SUMMARY_TALLY_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const reconciliation = reconcile(scenarios, []);
  const ctx: RunContext = {
    target: "pending-summary-tally-fixture",
    inputs: {},
    runStart: new Date("2026-07-10T00:00:00.000Z"),
    sourceSha: null,
  };
  summaryReport = assembleReport(reconciliation, ctx);
  summaryRendered = renderMarkdown(reconciliation, ctx);
});

Then(
  "the materialised summary tallies the Pending Items, a count apart from the scenario balanced and out-of-balance counts",
  function () {
    // The summary carries a Pending Items tally of 3 — the two on @SCN-PDT-001 plus the one on
    // @SCN-PDT-002. It is SEPARATE from the scenario verdict tally (balanced 1, out-of-balance 2):
    // a Pending Item is deferred, neither balanced nor out-of-balance. Reds before the tally is
    // materialised (summary.pending undefined).
    assert.equal(
      summaryReport.summary.pending,
      3,
      `the summary must tally 3 Pending Items; got ${summaryReport.summary.pending} (summary: ${JSON.stringify(
        summaryReport.summary
      )})`
    );
    assert.equal(
      summaryReport.summary.scenarioReconciliations.balanced,
      1,
      `expected 1 balanced scenario; got ${summaryReport.summary.scenarioReconciliations.balanced}`
    );
    assert.equal(
      summaryReport.summary.scenarioReconciliations.outOfBalance,
      2,
      `expected 2 out-of-balance scenarios; got ${summaryReport.summary.scenarioReconciliations.outOfBalance}`
    );
    // The tally is its OWN number — it coincides with neither the balanced nor the
    // out-of-balance count (the separateness the behaviour names).
    assert.notEqual(summaryReport.summary.pending, summaryReport.summary.scenarioReconciliations.balanced);
    assert.notEqual(summaryReport.summary.pending, summaryReport.summary.scenarioReconciliations.outOfBalance);
  }
);

Then(
  "the tally counts Pending Items, not scenarios carrying them — one deferred obligation is one Pending Item",
  function () {
    // The tally equals the TOTAL Pending Items across the reconciled rows (one per deferred
    // obligation), NOT the number of scenarios carrying pending. @SCN-PDT-001 alone carries two,
    // so items (3) exceeds scenarios-carrying-pending (2) — the load-bearing distinction.
    const totalItems = summaryReport.ledger.scenarioReconciliations.flatMap((s) => s.pendingItems ?? []).length;
    const scenariosCarryingPending = summaryReport.ledger.scenarioReconciliations.filter(
      (s) => (s.pendingItems ?? []).length > 0
    ).length;
    assert.equal(
      summaryReport.summary.pending,
      totalItems,
      `the tally must count Pending Items (${totalItems}), not ${summaryReport.summary.pending}`
    );
    assert.equal(totalItems, 3, `expected 3 Pending Items across the rows; got ${totalItems}`);
    assert.equal(
      scenariosCarryingPending,
      2,
      `expected 2 scenarios carrying pending; got ${scenariosCarryingPending}`
    );
    assert.notEqual(
      summaryReport.summary.pending,
      scenariosCarryingPending,
      `the tally counts items, not scenarios carrying them — it must not equal ${scenariosCarryingPending}`
    );
  }
);

Then(
  "the rendered Evidence reconciliation shows the Pending Items tally, never an out-of-balance leaf at any count",
  function () {
    // The `### Evidence reconciliation` view shows a distinct Pending Items tally carrying the
    // count (3). Reds before the renderer emits it.
    const iSection = summaryRendered.indexOf("### Evidence reconciliation");
    assert.ok(iSection >= 0, `expected the Evidence reconciliation section in:\n${summaryRendered}`);
    const rest = summaryRendered.slice(iSection + 1);
    const nextHeading = rest.search(/\n#{2,3} /);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    // The tally shows within the section, carrying the count, marked with ⏳ (the pending marker).
    assert.match(
      section,
      /⏳\s*3 Pending Item/,
      `the Evidence reconciliation section must show the Pending Items tally (3); got:\n${section}`
    );
    // The out-of-balance leaves stay INTACT — the tally is not one of them, at any leaf count
    // (the constraint is categorical, not arithmetic). Each leaf
    // renders its canon description, not the bare handle (3F-1626).
    for (const leaf of [
      "Evidence Observation is missing",
      "Evidence Observation is failing",
      "Evidence Observation is passing but fabricated",
      "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
    ]) {
      assert.match(
        section,
        new RegExp(`↳ ${leaf} `),
        `the out-of-balance leaf decomposition must stay intact (↳ ${leaf}); got:\n${section}`
      );
    }
    // The Pending tally is NEVER an out-of-balance leaf of its own, at any leaf count (3F-1453
    // line): no `↳ pending` row anywhere in the whole report.
    assert.doesNotMatch(
      summaryRendered,
      /↳ pending/,
      `a Pending Item must NEVER render as an out-of-balance leaf (↳ pending) in:\n${summaryRendered}`
    );
  }
);

// @SCN-PND-012 — a BALANCED scenario carrying a Pending Item is visibly distinguished from a
// CLEAN-BALANCED one. The same-verdict contrast: both rows read `✓ balanced`, yet the
// clean-balanced row shows the em-dash placeholder `—` (nothing outstanding) while the
// balanced-with-pending row shows the `⏳ pending: <check>` label (owed/deferred work), the
// Pending Item never reading as an error. Distinct from @SCN-PND-010, which contrasts a Pending
// Item against a reconciling ERROR on an out-of-balance/mixed row. Proved through the REAL
// parse→reconcile→renderMarkdown (assemble→render) pipeline over the PLANTED
// tests/fixtures/pending-tags/balanced-contrast.feature — @SCN-PDD-001 (a bare `@unit`
// obligation discharged by a passing unit observation → clean-balanced, `—`) and @SCN-PDD-002
// (a sole `@integrationpending` → balanced-with-pending, `⏳ pending: integration`). Never a real
// `@<qc>pending` scenario in the scanned features/ corpus (fixture policy, evidence-manifesto
// §11B). The @unit arm (packages/core/src/render/markdown.test.ts, [SCN-PND-012]) proves the same
// same-verdict render distinction over renderMarkdown in isolation.
const BALANCED_CONTRAST_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/balanced-contrast.feature"
);

// The rendered markdown report of the reconciled balanced-contrast fixture.
let balancedContrastReport: string;

Given(
  "a planted balanced-contrast fixture — a clean-balanced scenario alongside a balanced-with-pending one, both verdict balanced",
  function () {
    // The fixture (both scenarios) is the source; the parse+reconcile+render happens in the When.
  }
);

When(
  "the report is rendered from the reconciled balanced-contrast fixture, the clean-balanced scenario's unit observation supplied",
  function () {
    // Feed the PLANTED balanced-contrast fixture through the REAL parse→reconcile→renderMarkdown
    // pipeline, supplying a PASSING unit observation citing @SCN-PDD-001 so its bare `@unit`
    // obligation reconciles `satisfied` — a genuinely CLEAN-BALANCED row (no reconciling item, no
    // Pending Item → the em-dash `—`). @SCN-PDD-002's sole `@integrationpending` partitions to a
    // one-sided Pending Item with no observation sought → BALANCED-WITH-PENDING (the ⏳ label).
    // renderMarkdown internally assembles the report and renders it — the assemble→render surface
    // under test. Reds before the renderer emits the Pending Item label: today's clean-balanced `—`
    // would render for the balanced-with-pending row too, collapsing the distinction.
    const source = readFileSync(BALANCED_CONTRAST_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDD-001",
      status: "passed",
    };
    const reconciliation = reconcile(scenarios, [passingUnit]);
    const ctx: RunContext = {
      target: "pending-balanced-contrast-fixture",
      inputs: {},
      runStart: new Date("2026-07-10T00:00:00.000Z"),
      sourceSha: null,
    };
    balancedContrastReport = renderMarkdown(reconciliation, ctx);
  }
);

Then(
  "the clean-balanced scenario's balanced row shows the em-dash placeholder — nothing outstanding",
  function () {
    // The @SCN-PDD-001 row is balanced (its unit obligation satisfied) and its exceptions cell is
    // the clean em-dash `—` — nothing outstanding, no reconciling item, no Pending Item.
    const row = rowFor(balancedContrastReport, "SCN-PDD-001");
    assert.match(row, /✓ balanced/, `the clean-balanced row must read balanced; got: ${row}`);
    assert.match(
      row,
      /\|\s*—\s*\|/,
      `the clean-balanced row's exceptions cell must be the em-dash placeholder; got: ${row}`
    );
    // A clean-balanced row carries NO pending label.
    assert.doesNotMatch(
      row,
      /⏳/,
      `the clean-balanced row must carry no pending label; got: ${row}`
    );
  }
);

Then(
  "the balanced-with-pending scenario's balanced row shows the ⏳ pending label instead — owed work, never an error",
  function () {
    // The @SCN-PDD-002 row is ALSO balanced, yet its exceptions cell shows the deferred integration
    // obligation as a `⏳ pending: integration` Pending Item — owed work, NOT the clean-balanced `—`
    // and NOT a reconciling-item error.
    const row = rowFor(balancedContrastReport, "SCN-PDD-002");
    assert.match(row, /✓ balanced/, `the balanced-with-pending row must read balanced; got: ${row}`);
    assert.match(
      row,
      /⏳ pending: integration/,
      `the balanced-with-pending row must show the ⏳ pending: integration label; got: ${row}`
    );
    // It is NOT the clean-balanced em-dash placeholder.
    assert.doesNotMatch(
      row,
      /\|\s*—\s*\|/,
      `the balanced-with-pending row must NOT be the clean-balanced em-dash; got: ${row}`
    );
    // And the Pending Item never reads as an error: the integration check renders as no
    // reconciling-item outcome on this row.
    assert.doesNotMatch(
      row,
      /integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/,
      `a Pending Item must never render as a reconciling-item error; got: ${row}`
    );
  }
);

Then(
  "the two balanced rows read differently at a glance — the pending row is not the clean-balanced em-dash",
  function () {
    // The reviewer-legibility close-out: both rows read `✓ balanced`, yet their exceptions cells
    // DIFFER — the clean-balanced cell is `—`, the balanced-with-pending cell is the ⏳ pending
    // label. The two exceptions cells are not equal, so the distinction is legible at a glance.
    const cleanRow = rowFor(balancedContrastReport, "SCN-PDD-001");
    const pendingRow = rowFor(balancedContrastReport, "SCN-PDD-002");
    const exceptionsCell = (row: string): string => (row.split("|")[3] ?? "").trim();
    const cleanCell = exceptionsCell(cleanRow);
    const pendingCell = exceptionsCell(pendingRow);
    assert.equal(cleanCell, "—", `the clean-balanced exceptions cell must be the em-dash; got: "${cleanCell}"`);
    assert.notEqual(
      pendingCell,
      cleanCell,
      `the balanced-with-pending exceptions cell ("${pendingCell}") must differ from the clean-balanced em-dash ("${cleanCell}") — the two balanced rows must read differently`
    );
    assert.match(
      pendingCell,
      /⏳ pending: integration/,
      `the balanced-with-pending exceptions cell must carry the ⏳ pending: integration label; got: "${pendingCell}"`
    );
  }
);

// @SCN-PND-013 — the cucumber reader's THREE-WAY classification, proved through the REAL
// parse→reconcile pipeline. The DECLARED side is the planted
// tests/fixtures/pending-tags/features/inconclusive-classification.feature (a single
// @integration @SCN-PDN-001 obligation, an UNREGISTERED fixture code). The OBSERVED side is a
// cucumber JSON report built per Examples row and fed to the REAL
// parseCucumberEvidenceObservations (§11A — the reader's own emitted-or-dropped output, never a
// hand-built observation). A `passed`/`failed` step emits a passed/failed observation →
// satisfied/failing; an inconclusive step (`undefined`/`pending`/`skipped`/`ambiguous`, none
// failed) is DROPPED, so the declared obligation finds no observation and reconciles missing BY
// ABSENCE. Reds today: an inconclusive result currently emits a `failed` observation, so the
// obligation reconciles `failing`, not `missing`. Never a real scanned scenario (fixture policy,
// evidence-manifesto §11B). The @unit arm (packages/core/src/parse/cucumber.test.ts,
// [SCN-PND-013]) proves the emitted-or-dropped classification over the reader in isolation.
const INCONCLUSIVE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/inconclusive-classification.feature"
);

// The row's step status, the parsed declared side, and the built observed-side report.
let classificationResult: string;
let classificationScenarios: Scenario[];
let classificationReport: CucumberJsonReport;

Given(
  "a planted declared integration obligation and a cucumber report whose step status is {string}",
  function (result: string) {
    // Parse the DECLARED side from the planted fixture (one @integration @SCN-PDN-001 obligation)
    // and build the OBSERVED side — a cucumber JSON report whose single step carries this row's
    // status. The reader runs in the When.
    classificationResult = result;
    const source = readFileSync(INCONCLUSIVE_FIXTURE, "utf8");
    classificationScenarios = parseScenarios(source);
    classificationReport = [
      {
        uri: "features/inconclusive-classification.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-PDN-001" }],
            steps: [{ result: { status: result } }],
          },
        ],
      },
    ];
  }
);

When(
  "the cucumber reader parses the report and the reconciler reconciles the declared obligation",
  function () {
    // The REAL cucumber reader (§11A): its emitted-or-dropped output IS the observation set the
    // reconciler joins the declared obligation against. An inconclusive result emits nothing, so
    // the join finds no observation → missing by absence.
    const observations = parseCucumberEvidenceObservations(classificationReport, "integration");
    reconciliation = reconcile(classificationScenarios, observations);
  }
);

Then(
  "the declared integration obligation reconciles {string}",
  function (outcome: string) {
    // Row-scoped to the SCN-PDN-001 scenario's OWN reconciled integration obligation.
    // Its outcome is the three-way classification's result: satisfied (passed) / failing (failed)
    // / missing (any inconclusive, by absence). Reds while an inconclusive result maps to failing.
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDN-001");
    assert.ok(scenario, "expected the declared fixture scenario (SCN-PDN-001)");
    const integrationOutcomes = scenario.qualityCheckReconciliations.filter(
      (o) => o.qualityCheck === "integration"
    );
    assert.equal(
      integrationOutcomes.length,
      1,
      `expected exactly one reconciled integration obligation on SCN-PDN-001; got ${
        integrationOutcomes.length
      } (${JSON.stringify(scenario.qualityCheckReconciliations)})`
    );
    assert.equal(
      integrationOutcomes[0]!.outcome,
      outcome,
      `the declared integration obligation for a "${classificationResult}" observation must reconcile "${outcome}"; got "${
        integrationOutcomes[0]!.outcome
      }" (row: ${JSON.stringify(scenario)})`
    );
  }
);

// @SCN-PND-014 — the anti-leniency corollary of PND-013, at the VERDICT level, proved through the
// REAL parse→reconcile pipeline. The DECLARED side is the planted
// tests/fixtures/pending-tags/features/undefined-not-pending.feature (a single @integration
// @SCN-PDA-001 obligation, an UNREGISTERED fixture code, carrying NO `<qc>pending` declaration).
// The OBSERVED side is a cucumber JSON report whose one step is `undefined`, fed to the REAL
// parseCucumberEvidenceObservations (§11A): the reader drops the inconclusive scenario, so the
// declared obligation finds no observation and reconciles MISSING by absence — the scenario verdict
// is out-of-balance. Because no `<qc>pending` was declared, the scenario raises NO Pending Item: an
// undefined step is NOT excused as pending (Cucumber's own leniency, the hole this tool must not
// have). Pending is a DECLARATION (slice 1/4), never inferred from an inconclusive run's status.
// Never a real scanned scenario (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-014]) sharpens the same assertion over
// the real reader feeding the real reconciler in isolation.
const UNDEFINED_NOT_PENDING_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/undefined-not-pending.feature"
);

let antiLeniencyScenarios: Scenario[];
let antiLeniencyReport: CucumberJsonReport;

Given(
  "a planted declared integration obligation carrying no pending declaration, and a cucumber report whose step is undefined",
  function () {
    // Parse the DECLARED side from the planted fixture (one @integration @SCN-PDA-001 obligation,
    // no `<qc>pending`) and build the OBSERVED side — a cucumber JSON report whose single step is
    // `undefined`. The reader runs in the When.
    const source = readFileSync(UNDEFINED_NOT_PENDING_FIXTURE, "utf8");
    antiLeniencyScenarios = parseScenarios(source);
    antiLeniencyReport = [
      {
        uri: "features/undefined-not-pending.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-PDA-001" }],
            steps: [{ result: { status: "undefined" } }],
          },
        ],
      },
    ];
  }
);

When(
  "the cucumber reader drops the undefined step and the reconciler reconciles the declared obligation",
  function () {
    // The REAL cucumber reader (§11A): the `undefined` step is inconclusive, so the reader emits
    // NOTHING — the declared obligation joins against an empty observation set and reconciles
    // missing by absence.
    const observations = parseCucumberEvidenceObservations(antiLeniencyReport, "integration");
    reconciliation = reconcile(antiLeniencyScenarios, observations);
  }
);

Then(
  "the scenario verdict is out-of-balance, its integration obligation a missing reconciling item",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDA-001");
    assert.ok(scenario, "expected the declared fixture scenario (SCN-PDA-001)");
    assert.equal(
      scenario.verdict,
      "out-of-balance",
      `an undefined step for a declared, non-pending integration obligation must leave the scenario out-of-balance; got "${
        scenario.verdict
      }" (row: ${JSON.stringify(scenario)})`
    );
    const missing = scenario.reconcilingItems.filter(
      (o) => o.qualityCheck === "integration" && o.outcome === "missing"
    );
    assert.equal(
      missing.length,
      1,
      `the integration obligation must be the scenario's one missing reconciling item; got ${
        missing.length
      } (reconcilingItems: ${JSON.stringify(scenario.reconcilingItems)})`
    );
  }
);

Then(
  "the scenario raises no Pending Item — the undefined step is not excused as pending",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDA-001");
    assert.ok(scenario, "expected the declared fixture scenario (SCN-PDA-001)");
    // The anti-leniency teeth: an inconclusive run raises NO Pending Item. A Pending Item requires
    // a `<qc>pending` DECLARATION (slice 1/4) — it is never inferred from an observation's status.
    assert.deepEqual(
      scenario.pendingItems,
      [],
      `an undefined step with no <qc>pending declaration must raise no Pending Item — it is not excused as pending; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
  }
);

// @SCN-PND-015 — the vitest reader's THREE-WAY classification, uniform with the cucumber reader
// (@SCN-PND-013), proved through the REAL parse→reconcile pipeline. The DECLARED side is the planted
// tests/fixtures/pending-tags/features/vitest-inconclusive-classification.feature (a single @unit
// @SCN-PDV-001 obligation, an UNREGISTERED fixture code). The OBSERVED side is a VITEST JSON report
// built per Examples row and fed to the REAL parseVitestEvidenceObservations (§11A — the reader's own
// emitted-or-dropped output, never a hand-built observation). A `passed`/`failed` assertion emits a
// passed/failed observation → satisfied/failing; an inconclusive vitest status (`skipped`/`todo`, any
// status ∉ {passed, failed}) is DROPPED, so the declared obligation finds no observation and reconciles
// missing BY ABSENCE. The status strings are the real vitest JSON reporter's actual assertion statuses
// (§11A), never hand-seeded. Reds today: an inconclusive result currently maps to a `failed` observation,
// so the obligation reconciles `failing`, not `missing`. Never a real scanned scenario (fixture policy,
// evidence-manifesto §11B). The @unit arm (packages/core/src/parse/vitest.test.ts, [SCN-PND-015]) proves
// the emitted-or-dropped classification over the reader in isolation.
const VITEST_INCONCLUSIVE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/vitest-inconclusive-classification.feature"
);

// The row's assertion status, the parsed declared side, and the built observed-side vitest report.
let vitestClassificationResult: string;
let vitestClassificationScenarios: Scenario[];
let vitestClassificationReport: VitestJsonReport;

Given(
  "a planted declared unit obligation and a vitest report whose assertion status is {string}",
  function (result: string) {
    // Parse the DECLARED side from the planted fixture (one @unit @SCN-PDV-001 obligation) and build
    // the OBSERVED side — a vitest JSON report whose single assertion carries this row's status. The
    // reader runs in the When.
    vitestClassificationResult = result;
    const source = readFileSync(VITEST_INCONCLUSIVE_FIXTURE, "utf8");
    vitestClassificationScenarios = parseScenarios(source);
    vitestClassificationReport = {
      testResults: [
        {
          name: "packages/core/src/parse/vitest-inconclusive.test.ts",
          assertionResults: [{ fullName: "[SCN-PDV-001] a declared unit obligation", status: result }],
        },
      ],
    };
  }
);

When(
  "the vitest reader parses the report and the reconciler reconciles the declared obligation",
  function () {
    // The REAL vitest reader (§11A): its emitted-or-dropped output IS the observation set the
    // reconciler joins the declared @unit obligation against. An inconclusive result emits nothing, so
    // the join finds no observation → missing by absence. The declared level (unit — the JS-ecosystem
    // default at the CLI edge) is passed as the reader's caller-declared level.
    const observations = parseVitestEvidenceObservations(vitestClassificationReport, "unit");
    reconciliation = reconcile(vitestClassificationScenarios, observations);
  }
);

Then(
  "the declared unit obligation reconciles {string}",
  function (outcome: string) {
    // Row-scoped to the SCN-PDV-001 scenario's OWN reconciled unit obligation. Its outcome is
    // the three-way classification's result: satisfied (passed) / failing (failed) / missing (any
    // inconclusive, by absence). Reds while an inconclusive result maps to failing.
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDV-001");
    assert.ok(scenario, "expected the declared fixture scenario (SCN-PDV-001)");
    const unitOutcomes = scenario.qualityCheckReconciliations.filter((o) => o.qualityCheck === "unit");
    assert.equal(
      unitOutcomes.length,
      1,
      `expected exactly one reconciled unit obligation on SCN-PDV-001; got ${
        unitOutcomes.length
      } (${JSON.stringify(scenario.qualityCheckReconciliations)})`
    );
    assert.equal(
      unitOutcomes[0]!.outcome,
      outcome,
      `the declared unit obligation for a "${vitestClassificationResult}" observation must reconcile "${outcome}"; got "${
        unitOutcomes[0]!.outcome
      }" (row: ${JSON.stringify(scenario)})`
    );
  }
);

// @SCN-PND-016 — SCENARIO-SCOPE community deferral: a recognised community deferral tag (@wip /
// @ignore / @skip / @todo / @pending — the DEFAULT_DEFERRAL_TAGS starter set) on a scenario
// defers EVERY obligation the scenario declares. Proved through the REAL parse→reconcile pipeline
// over the PLANTED tests/fixtures/pending-tags/community-tags.feature — each fixture scenario
// carries one community tag alongside a `@unit` and an `@integration` obligation, so both must be
// marked pending → two Pending Items, verdict balanced. Never a real community-tagged scenario in
// the scanned features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/parse/scenarios.test.ts, [SCN-PND-016]) proves the deferral over
// parseScenarios in isolation. Reds today: a community tag is ignored, so both obligations
// reconcile MISSING (out-of-balance), not pending.
const COMMUNITY_TAGS_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/community-tags.feature"
);
// Each recognised community deferral tag → the @SCN id of the planted fixture scenario carrying
// it (each declares a @unit + @integration obligation).
const COMMUNITY_TAG_TO_SCN: Record<string, string> = {
  "@wip": "SCN-PDW-001",
  "@ignore": "SCN-PDW-002",
  "@skip": "SCN-PDW-003",
  "@todo": "SCN-PDW-004",
  "@pending": "SCN-PDW-005",
};
let communityTag: string;
let communityScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying the community tag {string} alongside a `@unit` and an `@integration` obligation",
  function (tag: string) {
    // Record the tag under test; the parse+reconcile over the planted fixture happens in the When.
    communityTag = tag;
  }
);

When(
  "the parser derives the scenario's evidence obligations and the reconciler reconciles it against no observation",
  function () {
    // Feed the PLANTED community-tags fixture to the pure parser; scope to the scenario carrying
    // this row's community tag (via the tag→@SCN map). Reconcile it against NO observation, so the
    // second Then reads the Pending Items + verdict off the real reconciliation.
    const scnId = COMMUNITY_TAG_TO_SCN[communityTag];
    assert.ok(scnId, `unexpected community tag "${communityTag}"`);
    const source = readFileSync(COMMUNITY_TAGS_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    communityScenario = scenarios.find((s) => s.scnId === scnId);
    assert.ok(communityScenario, `expected the planted fixture scenario ${scnId} to parse`);
    reconciliation = reconcile([communityScenario], []);
  }
);

Then(
  "both the declared unit and integration obligations are deferred — pending, overriding their observation-derived outcome",
  function () {
    const obligations = communityScenario!.evidenceObligations;
    const unit = obligations.find((o) => o.qualityCheck === "unit");
    const integration = obligations.find((o) => o.qualityCheck === "integration");
    assert.ok(
      unit && unit.pending === true,
      `expected a pending unit obligation on the ${communityTag} scenario; got ${JSON.stringify(obligations)}`
    );
    assert.ok(
      integration && integration.pending === true,
      `expected a pending integration obligation on the ${communityTag} scenario; got ${JSON.stringify(obligations)}`
    );
  }
);

Then(
  "the scenario raises two Pending Items and has verdict balanced — no reconciling item",
  function () {
    const [row] = reconciliation.scenarioReconciliations;
    assert.ok(row, "expected exactly one reconciled scenario row");
    const pendingCount = (row.pendingItems ?? []).length;
    assert.equal(
      pendingCount,
      2,
      `the ${communityTag} scenario must raise two Pending Items (both deferred obligations); got ${pendingCount} (row: ${JSON.stringify(row)})`
    );
    assert.equal(
      row.verdict,
      "balanced",
      `a scenario whose only exceptions are Pending Items is balanced; got "${row.verdict}" (row: ${JSON.stringify(row)})`
    );
    assert.equal(
      row.reconcilingItems.length,
      0,
      `no reconciling item may be named — the deferred obligations are Pending Items, not errors; got ${JSON.stringify(row.reconcilingItems)}`
    );
  }
);

// @SCN-PND-017 — the SCOPE CONTRAST to @SCN-PND-016: a `<qc>pending` tag is OBLIGATION-SCOPE
// (it defers only its own check), whereas a recognised community tag is SCENARIO-SCOPE (it defers
// every obligation). Proved through the REAL parse→reconcile pipeline over the PLANTED
// tests/fixtures/pending-tags/obligation-scope.feature (@SCN-PDO-001 — `@unit @integrationpending`,
// NO community tag) fed a hand-built PASSING unit observation citing that very scenario. The bare
// `@unit` obligation is NOT deferred (the scenario-scope machinery does not over-reach absent a
// community tag), so it reconciles `satisfied`; the `@integrationpending` one partitions off to a
// one-sided Pending Item. Never a real `@<qc>pending` scenario in the scanned features/ corpus
// (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/parse/scenarios.test.ts, [SCN-PND-017]) proves the same obligation-scope
// distinction over parseScenarios in isolation, contrasted against the scenario-scope community
// tag. Green-first over the obligation-scope path (slice 1 + PND-009, already delivered); teeth
// proven by a make-`@integrationpending`-scenario-scope mutation (reverted).
const OBLIGATION_SCOPE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/obligation-scope.feature"
);

// The parsed scenario carrying `@unit @integrationpending` (its parse-level obligations under test).
let obligationScopeScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying `@unit @integrationpending` and NO community deferral tag, with a passing unit observation citing it",
  function () {
    // The fixture (@SCN-PDO-001) is the source; the parse+reconcile (with the passing unit
    // observation) happens in the When.
  }
);

When(
  "the parser derives the scenario's evidence obligations and the reconciler reconciles it against that passing unit observation",
  function () {
    // Feed the PLANTED obligation-scope fixture to the pure parser, then reconcile against a
    // PASSING unit observation citing @SCN-PDO-001. The bare `@unit` obligation stays NON-pending
    // (obligation-scope: only `@integrationpending` defers), so the observation discharges it to
    // `satisfied`; the `@integrationpending` one partitions to a one-sided Pending Item.
    const source = readFileSync(OBLIGATION_SCOPE_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    obligationScopeScenario = scenarios.find((s) => s.scnId === "SCN-PDO-001");
    assert.ok(obligationScopeScenario, "expected the planted fixture scenario SCN-PDO-001 to parse");
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDO-001",
      status: "passed",
    };
    reconciliation = reconcile([obligationScopeScenario], [passingUnit]);
  }
);

Then(
  "only the integration obligation is deferred pending — the bare unit obligation is not, so the `@integrationpending` scope is the single check",
  function () {
    // The parse-level scope distinction: `@integrationpending` derives a pending integration
    // obligation, while the bare `@unit` obligation is NOT deferred (no `pending` flag). Reds under
    // the scenario-scope mutation (which would mark the unit obligation pending too). This is the
    // obligation-scope-vs-scenario-scope contrast with @SCN-PND-016.
    const obligations = obligationScopeScenario!.evidenceObligations;
    const unit = obligations.find((o) => o.qualityCheck === "unit");
    const integration = obligations.find((o) => o.qualityCheck === "integration");
    assert.ok(
      unit && unit.pending === undefined,
      `the bare @unit obligation must NOT be deferred (obligation-scope, not scenario-scope); got ${JSON.stringify(obligations)}`
    );
    assert.ok(
      integration && integration.pending === true,
      `the @integrationpending obligation must be deferred pending; got ${JSON.stringify(obligations)}`
    );
  }
);

Then(
  "the unit obligation reconciles satisfied and the deferred integration one is the scenario's single Pending Item — verdict balanced, no reconciling item",
  function () {
    // The reconcile side of the contrast: the un-deferred unit obligation reconciles `satisfied`
    // against its passing observation (a genuine reconciling-side balance — NOT swallowed by any
    // scenario-scope deferral), while the deferred integration one is the scenario's single one-sided
    // Pending Item. Verdict balanced, no reconciling item.
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDO-001");
    assert.ok(scenario, "expected the reconciled fixture scenario (SCN-PDO-001)");
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [
        {
          qualityCheck: "unit",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "unit" },
          evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PDO-001", status: "passed" },
        },
      ],
      `the un-deferred unit obligation must reconcile satisfied as the sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the deferred integration obligation must be the scenario's single Pending Item; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
    assert.equal(
      scenario.verdict,
      "balanced",
      `the obligation-scope scenario must have verdict balanced; got "${scenario.verdict}" (row: ${JSON.stringify(scenario)})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `no reconciling item may be named — the deferred integration is a Pending Item, the unit is satisfied; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
  }
);

// @SCN-PND-018 — the COMPOSITION of the two deferral sources: SCENARIO-SCOPE (a recognised
// community tag, @SCN-PND-016) and OBLIGATION-SCOPE (`@<qc>pending`, @SCN-PND-017) coexist without
// interference. Proved through the REAL parse→reconcile pipeline over the PLANTED
// tests/fixtures/pending-tags/compose-scope.feature (@SCN-PDP-001 — `@wip @unit @integrationpending`)
// reconciled against NO observation. The bare `@unit` obligation is deferred by the scenario-scope
// `@wip` alone (there is no `@unitpending`); the `@integration` obligation is deferred by the
// obligation-scope `@integrationpending` AND overlappingly by `@wip` (idempotent). So BOTH obligations
// partition off to Pending Items — one owed from each source — verdict balanced, no reconciling item.
// Never a real community-tagged or `@<qc>pending` scenario in the scanned features/ corpus (fixture
// policy, evidence-manifesto §11B). The @unit arm (packages/core/src/parse/scenarios.test.ts,
// [SCN-PND-018]) proves the same composition over parseScenarios in isolation. Green-first over the
// slice-4 scenario-scope post-pass (@SCN-PND-016, already delivered — `@wip` marks every obligation
// pending, subsuming `@integrationpending`); teeth proven by a local mutation (reverted) that lets one
// source suppress the other so only one obligation defers.
const COMPOSE_SCOPE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/compose-scope.feature"
);

// The parsed scenario carrying `@wip @unit @integrationpending` (its parse-level obligations under test).
let composeScopeScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying `@wip` over a bare `@unit` and an obligation-scope `@integrationpending`",
  function () {
    // The fixture (@SCN-PDP-001) is the source; the parse+reconcile against no observation happens
    // in the When.
  }
);

When(
  "the parser derives the composition scenario's evidence obligations and the reconciler reconciles it against no observation",
  function () {
    // Feed the PLANTED compose-scope fixture to the pure parser, then reconcile against NO
    // observation. The bare `@unit` obligation is deferred by the scenario-scope `@wip`; the
    // `@integration` obligation by the obligation-scope `@integrationpending` (and overlappingly by
    // `@wip`). Both partition to Pending Items — one from each source — so the second Then reads two
    // Pending Items, verdict balanced, off the real reconciliation.
    const source = readFileSync(COMPOSE_SCOPE_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    composeScopeScenario = scenarios.find((s) => s.scnId === "SCN-PDP-001");
    assert.ok(composeScopeScenario, "expected the planted fixture scenario SCN-PDP-001 to parse");
    reconciliation = reconcile([composeScopeScenario], []);
  }
);

Then(
  "the unit obligation is deferred by the scenario-scope `@wip` and the integration obligation by the obligation-scope `@integrationpending` — both pending, one from each source",
  function () {
    // The parse-level composition: `@integrationpending` derives a pending integration obligation
    // (obligation-scope), and the scenario-scope `@wip` post-pass marks EVERY obligation pending —
    // reaching the bare `@unit` one (there is no `@unitpending`) and idempotently re-marking the
    // already-pending integration one. Neither source suppresses the other. Reds under a mutation
    // that lets one source override the other so only a single obligation defers.
    const obligations = composeScopeScenario!.evidenceObligations;
    const unit = obligations.find((o) => o.qualityCheck === "unit");
    const integration = obligations.find((o) => o.qualityCheck === "integration");
    assert.ok(
      unit && unit.pending === true,
      `the bare @unit obligation must be deferred by the scenario-scope @wip; got ${JSON.stringify(obligations)}`
    );
    assert.ok(
      integration && integration.pending === true,
      `the @integration obligation must be deferred by the obligation-scope @integrationpending (and @wip); got ${JSON.stringify(obligations)}`
    );
  }
);

Then(
  "the scenario raises two Pending Items and has verdict balanced — no reconciling item, the two deferral sources composing without interference",
  function () {
    // The reconcile side of the composition: BOTH deferred obligations partition off to one-sided
    // Pending Items — one owed from the scenario-scope source, one from the obligation-scope source.
    // No active obligation remains to reconcile, so no reconciling item and no both-missing fallback:
    // verdict balanced. The two sources compose — obligation-scope does not narrow the scenario-scope
    // deferral, scenario-scope does not merge away the obligation-scope Pending Item.
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDP-001");
    assert.ok(scenario, "expected the reconciled fixture scenario (SCN-PDP-001)");
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      `both deferred obligations must be Pending Items, one from each source; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
    assert.equal(
      scenario.verdict,
      "balanced",
      `a scenario whose only exceptions are Pending Items is balanced; got "${scenario.verdict}" (row: ${JSON.stringify(scenario)})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `no reconciling item may be named — both deferred obligations are Pending Items, not errors; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [],
      `no obligation reconciles — both are partitioned off as Pending Items; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
  }
);

// @SCN-PND-019 — the DECLARATION-OVERRIDES-OBSERVATION close-out: a recognised community
// deferral tag raises the Pending Item REGARDLESS of the observation side (slice 3 — the
// declaration overrides the observation-derived outcome). The pending flag is set at PARSE,
// before any observation match, so the obligation partitions to a Pending Item whatever the
// observed side would ELSE derive. Proved through the REAL parse→(reader)→reconcile pipeline over
// the PLANTED tests/fixtures/pending-tags/declaration-overrides-observation.feature — a `@skip
// @integration` scenario FILTERED OUT of the run (@SCN-PDF-001 — no observation at all, missing
// by absence without the deferral) and a `@wip @integration` scenario REPORTING A PENDING STATUS
// (@SCN-PDF-002 — a cucumber `pending`-status step the REAL reader drops as inconclusive, again
// missing by absence). Both are instead Pending Items, never missing reconciling items. The
// pending-status side feeds the REAL parseCucumberEvidenceObservations (§11A), so the dropped
// observation is the reader's own output, never a hand-built one. Never a real @skip / @wip
// scenario in the scanned features/ corpus (fixture policy, evidence-manifesto §11B). The @unit
// arm (packages/core/src/domain/evidenceReconciliation.test.ts, [SCN-PND-019]) proves the same override
// from both observation sides over the reader + reconciler in isolation. Green-first over
// @SCN-PND-016 (the parse-level deferral) + @SCN-PND-013 (the reader's inconclusive drop), both
// already delivered; teeth proven by a local mutation removing the scenario-scope deferral
// (reverted) — both sides then reconcile missing.
const OVERRIDE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/declaration-overrides-observation.feature"
);

// The two reconciled rows — one per observation side — keyed by fixture @SCN id.
let filteredOutScenario: ScenarioReconciliation | undefined;
let pendingStatusScenario: ScenarioReconciliation | undefined;

Given(
  "a planted fixture — a `@skip @integration` scenario filtered out of the run, and a `@wip @integration` scenario reporting a cucumber pending status",
  function () {
    // The fixture (both scenarios) is the source; the parse + per-side reconcile happens in the When.
  }
);

When(
  "the parser derives each scenario's obligations and the reconciler reconciles each against its observation side — the filtered-out one against no observation, the pending-status one against the reader's dropped output",
  function () {
    // Feed the PLANTED fixture to the pure parser: both scenarios carry a recognised community
    // deferral tag over an @integration obligation, so parseScenarios marks each integration
    // obligation pending (scenario-scope, @SCN-PND-016).
    const source = readFileSync(OVERRIDE_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    const filteredOut = scenarios.find((s) => s.scnId === "SCN-PDF-001");
    const pendingStatus = scenarios.find((s) => s.scnId === "SCN-PDF-002");
    assert.ok(filteredOut, "expected the planted filtered-out fixture scenario (SCN-PDF-001)");
    assert.ok(pendingStatus, "expected the planted pending-status fixture scenario (SCN-PDF-002)");

    // OBSERVATION SIDE 1 — FILTERED OUT: the @skip scenario is excluded from the run, so it
    // contributes NO observation at all. Reconcile it against an EMPTY observation set — without
    // the deferral its integration obligation would reconcile `missing` by absence.
    const filteredOutReconciliation = reconcile([filteredOut], []);
    filteredOutScenario = filteredOutReconciliation.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PDF-001"
    );

    // OBSERVATION SIDE 2 — REPORTS A PENDING STATUS: the @wip scenario runs and yields a cucumber
    // `pending`-status step. Fed to the REAL cucumber reader (§11A), the inconclusive step is
    // DROPPED → an empty observation set (no back-door hand-built observation). Reconcile the
    // pending-status scenario against the reader's OWN dropped output — again missing by absence
    // without the deferral.
    const pendingStatusReport: CucumberJsonReport = [
      {
        uri: "features/declaration-overrides-observation.feature",
        elements: [
          {
            tags: [{ name: "@wip" }, { name: "@integration" }, { name: "@SCN-PDF-002" }],
            steps: [{ result: { status: "pending" } }],
          },
        ],
      },
    ];
    const droppedObservations = parseCucumberEvidenceObservations(pendingStatusReport, "integration");
    assert.deepEqual(
      droppedObservations,
      [],
      `the cucumber reader must DROP the pending-status step as inconclusive (missing by absence); got ${JSON.stringify(
        droppedObservations
      )}`
    );
    const pendingStatusReconciliation = reconcile([pendingStatus], droppedObservations);
    pendingStatusScenario = pendingStatusReconciliation.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PDF-002"
    );
  }
);

Then(
  "the filtered-out scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the absent observation",
  function () {
    // The @skip deferral governs: the declared integration obligation partitions to EXACTLY one
    // one-sided Pending Item, and names NO `missing` reconciling item — the declaration overriding
    // the absent observation that would ELSE derive `missing`. Reds under a mutation removing the
    // scenario-scope deferral (the obligation would then reconcile `missing`, no Pending Item).
    assert.ok(filteredOutScenario, "expected the reconciled filtered-out row (SCN-PDF-001)");
    assert.deepEqual(
      filteredOutScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the filtered-out scenario's integration obligation must be a Pending Item; got ${JSON.stringify(
        filteredOutScenario.pendingItems
      )}`
    );
    const missing = filteredOutScenario.reconcilingItems.filter(
      (r) => r.qualityCheck === "integration" && r.outcome === "missing"
    );
    assert.equal(
      missing.length,
      0,
      `the deferral must override the absent observation — no missing reconciling item; got ${JSON.stringify(
        filteredOutScenario.reconcilingItems
      )}`
    );
  }
);

Then(
  "the pending-status scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the dropped observation",
  function () {
    // The @wip deferral governs the OTHER observation side identically: the reader dropped the
    // pending-status step (missing by absence), yet the declared integration obligation is a
    // Pending Item, not a `missing` reconciling item — the declaration overriding the dropped
    // observation. Reds under the same deferral-removal mutation.
    assert.ok(pendingStatusScenario, "expected the reconciled pending-status row (SCN-PDF-002)");
    assert.deepEqual(
      pendingStatusScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the pending-status scenario's integration obligation must be a Pending Item; got ${JSON.stringify(
        pendingStatusScenario.pendingItems
      )}`
    );
    const missing = pendingStatusScenario.reconcilingItems.filter(
      (r) => r.qualityCheck === "integration" && r.outcome === "missing"
    );
    assert.equal(
      missing.length,
      0,
      `the deferral must override the dropped observation — no missing reconciling item; got ${JSON.stringify(
        pendingStatusScenario.reconcilingItems
      )}`
    );
  }
);

Then(
  "each scenario has verdict balanced and names no reconciling item — the declaration governs regardless of the observation side",
  function () {
    // Both observation sides land the same verdict: the deferred obligation is a one-sided Pending
    // Item (verdict-neutral), so each scenario is balanced with an empty reconciling-item list. The
    // declaration governs from either side — the filtered-out absence and the dropped pending-status
    // observation alike.
    for (const scenario of [filteredOutScenario, pendingStatusScenario]) {
      assert.ok(scenario, "expected both reconciled fixture rows");
      assert.equal(
        scenario.verdict,
        "balanced",
        `a scenario whose only exception is a Pending Item is balanced; got "${scenario.verdict}" (row: ${JSON.stringify(
          scenario
        )})`
      );
      assert.deepEqual(
        scenario.reconcilingItems,
        [],
        `no reconciling item may be named — the deferred obligation is a Pending Item, not an error; got ${JSON.stringify(
          scenario.reconcilingItems
        )}`
      );
      assert.deepEqual(
        scenario.qualityCheckReconciliations,
        [],
        `no obligation reconciles — the integration obligation is partitioned off as a Pending Item; got ${JSON.stringify(
          scenario.qualityCheckReconciliations
        )}`
      );
    }
  }
);

// @SCN-PND-020 — the NEGATIVE BOUNDARY of the slice-4 Rule: an UNRECOGNISED tag (a tag absent
// from the recognised deferral set — an unregistered project tag like `@foo`) is given NO special
// meaning and defers NOTHING. Proved through the REAL parse→reconcile pipeline over the PLANTED
// tests/fixtures/pending-tags/unrecognised-tag.feature (@SCN-PDZ-001 — `@foo @unit`, no recognised
// deferral tag) fed a hand-built PASSING unit observation citing that very scenario. The bare
// `@unit` obligation stays un-deferred (no pending flag — the scenario-scope machinery is gated on
// membership of the recognised set), so it reconciles `satisfied`; the scenario raises NO Pending
// Item. Never a real `@foo`-deferred scenario in the scanned features/ corpus (fixture policy,
// evidence-manifesto §11B). The @unit arm (packages/core/src/parse/scenarios.test.ts,
// [SCN-PND-020]) proves the same non-deferral over parseScenarios in isolation. Green-first over
// the scenario-scope path (@SCN-PND-016, already delivered — an unrecognised tag isn't in the set,
// so nothing is marked pending); teeth proven by a local mutation that defers on ANY tag
// (reverted) — the `@foo` obligation would then wrongly become a Pending Item.
const UNRECOGNISED_TAG_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/unrecognised-tag.feature"
);

// The parsed scenario carrying `@foo @unit` (its parse-level obligations under test).
let unrecognisedTagScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying an unrecognised `@foo` tag alongside a declared `@unit` obligation, with a passing unit observation citing it",
  function () {
    // The fixture (@SCN-PDZ-001) is the source; the parse+reconcile (with the passing unit
    // observation) happens in the When.
  }
);

When(
  "the parser derives the unrecognised-tag scenario's evidence obligations and the reconciler reconciles it against that passing unit observation",
  function () {
    // Feed the PLANTED unrecognised-tag fixture to the pure parser, then reconcile against a
    // PASSING unit observation citing @SCN-PDZ-001. The `@foo` tag is NOT in the recognised
    // deferral set, so the bare `@unit` obligation stays NON-pending (no scenario-scope deferral);
    // the observation discharges it to `satisfied`, and no obligation partitions to a Pending Item.
    const source = readFileSync(UNRECOGNISED_TAG_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    unrecognisedTagScenario = scenarios.find((s) => s.scnId === "SCN-PDZ-001");
    assert.ok(unrecognisedTagScenario, "expected the planted fixture scenario SCN-PDZ-001 to parse");
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDZ-001",
      status: "passed",
    };
    reconciliation = reconcile([unrecognisedTagScenario], [passingUnit]);
  }
);

Then(
  "the unit obligation is not deferred — the unrecognised tag carries no special meaning, so it has no pending flag",
  function () {
    // The parse-level negative boundary: the `@foo` tag is unrecognised, so the bare `@unit`
    // obligation stays plain (NO pending flag) — the scenario-scope deferral is gated on membership
    // of the recognised set. Reds under a mutation that defers on ANY tag (the unit obligation
    // would then wrongly gain `pending: true`).
    const obligations = unrecognisedTagScenario!.evidenceObligations;
    assert.deepEqual(
      obligations,
      [{ qualityCheck: "unit" }],
      `the unrecognised @foo tag must defer nothing — the bare @unit obligation stays plain (no pending flag); got ${JSON.stringify(
        obligations
      )}`
    );
  }
);

Then(
  "the unit obligation reconciles satisfied and the scenario raises no Pending Item — verdict balanced, no reconciling item",
  function () {
    // The reconcile side of the negative boundary: the un-deferred unit obligation reconciles
    // `satisfied` against its passing observation (a genuine reconciling-side balance — the
    // obligation reconciles ON ITS OBSERVATION, never partitioned off), and the scenario raises NO
    // Pending Item. Verdict balanced, no reconciling item.
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDZ-001");
    assert.ok(scenario, "expected the reconciled fixture scenario (SCN-PDZ-001)");
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [
        {
          qualityCheck: "unit",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "unit" },
          evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PDZ-001", status: "passed" },
        },
      ],
      `the un-deferred unit obligation must reconcile satisfied as the sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [],
      `an unrecognised tag must raise NO Pending Item; got ${JSON.stringify(scenario.pendingItems)}`
    );
    assert.equal(
      scenario.verdict,
      "balanced",
      `the negative-boundary scenario must have verdict balanced; got "${scenario.verdict}" (row: ${JSON.stringify(
        scenario
      )})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `no reconciling item may be named — the unit obligation reconciles satisfied on its observation; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
  }
);

// @SCN-PND-021 — the recognised deferral-tag set is CONFIGURATION: a project-configured tag
// defers like a built-in. Proved through the REAL ingest→parse→reconcile pipeline (runReconcile,
// the impure CLI edge that reads `package.json`) over a PLANTED target repo
// tests/fixtures/pending-tags/config-extends/ — its package.json configures
// `specController.deferralTags: ["deferred"]`, and its feature declares a `@deferred @integration`
// scenario (@SCN-CFG-001) alongside a built-in `@wip @integration` one (@SCN-CFG-002). runReconcile
// reads the configured set, unions it with DEFAULT_DEFERRAL_TAGS, and threads DEFAULT ∪ configured
// into parseScenarios — so the `@deferred` scenario's integration obligation defers to a Pending
// Item exactly like the built-in `@wip` one. Config EXTENDS, never replaces: the `@wip` scenario
// still defers alongside the configured tag. Never a real configured deferral tag in the scanned
// features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm proves the config
// read/union in isolation (packages/spec-controller/src/ingest/ingestQualityChecks.test.ts,
// [SCN-PND-021]) and the --help documentation (packages/spec-controller/src/cli-registry.test.ts,
// [SCN-PND-021]). Reds today: the ingest edge reads no config, so `@deferred` is unrecognised and
// its integration obligation reconciles MISSING (out-of-balance), not a Pending Item.
const CONFIG_EXTENDS_FIXTURE = join(process.cwd(), "tests/fixtures/pending-tags/config-extends");

// The two reconciled rows of the config-extends target, keyed by fixture @SCN id.
let configuredScenario: ScenarioReconciliation | undefined;
let builtinScenario: ScenarioReconciliation | undefined;

Given(
  'a planted target repo whose package.json configures the deferral tag "@deferred", alongside a feature declaring a `@deferred @integration` scenario and a built-in `@wip @integration` one',
  function () {
    // The planted target repo (tests/fixtures/pending-tags/config-extends/) is the source; the
    // ingest→parse→reconcile happens in the When over its --features + --package-json.
  }
);

When(
  "the balance reconciler ingests the target — reading specController.deferralTags from its package.json and threading the extended set through the parser",
  function () {
    // Drive the REAL impure CLI core end-to-end: runReconcile resolves the input paths, reads
    // `specController.deferralTags` from the target package.json, unions it with the starter set, and
    // threads DEFAULT ∪ configured into parseScenarios. No result reports are supplied, so each
    // integration obligation is reconciled against no observation — deferred → a one-sided Pending
    // Item, or (without the config read) MISSING by absence.
    const reconciliation = runReconcile({
      features: join(CONFIG_EXTENDS_FIXTURE, "features"),
      packageJson: join(CONFIG_EXTENDS_FIXTURE, "package.json"),
    });
    configuredScenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-CFG-001");
    builtinScenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-CFG-002");
  }
);

Then(
  "the project-configured `@deferred` scenario's integration obligation is a Pending Item — deferred like a built-in, verdict balanced, no reconciling item",
  function () {
    // The configured `@deferred` tag defers through the full pipeline: the integration obligation
    // partitions to EXACTLY one one-sided Pending Item, the verdict is balanced, and no reconciling
    // item is named. Reds until the ingest edge reads specController.deferralTags and threads the
    // extended set (today `@deferred` is unrecognised → the obligation reconciles MISSING).
    assert.ok(configuredScenario, "expected the reconciled configured-tag row (SCN-CFG-001)");
    assert.deepEqual(
      configuredScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the @deferred scenario's integration obligation must be a Pending Item (config defers it like a built-in); got ${JSON.stringify(
        configuredScenario.pendingItems
      )}`
    );
    assert.equal(
      configuredScenario.verdict,
      "balanced",
      `the configured-tag scenario must be balanced (its only exception is a Pending Item); got "${configuredScenario.verdict}" (row: ${JSON.stringify(
        configuredScenario
      )})`
    );
    assert.deepEqual(
      configuredScenario.reconcilingItems,
      [],
      `no reconciling item may be named — the configured deferral makes the integration obligation a Pending Item, not a missing error; got ${JSON.stringify(
        configuredScenario.reconcilingItems
      )}`
    );
  }
);

Then(
  "the built-in `@wip` scenario still defers its integration obligation as a Pending Item — config extends the recognised set, never replaces it",
  function () {
    // Config EXTENDS, never replaces: the built-in `@wip` still defers alongside the configured
    // `@deferred` tag — a project cannot un-recognise `@wip`. Its integration obligation is also a
    // one-sided Pending Item, verdict balanced, no reconciling item.
    assert.ok(builtinScenario, "expected the reconciled built-in-tag row (SCN-CFG-002)");
    assert.deepEqual(
      builtinScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the built-in @wip scenario must still defer its integration obligation as a Pending Item (config extends, never replaces); got ${JSON.stringify(
        builtinScenario.pendingItems
      )}`
    );
    assert.equal(
      builtinScenario.verdict,
      "balanced",
      `the built-in-tag scenario must be balanced; got "${builtinScenario.verdict}" (row: ${JSON.stringify(
        builtinScenario
      )})`
    );
    assert.deepEqual(
      builtinScenario.reconcilingItems,
      [],
      `no reconciling item may be named — the built-in deferral makes the integration obligation a Pending Item; got ${JSON.stringify(
        builtinScenario.reconcilingItems
      )}`
    );
  }
);

// @SCN-PND-022 — INTERPRETATION 2: a deferred scenario declaring ZERO obligations (a bare `@wip`
// — @wip + @SCN, NO evidence tag) synthesises ONE scenario-scope Pending Item (a `qualityCheck`-
// less IOU) rather than reconciling BOTH-MISSING (out-of-balance). Proved through the REAL
// parse→reconcile→renderMarkdown pipeline over the PLANTED
// tests/fixtures/pending-tags/features/scenario-scope-no-obligations.feature. Never a real bare-
// `@wip` scenario in the scanned features/ corpus (fixture policy, evidence-manifesto §11B). The
// @unit arm (packages/core/src/parse/scenarios.test.ts + reconcile.test.ts, [SCN-PND-022]) proves
// the parse synthesis + the reconcile partition in isolation. Reds today: a bare `@wip` declares
// zero obligations → both-missing (out-of-balance), rendered as an em-dash, no ⏳ pending.
const NO_OBLIGATIONS_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/scenario-scope-no-obligations.feature"
);
let noObligationsReport: string;
let noObligationsRow: ScenarioReconciliation | undefined;

Given(
  "a planted fixture scenario carrying a bare `@wip` deferral tag and declaring no evidence obligations",
  function () {
    // The fixture (the bare-@wip scenario) is the source; parse+reconcile+render happens in the When.
  }
);

When(
  "the parser derives its obligations and the reconciler and renderer run the full pipeline over it",
  function () {
    // Feed the PLANTED bare-@wip fixture through the REAL parse→reconcile→renderMarkdown pipeline.
    // No observation is supplied: the synthesised scenario-scope pending obligation partitions to
    // one qualityCheck-less Pending Item, verdict balanced. renderMarkdown internally assembles the
    // report and renders it — the assemble→render surface under test.
    const source = readFileSync(NO_OBLIGATIONS_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    const rec = reconcile(scenarios, []);
    noObligationsRow = rec.scenarioReconciliations.find((r) => r.scnId === "SCN-PDX-001");
    const ctx: RunContext = {
      target: "no-obligations-fixture",
      inputs: {},
      runStart: new Date("2026-07-10T00:00:00.000Z"),
      sourceSha: null,
    };
    noObligationsReport = renderMarkdown(rec, ctx);
  }
);

Then(
  "the scenario synthesises one scenario-scope Pending Item and has verdict balanced — not the both-missing out-of-balance row",
  function () {
    const row = noObligationsRow;
    assert.ok(row, "expected the bare-@wip scenario to reconcile to a row");
    assert.equal(
      (row.pendingItems ?? []).length,
      1,
      `the bare-@wip scenario must synthesise exactly one scenario-scope Pending Item; got ${JSON.stringify(row.pendingItems)}`
    );
    assert.equal(
      row.pendingItems[0]!.qualityCheck,
      undefined,
      `the synthesised Pending Item is scenario-scope — no specific quality-check; got ${JSON.stringify(row.pendingItems[0])}`
    );
    assert.equal(
      row.verdict,
      "balanced",
      `a deferred scenario is balanced-with-pending, not out-of-balance; got "${row.verdict}" (row: ${JSON.stringify(row)})`
    );
    assert.equal(
      row.qualityCheckReconciliations.filter((o) => o.outcome === "both-missing").length,
      0,
      `the deferred scenario must NOT post a both-missing row; got ${JSON.stringify(row.qualityCheckReconciliations)}`
    );
  }
);

Then(
  "the rendered row shows a check-less `⏳ pending` marker — scenario-scope, naming no specific quality-check",
  function () {
    const row = rowFor(noObligationsReport, "SCN-PDX-001");
    // The scenario-scope Pending Item renders `⏳ pending` with NO `: <check>` suffix — distinct
    // from an obligation-scope `⏳ pending: <check>` and from a clean-balanced `—`.
    assert.match(
      row,
      /⏳ pending(?![:\w])/,
      `the scenario-scope Pending Item must render a check-less ⏳ pending; got: ${row}`
    );
    assert.doesNotMatch(
      row,
      /⏳ pending:/,
      `a scenario-scope Pending Item names no quality-check — no "pending: <check>"; got: ${row}`
    );
    assert.match(row, /✓ balanced/, `the deferred scenario reads balanced; got: ${row}`);
  }
);
