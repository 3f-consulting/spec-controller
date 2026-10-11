import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-LDG-037] a passing and a failing test in one file citing the same scenario read failing, whichever order the two evidence observations arrive in", () => {
  const passed = { fullName: "[SCN-ONE-001] the test that passed", status: "passed" };
  const failed = { fullName: "[SCN-ONE-001] the test that failed", status: "failed" };

  it.each([
    ["passed first", [passed, failed]],
    ["failed first", [failed, passed]],
  ])("the JSON report's unit reconciliation reads failing and carries the failed test's evidence observation, with the row out of balance and exit 1, %s", (_order, assertionResults) => {
    const dir = mkdtempSync(join(tmpdir(), "scn-ldg-037-unit-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: one\n");
    writeFileSync(join(dir, "vitest.json"), JSON.stringify({ testResults: [{ name: "m.test.ts", assertionResults }] }));
    const { stdout, exitCode } = runBalanceCaptured(["--features", join(dir, "features"), "--vitest", join(dir, "vitest.json"), "--format", "json"]);
    const row = JSON.parse(stdout).ledger.scenarioReconciliations.find(
      (r: { scnId: string }) => r.scnId === "SCN-ONE-001"
    );
    const unit = row.qualityCheckReconciliations.find((q: { qualityCheck: string }) => q.qualityCheck === "unit");
    expect([unit.outcome, unit.evidenceObservation?.locator, unit.evidenceObservation?.status, row.verdict, exitCode]).toEqual([
      "failing",
      "m.test.ts",
      "failed",
      "out-of-balance",
      1,
    ]);
  });
});
