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
let failedCredit: string;

function writeVitestReport(name: string, testResults: Array<{ name: string; assertionResults: Assertion[] }>): string {
  const path = join(workDir, name);
  writeFileSync(path, JSON.stringify({ testResults }));
  return path;
}

const cite = (label: string, status: Assertion["status"]): Assertion => ({ fullName: `[${SCN}] ${label}`, status });

Given(
  "a runner report citing one scenario from two test files, the file that sorts first passing and the file that sorts last failing",
  function () {
    workDir = mkdtempSync(join(tmpdir(), "spec-controller-ldg036-"));
    vitestReports = [
      writeVitestReport("vitest.json", [
        { name: `${FIXTURE}/z.test.ts`, assertionResults: [cite("the file that sorts last", "failed")] },
        { name: `${FIXTURE}/a.test.ts`, assertionResults: [cite("the file that sorts first", "passed")] },
      ]),
    ];
    failedCredit = `${FIXTURE}/z.test.ts=failed`;
  }
);

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

Then("the scenario's unit reconciliation reads failing, carrying the failed test's credit", function () {
  for (const run of runs) {
    const unit = rowOf(run).qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
    const carried = `${unit?.evidenceObservation?.locator}=${unit?.evidenceObservation?.status}`;
    assert.deepEqual([unit?.outcome, carried], ["failing", failedCredit]);
  }
});

Then("the scenario and the run are both out of balance", function () {
  for (const run of runs) {
    assert.equal(rowOf(run).verdict, "out-of-balance");
    assert.equal(run.exitCode, 1);
  }
});

const FITNESS_SCN = "SCN-CVT-036";
let fitnessScenarios: Scenario[];
let fitnessCredits: EvidenceObservation[];
let fitnessLedger: Ledger;

const staticCredit = (staticCheck: string, status: "passed" | "failed"): EvidenceObservation => ({
  qualityCheck: "fitness",
  staticCheck,
  scnId: FITNESS_SCN,
  exists: true,
  enforcedOverRealSource: true,
  status,
});

Given(
  "a scenario naming one fitness check, and two credits for that check citing it, the one read first passing and the other failed",
  function () {
    fitnessScenarios = [{ scnId: FITNESS_SCN, evidenceObligations: [{ qualityCheck: "fitness" }] }];
    fitnessCredits = [staticCredit("lint:b", "failed"), staticCredit("lint:a", "passed")];
  }
);

When("the published engine reconciles them", function () {
  fitnessLedger = reconcile(fitnessScenarios, fitnessCredits);
});

Then(
  "the check's obligation reads failing, carrying the failed credit, and the ledger is out of balance",
  function () {
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === FITNESS_SCN);
    assert.ok(row, "the fitness scenario has no row");
    assert.deepEqual(
      row.evidenceObservations.map((o) => [o.qualityCheck === "fitness" ? o.staticCheck : o.locator, o.status]),
      [["lint:a", "passed"], ["lint:b", "failed"]]
    );
    const item = row.qualityCheckReconciliations.find((q) => q.qualityCheck === "fitness");
    const carried = item?.evidenceObservation;
    assert.deepEqual(
      [item?.outcome, carried?.qualityCheck === "fitness" ? carried.staticCheck : undefined, carried?.status],
      ["failing", "lint:b", "failed"]
    );
    assert.equal(row.verdict, "out-of-balance");
    assert.equal(isBalanced(fitnessLedger), false);
  }
);

const runOf = (enforcedOverRealSource: boolean, locator: string): EvidenceObservation => ({
  qualityCheck: "fitness",
  staticCheck: "lint:alpha",
  scnId: FITNESS_SCN,
  exists: true,
  enforcedOverRealSource,
  locator,
});

let fitnessPairs: Array<{ credits: EvidenceObservation[]; named: EvidenceObservation }> = [];
let fitnessLedgers: Ledger[] = [];

Given(
  "a scenario naming one fitness check, and two credits for that check citing it, one wired and one severed, and the same two with their locators swapped so each sorts first",
  function () {
    fitnessScenarios = [{ scnId: FITNESS_SCN, evidenceObligations: [{ qualityCheck: "fitness" }] }];
    fitnessPairs = [
      { credits: [runOf(true, "a.feature"), runOf(false, "z.feature")], named: runOf(false, "z.feature") },
      { credits: [runOf(true, "z.feature"), runOf(false, "a.feature")], named: runOf(false, "a.feature") },
    ];
  }
);

When("the published engine reconciles each pair", function () {
  fitnessLedgers = fitnessPairs.map(({ credits }) => reconcile(fitnessScenarios, credits));
});

Given(
  "a scenario naming one fitness check, and two credits for that check citing it, one wired and failed and one severed, and the same two with their locators swapped so each sorts first",
  function () {
    fitnessScenarios = [{ scnId: FITNESS_SCN, evidenceObligations: [{ qualityCheck: "fitness" }] }];
    const failedAt = (locator: string): EvidenceObservation => ({ ...runOf(true, locator), status: "failed" });
    fitnessPairs = [
      { credits: [failedAt("a.feature"), runOf(false, "z.feature")], named: failedAt("a.feature") },
      { credits: [failedAt("z.feature"), runOf(false, "a.feature")], named: failedAt("z.feature") },
    ];
  }
);

function eachPairReads(outcome: string): void {
  fitnessLedgers.forEach((ledger, i) => {
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === FITNESS_SCN);
    assert.ok(row, "the fitness scenario has no row");
    const item = row.qualityCheckReconciliations.find((q) => q.qualityCheck === "fitness");
    assert.deepEqual([item?.outcome, item?.evidenceObservation], [outcome, fitnessPairs[i]!.named]);
    assert.equal(row.verdict, "out-of-balance");
    assert.equal(isBalanced(ledger), false);
  });
}

Then(
  "the check's obligation reads watermelon, carrying the severed credit, and the ledger is out of balance, both ways round",
  function () {
    eachPairReads("watermelon");
  }
);

Then(
  "the check's obligation reads failing, carrying the failed credit, and the ledger is out of balance, both ways round",
  function () {
    eachPairReads("failing");
  }
);

After({ tags: "@SCN-LDG-036 or @SCN-LDG-037" }, function () {
  if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
});
