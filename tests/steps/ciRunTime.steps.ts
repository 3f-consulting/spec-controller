/**
 * @integration for features/ci-run-time.feature — the MEASURED fitness check axis: an obligation
 * that carries a number, a credit that is a number, and the reconciliation between them.
 *
 * Bidirectional evidence (Evidence Manifesto §9): each step block below carries the @SCN it
 * proves, matching the feature file's scenarios and the @unit pins in
 * packages/core/src/parse/measuredObligations.test.ts and
 * packages/core/src/domain/thresholds.test.ts.
 *
 * WHY @integration AND NOT @unit ALONE. The @unit pins prove each rule in isolation; these steps
 * exercise the same rules through the seam that composes them — a target's manifest read into a
 * threshold registry, the corpus read against it, and the reconciler handed both. The two readings
 * disagreeing is exactly the fault worth catching: a rule that is right on its own and wired to
 * the wrong input reads green at unit and wrong on the ledger.
 *
 * The threshold registry is core-INTERNAL (where this configuration is authored is still
 * settling — the same question `checkRegistryOf` is parked on), so it is reached by source path
 * rather than through the frozen v1 barrel.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import {
  parseScenarios,
  reconcile,
  evidenceReconciliationOf,
  renderMarkdown,
  renderJson,
} from "@3f-consulting/spec-controller-core";
import type {
  Scenario,
  Ledger,
  ScenarioReconciliation,
  RunContext,
} from "@3f-consulting/spec-controller-core";

import {
  thresholdsOf,
  measuredCheckTags,
  parseMeasuredEvidenceObservations,
  type ThresholdRegistry,
  type MeasuredEvidenceObservation,
} from "@3f-consulting/spec-controller-core/internal";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).

/** The target's authored ceilings, as its manifest holds them — @SCN, then bare check tag. */
let thresholds: ThresholdRegistry;

/** The corpus source the obligation rule is read over. */
let corpusSource: string;

/** What the corpus raised. */
let raised: Scenario[];

/**
 * The corpus the fixture builds, one stepless scenario at a time.
 *
 * Held as a list rather than as one string so a scenario needing TWO stepless rows (@SCN-CIP-007)
 * appends rather than rewrites — corpus ORDER is load-bearing on the static axis, and this axis's
 * whole claim is that it is NOT load-bearing here, which can only be shown over a corpus that has
 * an order to be indifferent to.
 */
let steplessRows: string[];

/** Compose the accumulated stepless rows into one feature source. */
function corpusOf(rows: readonly string[]): string {
  return `@MSD
Feature: measured

  Rule: the suites complete within their CI thresholds

${rows.join("\n")}`;
}

// @SCN-CIP-001
Given(
  "{string} is a measured fitness check whose threshold for {string} is {int}",
  function (check: string, scnId: string, ceiling: number) {
    // The DEBIT-side authoring, and the only place the ceiling comes from. The measurement the
    // credit carries is a number and nothing else: a runner that supplied both the number and the
    // bar it was judged against would be grading its own homework.
    thresholds = thresholdsOf({ [scnId]: { [check]: ceiling } });
    steplessRows = [];
  }
);

// @SCN-CIP-001
Given(
  "the corpus carries a stepless scenario {string} tagged with the bare check {string}",
  function (scnId: string, check: string) {
    steplessRows.push(
      `    @${check} @${scnId}\n    Scenario: the suite completes within its CI threshold\n`
    );
    corpusSource = corpusOf(steplessRows);
  }
);

// @SCN-CIP-001
When("the measured corpus is read", function () {
  // The obligation-raising tag set is the UNION of the registry's tags and the measured ones. Here
  // the registry contributes none — a measured check has no runnable handle to be registered under
  // — so this arm reads the measured half alone, which is the half that did not exist before.
  raised = parseScenarios(corpusSource, [], measuredCheckTags(thresholds), thresholds);
});

