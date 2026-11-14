import { Given, Then, When } from "@cucumber/cucumber";
import Ajv from "ajv";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const CLI = resolve("packages/spec-controller/dist/cli.js");

const SCHEMA = resolve("packages/spec-controller/dist/spec-reconciliation.schema.json");

const VARIANTS = resolve("packages/core/src/reports/json.variants.json");

type Report = Record<string, unknown> & { readonly totals: { readonly claimReconciliations: Record<string, unknown> } };

interface SchemaCheck {
  reports: readonly (readonly [string, Report])[];
  results: readonly (readonly [string, boolean, string])[];
}

// The JSON report the built command writes for a target with one feature file.
function realReport(): Report {
  const folder = temporaryDirectory("report-schema-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n");
  const run = spawnSync(process.execPath, [CLI, "balance", "--features", "features", "--format", "json"], { cwd: folder, encoding: "utf8" });
  assert.notEqual(run.stdout, "", `the command wrote no report, exiting ${run.status}: ${run.stderr}`);
  return JSON.parse(run.stdout) as Report;
}

// Each way a report breaks its schema, as one change made to a real run's report.
const BREAKING: Readonly<Record<string, (report: Report) => Report>> = {
  "a required part removed": ({ totals: _totals, ...rest }) => rest as Report,
  "a part the schema does not name": (report) => ({ ...report, extra: 1 }),
  "text where a count goes": (report) => ({ ...report, totals: { ...report.totals, claimReconciliations: { ...report.totals.claimReconciliations, total: "1" } } }),
};

// Each report checked: a real run's report as written, or as broken by every variant of its claim.
const WRITTEN: Readonly<Record<string, readonly string[]>> = {
  "a JSON report from a real run": ["as written"],
  "a JSON report with one of its required parts removed": (JSON.parse(readFileSync(VARIANTS, "utf8")) as Record<string, { readonly variants: readonly string[] }>)["CLM-RPT-102"]!.variants,
};

Given(/^(a JSON report .+) was written$/, function (this: SchemaCheck, written: string) {
  const changes = WRITTEN[written];
  assert.ok(changes, `no report is written for "${written}"`);
  const report = realReport();
  this.reports = changes.map((change) => [change, change === "as written" ? report : BREAKING[change]!(report)]);
});

When("it is checked against the schema", function (this: SchemaCheck) {
  const validate = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync(SCHEMA, "utf8")));
  this.results = this.reports.map(([change, report]) => [change, validate(report), JSON.stringify(validate.errors)]);
});

Then(/^it will be (accepted|refused)$/, function (this: SchemaCheck, result: string) {
  for (const [change, accepted, errors] of this.results) assert.equal(accepted, result === "accepted", `${change}: ${errors}`);
});
