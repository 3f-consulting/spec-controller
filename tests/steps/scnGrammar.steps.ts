/**
 * @integration arms for the one-grammar Rule of features/scn-tags.feature (3F-3636) — an @SCN is
 * read by evidence-manifesto §9A's grammar in every role: a feature part of two to five characters,
 * a number of any width.
 *
 * EVERY TARGET HOLDS THE BOUND FROM BOTH SIDES. The four feature parts are one, two, five and six
 * characters long, so each arm's absence (the one and the six read as nothing) sits beside the
 * presence that shows the reader was looking (the two and the five read as codes). An arm that
 * only planted over-long ids could not tell a tightened reader from one that reads nothing at all.
 *
 * THE SUBJECT IS THE BUILT BINARY `balance`, spawned over a planted target — the reading a consumer
 * gets is the command their pipeline runs.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

/** One code per feature-part length at the bound: 1 and 6 are outside §9A, 2 and 5 inside. */
const OUTSIDE = ["SCN-A-001", "SCN-SIXCHR-001"] as const;
const INSIDE = ["SCN-AB-001", "SCN-FIVEC-001"] as const;

interface GrammarRow {
  scnId: string;
  kind: string;
  qualityCheckReconciliations: { outcome: string }[];
}

interface GrammarRun {
  status: number;
  report: { ledger: { scenarioReconciliations: GrammarRow[] }; scenarioCodeErrors?: unknown[] };
  markdown: string;
}

/** The planted target: its feature files, and each evidence input the arm supplies. */
let target: { features: Record<string, string>; vitest?: unknown; cucumber?: unknown; ciSteps?: unknown };
let grammarRun: GrammarRun;

/** A feature file with one unit-tagged scenario carrying `scnId`, headed by its code when it has one. */
function scenarioFile(scnId: string): string {
  const code = scnId.split("-")[1]!;
  const header = /^[A-Z0-9]{2,5}$/.test(code) ? `@${code}\n` : "";
  return `${header}Feature: ${code.toLowerCase()}\n\n  @unit @${scnId}\n  Scenario: ${code.toLowerCase()} scenario\n    Given a thing\n`;
}

