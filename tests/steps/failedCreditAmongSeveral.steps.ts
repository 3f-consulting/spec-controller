/**
 * Step definitions for an evidence obligation answered by several credits that disagree (3F-3547):
 * @SCN-LDG-036 and @SCN-LDG-037 (features/ledger.feature), @SCN-LNT-036, @SCN-LNT-037 and
 * @SCN-LNT-038 (features/fitness-reconciliation.feature).
 *
 * The runtime arms: the REAL built CLI runs over the evidence-order fixture corpus (one scenario, SCN-TGT-001, raising
 * unit and integration) with a vitest report each Given writes, and everything is read back off the
 * exit code and the persisted spec-reconciliation.json.
 *
 * The static arm goes through the published engine's barrel instead, because no reader this CLI
 * runs delivers two credits with a verdict for one row and check: the CI run's record is keyed by
 * step code and a configured row by its code (measured at 3F-3547's Analysis).
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isBalanced, reconcile } from "@3f-consulting/spec-controller-core";
import type { EvidenceObservation, Ledger, Scenario } from "@3f-consulting/spec-controller-core";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = "tests/fixtures/evidence-order";
const SCN = "SCN-TGT-001";

interface Assertion {
  fullName: string;
  status: "passed" | "failed";
}
interface Credit {
  locator?: string;
  status?: string;
}
interface Item {
  qualityCheck: string;
  outcome: string;
  evidenceObservation?: Credit;
}
interface Report {
  ledger: { scenarioReconciliations: Array<{ scnId: string; verdict: string; qualityCheckReconciliations: Item[] }> };
}
interface Run {
  exitCode: number | null;
  report: Report;
}

let workDir: string;
let vitestReports: string[] = [];
let runs: Run[] = [];
/** The file and status of the credit a correct reading names: the failed one. */
let failedCredit: string;

function writeVitestReport(name: string, testResults: Array<{ name: string; assertionResults: Assertion[] }>): string {
  const path = join(workDir, name);
  writeFileSync(path, JSON.stringify({ testResults }));
  return path;
}

const cite = (label: string, status: Assertion["status"]): Assertion => ({ fullName: `[${SCN}] ${label}`, status });

// @SCN-LDG-036
Given(
  "a runner report citing one scenario from two test files, the file that sorts first passing and the file that sorts last failing",
  function () {
    workDir = mkdtempSync(join(tmpdir(), "spec-controller-ldg036-"));
    // LISTED IN THE ORDER A RUNNER MIGHT, NOT THE ORDER THE BOOKS READ: the passing file sorts first,
    // so a first-match reading names it and reads satisfied.
    vitestReports = [
      writeVitestReport("vitest.json", [
        { name: `${FIXTURE}/z.test.ts`, assertionResults: [cite("the file that sorts last", "failed")] },
        { name: `${FIXTURE}/a.test.ts`, assertionResults: [cite("the file that sorts first", "passed")] },
      ]),
    ];
    failedCredit = `${FIXTURE}/z.test.ts=failed`;
  }
);

// @SCN-LDG-037
Given(
  "a runner report citing one scenario from two tests in one file, one passing and one failing, and the same report with the two tests listed the other way round",
  function () {
    workDir = mkdtempSync(join(tmpdir(), "spec-controller-ldg037-"));
    const tests = [cite("the test that passed", "passed"), cite("the test that failed", "failed")];
    vitestReports = [
      writeVitestReport("vitest.json", [{ name: `${FIXTURE}/m.test.ts`, assertionResults: tests }]),
      writeVitestReport("vitest-reversed.json", [{ name: `${FIXTURE}/m.test.ts`, assertionResults: [...tests].reverse() }]),
    ];
    failedCredit = `${FIXTURE}/m.test.ts=failed`;
  }
);

