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
import { Before, Given, When, Then } from "@cucumber/cucumber";
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
    scenarioCodeErrors?: {
      kind: string;
      files: string[];
      namedFeatureCode?: string;
      namedFeatureFiles?: string[];
      message: string;
    }[];
    scenarioCodePopulation?: { featureFiles: number; featureCodes: number };
  };
  jsonPath: string;
  markdown: string;
}

/** The feature files of the target under test, `name → source`. */
let files: Record<string, string> = {};
/** The ids left without evidence, so their rows are out of balance and the by-feature cut lists them. */
let uncited = new Set<string>();
let run: CodeRun;

Before(function () {
  uncited = new Set();
});

/** A feature file headed `@<code>` (uncoded when null) holding one unit-tagged scenario per id. */
function featureFile(code: string | null, ids: readonly string[]): string {
  const header = code === null ? "" : `@${code}\n`;
  const scenarios = ids.map((id, i) => `  @unit @${id}\n  Scenario: scenario ${i}\n    Given a thing\n`);
  return `${header}Feature: target\n\n${scenarios.join("\n")}`;
}

/** Every @SCN the files carry, bar the uncited, each cited by one passing Vitest assertion. */
function citedIds(): string[] {
  const ids = new Set(Object.values(files).flatMap((source) => source.match(/SCN-[A-Z0-9]+-\d+/g) ?? []));
  return [...ids].filter((id) => !uncited.has(id));
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
  "a target whose file headed @TWO holds an uncited scenario coded @SCN-ONE-002, beside a file headed @ONE",
  function () {
    files = {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001", "SCN-ONE-002"]),
    };
    // Out of balance, so the by-feature cut prints the row the finding must agree with.
    uncited = new Set(["SCN-ONE-002"]);
  },
);

/** The `foreign-scn-code` finding this run carries: exactly one is expected. */
function foreignFinding(): NonNullable<CodeRun["report"]["scenarioCodeErrors"]>[number] {
  const foreign = (run.report.scenarioCodeErrors ?? []).filter((e) => e.kind === "foreign-scn-code");
  assert.equal(foreign.length, 1, `expected one foreign-scn-code; got ${JSON.stringify(run.report.scenarioCodeErrors)}`);
  return foreign[0]!;
}

/** The Feature cell of the by-feature row that lists `scnId`, read off the report's own cut. */
function byFeatureLabelOf(scnId: string): string {
  const start = run.markdown.indexOf("### Out-of-balance by feature");
  assert.ok(start >= 0, `expected an out-of-balance-by-feature cut; got:\n${run.markdown}`);
  const row = run.markdown
    .slice(start)
    .split("\n")
    .find((line) => line.startsWith("| ") && line.split("|")[3]?.includes(scnId));
  assert.ok(row, `expected a by-feature row listing ${scnId}`);
  return row.split("|")[1]!.trim();
}

