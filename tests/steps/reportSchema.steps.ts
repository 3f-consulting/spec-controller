import { Then } from "@cucumber/cucumber";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SPEC_CONTROLLER_BIN } from "./support/builtCli.js";
import { CLAIM_RECONCILIATIONS_SECTION } from "./support/reportClaimReconciliations.js";
import type { SpecControllerWorld } from "./support/world.js";

const PUBLISHED_SCHEMA = join(dirname(SPEC_CONTROLLER_BIN), "spec-reconciliation.schema.json");
const REQUIRED_KEY = CLAIM_RECONCILIATIONS_SECTION;
const UNNAMED_KEY = "surprise";

function publishedSchemaValidator(): ValidateFunction {
  if (!existsSync(PUBLISHED_SCHEMA)) assert.fail(`expected the published package to ship its JSON Schema at ${PUBLISHED_SCHEMA}; it does not`);
  const schema: unknown = JSON.parse(readFileSync(PUBLISHED_SCHEMA, "utf8"));
  return new Ajv({ allErrors: true }).compile(schema as object);
}

function errorsOf(report: unknown): ErrorObject[] {
  const validate = publishedSchemaValidator();
  return validate(report) ? [] : (validate.errors ?? []);
}

function reportCopy(world: SpecControllerWorld): Record<string, unknown> {
  return structuredClone(world.savedJson) as unknown as Record<string, unknown>;
}

function listed(errors: readonly ErrorObject[]): string {
  return JSON.stringify(errors, null, 2);
}

Then("the JSON report validates against the JSON Schema the published package ships", function (this: SpecControllerWorld) {
  const errors = errorsOf(this.savedJson);
  assert.deepEqual(errors, [], `expected the real report to validate against the published schema; got:\n${listed(errors)}`);
});

Then("the JSON report with its ledger removed is refused because the schema requires the ledger", function (this: SpecControllerWorld) {
  const report = reportCopy(this);
  assert.ok(REQUIRED_KEY in report, `expected the real report to carry ${REQUIRED_KEY}; got keys ${Object.keys(report).join(", ")}`);
  delete report[REQUIRED_KEY];
  const errors = errorsOf(report);
  assert.deepEqual(
    errors.map(({ instancePath, keyword, params }) => ({ instancePath, keyword, missingProperty: params.missingProperty })),
    [{ instancePath: "", keyword: "required", missingProperty: REQUIRED_KEY }],
    `expected one refusal, the schema requiring ${REQUIRED_KEY}; got:\n${listed(errors)}`,
  );
});

Then(
  "the JSON report with a key the schema does not name added is refused because the schema does not name that key",
  function (this: SpecControllerWorld) {
    const report = { ...reportCopy(this), [UNNAMED_KEY]: true };
    const errors = errorsOf(report);
    assert.deepEqual(
      errors.map(({ instancePath, keyword, params }) => ({ instancePath, keyword, additionalProperty: params.additionalProperty })),
      [{ instancePath: "", keyword: "additionalProperties", additionalProperty: UNNAMED_KEY }],
      `expected one refusal, the schema not naming ${UNNAMED_KEY}; got:\n${listed(errors)}`,
    );
  },
);
