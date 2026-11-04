import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { claimReconciliationCell } from "./support/claimReconciliationsTable.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { FitnessTarget, SpecControllerWorld } from "./support/world.js";

type OutcomeCarrier = { readonly outcome?: string };
type JsonReport = {
  readonly summary: { readonly evidenceReconciliation: { readonly reconciliationLines: { readonly byOutcome: Readonly<Record<string, number>> } } };
  readonly ledger: {
    readonly claimReconciliations: readonly {
      readonly claim: string;
      readonly kind: string;
      readonly qualityCheckReconciliations: readonly (OutcomeCarrier & { readonly evidenceObservations?: readonly OutcomeCarrier[] })[];
    }[];
  };
};

const LINT_CHECKS_TARGET: FitnessTarget = {
  features: "tests/fixtures/two-lint-checks-one-cited/features",
  ci: "tests/fixtures/two-lint-checks-one-cited/ci.yml",
  packageJson: "tests/fixtures/two-lint-checks-one-cited/package.json",
};

const NIGHTLY_LINT_TARGET: FitnessTarget = {
  features: "tests/fixtures/fitness-check-in-sibling-workflow/features",
  ci: "tests/fixtures/fitness-check-in-sibling-workflow/workflows",
  packageJson: "tests/fixtures/fitness-check-in-sibling-workflow/package.json",
};

Given("a target whose CI runs the lint:foo and lint:bar checks", function (this: SpecControllerWorld) {
  this.fitnessTarget = LINT_CHECKS_TARGET;
  this.outDir = temporaryDirectory(this, "spec-controller-usg001-");
});

Given("only lint:foo is cited by a scenario", function (this: SpecControllerWorld) {
});

function renderReportFor(fixture: FitnessTarget, dir: string): string {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const reportPath = join(dir, "spec-reconciliation.md");
  const argv = [
    ...SPEC_CONTROLLER_ARGV,
    "balance",
    "--features", abs(fixture.features),
    "--ci", abs(fixture.ci),
    "--package-json", abs(fixture.packageJson),
    "--target", "usg-fixture",
    "--format", `md:${reportPath}`,
  ];
  const result = spawnSync(NODE, argv, {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(
    result.status,
    1,
    `expected exit 1 (out-of-balance) writing the report; got ${result.status}\nstderr:\n${result.stderr}`
  );
  return readFileSync(reportPath, "utf8");
}

When("the reconciliation report is rendered for the target", function (this: SpecControllerWorld) {
  this.markdown = renderReportFor(this.fitnessTarget, this.outDir);
});

Then(
  "lint:foo is attributed to the scenario citing it, not reported uncited",
  function (this: SpecControllerWorld) {
    assert.equal(
      claimReconciliationCell(this.markdown, "SCN-TGT-001", "Fitness"),
      "F/1",
      `expected lint:foo's evidence observation posted to SCN-TGT-001 — the attribution the citation seam ` +
        `produces. Asserting only that no uncited evidence observation names lint:foo is the weaker claim, and ` +
        `a reader posting the evidence observation to a scenario the corpus never wrote satisfies it too. ` +
        `Got:\n${this.markdown}`
    );
    const reconcilingItems = claimReconciliationCell(this.markdown, "SCN-TGT-001", "Reconciling items");
    assert.ok(
      !reconcilingItems.split("; ").some((item) => item.startsWith("fitness:")),
      `expected SCN-TGT-001's fitness evidence obligation satisfied, adding no reconciling item; got: ${reconcilingItems}`
    );
    const unnamedClaimRow = this.markdown.split("\n").find((line) => line.startsWith("| (unnamed claim) |"));
    assert.ok(
      !unnamedClaimRow?.includes("lint:foo"),
      `a scenario cites lint:foo; the unnamed claim's row must not name it at all; got:\n${unnamedClaimRow}`
    );
    assert.ok(
      this.markdown.includes("| fitness | 2 |") && /^\d+ [^=\n]+ = \d+ [^+\n]+ \+ \d+ [^+\n]+ \+ 1 [^+\n]+\.$/m.test(this.markdown),
      `expected lint:foo folded into the running volume (fitness 2, 1 on the unnamed claim); got:\n${this.markdown}`
    );
  }
);

Given(
  "a target whose ci.yml runs no fitness function and whose nightly.yml runs lint:nightly",
  function (this: SpecControllerWorld) {
    this.fitnessTarget = NIGHTLY_LINT_TARGET;
    this.outDir = temporaryDirectory(this, "spec-controller-usg006-");
  },
);

Given("a scenario cites lint:nightly", function (this: SpecControllerWorld) {
});

When(
  "the reconciliation report is rendered over the target's workflow directory",
  function (this: SpecControllerWorld) {
    const repoRoot = process.cwd();
    const abs = (p: string): string => join(repoRoot, p);
    const reportPath = join(this.outDir, "spec-reconciliation.md");
    const jsonPath = join(this.outDir, "spec-reconciliation.json");
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", abs(this.fitnessTarget.features),
        "--ci", abs(this.fitnessTarget.ci),
        "--package-json", abs(this.fitnessTarget.packageJson),
        "--target", "fitness-check-in-sibling-workflow",
        "--format", `md:${reportPath}`,
        "--format", `json:${jsonPath}`,
      ],
      { cwd: this.outDir, encoding: "utf8" },
    );
    assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
    assert.ok(
      existsSync(reportPath),
      `expected a report to be written; stderr:\n${result.stderr}`,
    );
    this.siblingStatus = result.status;
    this.markdown = readFileSync(reportPath, "utf8");
    this.jsonText = readFileSync(jsonPath, "utf8");
  },
);

