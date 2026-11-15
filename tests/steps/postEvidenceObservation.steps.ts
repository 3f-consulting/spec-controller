import { Given, Then, When } from "@cucumber/cucumber";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const CLI = resolve("packages/spec-controller/dist/cli.js");
const CUCUMBER = resolve("node_modules/@cucumber/cucumber/bin/cucumber.js");

interface Rows {
  folder: string;
  report: string;
  error: string;
}

// Two rows of one Outline, each an integration claim with its own code.
const OUTLINE = `@ONE
Feature: one

  @integration
  Scenario Outline: one adds <n>
    Given one adds <n>

    Examples:
      | clm         | n |
      | CLM-ONE-001 | 1 |
      | CLM-ONE-002 | 2 |
`;

// The target's own step, loaded from this repository's Cucumber, the one that runs it.
const STEPS = `import { Given } from ${JSON.stringify(pathToFileURL(resolve("node_modules/@cucumber/cucumber/lib/index.js")).href)};
Given("one adds {int}", (_n) => {});
`;

Given("two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002", function (this: Rows) {
  this.folder = temporaryDirectory("outline-rows-");
  mkdirSync(join(this.folder, "features"));
  writeFileSync(join(this.folder, "features", "one.feature"), OUTLINE);
  writeFileSync(join(this.folder, "one.steps.mjs"), STEPS);
});

Given("Cucumber's evidence report had a result for each row", function (this: Rows) {
  const cucumber = spawnSync(process.execPath, [CUCUMBER, "features/one.feature", "--import", "one.steps.mjs", "--format", "json:cucumber.json"], { cwd: this.folder, encoding: "utf8" });
  assert.equal(cucumber.status, 0, cucumber.stdout + cucumber.stderr);
});

When("balance posts the evidence", function (this: Rows) {
  const run = spawnSync(process.execPath, [CLI, "balance", "--features", "features", "--cucumber", "cucumber.json", "--format", "json"], { cwd: this.folder, encoding: "utf8" });
  this.report = run.stdout;
  this.error = run.stderr;
});

interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

interface ClaimsReported {
  readonly claimReconciliations: readonly {
    readonly claim: { readonly claimCode?: ClaimCode };
    readonly qualityCheckReconciliations: readonly { readonly observation?: { readonly kind: string; readonly cites: readonly ClaimCode[] } }[];
  }[];
}

const written = ({ featureCode, number }: ClaimCode): string => `CLM-${featureCode}-${number}`;

// Each row's Claim Reconciliation, with the observations posted on it: their kind, and the claim codes each cites.
Then("an Evidence Observation will be posted for each row, citing the claim code of its row", function (this: Rows) {
  const { claimReconciliations } = JSON.parse(this.report) as ClaimsReported;
  const posted = (code: string) =>
    claimReconciliations
      .filter(({ claim }) => claim.claimCode !== undefined && written(claim.claimCode) === code)
      .map(({ qualityCheckReconciliations }) => qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [{ kind: observation.kind, cites: observation.cites.map(written) }] : [])));
  assert.deepEqual(
    { "CLM-ONE-001": posted("CLM-ONE-001"), "CLM-ONE-002": posted("CLM-ONE-002") },
    { "CLM-ONE-001": [[{ kind: "integration", cites: ["CLM-ONE-001"] }]], "CLM-ONE-002": [[{ kind: "integration", cites: ["CLM-ONE-002"] }]] },
    this.error,
  );
});
