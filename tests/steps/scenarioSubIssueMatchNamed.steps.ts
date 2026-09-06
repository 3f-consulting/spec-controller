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
 * THE CHECK CONVERTED AT 3F-3165, AND THE JOIN GOT SHORTER RATHER THAN LOOSER. It was a
 * discovered CI script whose run had to be joined back to a scenario through
 * `specController.checkRegistry` and then through the corpus; it is now a row of
 * `specController.fitnessChecks` naming SCN-FIT-010, and the credit arrives already citing.
 * So what is read off the tree is the ROW rather than the registry entry, and the credit
 * comes from the fitness pass's report rather than from script discovery.
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
 * The fitness pass's report, DERIVED FROM THE REAL GENERATED CORPUS rather than read off disk.
 *
 * WHY IT IS NOT THE FILE THE PASS WRITES. The credit this arm is about rides the fitness cucumber
 * report, and that report is written by a gate that runs AFTER the one this scenario runs in — so
 * reading the file would read the PREVIOUS run's report, or nothing at all in a fresh clone. What
 * is real here is the corpus: every scenario in it is emitted from a row of this repository's own
 * manifest, and a fitness pass over this tree reports exactly those. So the report is derived from
 * the tree's own corpus, which is the document the pass itself reads.
 *
 * NO STEP STATUS IS WRITTEN, and that is not an omission. `convertedFitnessCredits` reads none:
 * the credit is about the wiring, and the exit code is about the findings.
 */
// @SCN-SSM-006
const fitnessReportPath = (): string => {
  const corpus = readFileSync(join(process.cwd(), "features/fitness-checks.feature"), "utf8");
  const codes = [...corpus.matchAll(/^ *@fitness @(SCN-[A-Z]+-\d+)\s*$/gm)].map((m) => m[1]!);
  assert.ok(
    codes.length > 0,
    "expected the generated fitness corpus to carry at least one @fitness scenario"
  );
  const report = [
    {
      uri: "features/fitness-checks.feature",
      elements: codes.map((code) => ({
        tags: [{ name: "@fitness" }, { name: `@${code}` }],
        steps: [],
      })),
    },
  ];
  const dir = mkdtempSync(join(tmpdir(), "ssm006-fitness-"));
  const path = join(dir, "fitness.json");
  writeFileSync(path, JSON.stringify(report), "utf8");
  return path;
};

// @SCN-SSM-006
Given("the scn-subissues static check, wired over spec-controller's own source", function () {
  // No fixture — the reconcile below runs over the actual checked-out tree, which is what
  // makes this arm see real-source drift rather than a corpus curated to agree with it.
});

// @SCN-SSM-006
When("spec-controller's own tree is reconciled", function () {
  reportPath = fitnessReportPath();
  ownLedger = runReconcile({
    features: join(process.cwd(), "features"),
    ci: join(process.cwd(), ".github/workflows/ci.yml"),
    packageJson: join(process.cwd(), "package.json"),
    fitness: reportPath,
  });
});

// @SCN-SSM-006
Then("the check's run is credited to the scenario that names it", function () {
  const { scn, characteristic } = ownRow();
  const account = accountFor(ownLedger.ledger, scn);
  assert.ok(
    account,
    `expected a Ledger account for ${scn} — the scenario the row naming ${OWN_STATIC_CHECK} ` +
      `points at; got none. Without a generated scenario carrying that code the check names ` +
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
