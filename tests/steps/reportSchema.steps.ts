import { Given, Then, When } from "@cucumber/cucumber";
import { Ajv } from "ajv";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLISHED_SCHEMA } from "./support/builtCli.js";
import { CLAIM_RECONCILIATIONS_SECTION } from "./support/reportClaimReconciliations.js";
import { BALANCED_ARGS, specController } from "./support/specControllerRun.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { ExpectedRefusal, SpecControllerWorld } from "./support/world.js";

const UNNAMED_PART = "surprise";

const TOTALS = "totals";
const COUNT_PATH = [TOTALS, "claimReconciliations", "total"] as const;

type Count = Record<string, Record<string, unknown>>;

// Each report is a real run's report, then changed as the row says; the refusal is the one that change must draw.
const REPORTS: Readonly<Record<string, (report: Record<string, unknown>) => ExpectedRefusal | null>> = {
  "a JSON report from a real run": () => null,
  "a JSON report with one of its required parts removed": (report) => {
    assert.ok(CLAIM_RECONCILIATIONS_SECTION in report, `expected the real report to carry ${CLAIM_RECONCILIATIONS_SECTION}`);
    delete report[CLAIM_RECONCILIATIONS_SECTION];
    return { keyword: "required", instancePath: "", params: { missingProperty: CLAIM_RECONCILIATIONS_SECTION } };
  },
  "a JSON report with a part the schema does not name": (report) => {
    report[UNNAMED_PART] = true;
    return { keyword: "additionalProperties", instancePath: "", params: { additionalProperty: UNNAMED_PART } };
  },
  "a JSON report with text where a count goes": (report) => {
    const [section, group, count] = COUNT_PATH;
    const counts = (report[section] as Count)[group];
    assert.equal(typeof counts?.[count], "number", `expected the real report to carry a count at ${COUNT_PATH.join(".")}`);
    counts![count] = String(counts![count]);
    return { keyword: "type", instancePath: `/${COUNT_PATH.join("/")}`, params: { type: "number" } };
  },
};

for (const [report, change] of Object.entries(REPORTS)) {
  Given(`${report} was written`, function (this: SpecControllerWorld) {
    const path = join(temporaryDirectory(this, "spec-controller-schema-"), "spec-reconciliation.json");
    const run = specController(["balance", ...BALANCED_ARGS, "--format", `json:${path}`]);
    assert.ok(existsSync(path), `expected the run to write its JSON report; exit ${run.status}\n${run.stderr}`);
    this.checkedReport = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    this.expectedRefusal = change(this.checkedReport);
  });
}

When("it is checked against the schema", function (this: SpecControllerWorld) {
  assert.ok(existsSync(PUBLISHED_SCHEMA), `expected the package to ship its JSON Schema at ${PUBLISHED_SCHEMA}`);
  const validate = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync(PUBLISHED_SCHEMA, "utf8")) as object);
  this.schemaErrors = validate(this.checkedReport) ? [] : (validate.errors ?? []);
});

Then("it will be accepted", function (this: SpecControllerWorld) {
  assert.equal(this.expectedRefusal, null, "a changed report was expected to be accepted");
  assert.deepEqual(this.schemaErrors, [], `expected the report accepted; got:\n${JSON.stringify(this.schemaErrors, null, 2)}`);
});

Then("it will be refused", function (this: SpecControllerWorld) {
  assert.ok(this.expectedRefusal, "a real run's report was expected to be refused");
  const { keyword, instancePath, params } = this.expectedRefusal;
  assert.deepEqual(
    this.schemaErrors.map((error) => ({ keyword: error.keyword, instancePath: error.instancePath, params: error.params })),
    [{ keyword, instancePath, params }],
    `expected one refusal, ${keyword} at "${instancePath}"; got:\n${JSON.stringify(this.schemaErrors, null, 2)}`,
  );
});