// @SCN-LDG-036
// @SCN-LDG-037
When("balance reconciles each runner report", function () {
  const repoRoot = process.cwd();
  runs = vitestReports.map((vitest, i) => {
    const out = join(workDir, `run-${i}.json`);
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", join(repoRoot, FIXTURE, "features"),
        "--vitest", vitest,
        "--cucumber", join(repoRoot, FIXTURE, "cucumber.json"),
        "--target", "failed-credit-among-several",
        "--format", `json:${out}`,
      ],
      { cwd: workDir, encoding: "utf8" }
    );
    assert.equal(result.error, undefined, `the tool subprocess failed to spawn: ${result.error?.message}`);
    assert.ok(existsSync(out), `run ${i} wrote no report (exit ${result.status}):\n${result.stderr}`);
    return { exitCode: result.status, report: JSON.parse(readFileSync(out, "utf8")) as Report };
  });
});

function rowOf(run: Run) {
  const row = run.report.ledger.scenarioReconciliations.find((r) => r.scnId === SCN);
  assert.ok(row, "the fixture scenario has no row");
  return row;
}

// @SCN-LDG-036
// @SCN-LDG-037
Then("the scenario's unit reconciliation reads failing, carrying the failed test's credit", function () {
  for (const run of runs) {
    const unit = rowOf(run).qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
    const carried = `${unit?.evidenceObservation?.locator}=${unit?.evidenceObservation?.status}`;
    assert.deepEqual([unit?.outcome, carried], ["failing", failedCredit]);
  }
});

// @SCN-LDG-036
// @SCN-LDG-037
Then("the scenario and the run are both out of balance", function () {
  for (const run of runs) {
    assert.equal(rowOf(run).verdict, "out-of-balance");
    // The run's out-of-balance is the CLI's exit 1 — sound, and not a setup fault.
    assert.equal(run.exitCode, 1);
  }
});

// ---------------------------------------------------------------------------
// @SCN-LNT-036 — the static arm, through the published engine.
// ---------------------------------------------------------------------------

const FITNESS_SCN = "SCN-CVT-036";
const CHECK = "complexity";
let fitnessScenarios: Scenario[];
let fitnessCredits: EvidenceObservation[];
let fitnessLedger: Ledger;

const staticCredit = (staticCheck: string, status: "passed" | "failed"): EvidenceObservation => ({
  qualityCheck: "lint",
  staticCheck,
  checkTag: CHECK,
  scnId: FITNESS_SCN,
  exists: true,
  enforcedOverRealSource: true,
  status,
});

// @SCN-LNT-036
Given(
  "a scenario naming one fitness check, and two credits for that check citing it, the one read first passing and the other failed",
  function () {
    fitnessScenarios = [{ scnId: FITNESS_SCN, evidenceObligations: [{ qualityCheck: "lint", staticCheck: CHECK }] }];
    // Handed over failed-first: the books re-read them in evidence order, where `lint:a` leads.
    fitnessCredits = [staticCredit("lint:b", "failed"), staticCredit("lint:a", "passed")];
  }
);

// @SCN-LNT-036
When("the published engine reconciles them", function () {
  fitnessLedger = reconcile(fitnessScenarios, fitnessCredits);
});

// @SCN-LNT-036
Then(
  "the check's obligation reads failing, carrying the failed credit, and the ledger is out of balance",
  function () {
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === FITNESS_SCN);
    assert.ok(row, "the fitness scenario has no row");
    // THE GIVEN, HELD: the passing credit is the one the books read first, so a first-match reading
    // would have taken it.
    assert.deepEqual(
      row.evidenceObservations.map((o) => [o.qualityCheck === "lint" ? o.staticCheck : o.locator, o.status]),
      [["lint:a", "passed"], ["lint:b", "failed"]]
    );
    const item = row.qualityCheckReconciliations.find((q) => q.staticCheck === CHECK);
    const carried = item?.evidenceObservation;
    assert.deepEqual(
      [item?.outcome, carried?.qualityCheck === "lint" ? carried.staticCheck : undefined, carried?.status],
      ["failing", "lint:b", "failed"]
    );
    assert.equal(row.verdict, "out-of-balance");
    // The predicate the CLI's exit 1 reads.
    assert.equal(isBalanced(fitnessLedger), false);
  }
);

