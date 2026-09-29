/**
 * A balanced fitness-only corpus keeps summary.outOfBalance AGREEING with the balanced verdict.
 *
 * The arm drives the REAL parse→reconcile pipeline over a fixture corpus
 * (tests/fixtures/obligations-only/) whose ONLY fitness credit is one satisfied, CITATION-ROUTED
 * check: a stepless `@fitness` scenario whose code the lint:obligations-only CI step carries as its
 * own `id:`, so the run cites that scenario directly. Nothing else can mint a suspense row here, so
 * there is none and summary.outOfBalance is 0, agreeing with the balanced verdict. Under the
 * rejected post-to-suspense treatment this corpus mints a spurious out-of-balance suspense row,
 * which this fixture is the only one to make falsifiable.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { join } from "node:path";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { assembleRenderInput } from "../../packages/core/src/assemble/renderInput.js";
import { isBalanced } from "../../packages/core/src/domain/ledger.js";
import type { Ledger } from "../../packages/core/src/model.js";
import type { RunContext } from "../../packages/core/src/provenance/provenance.js";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";

const OBLIGATIONS_ONLY_CTX: RunContext = {
  target: "obligations-only",
  inputs: {},
  runStart: new Date("2026-07-20T00:00:00.000Z"),
  sourceSha: null,
};

let obligationsOnlyLedger: EvidenceReconciliation;

Given("a corpus whose only fitness credit is a citation-routed check, wired and green in CI", function () {
  // The obligations-only fixture: one STEPLESS scenario carrying the `@fitness` tag; a
  // package.json whose `scripts` define its check; a ci.yml running that check with the scenario's
  // code as the step's own `id:`. The check exists and is enforced over the real source →
  // satisfied, and its run cites that scenario. There is NO other credit shape, so nothing else can
  // put a row out of balance.
  const fixture = join(process.cwd(), "tests/fixtures/obligations-only");
  obligationsOnlyLedger = runReconcile({
    features: join(fixture, "features"),
    ci: join(fixture, "ci.yml"),
    packageJson: join(fixture, "package.json"),
  });
});

When("the obligations-only corpus is reconciled", function () {
  // The reconcile happened in the Given (runReconcile builds the ledger); this marks the act
  // boundary for readability. No-op by design.
});

Then("the fitness scenario reconciles satisfied and the run is balanced", function () {
  const account = obligationsOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-DEM-001");
  assert.ok(account, "expected a ledger account for SCN-DEM-001; got none");
  const fitness = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "fitness");
  assert.ok(fitness, `expected SCN-DEM-001 to carry a fitness reconciliation; got ${JSON.stringify(account.qualityCheckReconciliations)}`);
  assert.equal(fitness.outcome, "satisfied", `expected the citation-routed check to reconcile satisfied; got "${fitness.outcome}"`);
  assert.equal(account.verdict, "balanced", `expected SCN-DEM-001 balanced; got "${account.verdict}"`);
  assert.equal(isBalanced(obligationsOnlyLedger.ledger), true, "expected the whole run to be balanced");
});

Then("there is no suspense row, and summary.outOfBalance is 0 — agreeing with the balanced verdict", function () {
  // NO suspense row: the only fitness credit cites its own scenario, so nothing lands on `(no scenario)`.
  const suspense = obligationsOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "(no scenario)");
  assert.equal(suspense, undefined, "expected NO suspense row — the only fitness credit cites its own fitness scenario");
  // The summary AGREES with the balanced verdict. Under the rejected
  // post-to-suspense treatment a spurious out-of-balance suspense row would push this to 1 while
  // isBalanced stays true, and this assertion reds.
  const report = assembleRenderInput(obligationsOnlyLedger, OBLIGATIONS_ONLY_CTX);
  assert.equal(
    report.summary.scenarioReconciliations.outOfBalance,
    0,
    `expected summary.outOfBalance 0 agreeing with the balanced verdict; got ${report.summary.scenarioReconciliations.outOfBalance}`
  );
});
