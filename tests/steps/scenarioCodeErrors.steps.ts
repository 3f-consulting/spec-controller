/**
 * @integration arms for the scenario-code-error Rule of features/scn-tags.feature (3F-3635) — a
 * code filed under the wrong class, a class with no number, or two classes with one number is
 * listed under `## Scenario code errors`, and the run reds.
 *
 * THE SUBJECT IS THE BUILT BINARY `balance`, spawned over a planted target, because what a
 * consumer gets is the command their pipeline already runs: the discovery, the report and the
 * exit status together. Its own file rather than scnAccounts.steps.ts, which owns the step text
 * `the target runs balance over it` for its own Rule.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

/** What one `balance` run left behind: its status, its JSON report and its markdown. */
interface CodeRun {
  status: number;
  stderr: string;
  report: {
    ledger: { scenarioReconciliations: { scnId: string | null }[] };
    scenarioCodeErrors?: { kind: string; files: string[]; message: string }[];
  };
  jsonPath: string;
  markdown: string;
}

/** The feature files of the target under test, `name → source`. */
let files: Record<string, string> = {};
let run: CodeRun;

/** A feature file headed `@<code>` (uncoded when null) holding one unit-tagged scenario per id. */
function featureFile(code: string | null, ids: readonly string[]): string {
  const header = code === null ? "" : `@${code}\n`;
  const scenarios = ids.map((id, i) => `  @unit @${id}\n  Scenario: scenario ${i}\n    Given a thing\n`);
  return `${header}Feature: target\n\n${scenarios.join("\n")}`;
}

/** Every @SCN the files carry, each cited by one passing Vitest assertion. */
function citedIds(): string[] {
  return [...new Set(Object.values(files).flatMap((source) => source.match(/SCN-[A-Z0-9]+-\d+/g) ?? []))];
}

