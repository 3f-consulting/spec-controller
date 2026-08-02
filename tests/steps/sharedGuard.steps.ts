/**
 * @SCN-LDG-024 (3F-1850) — a static check named by TWO scenarios posts to EACH.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the step markers carry the @SCN-LDG-024 id
 * matching features/ledger.feature, so a grep of the id returns both halves of the pair.
 *
 * The @integration arm drives the REAL parse→reconcile pipeline over a fixture corpus
 * (tests/fixtures/shared-guard/) whose ci.yml runs `lint:double-obligation`, whose package.json
 * defines it, and whose two scenarios BOTH declare @lint=lint:double-obligation. One static check's
 * run is evidence for both naming scenarios: the credit posts to each naming account, and both
 * reconcile satisfied — the multi-obligation instance of the posting invariant (@SCN-LDG-022), the
 * case no corpus exercised.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { join } from "node:path";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import type { Ledger, ScenarioReconciliation } from "../../packages/core/src/model.js";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";

let sharedGuardLedger: EvidenceReconciliation;

const sharedAccountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
  ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

// @SCN-LDG-024
Given("two scenarios that each name the same static check by @lint, wired and green in CI", function () {
  // The shared-guard fixture: two scenarios (SCN-SHR-001, SCN-SHR-002) both declaring
  // @lint=lint:double-obligation; a ci.yml that RUNS lint:double-obligation; a package.json that
  // DEFINES it. So the static check exists and is enforced over the real source — wired-and-green.
  const fixture = join(process.cwd(), "tests/fixtures/shared-guard");
  sharedGuardLedger = runReconcile({
    features: join(fixture, "features"),
    ci: join(fixture, "ci.yml"),
    packageJson: join(fixture, "package.json"),
  });
});

// @SCN-LDG-024
When("the shared-guard corpus is reconciled", function () {
  // The reconcile happened in the Given (runReconcile builds the ledger); this step marks the
  // act boundary for the scenario's readability. No-op by design.
});

// @SCN-LDG-024
Then("both naming scenarios' lint obligations reconcile satisfied", function () {
  for (const scnId of ["SCN-SHR-001", "SCN-SHR-002"]) {
    const account = sharedAccountFor(sharedGuardLedger.ledger, scnId);
    assert.ok(account, `expected a ledger account for ${scnId}; got none`);
    const lint = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "lint");
    assert.ok(lint, `expected ${scnId} to carry a lint reconciliation; got ${JSON.stringify(account.qualityCheckReconciliations)}`);
    assert.equal(
      lint.outcome,
      "satisfied",
      `expected ${scnId}'s lint obligation to reconcile satisfied (the static check is wired + enforced); got "${lint.outcome}"`
    );
  }
  // A NAMED static check is never suspense — there is no undemanded guard in this corpus.
  assert.equal(
    sharedAccountFor(sharedGuardLedger.ledger, "(no scenario)"),
    undefined,
    "expected NO suspense row — the only lint credit is the named static check"
  );
});

// @SCN-LDG-024
Then("the one static-check credit is findable on each naming account, one object on both", function () {
  const a1 = sharedAccountFor(sharedGuardLedger.ledger, "SCN-SHR-001");
  const a2 = sharedAccountFor(sharedGuardLedger.ledger, "SCN-SHR-002");
  const c1 = a1?.evidenceObservations.find((o) => o.qualityCheck === "lint" && o.staticCheck === "lint:double-obligation");
  const c2 = a2?.evidenceObservations.find((o) => o.qualityCheck === "lint" && o.staticCheck === "lint:double-obligation");
  assert.ok(c1, "expected the static-check credit findable on SCN-SHR-001's account");
  assert.ok(c2, "expected the static-check credit findable on SCN-SHR-002's account");
  // BY REFERENCE — the SAME observation object on each account, not a copy. A copy would
  // double-count the moment anything folds over the flat stream (3F-1831 census).
  assert.equal(c1, c2, "expected ONE object posted by reference to both accounts, not two copies");
});
