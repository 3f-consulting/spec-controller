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
 * tests/checks/lintScnSubIssuesCli.test.ts), and not a grep:
 * the assertion is the reconciliation OUTCOME over the real tree.
 *
 * THE CHECK CONVERTED AT 3F-3165, AND THE JOIN GOT SHORTER RATHER THAN LOOSER. It was a
 * discovered CI script whose run had to be joined back to a scenario through
 * `specController.checkRegistry` and then through the corpus; it is now a row of
 * `specController.fitnessChecks` naming SCN-FIT-010, and the credit arrives already citing.
 * So what is read off the tree is the ROW rather than the registry entry, and the credit
 * comes from the CI run's own step record rather than from script discovery.
 *
 * @SCN-SSM-006 — bidirectional evidence marker. Grepping SCN-SSM-006 returns the
 * scenario, this step block, and the @unit block in lintScnSubIssuesCli.test.ts.
 *
 * Parent: 3F-2366 (sub-issue 11 of 11 under 3F-2353, the balance sweep).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
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
let reportPath: string | undefined;

// @SCN-SSM-006
const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
  ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

/**
 * The configured row this repository gives the check, and the `@SCN` that row names.
 *
 * WHY THE NAMING SCENARIO IS NOT A CONSTANT HERE. Under name-match this arm knew the answer in
 * advance; under the one posting rule it had to read the registry for it; under conversion the
 * row states it outright. The discipline is unchanged and so is its reason: a literal
 * `SCN-FIT-010` typed here would assert "credited to SCN-FIT-010" rather than "credited to the
 * scenario that names it", and would go quietly wrong the first time the row was renumbered. So
 * it is READ OFF THE TREE, and the row is located by the COMMAND it runs — the one fact about
 * this check that a renumbering cannot move.
 */
// @SCN-SSM-006
const ownRow = (): { scn: string; characteristic: string } => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    specController?: {
      fitnessChecks?: { scn?: string; characteristic?: string; command?: string }[];
    };
  };
  const row = (manifest.specController?.fitnessChecks ?? []).find(
    (candidate) => candidate.command === `pnpm ${OWN_STATIC_CHECK}`
  );
  assert.ok(
    row?.scn !== undefined && row.characteristic !== undefined,
    `expected a specController.fitnessChecks row whose command runs ${OWN_STATIC_CHECK} — ` +
      `without one the check names no scenario at all, so its run has nothing to settle ` +
      `against and would post to suspense.`
  );
  return { scn: row.scn, characteristic: row.characteristic };
};

/**
 * A CI RUN'S STEP RECORD for this tree, DERIVED FROM THE REAL CORPUS rather than read off disk.
 *
 * WHY IT IS NOT THE FILE A RUN WRITES. The credit this arm is about rides the CI run's own record
 * of its steps, and that record is dumped by a step of the pipeline this scenario is running
 * INSIDE — so reading the file would read the previous run's record, or nothing at all in a fresh
 * clone, and on a developer's machine there is no pipeline and so no record at all. What is real
 * here is the corpus: it is the authored document the rows are reconciled against, and a pipeline
 * over this tree carries a step per row it holds. So the record is derived from the tree's own
 * corpus rather than curated beside it.
 *
 * EVERY STEP IS RECORDED AS HAVING SUCCEEDED, AND THAT IS THE STATEMENT THIS ARM NEEDS. The record
 * stands in for a run over this tree, and this scenario's own claim at the foot is that the row
 * names the scenario AND a run reported it — so the document has to say the checks RAN. An entry
 * whose outcome this reader has no reading for is broken evidence (@SCN-LNT-026), and a row the
 * record holds no entry for is broken too (@SCN-LNT-027), so a record standing in for a healthy
 * run has to carry every code the corpus does and say what each one did.
 */
// @SCN-SSM-006
const ciStepRecordPath = (): string => {
  const corpus = readFileSync(join(process.cwd(), "features/fitness-checks.feature"), "utf8");
  const codes = [...corpus.matchAll(/^ *@fitness @(SCN-[A-Z]+-\d+)\s*$/gm)].map((m) => m[1]!);
  assert.ok(
    codes.length > 0,
    "expected the fitness corpus to carry at least one @fitness scenario"
  );
  const record = Object.fromEntries(
    codes.map((code) => [code, { outcome: "success", conclusion: "success" }])
  );
  const dir = mkdtempSync(join(tmpdir(), "ssm006-ci-steps-"));
  const path = join(dir, "ci-steps.json");
  writeFileSync(path, JSON.stringify(record), "utf8");
  return path;
};

// @SCN-SSM-006
Given("the scn-subissues static check, wired over spec-controller's own source", function () {
  // No fixture — the reconcile below runs over the actual checked-out tree, which is what
  // makes this arm see real-source drift rather than a corpus curated to agree with it.
});

// @SCN-SSM-006
When("spec-controller's own tree is reconciled", function () {
  reportPath = ciStepRecordPath();
  ownLedger = runReconcile({
    features: join(process.cwd(), "features"),
    ci: join(process.cwd(), ".github/workflows/ci.yml"),
    packageJson: join(process.cwd(), "package.json"),
    ciSteps: reportPath,
  });
});

// @SCN-SSM-006
Then("the check's run is credited to the scenario that names it", function () {
  const { scn, characteristic } = ownRow();
  const account = accountFor(ownLedger.ledger, scn);
  assert.ok(
    account,
    `expected a Ledger account for ${scn} — the scenario the row naming ${OWN_STATIC_CHECK} ` +
      `points at; got none. Without a scenario carrying that code the check names ` +
      `nothing and its run has no Evidence Obligation to settle against.`
  );

  // OBLIGATIONS, not observations — the debit side's own shape, spelled out. The two sides carry
  // the characteristic under the same field name and are otherwise unrelated types.
  assert.ok(
    account.evidenceObligations.some(
      (o) => o.qualityCheck === "lint" && o.staticCheck === characteristic
    ),
    `expected ${scn} to raise the fitness Evidence Obligation for "${characteristic}"; got ` +
      `${JSON.stringify(account.evidenceObligations)}`
  );

  const credit = account.evidenceObservations.find(
    (o) => isStaticCheckObservation(o) && o.staticCheck === characteristic
  );
  assert.ok(
    credit,
    `expected the converted run's credit posted to ${scn}'s account; got ` +
      `${JSON.stringify(account.evidenceObservations)}`
  );

  const lint = account.qualityCheckReconciliations.find((r) => r.qualityCheck === "lint");
  assert.ok(
    lint,
    `expected ${scn} to carry a lint reconciliation; got ` +
      `${JSON.stringify(account.qualityCheckReconciliations)}`
  );
  assert.equal(
    lint.outcome,
    "satisfied",
    `expected ${scn}'s lint obligation to reconcile satisfied — the row names the scenario AND ` +
      `a pass over this tree reported it; got "${lint.outcome}"`
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
    `expected NO static check folded onto the suspense scenario — every check that runs is ` +
      `named, by a configured row or by a scenario carrying its bare check tag; got uncited: ` +
      `${uncitedStaticChecks.join(", ")}`
  );

  if (reportPath !== undefined) {
    rmSync(join(reportPath, ".."), { recursive: true, force: true });
    reportPath = undefined;
  }
});