/** Write the target, spawn the built CLI's `balance` over it, and read both reports back. */
function balance(): CodeRun {
  const dir = mkdtempSync(join(tmpdir(), "scn-code-errors-"));
  mkdirSync(join(dir, "features"));
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, "features", name), source);
  writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
  writeFileSync(join(dir, "package.json"), "{}\n");
  writeFileSync(
    join(dir, "vitest.json"),
    JSON.stringify({
      testResults: [
        { name: "t.test.ts", assertionResults: citedIds().map((id) => ({ fullName: `[${id}] proven`, status: "passed" })) },
      ],
    }),
  );
  const jsonPath = join(dir, "report.json");
  const mdPath = join(dir, "report.md");
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(dir, "features"),
      "--vitest", join(dir, "vitest.json"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", `json:${jsonPath}`,
      "--format", `md:${mdPath}`,
    ],
    { cwd: dir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `spec-controller failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(jsonPath), `expected the report written; exit ${result.status}, stderr: ${result.stderr}`);
  return {
    status: result.status ?? -1,
    stderr: result.stderr,
    report: JSON.parse(readFileSync(jsonPath, "utf8")),
    jsonPath,
    markdown: readFileSync(mdPath, "utf8"),
  };
}

/** The `## Scenario code errors` section of the markdown, up to the next `## ` heading. */
function section(markdown: string): string {
  const start = markdown.indexOf("## Scenario code errors");
  assert.ok(start >= 0, `expected a "## Scenario code errors" section; got:\n${markdown}`);
  const next = markdown.indexOf("\n## ", start + 1);
  return markdown.slice(start, next < 0 ? undefined : next);
}

/** Assert the run lists exactly one error of `kind`, naming each of `named` on both surfaces. */
function assertListed(kind: string, named: readonly string[]): void {
  const errors = run.report.scenarioCodeErrors ?? [];
  assert.deepEqual(errors.map((e) => e.kind), [kind], `expected one ${kind}; got ${JSON.stringify(errors)}`);
  const listed = section(run.markdown);
  assert.ok(listed.includes(`\`${kind}\``), `expected the section to name ${kind}; got:\n${listed}`);
  for (const text of named) {
    assert.ok(errors[0]!.message.includes(text), `expected the JSON error to name ${text}; got ${errors[0]!.message}`);
    assert.ok(listed.includes(text), `expected the section to name ${text}; got:\n${listed}`);
  }
}

// @SCN-STG-011
Given(
  "a target whose file headed @TWO holds a scenario coded @SCN-ONE-002, beside a file headed @ONE",
  function () {
    files = {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001", "SCN-ONE-002"]),
    };
  },
);

// @SCN-STG-011
When("balance reconciles that target", function () {
  run = balance();
});

// @SCN-STG-011
Then("the run fails on a scenario code error", function () {
  assert.equal(run.status, 1, `expected exit 1; got ${run.status}. stderr: ${run.stderr}`);
  assert.ok((run.report.scenarioCodeErrors ?? []).length > 0, "expected the run to carry a scenario code error");
});

// @SCN-STG-011
Then(
  "the scenario code errors name foreign-scn-code with the file, the offending id and the code that file carries",
  function () {
    assertListed("foreign-scn-code", ["two.feature", "SCN-ONE-002", "@TWO"]);
  },
);

// @SCN-STG-011
Then("they do not name the scenario whose code agrees with its file", function () {
  assert.ok(!section(run.markdown).includes("SCN-TWO-001"), "the scenario filed under its own code is not convicted");
});

// @SCN-STG-011
When("the offending scenario is coded @SCN-ONE-1 instead", function () {
  files["two.feature"] = featureFile("TWO", ["SCN-TWO-001", "SCN-ONE-1"]);
  run = balance();
});

// @SCN-STG-011
Then("the scenario code errors name foreign-scn-code for @SCN-ONE-1 in the same way", function () {
  assert.equal(run.status, 1, `expected exit 1; got ${run.status}. stderr: ${run.stderr}`);
  assertListed("foreign-scn-code", ["two.feature", "SCN-ONE-1", "@TWO"]);
});

// @SCN-STG-011
When("the offending scenario is re-coded to its own file", function () {
  files["two.feature"] = featureFile("TWO", ["SCN-TWO-001", "SCN-TWO-002"]);
  run = balance();
});

// @SCN-STG-011
Then("the run balances with no scenario code error", function () {
  assert.equal(run.status, 0, `expected exit 0; got ${run.status}. stderr: ${run.stderr}`);
  assert.deepEqual(run.report.scenarioCodeErrors, []);
});

// @SCN-STG-010
Given("a target whose two feature files both carry the header code @ONE", function () {
  files = {
    "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
    "one-b.feature": featureFile("ONE", ["SCN-ONE-002"]),
  };
});

// @SCN-STG-010
Then(
  "the scenario code errors name duplicate-feature-code with the code and both files that carry it",
  function () {
    assertListed("duplicate-feature-code", ["@ONE", "one.feature", "one-b.feature"]);
  },
);

// @SCN-STG-010
When("one of the two files is given a code of its own", function () {
  files = {
    "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
    "one-b.feature": featureFile("TWO", ["SCN-TWO-001"]),
  };
  run = balance();
});

// @SCN-STG-019
Given(
  "a target whose file carrying no header code holds a scenario coded @SCN-UNC-001, beside a file headed @ONE",
  function () {
    files = {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "unc.feature": featureFile(null, ["SCN-UNC-001"]),
    };
  },
);

// @SCN-STG-019
Then("the scenario code errors name no-feature-code with the file that carries no header code", function () {
  assertListed("no-feature-code", ["unc.feature"]);
});

// @SCN-STG-019
When(
  "that file is headed @TOOLONGCODE, a header code of more than five characters, and its scenario is coded @SCN-TOOLONGCODE-001",
  function () {
    delete files["unc.feature"];
    files["long.feature"] = featureFile("TOOLONGCODE", ["SCN-TOOLONGCODE-001"]);
    run = balance();
  },
);

// @SCN-STG-019
Then("the scenario code errors name no-feature-code with that file in the same way", function () {
  assert.equal(run.status, 1, `expected exit 1; got ${run.status}. stderr: ${run.stderr}`);
  assertListed("no-feature-code", ["long.feature"]);
});

// @SCN-STG-019
When("the file carrying no header code holds only scenarios that carry no code", function () {
  delete files["long.feature"];
  files["plain.feature"] = "Feature: plain\n\n  @unit\n  Scenario: an uncoded scenario\n    Given a thing\n";
  run = balance();
});

// @SCN-STG-019
Then("the run lists no scenario code error", function () {
  assert.deepEqual(run.report.scenarioCodeErrors, []);
});

/** The three misfilings, each beside its correctly filed twin — the same codes, filed rightly. */
const MISFILED_PAIRS: { misfiled: Record<string, string>; twin: Record<string, string> }[] = [
  {
    misfiled: {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001", "SCN-ONE-002"]),
    },
    twin: {
      "one.feature": featureFile("ONE", ["SCN-ONE-001", "SCN-ONE-002"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001"]),
    },
  },
  {
    misfiled: { "one.feature": featureFile("ONE", ["SCN-ONE-001"]), "unc.feature": featureFile(null, ["SCN-UNC-001"]) },
    twin: { "one.feature": featureFile("ONE", ["SCN-ONE-001"]), "unc.feature": featureFile("UNC", ["SCN-UNC-001"]) },
  },
  {
    misfiled: { "one.feature": featureFile("ONE", ["SCN-ONE-001"]), "one-b.feature": featureFile("ONE", ["SCN-ONE-002"]) },
    twin: { "one.feature": featureFile("ONE", ["SCN-ONE-001", "SCN-ONE-002"]) },
  },
];

let pairRuns: { misfiled: CodeRun; twin: CodeRun }[] = [];

// @SCN-STG-020
Given(
  "three targets, one misfiling a scenario code in each of the three ways, and each one's correctly filed twin",
  function () {
    pairRuns = [];
  },
);

// @SCN-STG-020
When("balance reconciles each target and its twin", function () {
  pairRuns = MISFILED_PAIRS.map(({ misfiled, twin }) => {
    files = misfiled;
    const misfiledRun = balance();
    files = twin;
    return { misfiled: misfiledRun, twin: balance() };
  });
});

// @SCN-STG-020
Then("each target's accounts reconcile exactly as its twin's do", function () {
  // Keyed by the code, as the ledger is: the twin files the same accounts in a different file
  // order, and rows are listed in file order.
  const byCode = (run: CodeRun) =>
    [...run.report.ledger.scenarioReconciliations].sort((a, b) => String(a.scnId).localeCompare(String(b.scnId)));
  for (const { misfiled, twin } of pairRuns) {
    assert.deepEqual(byCode(misfiled), byCode(twin));
  }
});

// @SCN-STG-020
Then("only the scenario code errors tell them apart", function () {
  for (const { misfiled, twin } of pairRuns) {
    assert.equal((misfiled.report.scenarioCodeErrors ?? []).length, 1, "the misfiled target carries its one error");
    assert.deepEqual(twin.report.scenarioCodeErrors, [], "its twin carries none");
    const summaryOf = (run: CodeRun) => (run.report as unknown as { summary: unknown }).summary;
    assert.deepEqual(summaryOf(misfiled), summaryOf(twin), "the summaries agree");
  }
});

const STG021_STATEMENT =
  "Scenario codes are clean — 2 feature codes, each carried by exactly one of 2 feature files, " +
  "and every coded scenario sits in the file its code names.";
const STG021_DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

// @SCN-STG-021
Given(
  "a target whose two feature files each carry a header code of their own, every scenario coded for its file",
  function () {
    files = {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001"]),
    };
  },
);

// @SCN-STG-021
Then(
  "the report's scenario code errors section states the codes are clean, with the number of feature codes and feature files",
  function () {
    assert.ok(section(run.markdown).includes(STG021_STATEMENT), `expected:\n${STG021_STATEMENT}\ngot:\n${section(run.markdown)}`);
  },
);

// @SCN-STG-021
Then("it says a duplicated scenario code is reported on its account's rows", function () {
  assert.ok(section(run.markdown).includes(STG021_DUPLICATE_LINE), `expected:\n${STG021_DUPLICATE_LINE}`);
});

// @SCN-STG-021
Then("the report saved as JSON re-renders the same section", function () {
  const rerendered = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", "--render-from-json", run.jsonPath], {
    encoding: "utf8",
  });
  assert.equal(section(rerendered.stdout), section(run.markdown));
});
