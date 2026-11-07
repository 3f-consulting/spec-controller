import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnBalance } from "./support/balanceTarget.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText } from "./support/catalogue.js";
import { claimReconciliationsOf } from "./support/reportClaimReconciliations.js";
import { showsHeading, verdictLineOf as verdictShownIn } from "./support/reportLines.js";
import { reconciliationTotalsOf } from "./support/reportReconciliationTotals.js";
import { scenarioCodesOnReport } from "./support/reportScenarioCodes.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import { scenarioName } from "./support/scenarioName.js";
import type { CorpusRun, SpecControllerWorld } from "./support/world.js";

Given(
  "a feature corpus containing a feature file that is a corrupt tag line",
  function (this: SpecControllerWorld) {
    writeCorruptFeature(this, 
      "@AAA\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n\n" +
        "  @unit @SCN-AAA-002 x\n  Scenario: beta works\n    Given another thing\n",
    );
  },
);

Given(
  "a feature corpus containing a feature file that is a corrupt scenario keyword",
  function (this: SpecControllerWorld) {
    writeCorruptFeature(this, 
      "@AAA\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n\n" +
        "  @unit @SCN-AAA-002\n  Scenari0: beta works\n    Given another thing\n",
    );
  },
);

Given(
  "a feature corpus containing a feature file that is wholly unparseable",
  function (this: SpecControllerWorld) {
    writeCorruptFeature(this, "not gherkin at all {{{\n");
  },
);

function writeCorruptFeature(world: SpecControllerWorld, featureSource: string): void {
  const dir = temporaryDirectory(world, `scn-cli-016-${process.pid}-`);
  mkdirSync(join(dir, "features"), { recursive: true });
  world.unparseableFeature = join(dir, "features", "target.feature");
  writeFileSync(world.unparseableFeature, featureSource);

  const vitestReport = join(dir, "vitest.json");
  writeFileSync(
    vitestReport,
    JSON.stringify({
      testResults: [
        {
          name: "/x/a.test.ts",
          status: "passed",
          assertionResults: [
            { fullName: "[SCN-AAA-001] alpha works", title: "alpha works", status: "passed" },
          ],
        },
      ],
    }),
  );
  const packageJson = join(dir, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "fixture", scripts: {} }));

  world.invocationArgs = [
    "--features",
    join(dir, "features"),
    "--vitest",
    vitestReport,
    "--package-json",
    packageJson,
  ];
}

Then("the refusal names the unparseable feature file and the parse failure", function (this: SpecControllerWorld) {
  assert.ok(
    this.balanceResult.stderr.includes(this.unparseableFeature),
    `expected stderr to NAME the unparseable feature file ${this.unparseableFeature}; got:\n${this.balanceResult.stderr}`,
  );
  assert.ok(
    this.balanceResult.stderr.trim().length > this.unparseableFeature.length,
    `expected stderr to carry the PARSE FAILURE alongside the file name; got:\n${this.balanceResult.stderr}`,
  );
  assert.doesNotMatch(
    this.balanceResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${this.balanceResult.stderr}`,
  );
});

const ENUMERATED_STATUSES = [0, 1, 2, 3, 4, 5];

Given("a target with no Gherkin corpus at all — no features directory on disk", function (this: SpecControllerWorld) {
  const dir = temporaryDirectory(this, `scn-cli-017-${process.pid}-`);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "new-client-target", private: true, scripts: { test: "vitest run" } }),
  );
  assert.ok(
    !existsSync(join(dir, "features")),
    `fixture invariant: ${join(dir, "features")} must NOT exist — this is the ABSENT corpus case`,
  );
  this.invocationArgs = [];
  this.invocationCwd = dir;
});

Then("the run ends on the exit its verdict headline names, rather than on a stack trace", function (this: SpecControllerWorld) {
  assert.doesNotMatch(
    this.balanceResult.stderr,
    /^\s+at .+:\d+:\d+\)?$/m,
    `expected no stack trace on stderr; got:\n${this.balanceResult.stderr}`,
  );
  assert.doesNotMatch(
    this.balanceResult.stderr,
    /ENOENT/,
    `the absent corpus escaped as a raw filesystem error; got:\n${this.balanceResult.stderr}`,
  );
  assert.ok(
    ENUMERATED_STATUSES.includes(this.balanceResult.status ?? -1),
    `expected an enumerated status; got ${this.balanceResult.status}\nstderr:\n${this.balanceResult.stderr}`,
  );
  const headline = verdictShownIn(this.balanceResult.stdout);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${this.balanceResult.stdout}`);
  assert.equal(
    this.balanceResult.status,
    headline.exit,
    `the report says exit ${headline.exit} (${headline.line}) but the process exited ${this.balanceResult.status} — a status the REPORT did not choose is Node's, not the tool's`,
  );
});