// @SCN-CIP-001
Then(
  "that scenario raises exactly one Evidence Obligation, naming the measured check {string}",
  function (check: string) {
    assert.equal(raised.length, 1, `expected one scenario; got ${JSON.stringify(raised)}`);
    const obligations = raised[0]!.evidenceObligations;
    assert.equal(
      obligations.length,
      1,
      `expected exactly one Evidence Obligation; got ${JSON.stringify(obligations)}`
    );
    assert.equal(obligations[0]!.qualityCheck, "lint");
    assert.equal(obligations[0]!.staticCheck, check);
    assert.equal(obligations[0]!.measured, true);
  }
);

// @SCN-CIP-001
Then("that Evidence Obligation carries the threshold {int}", function (ceiling: number) {
  // The clause the whole debit side exists for. Without it the ledger would hold a check's NAME
  // and no rule, and the only thing left able to say whether a measurement passed would be the
  // thing that produced it.
  assert.equal(raised[0]!.evidenceObligations[0]!.threshold, ceiling);
});

// ---------------------------------------------------------------------------
// @SCN-CIP-003 — the CREDIT side: the timing wrapper's artefact read into citing observations.
// ---------------------------------------------------------------------------

/** The artefact as the wrapper writes it, built row by row across the Given steps. */
let timingArtefact: { measurements: unknown[] } | undefined;

/** What the reader produced from it. */
let measurements: MeasuredEvidenceObservation[];

// @SCN-CIP-003
Given(
  "the timing artefact records a measurement of {float} for {string} on {string}",
  function (measured: number, check: string, scnId: string) {
    timingArtefact = { measurements: [{ scnId, checkTag: check, measured }] };
  }
);

// @SCN-CIP-003
Given("the timing artefact also carries a row missing its check", function () {
  // The tolerant read, exercised alongside the good row rather than alone: an artefact whose bad
  // row cost the whole verdict would be loud nowhere, and the assertion below is "exactly one"
  // precisely so the drop is proven rather than assumed.
  timingArtefact!.measurements.push({ scnId: "SCN-MSD-002", measured: 12.5 });
});

// @SCN-CIP-003
When("the timing artefact is ingested", function () {
  measurements = parseMeasuredEvidenceObservations(timingArtefact ?? { measurements: [] });
});

// @SCN-CIP-003
Then(
  "exactly one Evidence Observation is produced, citing {string} and naming the check {string}",
  function (scnId: string, check: string) {
    assert.equal(
      measurements.length,
      1,
      `expected exactly one observation; got ${JSON.stringify(measurements)}`
    );
    assert.equal(measurements[0]!.qualityCheck, "lint");
    assert.equal(measurements[0]!.scnId, scnId);
    // BOTH terms, because neither is an address on its own (@SCN-LNT-012): the @SCN says which row
    // the credit posts to, the check tag says which of that row's obligations it answers.
    assert.equal(measurements[0]!.checkTag, check);
  }
);

// @SCN-CIP-003
Then("it carries the measurement {float}", function (measured: number) {
  assert.equal(measurements[0]!.measured, measured);
});

// ---------------------------------------------------------------------------
// @SCN-CIP-004 — the reconciliation: an obligation holding a ceiling, met by a number.
// ---------------------------------------------------------------------------

/** The Ledger the corpus and the measurements reconciled to. */
let ledger: Ledger;

/** The row this scenario is about, looked up once by the Then steps. */
function rowOf(scnId: string): ScenarioReconciliation {
  const row = ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  assert.ok(row, `expected a Ledger row for ${scnId}; got ${JSON.stringify(ledger.scenarioReconciliations.map((r) => r.scnId))}`);
  return row;
}

/** The reconciling item (or satisfied sub-row) this row holds for a given measured check. */
function itemFor(scnId: string, check: string) {
  const item = rowOf(scnId).qualityCheckReconciliations.find((r) => r.staticCheck === check);
  assert.ok(item, `expected a quality-check reconciliation for "${check}" on ${scnId}`);
  return item;
}

