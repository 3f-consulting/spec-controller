/**
 * @SCN-LDG-025 (3F-1851) — a balanced fitness-only corpus keeps summary.outOfBalance AGREEING with
 * the balanced verdict.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the step markers carry the @SCN-LDG-025 id
 * matching features/ledger.feature, so a grep of the id returns both halves of the pair.
 *
 * The @integration arm drives the REAL parse→reconcile pipeline over a fixture corpus
 * (tests/fixtures/obligations-only/) whose ONLY fitness credit is one satisfied, CITATION-ROUTED
 * check: a stepless fitness scenario carries the bare `@obligations-only` tag, the target's
 * registry maps `lint:obligations-only` to it, and the run cites that scenario's @SCN. Nothing else
 * can mint a suspense row here, so there is none and summary.outOfBalance is 0, agreeing with the
 * balanced verdict. Under the rejected post-to-suspense treatment this corpus mints a spurious
 * out-of-balance suspense row (the 3F-1703 fault) — which this fixture is the only one to make
 * falsifiable.
 *
 * RE-POINTED, NOT RETIRED (3F-2620). The route to the single satisfied credit moved from the
 * retired named-guard match to the one posting rule; the coverage — the headline agreeing with the
 * verdict — is distinct from @SCN-LNT-008's (two scenarios sharing one check) and survives with it.
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

// @SCN-LDG-025
Given("a corpus whose only fitness credit is a citation-routed check, wired and green in CI", function () {
  // The obligations-only fixture: one STEPLESS fitness scenario (SCN-DEM-001) carrying the bare
  // check `@obligations-only`; a package.json whose `specController.checkRegistry` registers
  // `lint:obligations-only` as that check and whose `scripts` define it; a ci.yml running it. The
  // check exists and is enforced over the real source → satisfied, and its run cites SCN-DEM-001.
  // There is NO other credit shape, so nothing else can put a row out of balance.
  const fixture = join(process.cwd(), "tests/fixtures/obligations-only");
  obligationsOnlyLedger = runReconcile({
    features: join(fixture, "features"),
    ci: join(fixture, "ci.yml"),
    packageJson: join(fixture, "package.json"),
  });
});

// @SCN-LDG-025
When("the obligations-only corpus is reconciled", function () {
  // The reconcile happened in the Given (runReconcile builds the ledger); this marks the act
  // boundary for readability. No-op by design.
});

// @SCN-LDG-025
Then("the fitness scenario reconciles satisfied and the run is balanced", function () {
  const account = obligationsOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-DEM-001");
  assert.ok(account, "expected a ledger account for SCN-DEM-001; got none");
  const lint = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "lint");
  assert.ok(lint, `expected SCN-DEM-001 to carry a fitness reconciliation; got ${JSON.stringify(account.qualityCheckReconciliations)}`);
  assert.equal(lint.outcome, "satisfied", `expected the citation-routed check to reconcile satisfied; got "${lint.outcome}"`);
  assert.equal(account.verdict, "balanced", `expected SCN-DEM-001 balanced; got "${account.verdict}"`);
  assert.equal(isBalanced(obligationsOnlyLedger.ledger), true, "expected the whole run to be balanced");
});

// @SCN-LDG-025
Then("there is no suspense row, and summary.outOfBalance is 0 — agreeing with the balanced verdict", function () {
  // NO suspense row: the only fitness credit cites SCN-DEM-001, so nothing lands on `(no scenario)`.
  const suspense = obligationsOnlyLedger.ledger.scenarioReconciliations.find((r) => r.scnId === "(no scenario)");
  assert.equal(suspense, undefined, "expected NO suspense row — the only fitness credit cites its own fitness scenario");
  // The summary AGREES with the balanced verdict — the 3F-1703 identity. Under the rejected
  // post-to-suspense treatment a spurious out-of-balance suspense row would push this to 1 while
  // isBalanced stays true, and this assertion reds.
  const report = assembleRenderInput(obligationsOnlyLedger, OBLIGATIONS_ONLY_CTX);
  assert.equal(
    report.summary.scenarioReconciliations.outOfBalance,
    0,
    `expected summary.outOfBalance 0 agreeing with the balanced verdict; got ${report.summary.scenarioReconciliations.outOfBalance}`
  );
});