/** Spawn the built CLI's `balance` over the planted target and read both reports back. */
function balanceGrammarTarget(): GrammarRun {
  const dir = mkdtempSync(join(tmpdir(), "scn-grammar-"));
  mkdirSync(join(dir, "features"));
  for (const [name, source] of Object.entries(target.features)) writeFileSync(join(dir, "features", name), source);
  writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
  writeFileSync(join(dir, "package.json"), "{}\n");
  const args = ["--features", join(dir, "features"), "--ci", join(dir, "ci.yml"), "--package-json", join(dir, "package.json")];
  const inputs = [
    ["vitest", target.vitest],
    ["cucumber", target.cucumber],
    ["ci-steps", target.ciSteps],
  ] as const;
  for (const [flag, content] of inputs) {
    if (content === undefined) continue;
    writeFileSync(join(dir, `${flag}.json`), JSON.stringify(content));
    args.push(`--${flag}`, join(dir, `${flag}.json`));
  }
  const jsonPath = join(dir, "report.json");
  const mdPath = join(dir, "report.md");
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "balance", ...args, "--format", `json:${jsonPath}`, "--format", `md:${mdPath}`],
    { cwd: dir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `spec-controller failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(jsonPath), `expected the report written; exit ${result.status}, stderr: ${result.stderr}`);
  return {
    status: result.status ?? -1,
    report: JSON.parse(readFileSync(jsonPath, "utf8")),
    markdown: readFileSync(mdPath, "utf8"),
  };
}

/** The ledger row for an id, or undefined when the ledger opened none. */
function rowOf(scnId: string): GrammarRow | undefined {
  return grammarRun.report.ledger.scenarioReconciliations.find((row) => row.scnId === scnId);
}

// @SCN-STG-024
Given(
  "a target whose four scenarios are tagged with feature parts of one, two, five and six characters, each in a file of its own",
  function () {
    target = { features: Object.fromEntries([...OUTSIDE, ...INSIDE].map((id) => [`${id.toLowerCase()}.feature`, scenarioFile(id)])) };
  },
);

// @SCN-STG-024 (and every arm of this Rule)
When("balance reconciles that grammar target", function () {
  grammarRun = balanceGrammarTarget();
});

// @SCN-STG-024
Then("the two- and five-character codes are accounts", function () {
  for (const id of INSIDE) {
    assert.equal(rowOf(id)?.kind, "scenario", `expected an account for ${id}; got ${JSON.stringify(rowOf(id))}`);
  }
});

// @SCN-STG-024
Then(
  "the scenarios tagged with a one- and a six-character feature part carry no @SCN code, and no account is opened for either",
  function () {
    for (const id of OUTSIDE) {
      assert.equal(rowOf(id), undefined, `expected no account for ${id}; got ${JSON.stringify(rowOf(id))}`);
    }
    const uncoded = grammarRun.report.ledger.scenarioReconciliations.filter((row) =>
      row.qualityCheckReconciliations.some((qcr) => qcr.outcome === "no-scn-code"),
    );
    assert.equal(uncoded.length, OUTSIDE.length, `expected ${OUTSIDE.length} uncoded scenarios; got ${JSON.stringify(uncoded)}`);
  },
);

// @SCN-STG-024 (and every arm of this Rule)
Then("the grammar target lists no scenario code error", function () {
  assert.deepEqual(grammarRun.report.scenarioCodeErrors ?? [], [], `expected no scenario code error; got ${JSON.stringify(grammarRun.report.scenarioCodeErrors)}`);
});

/** The target's own scenario, which every evidence arm below also proves, so it balances. */
const OWN = "SCN-OWN-001";

/** The rows of one kind — `phantom-scenario` or `suspense-scenario`. */
function rowsOfKind(kind: string): GrammarRow[] {
  return grammarRun.report.ledger.scenarioReconciliations.filter((row) => row.kind === kind);
}

/** How many credits the suspense row carries as citing no scenario. */
function suspenseCredits(): number {
  return rowsOfKind("suspense-scenario")
    .flatMap((row) => row.qualityCheckReconciliations)
    .filter((qcr) => qcr.outcome === "cites-no-scenario").length;
}

// @SCN-STG-025
Given(
  "a target with one scenario of its own, and a Vitest report whose passing titles cite feature parts of one, two, five and six characters that no scenario carries",
  function () {
    const titles = [OWN, ...OUTSIDE, ...INSIDE].map((id) => ({ fullName: `[${id}] a passing test`, status: "passed" }));
    target = {
      features: { "own.feature": scenarioFile(OWN) },
      vitest: { testResults: [{ name: "t.test.ts", assertionResults: titles }] },
    };
  },
);

// @SCN-STG-025
Then("the two- and five-character citations open phantom scenarios", function () {
  for (const id of INSIDE) {
    assert.equal(rowOf(id)?.kind, "phantom-scenario", `expected a phantom for ${id}; got ${JSON.stringify(rowOf(id))}`);
  }
  assert.equal(rowOf(OWN)?.kind, "scenario", `expected the target's own scenario as an account`);
});

// @SCN-STG-025
Then(
  "the one- and six-character titles cite no scenario, so both credits post to the suspense scenario",
  function () {
    for (const id of OUTSIDE) assert.equal(rowOf(id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(id))}`);
    assert.equal(suspenseCredits(), OUTSIDE.length, `expected ${OUTSIDE.length} uncited credits; got ${JSON.stringify(rowsOfKind("suspense-scenario"))}`);
  },
);

// @SCN-STG-026
Given(
  "a target with one scenario of its own, and a Cucumber report whose passing scenarios are tagged with feature parts of one, two, five and six characters that no scenario carries",
  function () {
    const elements = [OWN, ...OUTSIDE, ...INSIDE].map((id) => ({
      name: `${id} scenario`,
      tags: [{ name: "@integration" }, { name: `@${id}` }],
      steps: [{ result: { status: "passed" } }],
    }));
    target = {
      features: { "own.feature": scenarioFile(OWN).replace("@unit", "@integration") },
      cucumber: [{ uri: "features/own.feature", elements }],
    };
  },
);

// @SCN-STG-026
Then(
  "the one- and six-character Cucumber scenarios cite no scenario, so both credits post to the suspense scenario",
  function () {
    for (const id of OUTSIDE) assert.equal(rowOf(id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(id))}`);
    assert.equal(suspenseCredits(), OUTSIDE.length, `expected ${OUTSIDE.length} uncited credits; got ${JSON.stringify(rowsOfKind("suspense-scenario"))}`);
  },
);

