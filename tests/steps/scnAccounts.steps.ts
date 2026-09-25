/**
 * @integration arms for the account-number Rule of features/scn-tags.feature (3F-3609) — an @SCN
 * is one account number, and two scenarios carrying it make that account unreconcilable.
 *
 * Its own file, because this Rule is `balance`'s: a Rule's arms live beside the command that
 * answers it.
 *
 * THE SUBJECT IS REAL GHERKIN. Each corpus here is feature-file text the real parser reads, so the
 * wiring under test is parse → reconcile — the reading cucumber itself makes of the file, tag
 * inheritance and all — not a hand-built `Scenario[]` the @unit arms already cover.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseScenarios, reconcile } from "@3f-consulting/spec-controller-core";
import type { EvidenceObservation, Ledger, ScenarioReconciliation } from "@3f-consulting/spec-controller-core";
import { isBalanced } from "../../packages/core/src/domain/ledger.js";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

/** The feature files of the corpus under test, as source text, one entry per file. */
let corpus: string[] = [];
/** The credits the run observed. */
let observations: EvidenceObservation[] = [];
/**
 * A corpus written to disk, read through the INGEST EDGE the CLI reads it through — set when the
 * arrangement is about FILES, so the files meet in one corpus the way a target's do.
 */
let corpusDir: string | undefined;
/** The shared code the scenarios carry. */
let sharedCode = "";
let ledger: Ledger;

function reconcileCorpus(): void {
  if (corpusDir !== undefined) {
    ledger = runReconcile({
      features: join(corpusDir, "features"),
      ci: join(corpusDir, "ci.yml"),
      packageJson: join(corpusDir, "package.json"),
    }).ledger;
    return;
  }
  ledger = reconcile(corpus.flatMap((source) => parseScenarios(source)), observations);
}

/** Write each `name → source` feature file into a fresh target directory, with an empty pipeline. */
function writeCorpus(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "scn-stg-"));
  mkdirSync(join(dir, "features"));
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, "features", name), source);
  writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
  return dir;
}

function theAccount(): ScenarioReconciliation {
  const accounts = ledger.scenarioReconciliations.filter((r) => r.scnId === sharedCode);
  assert.equal(
    accounts.length,
    1,
    `expected ONE account for ${sharedCode}; got ${accounts.length}: ${JSON.stringify(accounts.map((a) => a.kind))}`,
  );
  return accounts[0]!;
}

// @SCN-STG-013
Given(
  "a feature file whose two scenarios carry one @SCN, each naming a unit check, the second also deferring an integration check",
  function () {
    sharedCode = "SCN-DUP-001";
    observations = [];
    corpusDir = undefined;
    corpus = [
      [
        "@DUP",
        "Feature: dup",
        "",
        "  @unit @SCN-DUP-001",
        "  Scenario: the first scenario carrying the code",
        "    Given a thing",
        "",
        "  @unit @integrationpending @SCN-DUP-001",
        "  Scenario: the second scenario carrying the code",
        "    Given a thing",
        "",
      ].join("\n"),
    ];
  },
);

// @SCN-STG-013
When("the ledger reconciles that corpus into accounts", function () {
  reconcileCorpus();
});

// @SCN-STG-013
Then("the corpus holds one account for that code", function () {
  assert.equal(theAccount().kind, "scenario", "the one account is a REAL scenario account");
});

// @SCN-STG-013
Then(
  "every quality check on it, the deferred integration check included, reads duplicate-scn-code",
  function () {
    const seen = theAccount().qualityCheckReconciliations.map((q) => `${q.qualityCheck}:${q.outcome}`);
    assert.deepEqual(seen, ["unit:duplicate-scn-code", "integration:duplicate-scn-code"]);
  },
);

// @SCN-STG-013
Then("that account carries no Pending Item", function () {
  assert.deepEqual(theAccount().pendingItems, []);
});

// @SCN-STG-013
Then("that account is out of balance", function () {
  assert.equal(theAccount().verdict, "out-of-balance");
  assert.equal(isBalanced(ledger), false, "a run holding an unreconcilable account never balances");
});