const NEW_CLIENT_UNCITED = "tests/fixtures/new-client-uncited";

Given("a target with no Gherkin corpus whose unit evidence cites no scenario", function (this: SpecControllerWorld) {
  const dir = join(process.cwd(), NEW_CLIENT_UNCITED);
  assert.ok(
    !existsSync(join(dir, "features")),
    `fixture invariant: ${join(dir, "features")} must NOT exist — an EMPTY corpus directory is a
     different shape and would sit green through the very shortcut this scenario guards`,
  );
  const outDir = temporaryDirectory(this, "spec-controller-uncited-");
  this.uncitedJsonPath = join(outDir, "spec-reconciliation.json");
  this.invocationArgs = ["--vitest", "vitest.json", "--format", "md", "--format", `json:${this.uncitedJsonPath}`];
  this.invocationCwd = dir;
});

Then("the uncited evidence observations are posted to the unnamed claim's reconciliation", function (this: SpecControllerWorld) {
  const report = JSON.parse(readFileSync(this.uncitedJsonPath, "utf8"));
  const { evidenceObservations } = report.summary;
  assert.deepEqual(
    [
      evidenceObservations.total,
      evidenceObservations.onScenario,
      evidenceObservations.onPhantomClaim,
      evidenceObservations.onUnnamedClaim,
    ],
    [2, 0, 0, 2],
    `expected both uncited evidence observations on the unnamed claim and none anywhere else; got: ${JSON.stringify(evidenceObservations)}`,
  );
  const { reconciliationLines } = reconciliationTotalsOf(report);
  assert.equal(
    reconciliationLines.byOutcome["cites-no-scenario"],
    2,
    `expected the two evidence observations reconciled as cites-no-scenario; got: ${JSON.stringify(reconciliationLines)}`,
  );
});

Then("the run is never read as one with nothing to reconcile", function (this: SpecControllerWorld) {
  assert.ok(
    !this.balanceResult.stdout.includes(entryText("nothing-to-reconcile-headline").replaceAll("*", "")),
    `a corpus-less run WITH accounts has something to reconcile — the unnamed claim's row; got:\n${this.balanceResult.stdout}`,
  );
  assert.notEqual(
    this.balanceResult.status,
    5,
    `expected an ordinary out-of-balance verdict; the run exited 5, so nothing-to-reconcile was keyed on the empty CORPUS rather than the empty LEDGER\nstdout:\n${this.balanceResult.stdout}`,
  );
});

const CORPUS_DIR = "features";

function verdictLineOf(stdout: string, shape: string): string {
  const line = verdictShownIn(stdout)?.line;
  assert.ok(line, `expected a run-verdict headline for the target with ${shape}; got:\n${stdout}`);
  return line;
}

function noCorpusRun(world: SpecControllerWorld, index: number): { shape: string; stdout: string } {
  const run = world.noCorpusRuns[index];
  assert.ok(run, `expected all three shapes to have been run; run ${index} is missing`);
  return run;
}

