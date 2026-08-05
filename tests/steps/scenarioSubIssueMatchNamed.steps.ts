/**
 * Step definitions for the @SCN-SSM-006 self-reconciliation arm of
 * features/scenario-sub-issue-match.feature — the check's own run reconciling on
 * spec-controller's OWN Ledger rather than folding onto the suspense scenario as an
 * uncited static check.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL reconcile pipeline —
 * `runReconcile` over spec-controller's own features/ + .github/workflows/ci.yml +
 * package.json — and reads the posting off the resulting Ledger. Not a re-run of the
 * observers in isolation (that is the @unit arm, in
 * packages/spec-controller/static-checks/lintScnSubIssuesCli.test.ts), and not a grep:
 * the assertion is the reconciliation OUTCOME over the real tree.
 *
 * @SCN-SSM-006 — bidirectional evidence marker. Grepping SCN-SSM-006 returns the
 * scenario, this step block, and the @unit block in lintScnSubIssuesCli.test.ts.
 *
 * Parent: 3F-2366 (sub-issue 11 of 11 under 3F-2353, the balance sweep).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { join } from "node:path";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import type { Ledger, ScenarioReconciliation } from "../../packages/core/src/model.js";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";

// @SCN-SSM-006
/** The static check whose own reconciliation this scenario pins. */
const OWN_STATIC_CHECK = "lint:scn-subissues";

/** The scenario that NAMES it — this very scenario, the self-reconciliation. */
const NAMING_SCENARIO = "SCN-SSM-006";

/** The suspense scenario's account id: where a credit citing no scenario lands. */
const SUSPENSE_SCENARIO = "(no scenario)";

let ownLedger: EvidenceReconciliation;

// @SCN-SSM-006
const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
  ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

// @SCN-SSM-006
Given("the scn-subissues static check, wired over spec-controller's own source", function () {
  // No fixture — the reconcile below runs over the actual checked-out tree, which is what
  // makes this arm see real-source drift rather than a corpus curated to agree with it.
});

// @SCN-SSM-006
When("spec-controller's own tree is reconciled", function () {
  ownLedger = runReconcile({
    features: join(process.cwd(), "features"),
    ci: join(process.cwd(), ".github/workflows/ci.yml"),
    packageJson: join(process.cwd(), "package.json"),
  });
});

// @SCN-SSM-006
Then("the check's run is credited to the scenario that names it", function () {
  const account = accountFor(ownLedger.ledger, NAMING_SCENARIO);
  assert.ok(
    account,
    `expected a Ledger account for ${NAMING_SCENARIO} — the scenario naming ` +
      `${OWN_STATIC_CHECK}; got none. Without the @lint=${OWN_STATIC_CHECK} tag the check ` +
      `names no scenario and its run has nothing to settle against.`
  );

  const credit = account.evidenceObservations.find(
    (o) => o.qualityCheck === "lint" && o.staticCheck === OWN_STATIC_CHECK
  );
  assert.ok(
    credit,
    `expected ${OWN_STATIC_CHECK}'s run posted to ${NAMING_SCENARIO}'s account; got ` +
      `${JSON.stringify(account.evidenceObservations)}`
  );

  const lint = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "lint");
  assert.ok(
    lint,
    `expected ${NAMING_SCENARIO} to carry a lint reconciliation; got ` +
      `${JSON.stringify(account.qualityCheckReconciliations)}`
  );
  assert.equal(
    lint.outcome,
    "satisfied",
    `expected ${NAMING_SCENARIO}'s lint obligation to reconcile satisfied — the check ` +
      `exists AND is enforced over real source; got "${lint.outcome}"`
  );
});

// @SCN-SSM-006
Then("no static check run is left uncited on the suspense scenario", function () {
  const suspense = accountFor(ownLedger.ledger, SUSPENSE_SCENARIO);
  const uncitedStaticChecks = (suspense?.evidenceObservations ?? [])
    .filter((o) => o.qualityCheck === "lint")
    .map((o) => o.staticCheck);

  assert.deepEqual(
    uncitedStaticChecks,
    [],
    `expected NO static check folded onto the suspense scenario — every running check is ` +
      `named by an @lint tag; got uncited: ${uncitedStaticChecks.join(", ")}`
  );
});