// @SCN-STG-011
Then(
  "they name the file headed @ONE as where the by-feature cut counts the scenario, the row the report lists it under",
  function () {
    const finding = foreignFinding();
    assert.deepEqual(finding.namedFeatureFiles, ["one.feature"], "the finding carries the one file headed @ONE");
    const slug = /^(\S+) \(ONE\)$/.exec(byFeatureLabelOf("SCN-ONE-002"))?.[1];
    assert.equal(slug, "one", "the report's by-feature cut counts the scenario under the file headed @ONE");
    assert.ok(finding.message.includes(`${slug}.feature`), `expected the finding to name ${slug}.feature; got ${finding.message}`);
    assert.ok(section(run.markdown).includes(`${slug}.feature`), "the section names it too");
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

// @SCN-STG-011
When("a second file is also headed @ONE and the offending scenario is coded @SCN-ONE-002 again", function () {
  files = {
    "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
    "one-b.feature": featureFile("ONE", ["SCN-ONE-003"]),
    "two.feature": featureFile("TWO", ["SCN-TWO-001", "SCN-ONE-002"]),
  };
  run = balance();
});

// @SCN-STG-011
Then(
  "the scenario code errors name foreign-scn-code with both files headed @ONE, presenting neither as the file",
  function () {
    assert.equal(run.status, 1, `expected exit 1; got ${run.status}. stderr: ${run.stderr}`);
    const finding = foreignFinding();
    assert.deepEqual([...(finding.namedFeatureFiles ?? [])].sort(), ["one-b.feature", "one.feature"]);
    for (const file of ["one.feature", "one-b.feature"]) {
      assert.ok(finding.message.includes(file), `expected the finding to name ${file}; got ${finding.message}`);
    }
  },
);

/** Assert the finding offers no file the corpus lacks: no `@THR` header, and no file but its own. */
function assertNoMoveToThr(finding: ReturnType<typeof foreignFinding>): void {
  assert.deepEqual(finding.namedFeatureFiles, [], "no file's header carries THR");
  assert.ok(!/@THR\b/.test(finding.message), `expected no file headed @THR offered; got ${finding.message}`);
  const named = [...new Set(finding.message.match(/[\w-]+\.feature/g) ?? [])];
  assert.deepEqual(named, ["two.feature"], `expected no file named but its own; got ${finding.message}`);
}

// @SCN-STG-022
Given(
  "a target whose file headed @TWO holds an uncited scenario coded @SCN-THR-002, beside a file headed @ONE and no file headed @THR",
  function () {
    files = {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001", "SCN-THR-002"]),
    };
    uncited = new Set(["SCN-THR-002"]);
  },
);

// @SCN-STG-022
Then("the foreign-scn-code finding names two.feature, the id @SCN-THR-002 and the code @TWO that file carries", function () {
  assertListed("foreign-scn-code", ["two.feature", "SCN-THR-002", "@TWO"]);
});

// @SCN-STG-022
Then("it says no file carries THR, and the report's by-feature row for THR names no file", function () {
  assert.deepEqual(foreignFinding().namedFeatureFiles, [], "no file's header carries THR");
  assert.equal(byFeatureLabelOf("SCN-THR-002"), "THR", "the by-feature row stands for no file");
});

// @SCN-STG-022
Then("it offers no move to a file headed @THR", function () {
  assertNoMoveToThr(foreignFinding());
});

// @SCN-STG-022
When("the only other file using THR carries no header code and holds @SCN-THR-001", function () {
  files["thr.feature"] = featureFile(null, ["SCN-THR-001"]);
  run = balance();
});

// @SCN-STG-022
Then(
  "the foreign-scn-code finding still says no file carries THR, and offers no move to a file headed @THR",
  function () {
    assert.equal(run.status, 1, `expected exit 1; got ${run.status}. stderr: ${run.stderr}`);
    assertNoMoveToThr(foreignFinding());
  },
);

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

const STG021_DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

/** A feature file carrying no header code and no coded scenario. */
const UNCODED = "Feature: plain\n\n  @unit\n  Scenario: an uncoded scenario\n    Given a thing\n";

// @SCN-STG-021
Given(
  "a target of three feature files, two each carrying a header code of its own with every scenario coded for it, and one carrying no code and no coded scenario",
  function () {
    files = {
      "one.feature": featureFile("ONE", ["SCN-ONE-001"]),
      "two.feature": featureFile("TWO", ["SCN-TWO-001"]),
      "plain.feature": UNCODED,
    };
  },
);

// @SCN-STG-021
When("the target is one feature file carrying no code and no coded scenario", function () {
  files = { "plain.feature": UNCODED };
  run = balance();
});

// @SCN-STG-021
When(
  "the target is two feature files, one carrying a header code and one carrying no code and no coded scenario",
  function () {
    files = { "one.feature": featureFile("ONE", ["SCN-ONE-001"]), "plain.feature": UNCODED };
    run = balance();
  },
);

/** The number the section's first statement puts before `noun` (`feature file`, `feature code`). */
function countBefore(noun: string): number | undefined {
  const statement = section(run.markdown).split("\n\n")[1] ?? "";
  const match = new RegExp(`(\\d+) ${noun}s?\\b`).exec(statement);
  return match ? Number(match[1]) : undefined;
}

// @SCN-STG-021
Then(
  "the report's scenario code errors section states the codes are clean over {int} feature file(s) carrying {int} feature code(s)",
  function (featureFiles: number, featureCodes: number) {
    assert.deepEqual(run.report.scenarioCodeErrors, [], "the codes are clean");
    assert.deepEqual(run.report.scenarioCodePopulation, { featureFiles, featureCodes }, "the JSON carries the corpus's own counts");
    const statement = section(run.markdown).split("\n\n")[1] ?? "";
    assert.match(statement, /\bclean\b/, `expected the codes stated clean; got:\n${statement}`);
    assert.equal(countBefore("feature file"), featureFiles, `expected ${featureFiles} feature files stated; got:\n${statement}`);
    assert.equal(countBefore("feature code"), featureCodes, `expected ${featureCodes} feature codes stated; got:\n${statement}`);
  },
);

// @SCN-STG-023
Given("a target whose feature directory holds no feature file", function () {
  files = {};
});

// @SCN-STG-023
Then("the run has nothing to reconcile", function () {
  assert.equal(run.status, 5, `expected exit 5, nothing to reconcile; got ${run.status}. stderr: ${run.stderr}`);
});

// @SCN-STG-023
Then(
  "the report's scenario code errors section says no feature file was judged, stating no code clean and no count",
  function () {
    assert.deepEqual(run.report.scenarioCodePopulation, { featureFiles: 0, featureCodes: 0 });
    const statement = section(run.markdown).split("\n\n")[1] ?? "";
    assert.doesNotMatch(statement, /\bclean\b/, `expected no code stated clean; got:\n${statement}`);
    assert.equal(countBefore("feature file"), undefined, `expected no feature-file count; got:\n${statement}`);
    assert.equal(countBefore("feature code"), undefined, `expected no feature-code count; got:\n${statement}`);
    assert.match(statement, /\bno feature file\b/i, `expected it to say no feature file was judged; got:\n${statement}`);
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
