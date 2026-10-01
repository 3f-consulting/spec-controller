import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

let corpusDir: string | undefined;

function writeCorpus(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "scn-stg-"));
  mkdirSync(join(dir, "features"));
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, "features", name), source);
  writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
  return dir;
}

interface ScenarioReconciliation {
  scnId: string | null;
}

interface BalanceRun {
  status: number;
  stderr: string;
  report: { ledger: { scenarioReconciliations: ScenarioReconciliation[] } };
  jsonPath: string;
  markdown: string;
}

function spawnController(args: readonly string[], cwd: string) {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `spec-controller failed to spawn: ${result.error?.message}`);
  return result;
}

function runBalanceOver(dir: string): BalanceRun {
  const jsonPath = join(dir, "report.json");
  const mdPath = join(dir, "report.md");
  const result = spawnController(
    [
      "balance",
      "--features", join(dir, "features"),
      "--vitest", join(dir, "vitest.json"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", `json:${jsonPath}`,
      "--format", `md:${mdPath}`,
    ],
    dir,
  );
  assert.ok(existsSync(jsonPath), `expected the report written; exit ${result.status}, stderr: ${result.stderr}`);
  return {
    status: result.status ?? -1,
    stderr: result.stderr,
    report: JSON.parse(readFileSync(jsonPath, "utf8")),
    jsonPath,
    markdown: readFileSync(mdPath, "utf8"),
  };
}

function stg018Target(withDuplicate: boolean): string {
  const dir = writeCorpus({
    "dup.feature":
      "@DUP\nFeature: dup\n\n  @unit @SCN-DUP-001\n  Scenario: first\n    Given a thing\n\n" +
      (withDuplicate ? "  @unit @SCN-DUP-001\n  Scenario: second\n    Given a thing\n\n" : "") +
      "  @unit @SCN-DUP-002\n  Scenario: its own\n    Given a thing\n",
  });
  writeFileSync(
    join(dir, "vitest.json"),
    JSON.stringify({
      testResults: [
        {
          name: "dup.test.ts",
          assertionResults: [
            { fullName: "[SCN-DUP-001] proven", status: "passed" },
            { fullName: "[SCN-DUP-002] proven", status: "passed" },
          ],
        },
      ],
    }),
  );
  writeFileSync(join(dir, "package.json"), "{}\n");
  return dir;
}

let stg018Run: BalanceRun;

Given(
  "a target whose corpus carries one @SCN on two scenarios beside a scenario of its own, every scenario cited by passing evidence",
  function () {
    corpusDir = stg018Target(true);
  },
);

When("the target runs balance over it", function () {
  stg018Run = runBalanceOver(corpusDir!);
});

Then("the run exits 1, failing as out of balance, not as an input it cannot read", function () {
  assert.equal(stg018Run.status, 1, `expected exit 1 (out of balance); got ${stg018Run.status}. stderr: ${stg018Run.stderr}`);
});

Then(
  "the report reconciles the scenario of its own exactly as it does in the same corpus without the duplicate",
  function () {
    const own = (run: BalanceRun): ScenarioReconciliation | undefined =>
      run.report.ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-DUP-002");
    const without = runBalanceOver(stg018Target(false));
    assert.ok(own(stg018Run), "the report carries the scenario of its own");
    assert.deepEqual(own(stg018Run), own(without));
  },
);

Then("nothing says the corpus was refused", function () {
  assert.doesNotMatch(stg018Run.stderr, /names the same @SCN on more than one scenario/);
});

function stg017Target(): string {
  const dir = writeCorpus({
    "one.feature": "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: the scenario in one\n    Given a thing\n",
    "two.feature":
      "@TWO\nFeature: two\n\n  @unit @SCN-ONE-001\n  Scenario: the scenario in two\n    Given a thing\n\n" +
      "  @unit @SCN-TWO-001\n  Scenario: its own\n    Given a thing\n",
  });
  writeFileSync(join(dir, "vitest.json"), JSON.stringify({ testResults: [] }));
  writeFileSync(join(dir, "package.json"), "{}\n");
  return dir;
}

const STG017_STATEMENT = "- The corpus holds 3 scenarios in 2 accounts — 1 @SCN code(s) carried by more than one scenario:";
const STG017_SHARERS = "  - SCN-ONE-001: one.feature : the scenario in one; two.feature : the scenario in two";

Given(
  "a target whose corpus carries one @SCN on two scenarios in two feature files, beside a scenario of its own",
  function () {
    corpusDir = stg017Target();
  },
);

Then("the report states that the corpus holds three scenarios in two accounts", function () {
  assert.ok(stg018Run.markdown.includes(STG017_STATEMENT), `expected the report to state:\n${STG017_STATEMENT}`);
});

Then("it names the shared code with the file and the name of each scenario carrying it", function () {
  assert.ok(stg018Run.markdown.includes(STG017_SHARERS), `expected the report to name:\n${STG017_SHARERS}`);
});

Then("the report saved as JSON re-renders the same statement", function () {
  const rerendered = spawnController(["balance", "--render-from-json", stg018Run.jsonPath], corpusDir!).stdout;
  assert.ok(rerendered.includes(STG017_STATEMENT), "the re-rendered report states scenarios against accounts");
  assert.ok(rerendered.includes(STG017_SHARERS), "the re-rendered report names the sharers");
});
