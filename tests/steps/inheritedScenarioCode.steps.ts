import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { exitOn } from "./support/runExit.js";

const INHERITED = "tests/fixtures/inherited-scenario-code";

const SCENARIO_CODE_INHERITED_FROM: Readonly<Record<string, string>> = {
  Feature: "SCN-INF-001",
  Rule: "SCN-INR-001",
};

const THE_ONE_SCENARIO = "the one scenario beneath it";

interface ScenarioReconciliation {
  scnId: string;
  kind: string;
  verdict: string;
}

interface Run {
  status: number | null;
  report: {
    ledger: { scenarioReconciliations: ScenarioReconciliation[] };
    evidenceObligations: { untaggedScenarios: { feature: string; scenario: string }[] };
  };
}

let ancestor = "";
let run: Run | undefined;

Given(
  "a target whose one scenario carries no scenario code of its own, inherits one from its {word}, and has passing evidence citing that code",
  function (from: string) {
    assert.ok(SCENARIO_CODE_INHERITED_FROM[from], `no fixture inherits a scenario code from its ${from}`);
    ancestor = from;
    run = undefined;
  },
);

When("balance reconciles that target", function () {
  const target = `${INHERITED}/${ancestor.toLowerCase()}`;
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", `${target}/features`,
      "--vitest", `${target}/vitest.json`,
      "--package-json", `${target}/package.json`,
      "--ci", target,
      "--format", "json",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  try {
    run = { status: result.status, report: JSON.parse(result.stdout) as Run["report"] };
  } catch {
    assert.fail(`expected a JSON reconciliation on stdout; exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
});

function reconciled(): Run {
  assert.ok(run, "the target was not reconciled");
  return run;
}

Then("the scenario is reconciled once, balanced, on its scenario code's row", function () {
  const rows = reconciled().report.ledger.scenarioReconciliations.filter(({ kind }) => kind === "scenario");
  assert.deepEqual(
    rows.map(({ scnId, verdict }) => ({ scnId, verdict })),
    [{ scnId: SCENARIO_CODE_INHERITED_FROM[ancestor], verdict: "balanced" }],
    "the scenario was not reconciled exactly once, balanced, on its inherited code's row",
  );
});

Then("no reconciliation names it as a scenario with no scenario code", function () {
  const { report } = reconciled();
  assert.deepEqual(report.evidenceObligations.untaggedScenarios, [], "the scenario was also listed as carrying no scenario code");
  const named = report.ledger.scenarioReconciliations.filter(({ scnId }) => scnId.endsWith(THE_ONE_SCENARIO));
  assert.deepEqual(named, [], "a reconciliation row names the scenario by its title, as one with no scenario code");
});

Then("the run balances", function () {
  assert.equal(reconciled().status, exitOn("the balanced verdict"), "the run did not reach the balanced verdict");
});
