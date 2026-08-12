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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  runReconcile,
  resolveCheckRegistry,
} from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import type { Ledger, ScenarioReconciliation } from "../../packages/core/src/model.js";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
// The `lint` quality-check carries two shapes since @SCN-CIP-003 (a static-check fact and a
// measurement), so a reader wanting a static check's own runnable handle asks for one.
import { isStaticCheckObservation } from "@3f-consulting/spec-controller-core/internal";

// @SCN-SSM-006
/** The static check whose own reconciliation this scenario pins. */
const OWN_STATIC_CHECK = "lint:scn-subissues";

/** The suspense scenario's account id: where a credit citing no scenario lands. */
const SUSPENSE_SCENARIO = "(no scenario)";

let ownLedger: EvidenceReconciliation;

// @SCN-SSM-006
const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
  ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

/**
 * The bare check tag this repository's own registry resolves the handle to (3F-2589).
 *
 * WHY THE NAMING SCENARIO IS NO LONGER A CONSTANT HERE. Under name-match this arm knew the
 * answer in advance: the scenario naming the check was the one that spelled the runnable handle
 * in the retired tag form, and that was this file's own @SCN-SSM-006. Under the one posting rule
 * the corpus names a check by a BARE tag, so WHICH scenario names it is the corpus's answer, and
 * restating it as a literal here would assert something the Gherkin does not say — "credited to
 * SCN-SSM-006" rather than "credited to the scenario that names it". Worse, the literal would go
 * quietly wrong the first time the fitness scenario moved or renumbered.
 *
 * So the account is found by its POSTED DEBIT — the account that raised the fitness Evidence
 * Obligation for this check — and the credit is then asserted onto that same account. That is
 * double-entry read as double-entry: debit side and credit side located independently, and the
 * assertion is that they meet.
 */
// @SCN-SSM-006
const ownCheckTag = (): string => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8")
  ) as Parameters<typeof resolveCheckRegistry>[0];
  const tag = resolveCheckRegistry(manifest).get(OWN_STATIC_CHECK);
  assert.ok(
    tag,
    `expected ${OWN_STATIC_CHECK} to be registered in specController.checkRegistry — an ` +
      `unregistered handle reaches no bare check tag, so no scenario can name it and its run ` +
      `posts to suspense.`
  );
  return tag;
};

// @SCN-SSM-006
const accountRaising = (ledger: Ledger, checkTag: string): ScenarioReconciliation | undefined =>
  ledger.scenarioReconciliations.find((r) =>
    // OBLIGATIONS, not observations — the predicate below is the debit's own shape and stays
    // spelled out. `isStaticCheckObservation` narrows the observation union and has no business
    // here; the two sides carry the bare check tag under the same field name and are otherwise
    // unrelated types.
    r.evidenceObligations.some((o) => o.qualityCheck === "lint" && o.staticCheck === checkTag)
  );

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
  const checkTag = ownCheckTag();
  const account = accountRaising(ownLedger.ledger, checkTag);
  assert.ok(
    account,
    `expected a Ledger account raising the fitness Evidence Obligation for "${checkTag}" — ` +
      `the scenario naming ${OWN_STATIC_CHECK}; got none. Without a stepless scenario ` +
      `carrying the bare @${checkTag} tag the check names no scenario and its run has ` +
      `nothing to settle against.`
  );

  const credit = account.evidenceObservations.find(
    (o) => isStaticCheckObservation(o) && o.staticCheck === OWN_STATIC_CHECK
  );
  assert.ok(
    credit,
    `expected ${OWN_STATIC_CHECK}'s run posted to ${account.scnId}'s account; got ` +
      `${JSON.stringify(account.evidenceObservations)}`
  );

  const lint = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "lint");
  assert.ok(
    lint,
    `expected ${account.scnId} to carry a lint reconciliation; got ` +
      `${JSON.stringify(account.qualityCheckReconciliations)}`
  );
  assert.equal(
    lint.outcome,
    "satisfied",
    `expected ${account.scnId}'s lint obligation to reconcile satisfied — the check ` +
      `exists AND is enforced over real source; got "${lint.outcome}"`
  );
});

// @SCN-SSM-006
Then("no static check run is left uncited on the suspense scenario", function () {
  const suspense = accountFor(ownLedger.ledger, SUSPENSE_SCENARIO);
  const uncitedStaticChecks = (suspense?.evidenceObservations ?? [])
    .filter(isStaticCheckObservation)
    .map((o) => o.staticCheck);

  assert.deepEqual(
    uncitedStaticChecks,
    [],
    `expected NO static check folded onto the suspense scenario — every running check is ` +
      `named by a stepless fitness scenario carrying its bare check tag; got uncited: ` +
      `${uncitedStaticChecks.join(", ")}`
  );
});
