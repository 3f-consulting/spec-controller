import { Given, Then, When } from "@cucumber/cucumber";
import Ajv from "ajv";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const CLI = resolve("packages/spec-controller/dist/cli.js");

const SCHEMA = resolve("packages/spec-controller/dist/spec-reconciliation.schema.json");

type Report = Record<string, unknown> & { readonly totals: { readonly claimReconciliations: Record<string, unknown> } };

interface SchemaCheck {
  reports: readonly Report[];
  accepted: boolean;
  errors: string;
}

// The JSON report the built command writes for a target with one feature file and the settings file given.
function realReport(settingsFile: string): Report {
  const folder = temporaryDirectory("report-schema-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n");
  writeFileSync(join(folder, "spec-controller.yml"), settingsFile);
  const run = spawnSync(process.execPath, [CLI, "balance", "--config", "spec-controller.yml", "--features", "features", "--format", "json"], { cwd: folder, encoding: "utf8" });
  assert.notEqual(run.stdout, "", `the command wrote no report, exiting ${run.status}: ${run.stderr}`);
  return JSON.parse(run.stdout) as Report;
}

// The settings files of the real runs whose reports are checked: one that sets nothing, and one with a key that names no
// setting, so its run is not reconciled for configuration errors.
const REAL_RUNS = ["", "unitt: [vitest]\n"];

// Each report checked, as a real run's report with one change made to it.
const WRITTEN: Readonly<Record<string, (report: Report) => Report>> = {
  "a JSON report from a real run": (report) => report,
  "a JSON report with one of its required parts removed": ({ totals: _totals, ...rest }) => rest as Report,
  "a JSON report with a part the schema does not name": (report) => ({ ...report, extra: 1 }),
  "a JSON report with text where a count goes": (report) => ({ ...report, totals: { ...report.totals, claimReconciliations: { ...report.totals.claimReconciliations, total: "1" } } }),
};

Given(/^(a JSON report .+) was written$/, function (this: SchemaCheck, written: string) {
  this.reports = REAL_RUNS.map((settingsFile) => WRITTEN[written]!(realReport(settingsFile)));
});

When("it is checked against the schema", function (this: SchemaCheck) {
  const validate = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync(SCHEMA, "utf8")));
  const checked = this.reports.map((report) => ({ accepted: validate(report), errors: JSON.stringify(validate.errors) }));
  this.accepted = checked.every(({ accepted }) => accepted);
  this.errors = checked.map(({ errors }) => errors).join("\n");
});

Then(/^it will be (accepted|refused)$/, function (this: SchemaCheck, result: string) {
  assert.equal(this.accepted, result === "accepted", this.errors);
});
