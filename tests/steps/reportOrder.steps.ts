import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-order/features",
  vitest: "tests/fixtures/evidence-order/vitest.json",
  cucumber: "tests/fixtures/evidence-order/cucumber.json",
};

interface Credit {
  qualityCheck: string;
  locator?: string;
}
interface Row {
  scnId: string;
  evidenceObservations: Credit[];
  qualityCheckReconciliations: Array<{ qualityCheck: string; evidenceObservation?: Credit }>;
}
type Report = { runProvenance: unknown; ledger: { scenarioReconciliations: Row[] } };

let rmd009Dir: string;
let rmd009Reports: string[] = [];
let rmd009Parsed: Report[] = [];

Given(
  "a runner report citing one scenario from two test files, and the same report with its files listed the other way round",
  function () {
    rmd009Dir = mkdtempSync(join(tmpdir(), "spec-controller-rmd009-"));
    const report = JSON.parse(readFileSync(join(process.cwd(), FIXTURE.vitest), "utf8")) as {
      testResults: unknown[];
    };
    assert.ok(report.testResults.length > 1, "the fixture must list more than one file, or reversing it changes nothing");
    const reversed = join(rmd009Dir, "vitest-reversed.json");
    writeFileSync(reversed, JSON.stringify({ ...report, testResults: [...report.testResults].reverse() }));
    rmd009Reports = [join(process.cwd(), FIXTURE.vitest), reversed];
  }
);

When("the reconciliation is run over each and saved in JSON", function () {
  const repoRoot = process.cwd();
  rmd009Parsed = rmd009Reports.map((vitest, i) => {
    const out = join(rmd009Dir, `run-${i}.json`);
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", join(repoRoot, FIXTURE.features),
        "--vitest", vitest,
        "--cucumber", join(repoRoot, FIXTURE.cucumber),
        "--target", "evidence-order-fixture",
        "--format", `json:${out}`,
      ],
      { cwd: rmd009Dir, encoding: "utf8" }
    );
    assert.equal(result.error, undefined, `the tool subprocess failed to spawn: ${result.error?.message}`);
    assert.ok(existsSync(out), `run ${i} wrote no report (exit ${result.status}):\n${result.stderr}`);
    return JSON.parse(readFileSync(out, "utf8")) as Report;
  });
});

Then("the two reports are identical apart from their run provenance", function () {
  const [first, second] = rmd009Parsed.map(({ runProvenance: _runProvenance, ...rest }) => JSON.stringify(rest));
  assert.equal(second, first);
});

function rowOf(report: Report): Row {
  const row = report.ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-TGT-001");
  assert.ok(row, "the fixture scenario has no row");
  return row;
}

Then("the scenario's row reads its evidence in quality-check order, then by location", function () {
  for (const report of rmd009Parsed) {
    assert.deepEqual(
      rowOf(report).evidenceObservations.map((o) => [o.qualityCheck, o.locator]),
      [
        ["unit", "tests/fixtures/evidence-order/a.test.ts"],
        ["unit", "tests/fixtures/evidence-order/z.test.ts"],
        ["integration", "features/target.feature"],
      ]
    );
  }
});

Then("its unit reconciliation names the same test file in both", function () {
  const named = rmd009Parsed.map(
    (report) => rowOf(report).qualityCheckReconciliations.find((q) => q.qualityCheck === "unit")?.evidenceObservation?.locator
  );
  assert.deepEqual(named, ["tests/fixtures/evidence-order/a.test.ts", "tests/fixtures/evidence-order/a.test.ts"]);
});

After({ tags: "@SCN-RMD-009" }, function () {
  if (rmd009Dir && existsSync(rmd009Dir)) rmSync(rmd009Dir, { recursive: true, force: true });
});
