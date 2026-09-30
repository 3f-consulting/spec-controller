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
  const fixture = join(process.cwd(), "tests/fixtures/obligations-only");
  obligationsOnlyLedger = runReconcile({
    features: join(fixture, "features"),
    ci: join(fixture, "ci.yml"),
    packageJson: join(fixture, "package.json"),
  });
});

When("the obligations-only corpus is reconciled", function () {
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
  const suspense = obligationsOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "(no scenario)");
  assert.equal(suspense, undefined, "expected NO suspense row — the only fitness credit cites its own fitness scenario");
  const report = assembleRenderInput(obligationsOnlyLedger, OBLIGATIONS_ONLY_CTX);
  assert.equal(
    report.summary.scenarioReconciliations.outOfBalance,
    0,
    `expected summary.outOfBalance 0 agreeing with the balanced verdict; got ${report.summary.scenarioReconciliations.outOfBalance}`
  );
});
