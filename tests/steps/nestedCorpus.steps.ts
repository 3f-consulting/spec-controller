import { After, Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const NESTED = "tests/fixtures/nested-corpus";

const NESTED_FEATURE_FILES = ["top.feature", "area/middle.feature", "area/deeper/deep.feature"];

const SCENARIOS_OF_EVERY_FILE = ["SCN-NTA-001", "SCN-NTB-001", "SCN-NTC-001", "SCN-NTC-002"];

interface Run {
  status: number | null;
  report: Record<string, unknown>;
}

let nestedCorpus = "";
let flatCorpus = "";
let nestedRun: Run | undefined;
let flatRun: Run | undefined;

const temporaryPaths: string[] = [];

After(function () {
  for (const path of temporaryPaths.splice(0)) rmSync(path, { recursive: true, force: true });
});

function reconcile(features: string): Run {
  const result: SpawnSyncReturns<string> = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", features,
      "--vitest", `${NESTED}/vitest.json`,
      "--package-json", `${NESTED}/package.json`,
      "--ci", NESTED,
      "--format", "json",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  let report: Record<string, unknown>;
  try {
    report = JSON.parse(result.stdout) as Record<string, unknown>;
  } catch {
    assert.fail(`expected a JSON reconciliation on stdout; exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return { status: result.status, report };
}

function judgement({ report }: Run): Record<string, unknown> {
  const { runProvenance: _provenance, metadata: _metadata, ...judged } = report;
  return judged;
}

function scenarioCodesOf({ report }: Run): string[] {
  const ledger = report["ledger"] as { claimReconciliations: { scnId: string; kind: string }[] };
  return ledger.claimReconciliations
    .filter(({ kind }) => kind === "scenario")
    .map(({ scnId }) => scnId)
    .sort();
}

Given("a target whose feature files sit in its corpus at the top level and in subdirectories at several depths", function () {
  nestedCorpus = `${NESTED}/features`;
});

Given("the same target with every one of those feature files at the top level of its corpus", function () {
  const root = mkdtempSync(join(tmpdir(), `nested-corpus-flat-${process.pid}-`));
  temporaryPaths.push(root);
  flatCorpus = join(root, "features");
  mkdirSync(flatCorpus);
  for (const file of NESTED_FEATURE_FILES) copyFileSync(join(nestedCorpus, file), join(flatCorpus, basename(file)));
});

When("balance is asked to reconcile both of those targets", function () {
  nestedRun = reconcile(nestedCorpus);
  flatRun = reconcile(flatCorpus);
});

Then("the nested target's reconciliation reports the scenarios of every one of its feature files", function () {
  assert.ok(nestedRun, "the nested target was not reconciled");
  assert.deepEqual(
    scenarioCodesOf(nestedRun),
    SCENARIOS_OF_EVERY_FILE,
    "a feature file below the top level of the corpus was not read",
  );
});

Then("both targets reach the same verdict over the same Scenario Reconciliations", function () {
  assert.ok(nestedRun && flatRun, "both targets must have been reconciled");
  assert.deepEqual(scenarioCodesOf(flatRun), SCENARIOS_OF_EVERY_FILE, "fixture invariant: the flat corpus reads every file");
  assert.equal(nestedRun.status, flatRun.status, "the nested target reached a different verdict from the flat one");
  assert.deepEqual(judgement(nestedRun), judgement(flatRun));
});

const SAME_NAME = "tests/fixtures/same-name-corpus";

const SAME_NAME_FILES = ["alpha/run.feature", "beta/run.feature"];

const UNTAGGED_TITLE = "the run has no scenario code";

let sameNameJson: Record<string, unknown> | undefined;
let sameNameMarkdown = "";

function balanceOverSameName(format: "json" | "md"): string {
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", `${SAME_NAME}/features`,
      "--vitest", `${SAME_NAME}/vitest.json`,
      "--package-json", `${SAME_NAME}/package.json`,
      "--ci", SAME_NAME,
      "--format", format,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result.stdout;
}

Given(
  "a target whose corpus holds two feature files of one name in different subdirectories, each with a scenario of one title that carries no scenario code",
  function () {
    sameNameJson = undefined;
    sameNameMarkdown = "";
  },
);

When("balance is asked to reconcile that corpus", function () {
  const json = balanceOverSameName("json");
  try {
    sameNameJson = JSON.parse(json) as Record<string, unknown>;
  } catch {
    assert.fail(`expected a JSON reconciliation on stdout:\n${json}`);
  }
  sameNameMarkdown = balanceOverSameName("md");
  assert.match(sameNameMarkdown, /^# Evidence Reconciliation/m, `expected a Markdown reconciliation on stdout:\n${sameNameMarkdown}`);
});

Then("the reconciliation names each of those scenarios by its feature file's path under the corpus", function () {
  assert.ok(sameNameJson, "the corpus was not reconciled");
  const obligations = sameNameJson["evidenceObligations"] as { untaggedScenarios: { feature: string; scenario: string }[] };
  assert.deepEqual(
    obligations.untaggedScenarios,
    SAME_NAME_FILES.map((feature) => ({ feature, scenario: UNTAGGED_TITLE })),
    "an untagged scenario's feature file was not named by its path under the corpus",
  );
  const ledger = sameNameJson["ledger"] as { claimReconciliations: { scnId: string }[] };
  const rows = ledger.claimReconciliations.map(({ scnId }) => scnId);
  for (const feature of SAME_NAME_FILES) {
    assert.ok(rows.includes(`${feature} : ${UNTAGGED_TITLE}`), `no reconciliation row names ${feature}:\n${rows.join("\n")}`);
    assert.ok(sameNameMarkdown.includes(`${feature} : ${UNTAGGED_TITLE}`), `the Markdown report does not name ${feature}`);
  }
});

Then("each of those scenarios is counted against its own feature, not against the other", function () {
  assert.match(sameNameMarkdown, /^\| alpha\/run \(SNA\) \| 1 \|/m, "the alpha file's untagged scenario was not counted against it alone");
  assert.match(sameNameMarkdown, /^\| beta\/run \(SNB\) \| 1 \|/m, "the beta file's untagged scenario was not counted against it alone");
});