// @SCN-STG-013
When("the two scenarios name no quality check at all", function () {
  corpus = [corpus[0]!.replace("@unit @integrationpending @SCN-DUP-001", "@SCN-DUP-001").replace("@unit @SCN-DUP-001", "@SCN-DUP-001")];
  reconcileCorpus();
});

// @SCN-STG-013
Then("the one account carries a single duplicate-scn-code sub-row, never both-missing", function () {
  assert.deepEqual(
    theAccount().qualityCheckReconciliations.map((q) => q.outcome),
    ["duplicate-scn-code"],
  );
});

// @SCN-STG-014
Given(
  "a corpus of two feature files, each holding a scenario that carries the same @SCN and names a unit check",
  function () {
    sharedCode = "SCN-ONE-001";
    corpusDir = writeCorpus({
      "one.feature": "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: the scenario in one\n    Given a thing\n",
      "two.feature": "@TWO\nFeature: two\n\n  @unit @SCN-ONE-001\n  Scenario: the scenario in two\n    Given a thing\n",
    });
  },
);

// @SCN-STG-014
Then("every quality check on it reads duplicate-scn-code", function () {
  const items = theAccount().qualityCheckReconciliations;
  assert.ok(items.length > 0, "the account carries at least one quality check");
  assert.deepEqual(
    items.filter((q) => q.outcome !== "duplicate-scn-code").map((q) => `${q.qualityCheck}:${q.outcome}`),
    [],
    "every quality check on the account reads duplicate-scn-code",
  );
});

// @SCN-STG-015
Given(
  "two scenarios sharing one @SCN, one naming a unit check and the other an integration check, each with passing evidence at its own check",
  function () {
    sharedCode = "SCN-DIS-001";
    corpusDir = undefined;
    corpus = [
      "@DIS\nFeature: disjoint\n\n  @unit @SCN-DIS-001\n  Scenario: the unit-proven one\n    Given a thing\n\n" +
        "  @integration @SCN-DIS-001\n  Scenario: the integration-proven one\n    Given a thing\n",
    ];
    // Each sharer's OWN check has passing evidence — so were the account split, both halves would
    // balance. That is the false green the one account refuses.
    observations = [
      { qualityCheck: "unit", scnId: "SCN-DIS-001", status: "passed", locator: "dis.test.ts" },
      { qualityCheck: "integration", scnId: "SCN-DIS-001", status: "passed", locator: "features/dis.feature" },
    ];
  },
);

// @SCN-STG-015
Then(
  "that account carries both the unit and the integration check, each reading duplicate-scn-code",
  function () {
    assert.deepEqual(
      theAccount().qualityCheckReconciliations.map((q) => `${q.qualityCheck}:${q.outcome}`),
      ["unit:duplicate-scn-code", "integration:duplicate-scn-code"],
    );
  },
);

/** The three credits @SCN-STG-016 cites the shared code with — each distinct, so each is findable. */
const STG016_CREDITS: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-CRD-001", status: "passed", locator: "crd-pass.test.ts" },
  { qualityCheck: "unit", scnId: "SCN-CRD-001", status: "failed", locator: "crd-fail.test.ts" },
  { qualityCheck: "e2e", scnId: "SCN-CRD-001", status: "passed", locator: "crd-e2e.spec.ts" },
];

/** Every row's posted credits that cite the shared code, by locator. */
function postedCitingLocators(rows: readonly ScenarioReconciliation[]): string[] {
  return rows.flatMap((r) =>
    r.evidenceObservations
      .filter((o) => o.scnId === sharedCode)
      .map((o) => String(o.qualityCheck === "fitness" ? o.staticCheck : o.locator)),
  );
}