const NIGHTLY_SWEEP_TARGET: FitnessTarget = {
  features: "tests/fixtures/uncited-fitness-check-in-sibling-workflow/features",
  ci: "tests/fixtures/uncited-fitness-check-in-sibling-workflow/workflows",
  packageJson: "tests/fixtures/uncited-fitness-check-in-sibling-workflow/package.json",
};

Given(
  "a target whose nightly.yml runs lint:sweep and whose ci.yml does not",
  function (this: SpecControllerWorld) {
    this.fitnessTarget = NIGHTLY_SWEEP_TARGET;
    this.outDir = temporaryDirectory(this, "spec-controller-usg007-");
  },
);

When("the reconciliation report is rendered for that target's ci.yml alone", function (this: SpecControllerWorld) {
  const repoRoot = process.cwd();
  const reportPath = join(this.outDir, "spec-reconciliation.md");
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(repoRoot, NIGHTLY_SWEEP_TARGET.features),
      "--ci", join(repoRoot, NIGHTLY_SWEEP_TARGET.ci, "ci.yml"),
      "--package-json", join(repoRoot, NIGHTLY_SWEEP_TARGET.packageJson),
      "--target", "usg-narrowed-fixture",
      "--format", `md:${reportPath}`,
    ],
    { cwd: this.outDir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(reportPath), `expected a report; stderr:\n${result.stderr}`);
  this.markdown = readFileSync(reportPath, "utf8");
});

Then("lint:sweep is not counted among the running fitness functions", function (this: SpecControllerWorld) {
  assert.ok(
    this.markdown.includes("| fitness | 0 |"),
    `expected NOTHING observed: the caller named one workflow, and lint:sweep runs in ` +
      `another. Sweeping the parent directory off a file argument would widen a scope ` +
      `the caller chose deliberately. Got:\n${this.markdown}`,
  );
  assert.ok(
    !this.markdown.includes("lint:sweep"),
    `expected lint:sweep absent from the report entirely; got:\n${this.markdown}`,
  );
});

Then(
  "lint:nightly reconciles satisfied, with no watermelon raised against it",
  function (this: SpecControllerWorld) {
    assert.equal(
      claimReconciliationCell(this.markdown, "SCN-TGS-001", "Fitness"),
      "F/1",
      `expected lint:nightly's evidence observation posted to SCN-TGS-001 — lint:nightly is invoked by ` +
        `nightly.yml, so the scenario citing it is telling the truth. Reading ci.yml alone is what makes ` +
        `the tool disagree. Report:\n${this.markdown}`,
    );
    const reconcilingItems = claimReconciliationCell(this.markdown, "SCN-TGS-001", "Reconciling items");
    assert.ok(
      !reconcilingItems.split("; ").some((item) => item.startsWith("fitness:")),
      `expected SCN-TGS-001's fitness evidence obligation satisfied, adding no reconciling item; got: ${reconcilingItems}`,
    );
    const report = JSON.parse(this.jsonText) as JsonReport;
    const watermelons = report.summary.evidenceReconciliation.reconciliationLines.byOutcome.watermelon;
    assert.equal(
      watermelons,
      0,
      `expected NO watermelon in the summary, whose count of watermelon lines is present even at zero: a ` +
        `watermelon says a cited check is passing but fabricated, and this one genuinely runs. Report:\n${this.jsonText}`,
    );
    const onScenarios = report.ledger.claimReconciliations
      .filter((row) => row.kind === "scenario")
      .flatMap((row) => row.qualityCheckReconciliations.flatMap((line) => [line, ...(line.evidenceObservations ?? [])]))
      .filter((carrier) => carrier.outcome === "watermelon");
    assert.deepEqual(
      onScenarios,
      [],
      `expected NO watermelon on any scenario's row: a watermelon says a cited check is passing but ` +
        `fabricated, and this one genuinely runs. Accusing a real gate of being fake is ` +
        `worse than missing it. Report:\n${this.jsonText}`,
    );
    assert.equal(
      this.siblingStatus,
      0,
      `expected the target to reconcile BALANCED once both workflows are read — its only ` +
        `obligation is the fitness one, and it is settled. Got exit ${this.siblingStatus}. ` +
        `Report:\n${this.markdown}`,
    );
  },
);
