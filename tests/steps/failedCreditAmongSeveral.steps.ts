import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

After({ tags: "@SCN-LDG-036 or @SCN-LDG-037" }, function () {
  if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
});