// ---------------------------------------------------------------------------
// @SCN-LNT-037 and @SCN-LNT-038 — a severed run beside a wired one, and beside a failed one,
// through the published engine.
// ---------------------------------------------------------------------------

/** A run of `CHECK` citing `FITNESS_SCN` that carries no verdict; only its wiring and file vary. */
const runOf = (enforcedOverRealSource: boolean, locator: string): EvidenceObservation => ({
  qualityCheck: "lint",
  staticCheck: "lint:alpha",
  checkTag: CHECK,
  scnId: FITNESS_SCN,
  exists: true,
  enforcedOverRealSource,
  locator,
});

/** Each pair of credits to reconcile, and the credit a correct reading names on it. */
let fitnessPairs: Array<{ credits: EvidenceObservation[]; named: EvidenceObservation }> = [];
let fitnessLedgers: Ledger[] = [];

// @SCN-LNT-037
Given(
  "a scenario naming one fitness check, and two credits for that check citing it, one wired and one severed, and the same two with their locators swapped so each sorts first",
  function () {
    fitnessScenarios = [{ scnId: FITNESS_SCN, evidenceObligations: [{ qualityCheck: "lint", staticCheck: CHECK }] }];
    // The measured false green is the first pair: the wired run's file sorts ahead of the severed one's.
    fitnessPairs = [
      { credits: [runOf(true, "a.feature"), runOf(false, "z.feature")], named: runOf(false, "z.feature") },
      { credits: [runOf(true, "z.feature"), runOf(false, "a.feature")], named: runOf(false, "a.feature") },
    ];
  }
);

// @SCN-LNT-037
// @SCN-LNT-038
When("the published engine reconciles each pair", function () {
  fitnessLedgers = fitnessPairs.map(({ credits }) => reconcile(fitnessScenarios, credits));
});

// @SCN-LNT-038
Given(
  "a scenario naming one fitness check, and two credits for that check citing it, one wired and failed and one severed, and the same two with their locators swapped so each sorts first",
  function () {
    fitnessScenarios = [{ scnId: FITNESS_SCN, evidenceObligations: [{ qualityCheck: "lint", staticCheck: CHECK }] }];
    const failedAt = (locator: string): EvidenceObservation => ({ ...runOf(true, locator), status: "failed" });
    fitnessPairs = [
      { credits: [failedAt("a.feature"), runOf(false, "z.feature")], named: failedAt("a.feature") },
      { credits: [failedAt("z.feature"), runOf(false, "a.feature")], named: failedAt("z.feature") },
    ];
  }
);

/** Every pair's obligation reads `outcome`, naming the credit its Given said a correct reading names. */
function eachPairReads(outcome: string): void {
  fitnessLedgers.forEach((ledger, i) => {
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === FITNESS_SCN);
    assert.ok(row, "the fitness scenario has no row");
    const item = row.qualityCheckReconciliations.find((q) => q.staticCheck === CHECK);
    assert.deepEqual([item?.outcome, item?.evidenceObservation], [outcome, fitnessPairs[i]!.named]);
    assert.equal(row.verdict, "out-of-balance");
    // The predicate the CLI's exit 1 reads.
    assert.equal(isBalanced(ledger), false);
  });
}

// @SCN-LNT-037
Then(
  "the check's obligation reads watermelon, carrying the severed credit, and the ledger is out of balance, both ways round",
  function () {
    eachPairReads("watermelon");
  }
);

// @SCN-LNT-038
Then(
  "the check's obligation reads failing, carrying the failed credit, and the ledger is out of balance, both ways round",
  function () {
    eachPairReads("failing");
  }
);

After({ tags: "@SCN-LDG-036 or @SCN-LDG-037" }, function () {
  if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
});
