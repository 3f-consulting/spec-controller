/**
 * @SCN-LNT-035 step defs — a bar a configured row still carries is named as a retired key, and the
 * row is credited by its own step's outcome as any row is.
 *
 * Drives the BUILT CLI over tests/fixtures/scn-lnt-035 — the scn-lnt-021 target (@SCN-LNT-021)
 * with a bar written on each row: `atMost` on SCN-CVT-001, and on SCN-CVT-002 an `atLeast`
 * naming a mutation gate beside an `atMost`. Both halves are read off ONE run: the markdown's
 * retired-key account and the JSON's `summary.retiredKeys` for the name, the JSON ledger and the
 * exit code for the credit — so a reader that named the bar by dropping the row, or credited the
 * row by reading the bar, fails one half or the other.
 * // @SCN-LNT-035
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/scn-lnt-035");

interface BarredRowRun {
  status: number | null;
  md: string;
  json: {
    summary: { retiredKeys?: string[]; scenarioReconciliations: { outOfBalance: number } };
    ledger: {
      scenarioReconciliations: {
        scnId: string;
        verdict: string;
        qualityCheckReconciliations: {
          staticCheck?: string;
          outcome: string;
          evidenceObligation?: unknown;
          evidenceObservation?: { scnId?: string; status?: string };
        }[];
      }[];
    };
  };
}

let run: BarredRowRun;

// @SCN-LNT-035
Given(
  "a target whose configured rows name a static fitness check for each of the two scenarios its corpus carries, one row carrying atMost and the other carrying an atLeast naming a mutation gate beside an atMost",
  function () {
    // THE PREMISE, ASSERTED FOR ITS SHAPE: every bar this scenario is about, on the row it names.
    const manifest = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8")) as {
      specController: { fitnessChecks: Record<string, unknown>[] };
    };
    assert.deepEqual(
      manifest.specController.fitnessChecks.map(({ scn, characteristic, atLeast, atMost }) => ({
        scn,
        characteristic,
        atLeast,
        atMost,
      })),
      [
        { scn: "SCN-CVT-001", characteristic: "complexity", atLeast: undefined, atMost: 10 },
        {
          scn: "SCN-CVT-002",
          characteristic: "mutation",
          atLeast: { mutationGate: "domain" },
          atMost: 100,
        },
      ],
      "expected the fixture's two rows to carry exactly the bars this scenario names"
    );
  }
);

// @SCN-LNT-035
Given("its CI run's record says both of those checks' steps succeeded", function () {
  const record = JSON.parse(readFileSync(join(FIXTURE, "ci-steps.json"), "utf8")) as Record<
    string,
    { outcome: string }
  >;
  assert.deepEqual(
    Object.entries(record).map(([id, step]) => [id, step.outcome]),
    [
      ["SCN-CVT-001", "success"],
      ["SCN-CVT-002", "success"],
      ["dump-the-step-record", "success"],
    ],
    "expected both check steps to have succeeded, beside the step that wrote the record"
  );
});

// @SCN-LNT-035
When("that target's reconciliation report is rendered with the record its own CI run wrote", function () {
  const dir = mkdtempSync(join(tmpdir(), "spec-controller-lnt035-"));
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(FIXTURE, "features"),
      "--ci", join(FIXTURE, "ci.yml"),
      "--package-json", join(FIXTURE, "package.json"),
      "--ci-steps", join(FIXTURE, "ci-steps.json"),
      "--target", "lnt-035-fixture",
      "--format", `md:${join(dir, "report.md")}`,
      "--format", `json:${join(dir, "report.json")}`,
    ],
    { cwd: dir, encoding: "utf8" }
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  run = {
    status: result.status,
    md: readFileSync(join(dir, "report.md"), "utf8"),
    json: JSON.parse(readFileSync(join(dir, "report.json"), "utf8")) as BarredRowRun["json"],
  };
});

// @SCN-LNT-035
Then("the report names each bar a configured row carries as a retired key, with the row it sits on", function () {
  const tail = "retired: this reader no longer reads a row's bar, and the row is credited by its step's outcome.";
  const start = run.md.indexOf("### Static checks");
  const section = run.md.slice(start, run.md.indexOf("\n###", start + 1));
  assert.deepEqual(
    section.split("\n").filter((line) => line.startsWith("- specController.")),
    [
      `- specController.fitnessChecks[SCN-CVT-001].atMost — ${tail}`,
      `- specController.fitnessChecks[SCN-CVT-002].atLeast — ${tail}`,
      `- specController.fitnessChecks[SCN-CVT-002].atMost — ${tail}`,
    ],
    `expected each bar named with its row, in the order the manifest wrote them. Got:\n${run.md}`
  );
  assert.deepEqual(
    run.json.summary.retiredKeys,
    [
      "fitnessChecks[SCN-CVT-001].atMost",
      "fitnessChecks[SCN-CVT-002].atLeast",
      "fitnessChecks[SCN-CVT-002].atMost",
    ],
    "expected the JSON's retired-key account to carry the same three keys the markdown names"
  );
});

// @SCN-LNT-035
Then(
  "each row is credited by its own step's outcome, both Evidence Obligations read satisfied, and the run balances",
  function () {
    // THE OBLIGATION CARRIES NO BAR, which is the bar being unread rather than merely unnamed: a
    // reader that still took the number would put it on the debit.
    assert.deepEqual(
      run.json.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [
          item.staticCheck,
          item.outcome,
          item.evidenceObligation,
          item.evidenceObservation?.scnId,
          item.evidenceObservation?.status,
        ]),
      ]),
      [
        ["SCN-CVT-001", "balanced", [["complexity", "satisfied", { qualityCheck: "lint", staticCheck: "complexity" }, "SCN-CVT-001", "passed"]]],
        ["SCN-CVT-002", "balanced", [["mutation", "satisfied", { qualityCheck: "lint", staticCheck: "mutation" }, "SCN-CVT-002", "passed"]]],
      ],
      `expected each barred row credited by its own step, as a row carrying no bar is. Got ` +
        JSON.stringify(run.json.ledger.scenarioReconciliations)
    );
    assert.equal(run.json.summary.scenarioReconciliations.outOfBalance, 0);
    assert.equal(run.status, 0, `expected the run to balance (exit 0); got ${run.status}`);
  }
);