// @SCN-CIP-004
When("the corpus and the measurements are reconciled", function () {
  // The WHOLE seam in one step: the corpus read against the target's ceilings, the artefact read
  // into citing credits, and the reconciler handed both. The @unit pins prove each rule alone;
  // this is where a rule wired to the wrong input would show, and nowhere else.
  ledger = reconcile(
    parseScenarios(corpusSource, [], measuredCheckTags(thresholds), thresholds),
    parseMeasuredEvidenceObservations(timingArtefact ?? { measurements: [] })
  );
});

// @SCN-CIP-004
Then(
  "the row {string} reconciles satisfied on the measured check {string}",
  function (scnId: string, check: string) {
    assert.equal(itemFor(scnId, check).outcome, "satisfied");
    assert.equal(rowOf(scnId).verdict, "balanced");
  }
);

// @SCN-CIP-004
Then("that reconciling item carries both the measurement and the threshold", function () {
  // Both numbers on one item is what makes an out-of-balance row actionable: "over its threshold"
  // sends a reader nowhere, "96.4 against 75" sends them somewhere.
  const item = itemFor("SCN-MSD-001", "ci-run-time");
  assert.ok(item.evidenceObligation?.threshold !== undefined, "expected the ceiling on the debit");
  assert.ok(item.evidenceObservation !== undefined, "expected the measurement on the credit");
});

// @SCN-CIP-005
Then(
  "the row {string} reconciles failing on the measured check {string}",
  function (scnId: string, check: string) {
    assert.equal(itemFor(scnId, check).outcome, "failing");
  }
);

// @SCN-CIP-005
Then("the row is out-of-balance", function () {
  // Asserted, not assumed. `failing` is already in OUT_OF_BALANCE_OUTCOMES, so nothing about the
  // roll-up is special-cased for this axis — which is exactly why a route that produced the outcome
  // and failed to reach the verdict would be invisible: the outcome would be right and the run
  // would still be green.
  assert.equal(rowOf("SCN-MSD-001").verdict, "out-of-balance");
});

// @SCN-CIP-006
Given("no timing artefact was produced at all", function () {
  // ABSENT, not empty. A missing artefact is tolerated exactly as a missing vitest report is — the
  // reader contributes nothing rather than throwing — so the fault surfaces as the obligation it
  // leaves unanswered rather than as a read error, which would say "the run is broken" when what
  // happened is "the step never ran".
  timingArtefact = undefined;
});

// @SCN-CIP-006
Then(
  "the row {string} reconciles missing on the measured check {string}",
  function (scnId: string, check: string) {
    assert.equal(itemFor(scnId, check).outcome, "missing");
  }
);

// @SCN-CIP-006
Then("that reconciling item carries no measurement at all", function () {
  // (Obligation Exists, Observation None) — the canon side-profile for `missing`, which the smart
  // constructor enforces. Asserted because the whole point of the outcome is that nothing was
  // observed: an item holding evidence while claiming none would be a contradiction the renderer
  // would then have to interpret.
  assert.equal(itemFor("SCN-MSD-001", "ci-run-time").evidenceObservation, undefined);
});

// @SCN-CIP-002
Then("the obligation on row {string} names no threshold at all", function (scnId: string) {
  // The fact is on the row's DATA, not inferred by a reader: the obligation is visibly measured
  // with no ceiling, sitting next to every other measured obligation that has one. That is what
  // lets the renderer say "no threshold configured" rather than leave a blank a reader has to
  // interpret (@SCN-CIP-008), and it is why the two fields are separate on the obligation.
  const item = itemFor(scnId, "ci-run-time");
  assert.equal(item.evidenceObligation?.measured, true);
  assert.equal(item.evidenceObligation?.threshold, undefined);
  assert.notEqual(item.outcome, "satisfied");
});