// @SCN-STG-027
Given(
  "a target with one scenario of its own, and a CI step record whose successful steps are keyed by feature parts of one, two, five and six characters that no scenario carries",
  function () {
    const step = { outputs: {}, outcome: "success", conclusion: "success" };
    target = {
      features: { "own.feature": scenarioFile(OWN) },
      vitest: { testResults: [{ name: "t.test.ts", assertionResults: [{ fullName: `[${OWN}] proven`, status: "passed" }] }] },
      ciSteps: Object.fromEntries([...OUTSIDE, ...INSIDE].map((id) => [id, step])),
    };
  },
);

// @SCN-STG-027 — a step id that is not an @SCN is a consumer's own plumbing, and cites nothing:
// it is not even an uncited credit (parse/fitnessCitations.ts), so the rows hold no trace of it.
Then("the one- and six-character step ids post no credit at all", function () {
  for (const id of OUTSIDE) assert.equal(rowOf(id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(id))}`);
  assert.equal(suspenseCredits(), 0, `expected no uncited credit; got ${JSON.stringify(rowsOfKind("suspense-scenario"))}`);
  const rows = grammarRun.report.ledger.scenarioReconciliations.map((row) => row.scnId);
  assert.deepEqual(rows.sort(), [OWN, ...INSIDE].sort(), `expected only the target's own row and the two phantoms; got ${JSON.stringify(rows)}`);
});

/** The corpus audit the report carries beside the ledger. */
function corpusAudit(): { excludedOccurrences: number; proseOnlyCodes: string[] } {
  return (grammarRun.report as unknown as { evidenceObligations: { excludedOccurrences: number; proseOnlyCodes: string[] } })
    .evidenceObligations;
}

// @SCN-STG-028
Given(
  "a target whose only scenario mentions, in a step and a comment, untagged ids with feature parts of one, two, five and six characters",
  function () {
    const [one, six] = OUTSIDE;
    const [two, five] = INSIDE;
    const source =
      `@OWN\nFeature: own\n\n  @unit @${OWN}\n  Scenario: own scenario\n` +
      `    Given the prose mentions @${one} and @${two}\n    # and a comment mentions @${five} and @${six}\n    And a thing\n`;
    target = {
      features: { "own.feature": source },
      vitest: { testResults: [{ name: "t.test.ts", assertionResults: [{ fullName: `[${OWN}] proven`, status: "passed" }] }] },
    };
  },
);

// @SCN-STG-028
Then(
  "the report counts two @SCN ids seen in non-tag context, and lists the two- and five-character codes as appearing only in prose",
  function () {
    assert.equal(corpusAudit().excludedOccurrences, INSIDE.length, `got ${JSON.stringify(corpusAudit())}`);
    assert.deepEqual([...corpusAudit().proseOnlyCodes].sort(), [...INSIDE].sort(), `got ${JSON.stringify(corpusAudit())}`);
    assert.match(grammarRun.markdown, /- 2 @SCN ids seen in non-tag context, excluded/);
  },
);

// @SCN-STG-028
Then("it counts and lists neither the one- nor the six-character id", function () {
  for (const id of OUTSIDE) {
    assert.ok(!corpusAudit().proseOnlyCodes.includes(id), `expected ${id} not listed; got ${JSON.stringify(corpusAudit())}`);
  }
});
