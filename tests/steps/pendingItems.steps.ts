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
import { parseScenarios, reconcile } from "@3f-consulting/spec-controller-core";
import type {
  Scenario,
  EvidenceObligation,
  EvidenceReconciliation,
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