// @SCN-CIP-007
Given(
  "{string} also has a threshold of {int} for {string}",
  function (check: string, ceiling: number, scnId: string) {
    // A SECOND ceiling under the same characteristic — canon's own arrangement for this tag, and
    // the arrangement the static axis calls a corpus fault. Merged into the registry the first
    // Given built rather than replacing it, because the point is that BOTH survive.
    const merged: Record<string, Record<string, number>> = {};
    for (const [scn, ceilings] of thresholds) {
      merged[scn] = Object.fromEntries(ceilings);
    }
    merged[scnId] = { ...(merged[scnId] ?? {}), [check]: ceiling };
    thresholds = thresholdsOf(merged);
  }
);

// @SCN-CIP-007
Given(
  "the timing artefact also records a measurement of {float} for {string} on {string}",
  function (measured: number, check: string, scnId: string) {
    timingArtefact!.measurements.push({ scnId, checkTag: check, measured });
  }
);

// ---------------------------------------------------------------------------
// @SCN-CIP-008 — the render: a posting nobody renders is a posting nobody reads.
// ---------------------------------------------------------------------------

/** The two renderings of the same reconciliation. */
let markdown: string;
let json: string;

/**
 * A RunContext fixture — the sibling provenance argument the renderers require. These
 * assertions are scoped to the measured row's own cell, so the provenance header above them is
 * irrelevant to what they claim.
 */
const CIP_CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

// @SCN-CIP-008
When("the corpus and the measurements are reconciled and rendered", function () {
  const reconciliation = evidenceReconciliationOf(
    parseScenarios(corpusSource, [], measuredCheckTags(thresholds), thresholds),
    parseMeasuredEvidenceObservations(timingArtefact ?? { measurements: [] })
  );
  ledger = reconciliation.ledger;
  markdown = renderMarkdown(reconciliation, CIP_CTX);
  json = renderJson(reconciliation, CIP_CTX);
});

// @SCN-CIP-008
Then(
  "the markdown names the check {string} with its measurement {float} and its threshold {float}",
  function (check: string, measured: number, ceiling: number) {
    // The assertion is deliberately stronger than "the row is present". A row reading
    // "ci-run-time: failing" and nothing else would pass a presence check while telling a reader
    // nothing they can act on, which is the whole failure this scenario exists to be stronger than.
    // Scoped to the Scenario Reconciliations ledger: the report also carries a per-check summary
    // table whose first cells are the same @SCN and the same check tag, so a whole-report search
    // would find that row instead and the assertions would be about a different cut of the fact.
    const start = markdown.indexOf("## Scenario Reconciliations");
    const ledgerSection = start >= 0 ? markdown.slice(start) : markdown;
    const line = ledgerSection.split("\n").find((l) => l.startsWith("| SCN-MSD-001 "));
    assert.ok(line, `expected a ledger row for SCN-MSD-001`);
    assert.ok(line.includes(check), `expected the check ${check} in: ${line}`);
    assert.ok(line.includes(String(measured)), `expected the measurement ${measured} in: ${line}`);
    assert.ok(line.includes(String(ceiling)), `expected the threshold ${ceiling} in: ${line}`);
  }
);

// @SCN-CIP-008
Then("the JSON carries the measurement and the threshold on the row's own entries", function () {
  // Through the EXISTING serialisation — the ceiling rides the obligation, the measurement rides
  // the observation — rather than through a parallel measured-only field. That is what keeps the
  // no-parallel-store round-trip true: every summary re-folds from the serialised Ledger, so a
  // field that failed to serialise would break it somewhere far from here.
  const report = JSON.parse(json) as unknown;
  const serialised = JSON.stringify(report);
  assert.ok(serialised.includes('"threshold":75'), "expected the ceiling in the serialised report");
  assert.ok(serialised.includes('"measured":96.4'), "expected the measurement in the serialised report");
});