// @SCN-STG-016
Given(
  "two scenarios sharing one @SCN and three credits citing it, one passing, one failing, and one at a check neither names",
  function () {
    sharedCode = "SCN-CRD-001";
    corpusDir = undefined;
    corpus = [
      "@CRD\nFeature: credits\n\n  @unit @SCN-CRD-001\n  Scenario: the first sharer\n    Given a thing\n\n" +
        "  @unit @SCN-CRD-001\n  Scenario: the second sharer\n    Given a thing\n",
    ];
    observations = [...STG016_CREDITS];
  },
);

// @SCN-STG-016
Then("each of the three credits posts to that one account exactly once", function () {
  assert.deepEqual(
    postedCitingLocators([theAccount()]).sort(),
    STG016_CREDITS.map((o) => String(o.qualityCheck === "fitness" ? o.staticCheck : o.locator)).sort(),
    "the one account holds each citing credit once — none dropped, none doubled",
  );
});

// @SCN-STG-016
Then("no other account carries any of them", function () {
  const others = ledger.scenarioReconciliations.filter((r) => r !== theAccount());
  assert.deepEqual(postedCitingLocators(others), []);
});

// @SCN-STG-016
Then("none of them satisfies a quality check on that account", function () {
  const outcomes = theAccount().qualityCheckReconciliations.map((q) => q.outcome);
  assert.ok(outcomes.length > 0, "the account carries its quality checks");
  assert.deepEqual(
    outcomes.filter((o) => o !== "duplicate-scn-code"),
    [],
    "no credit is attributed to a sharer, so nothing satisfies and nothing else is read",
  );
});

/** A `balance` run of the BUILT binary over a target directory — what a consumer runs. */
interface BalanceRun {
  status: number;
  stderr: string;
  report: { ledger: { scenarioReconciliations: ScenarioReconciliation[] } };
  /** The saved JSON report's path, for re-rendering it. */
  jsonPath: string;
  markdown: string;
}

/** Spawn the built CLI; the report is written to files so both formats come from one run. */
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

/** The STG-018 target: SCN-DUP-001 on two scenarios beside SCN-DUP-002, every scenario cited passing. */
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

// @SCN-STG-018
Given(
  "a target whose corpus carries one @SCN on two scenarios beside a scenario of its own, every scenario cited by passing evidence",
  function () {
    corpusDir = stg018Target(true);
  },
);

// @SCN-STG-018
When("the target runs balance over it", function () {
  stg018Run = runBalanceOver(corpusDir!);
});

// @SCN-STG-018
Then("the run fails as out of balance, not as an input it cannot read", function () {
  assert.equal(stg018Run.status, 1, `expected exit 1 (out of balance); got ${stg018Run.status}. stderr: ${stg018Run.stderr}`);
});

// @SCN-STG-018
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

// @SCN-STG-018
Then("nothing says the corpus was refused", function () {
  assert.doesNotMatch(stg018Run.stderr, /names the same @SCN on more than one scenario/);
});

/** The STG-017 target: SCN-ONE-001 on a scenario in each of two files, beside SCN-TWO-001. */
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

// @SCN-STG-017
Given(
  "a target whose corpus carries one @SCN on two scenarios in two feature files, beside a scenario of its own",
  function () {
    corpusDir = stg017Target();
  },
);

// @SCN-STG-017
Then("the report states that the corpus holds three scenarios in two accounts", function () {
  assert.ok(stg018Run.markdown.includes(STG017_STATEMENT), `expected the report to state:\n${STG017_STATEMENT}`);
});

// @SCN-STG-017
Then("it names the shared code with the file and the name of each scenario carrying it", function () {
  assert.ok(stg018Run.markdown.includes(STG017_SHARERS), `expected the report to name:\n${STG017_SHARERS}`);
});

// @SCN-STG-017
Then("the report saved as JSON re-renders the same statement", function () {
  const rerendered = spawnController(["balance", "--render-from-json", stg018Run.jsonPath], corpusDir!).stdout;
  assert.ok(rerendered.includes(STG017_STATEMENT), "the re-rendered report states scenarios against accounts");
  assert.ok(rerendered.includes(STG017_SHARERS), "the re-rendered report names the sharers");
});
