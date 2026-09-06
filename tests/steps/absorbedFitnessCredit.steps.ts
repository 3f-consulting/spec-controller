/**
 * @integration for @SCN-LNT-013 / @SCN-LNT-014 — a fitness credit that reaches a REAL row and
 * answers nothing on it.
 *
 * Bidirectional evidence (Evidence Manifesto §9): each step block carries the @SCN it proves,
 * matching features/fitness-reconciliation.feature and the @unit pins in
 * packages/core/src/domain/absorbedFitnessCredit.test.ts.
 *
 * ITS OWN STEPS FILE rather than further steps in lintReconciliation.steps.ts: that file's fixtures
 * are built for the CITATION SEAM — a registry, a corpus, planted package.json and CI documents —
 * and this arm needs none of them. What it needs is a row and two credits, so reusing that
 * machinery would make the fixture harder to read than the rule it demonstrates.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import { evidenceReconciliationOf, isBalanced } from "@3f-consulting/spec-controller-core";
import type {
  EvidenceObservation,
  EvidenceReconciliation,
  Scenario,
  ScenarioReconciliation,
} from "@3f-consulting/spec-controller-core";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let scenarios: Scenario[];
let observations: EvidenceObservation[];
let reconciliation: EvidenceReconciliation;

/** A static-check credit citing a row, wired into CI over the real source unless told otherwise. */
function creditOf(scnId: string, checkTag: string, enforced = true): EvidenceObservation {
  return {
    qualityCheck: "lint",
    staticCheck: `lint:${checkTag}`,
    checkTag,
    scnId,
    exists: true,
    enforcedOverRealSource: enforced,
  };
}

function rowOf(scnId: string): ScenarioReconciliation {
  const row = reconciliation.ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  assert.ok(row, `expected a Ledger row for ${scnId}`);
  return row;
}

// @SCN-LNT-013
Given(
  "a fitness scenario {string} raises the check {string} and no other",
  function (scnId: string, check: string) {
    scenarios = [{ scnId, evidenceObligations: [{ qualityCheck: "lint", staticCheck: check }] }];
    observations = [];
  }
);

// @SCN-LNT-013
Given("a run of the check {string} cites {string}", function (check: string, scnId: string) {
  // The credit reaches a REAL row — the citation is right, the row exists. The only thing wrong is
  // that this check is not one that row owes.
  observations.push(creditOf(scnId, check));
});

// @SCN-LNT-013
When("that corpus and those runs are reconciled", function () {
  reconciliation = evidenceReconciliationOf(scenarios, observations, [], true, true);
});

// @SCN-LNT-013
Then(
  "the row {string} holds a no-evidence-obligation item naming the check {string}",
  function (scnId: string, check: string) {
    const item = rowOf(scnId).qualityCheckReconciliations.find((i) => i.staticCheck === check);
    assert.ok(item, `expected an item naming "${check}" on ${scnId} — the credit must not vanish`);
    assert.equal(item.outcome, "no-evidence-obligation");
    // CREDIT-ONLY: canon's (Obligation None, Observation Exists). The row never named this check,
    // so there is no debit for the item to carry.
    assert.equal(item.evidenceObligation, undefined);
    assert.ok(item.evidenceObservation !== undefined, "expected the citing credit on the item");
  }
);

// @SCN-LNT-013
Then(
  "the row's own {string} obligation reconciles beside it, untouched",
  function (check: string) {
    const item = rowOf("SCN-AAA-001").qualityCheckReconciliations.find(
      (i) => i.staticCheck === check
    );
    assert.ok(item, `expected the row's own "${check}" obligation to still reconcile`);
    assert.notEqual(item.outcome, "no-evidence-obligation");
    assert.ok(item.evidenceObligation !== undefined, "expected the debit on the row's own item");
  }
);

// @SCN-LNT-014
Given(
  "the {string} run cites {string} and is wired into CI over the real source",
  function (check: string, scnId: string) {
    observations.push(creditOf(scnId, check));
  }
);

// @SCN-LNT-014
Given(
  "a run of the check {string} cites {string} but CI does not run it",
  function (check: string, scnId: string) {
    // A GENUINE WATERMELON — the check exists and nothing runs it. Before the fix this credit was
    // absorbed by the row's own lint obligation and left no trace, so the tool reported a tree
    // containing an unwired check as balanced.
    observations.push(creditOf(scnId, check, false));
  }
);

// @SCN-LNT-014
Then(
  "the row {string} is out-of-balance over the stray credit alone",
  function (scnId: string) {
    const row = rowOf(scnId);
    // "Alone" is load-bearing: the row's own obligation is SATISFIED, so the only thing making this
    // row out-of-balance is the credit it never asked for. A fixture whose row was already red
    // would assert nothing here.
    assert.deepEqual(
      row.reconcilingItems.map((i) => `${i.staticCheck}=${i.outcome}`),
      ["typecheck=no-evidence-obligation"]
    );
    assert.equal(row.verdict, "out-of-balance");
  }
);

// @SCN-LNT-014
Then("the whole run reads out-of-balance", function () {
  // THE ONE THAT MATTERS. A row-level assertion alone would still pass if the roll-up dropped the
  // row; this is the reading the build's exit code is taken from.
  assert.equal(isBalanced(reconciliation.ledger), false);
});
