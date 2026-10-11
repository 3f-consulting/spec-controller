import { After, Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

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
}

let target: { features: Record<string, string>; vitest?: unknown; cucumber?: unknown; ciSteps?: unknown };
let grammarRun: GrammarRun;
const temporaryDirectories: string[] = [];

After(function () {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function scenarioFile(scnId: string): string {
  const code = scnId.split("-")[1]!;
  const header = /^[A-Z0-9]{2,5}$/.test(code) ? `@${code}\n` : "";
  return `${header}Feature: ${code.toLowerCase()}\n\n  @unit @${scnId}\n  Scenario: ${code.toLowerCase()} scenario\n    Given a thing\n`;
}

function balanceGrammarTarget(): GrammarRun {
  const dir = mkdtempSync(join(tmpdir(), "scn-grammar-"));
  temporaryDirectories.push(dir);
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
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "balance", ...args, "--format", `json:${jsonPath}`],
    { cwd: dir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `spec-controller failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(jsonPath), `expected the report written; exit ${result.status}, stderr: ${result.stderr}`);
  return {
    status: result.status ?? -1,
    report: JSON.parse(readFileSync(jsonPath, "utf8")),
  };
}

function rowOf(scnId: string): GrammarRow | undefined {
  return grammarRun.report.ledger.scenarioReconciliations.find((row) => row.scnId === scnId);
}

When("balance reconciles that grammar target", function () {
  grammarRun = balanceGrammarTarget();
});

Then("the grammar target lists no scenario code error", function () {
  assert.deepEqual(grammarRun.report.scenarioCodeErrors ?? [], [], `expected no scenario code error; got ${JSON.stringify(grammarRun.report.scenarioCodeErrors)}`);
});

const OWN = "SCN-OWN-001";

function rowsOfKind(kind: string): GrammarRow[] {
  return grammarRun.report.ledger.scenarioReconciliations.filter((row) => row.kind === kind);
}

function suspenseObservations(): number {
  return rowsOfKind("suspense-scenario")
    .flatMap((row) => row.qualityCheckReconciliations)
    .filter((qcr) => qcr.outcome === "cites-no-scenario").length;
}

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

Then("the two- and five-character citations open phantom scenarios", function () {
  for (const id of INSIDE) {
    assert.equal(rowOf(id)?.kind, "phantom-scenario", `expected a phantom for ${id}; got ${JSON.stringify(rowOf(id))}`);
  }
  assert.equal(rowOf(OWN)?.kind, "scenario", `expected the target's own scenario as an account`);
});

Then(
  "the one- and six-character titles cite no scenario, so both evidence observations post to the suspense scenario",
  function () {
    for (const id of OUTSIDE) assert.equal(rowOf(id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(id))}`);
    assert.equal(suspenseObservations(), OUTSIDE.length, `expected ${OUTSIDE.length} uncited evidence observations; got ${JSON.stringify(rowsOfKind("suspense-scenario"))}`);
  },
);

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

Then(
  "the one- and six-character Cucumber scenarios cite no scenario, so both evidence observations post to the suspense scenario",
  function () {
    for (const id of OUTSIDE) assert.equal(rowOf(id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(id))}`);
    assert.equal(suspenseObservations(), OUTSIDE.length, `expected ${OUTSIDE.length} uncited evidence observations; got ${JSON.stringify(rowsOfKind("suspense-scenario"))}`);
  },
);

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

Then("the one- and six-character step ids post no evidence observation at all", function () {
  for (const id of OUTSIDE) assert.equal(rowOf(id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(id))}`);
  assert.equal(suspenseObservations(), 0, `expected no uncited evidence observation; got ${JSON.stringify(rowsOfKind("suspense-scenario"))}`);
  const rows = grammarRun.report.ledger.scenarioReconciliations.map((row) => row.scnId);
  assert.deepEqual(rows.sort(), [OWN, ...INSIDE].sort(), `expected only the target's own row and the two phantoms; got ${JSON.stringify(rows)}`);
});
