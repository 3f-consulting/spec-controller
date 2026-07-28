/**
 * @SCN-LDG-025 (3F-1851) — a demanded-guards-only corpus reconciles balanced.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the step markers carry the @SCN-LDG-025 id
 * matching features/ledger.feature, so a grep of the id returns both halves of the pair.
 *
 * The @integration arm drives the REAL parse→reconcile pipeline over a fixture corpus
 * (tests/fixtures/demanded-only/) whose ONLY lint credit is a satisfied demanded static guard.
 * The demanded-guard posting rule alone determines the verdict: the credit posts to its demanding
 * account, so there is no suspense row and summary.outOfBalance is 0, agreeing with the balanced
 * verdict. Under the rejected post-to-suspense treatment this corpus mints a spurious out-of-balance
 * suspense row (the 3F-1703 fault) — which this fixture finally makes falsifiable.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { join } from "node:path";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { assembleReport } from "../../packages/core/src/assemble/report.js";
import { isBalanced } from "../../packages/core/src/domain/ledger.js";
import type { Ledger } from "../../packages/core/src/model.js";
import type { RunContext } from "../../packages/core/src/provenance/provenance.js";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";

const DEMANDED_ONLY_CTX: RunContext = {
  target: "demanded-only",
  inputs: {},
  runStart: new Date("2026-07-20T00:00:00.000Z"),
  sourceSha: null,
};

let demandedOnlyLedger: EvidenceReconciliation;

// @SCN-LDG-025
Given("a corpus whose only lint credit is a demanded static guard, wired and green in CI", function () {
  // The demanded-only fixture: one scenario (SCN-DEM-001) declaring @lint=lint:demanded-only; a
  // ci.yml running lint:demanded-only; a package.json defining it. The static guard exists and is
  // enforced over the real source → satisfied. There is NO other credit shape, so nothing but the
  // demanded-guard path can determine the verdict.
  const fixture = join(process.cwd(), "tests/fixtures/demanded-only");
  demandedOnlyLedger = runReconcile({
    features: join(fixture, "features"),
    ci: join(fixture, "ci.yml"),
    packageJson: join(fixture, "package.json"),
  });
});

// @SCN-LDG-025
When("the demanded-only corpus is reconciled", function () {
  // The reconcile happened in the Given (runReconcile builds the ledger); this marks the act
  // boundary for readability. No-op by design.
});

// @SCN-LDG-025
Then("the demanding scenario reconciles satisfied and the run is balanced", function () {
  const account = demandedOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-DEM-001");
  assert.ok(account, "expected a ledger account for SCN-DEM-001; got none");
  const lint = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "lint");
  assert.ok(lint, `expected SCN-DEM-001 to carry a lint reconciliation; got ${JSON.stringify(account.qualityCheckReconciliations)}`);
  assert.equal(lint.outcome, "satisfied", `expected the demanded static guard to reconcile satisfied; got "${lint.outcome}"`);
  assert.equal(account.verdict, "balanced", `expected SCN-DEM-001 balanced; got "${account.verdict}"`);
  assert.equal(isBalanced(demandedOnlyLedger.ledger), true, "expected the whole run to be balanced");
});

// @SCN-LDG-025
Then("there is no suspense row, and summary.outOfBalance is 0 — agreeing with the balanced verdict", function () {
  // NO suspense row: the only lint credit is the demanded one, so nothing lands on `(no scenario)`.
  const suspense = demandedOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "(no scenario)");
  assert.equal(suspense, undefined, "expected NO suspense row — the only lint credit is the demanded static guard");
  // The summary AGREES with the balanced verdict — the 3F-1703 identity. Under the rejected
  // post-to-suspense treatment a spurious out-of-balance suspense row would push this to 1 while
  // isBalanced stays true, and this assertion reds.
  const report = assembleReport(demandedOnlyLedger, DEMANDED_ONLY_CTX);
  assert.equal(
    report.summary.scenarioReconciliations.outOfBalance,
    0,
    `expected summary.outOfBalance 0 agreeing with the balanced verdict; got ${report.summary.scenarioReconciliations.outOfBalance}`
  );
});