Given(
  "a target with no corpus directory, a target whose corpus is empty, and a target whose corpus carries no scenario",
  function (this: SpecControllerWorld) {
    const root = temporaryDirectory(this, `scn-cli-018-${process.pid}-`);
    const manifest = JSON.stringify({ name: "new-client-target", private: true, scripts: {} });
    const shapes: { shape: string; build: (dir: string) => void }[] = [
      { shape: "no corpus directory", build: () => {} },
      { shape: "an empty corpus", build: (dir) => mkdirSync(join(dir, CORPUS_DIR)) },
      {
        shape: "a corpus carrying no scenario",
        build: (dir) => {
          mkdirSync(join(dir, CORPUS_DIR));
          writeFileSync(
            join(dir, CORPUS_DIR, "target.feature"),
            "Feature: a corpus that carries no scenario\n\n  Prose only. This file carries no scenario.\n",
          );
        },
      },
    ];
    this.noCorpusTargets = shapes.map(({ shape, build }, i) => {
      const dir = join(root, `shape-${i}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "package.json"), manifest);
      build(dir);
      return { shape, root: dir };
    });
    const [first] = this.noCorpusTargets;
    assert.ok(first && !existsSync(join(first.root, CORPUS_DIR)),
      `fixture invariant: the first target must have NO ${CORPUS_DIR}/ — that is the shape under test`,
    );
  },
);

When(
  "balance is asked to reconcile each of those targets",
  function (this: SpecControllerWorld) {
    this.noCorpusRuns = this.noCorpusTargets.map(({ shape, root }) => {
      this.invocationCwd = root;
      return { shape, stdout: spawnBalance(this, []).stdout };
    });
  },
);

Then("every one of them is told the same verdict by the same sentence", function (this: SpecControllerWorld) {
  assert.equal(this.noCorpusRuns.length, 3, "expected all three shapes to have been run");
  const first = noCorpusRun(this, 0);
  const firstLine = verdictLineOf(first.stdout, first.shape);
  for (const index of [1, 2]) {
    const other = noCorpusRun(this, index);
    const otherLine = verdictLineOf(other.stdout, other.shape);
    assert.equal(
      otherLine,
      firstLine,
      `absent and empty are ONE answer, not two: the target with ${other.shape} was told something the target with ${first.shape} was not.\n  ${first.shape}: ${firstLine}\n  ${other.shape}: ${otherLine}`,
    );
  }
});

Then("that sentence names the corpus directory it examined", function (this: SpecControllerWorld) {
  const { shape, stdout } = noCorpusRun(this, 0);
  const line = verdictLineOf(stdout, shape);
  assert.ok(
    line.includes(CORPUS_DIR),
    `"I found no record" and "I found no regression" must not wear one word: the verdict never names the corpus directory (${CORPUS_DIR}) it examined.\n  ${line}`,
  );
});

const NESTED = "tests/fixtures/nested-corpus";

const NESTED_FEATURE_FILES = ["top.feature", "area/middle.feature", "area/deeper/deep.feature"];

const SCENARIOS_OF_EVERY_FILE = ["SCN-NTA-001", "SCN-NTB-001", "SCN-NTC-001", "SCN-NTC-002"];

function reconcile(features: string): CorpusRun {
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

function judgement({ report }: CorpusRun): Record<string, unknown> {
  const { runProvenance: _provenance, ...judged } = report;
  const summary = judged["summary"] as { outOfBalanceByFeature?: { featureFile?: string }[] };
  const byFeature = summary.outOfBalanceByFeature?.map(({ featureFile: _featureFile, ...entry }) => entry);
  return { ...judged, summary: { ...summary, ...(byFeature ? { outOfBalanceByFeature: byFeature } : {}) } };
}

function scenarioCodesOf({ report }: CorpusRun): string[] {
  return claimReconciliationsOf<{ claim: string; kind: string }>(report)
    .filter(({ kind }) => kind === "scenario")
    .map(({ claim }) => claim)
    .sort();
}

Given("a target whose feature files sit in its corpus at the top level and in subdirectories at several depths", function (this: SpecControllerWorld) {
  this.nestedCorpus = `${NESTED}/features`;
});

Given("the same target with every one of those feature files at the top level of its corpus", function (this: SpecControllerWorld) {
  const root = temporaryDirectory(this, `nested-corpus-flat-${process.pid}-`);
  this.flatCorpus = join(root, "features");
  mkdirSync(this.flatCorpus);
  for (const file of NESTED_FEATURE_FILES) copyFileSync(join(this.nestedCorpus, file), join(this.flatCorpus, basename(file)));
});

When("balance is asked to reconcile both of those targets", function (this: SpecControllerWorld) {
  this.nestedRun = reconcile(this.nestedCorpus);
  this.flatRun = reconcile(this.flatCorpus);
});

Then("the nested target's reconciliation reports the scenarios of every one of its feature files", function (this: SpecControllerWorld) {
  assert.ok(this.nestedRun, "the nested target was not reconciled");
  assert.deepEqual(
    scenarioCodesOf(this.nestedRun),
    SCENARIOS_OF_EVERY_FILE,
    "a feature file below the top level of the corpus was not read",
  );
});

Then("both targets reach the same verdict over the same Claim Reconciliations", function (this: SpecControllerWorld) {
  assert.ok(this.nestedRun && this.flatRun, "both targets must have been reconciled");
  assert.deepEqual(scenarioCodesOf(this.flatRun), SCENARIOS_OF_EVERY_FILE, "fixture invariant: the flat corpus reads every file");
  assert.equal(this.nestedRun.status, this.flatRun.status, "the nested target reached a different verdict from the flat one");
  assert.deepEqual(judgement(this.nestedRun), judgement(this.flatRun));
});

const SAME_NAME = "tests/fixtures/same-name-corpus";

const SAME_NAME_FILES = ["alpha/run.feature", "beta/run.feature"];

const UNTAGGED_TITLE = "the run has no scenario code";

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
  function (this: SpecControllerWorld) {
    this.sameNameJson = null;
    this.sameNameMarkdown = "";
  },
);

When("balance is asked to reconcile that corpus", function (this: SpecControllerWorld) {
  const json = balanceOverSameName("json");
  try {
    this.sameNameJson = JSON.parse(json) as Record<string, unknown>;
  } catch {
    assert.fail(`expected a JSON reconciliation on stdout:\n${json}`);
  }
  this.sameNameMarkdown = balanceOverSameName("md");
  assert.ok(showsHeading(this.sameNameMarkdown, 1, "report-title"), `expected a Markdown reconciliation on stdout:\n${this.sameNameMarkdown}`);
});

Then("the reconciliation names each of those scenarios by its feature file's path under the corpus", function (this: SpecControllerWorld) {
  assert.ok(this.sameNameJson, "the corpus was not reconciled");
  assert.deepEqual(
    scenarioCodesOnReport(this.sameNameJson).untaggedScenarios,
    SAME_NAME_FILES.map((feature) => scenarioName(feature, UNTAGGED_TITLE)),
    "an untagged scenario's name does not hold its feature file's path under the corpus",
  );
  const rows = claimReconciliationsOf<{ claim: string }>(this.sameNameJson).map(({ claim }) => claim);
  for (const feature of SAME_NAME_FILES) {
    assert.ok(rows.includes(`${feature} : ${UNTAGGED_TITLE}`), `no reconciliation row names ${feature}:\n${rows.join("\n")}`);
    assert.ok(this.sameNameMarkdown.includes(`${feature} : ${UNTAGGED_TITLE}`), `the Markdown report does not name ${feature}`);
  }
});

Then("each of those scenarios is counted against its own feature, not against the other", function (this: SpecControllerWorld) {
  assert.ok(this.sameNameJson, "the corpus was not reconciled");
  const summary = this.sameNameJson["summary"] as { outOfBalanceByFeature: { feature: string; count: number; scenariosWithNoClaimCode?: number }[] };
  assert.deepEqual(
    summary.outOfBalanceByFeature.map(({ feature, count, scenariosWithNoClaimCode }) => ({ feature, count, scenariosWithNoClaimCode })),
    [
      { feature: "SNA", count: 1, scenariosWithNoClaimCode: 1 },
      { feature: "SNB", count: 1, scenariosWithNoClaimCode: 1 },
    ],
    "each file's untagged scenario was not counted against its own feature alone",
  );
});
