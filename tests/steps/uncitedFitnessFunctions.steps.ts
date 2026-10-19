import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

interface UsgFixture {
  features: string;
  ci: string;
  packageJson: string;
}

const USG_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg/features",
  ci: "tests/fixtures/usg/ci.yml",
  packageJson: "tests/fixtures/usg/package.json",
};

const USG_SIBLING_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-sibling/features",
  ci: "tests/fixtures/usg-sibling/workflows",
  packageJson: "tests/fixtures/usg-sibling/package.json",
};

let activeFixture: UsgFixture;
let activeDir: string;
let activeMd: string;

Given("a target whose CI runs the lint:foo and lint:bar checks", function () {
  activeFixture = USG_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg001-"));
});

Given("only lint:foo is cited by a scenario", function () {
});

function renderReportFor(fixture: UsgFixture, dir: string): string {
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

When("the reconciliation report is rendered for the target", function () {
  activeMd = renderReportFor(activeFixture, activeDir);
});

Then(
  "lint:foo is attributed to the scenario citing it, not reported uncited",
  function () {
    assert.ok(
      activeMd.includes(
        "| SCN-TGT-001 | ✓ Evidence Observation satisfies its Evidence Obligation |"
      ),
      `expected lint:foo's evidence observation posted to SCN-TGT-001, satisfied — the ` +
        `attribution the citation seam produces. Asserting only that no uncited evidence observation names ` +
        `lint:foo is the weaker claim, and a reader posting the evidence observation to a scenario the corpus ` +
        `never wrote satisfies it too. Got:\n${activeMd}`
    );
    const suspenseRow = activeMd.split("\n").find((line) => line.startsWith("| (unnamed claim) |"));
    assert.ok(
      !suspenseRow?.includes("lint:foo"),
      `a scenario cites lint:foo; the suspense row must not name it at all; got:\n${suspenseRow}`
    );
    assert.ok(
      activeMd.includes("2 fitness function(s) run, 1 uncited fitness function(s)"),
      `expected lint:foo folded into the running volume (2 run, 1 uncited fitness function(s)); got:\n${activeMd}`
    );
  }
);

let siblingStatus: number | null;

Given(
  "a target whose ci.yml runs no fitness function and whose nightly.yml runs lint:nightly",
  function () {
    activeFixture = USG_SIBLING_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg006-"));
  },
);

Given("a scenario cites lint:nightly", function () {
});

When(
  "the reconciliation report is rendered over the target's workflow directory",
  function () {
    const repoRoot = process.cwd();
    const abs = (p: string): string => join(repoRoot, p);
    const reportPath = join(activeDir, "spec-reconciliation.md");
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", abs(activeFixture.features),
        "--ci", abs(activeFixture.ci),
        "--package-json", abs(activeFixture.packageJson),
        "--target", "usg-sibling-fixture",
        "--format", `md:${reportPath}`,
      ],
      { cwd: activeDir, encoding: "utf8" },
    );
    assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
    assert.ok(
      existsSync(reportPath),
      `expected a report to be written; stderr:\n${result.stderr}`,
    );
    siblingStatus = result.status;
    activeMd = readFileSync(reportPath, "utf8");
  },
);

const USG_SIBLING_UNCITED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-sibling-uncited/features",
  ci: "tests/fixtures/usg-sibling-uncited/workflows",
  packageJson: "tests/fixtures/usg-sibling-uncited/package.json",
};

Given(
  "a target whose nightly.yml runs lint:sweep and whose ci.yml does not",
  function () {
    activeFixture = USG_SIBLING_UNCITED_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg007-"));
  },
);

When("the reconciliation report is rendered for that target's ci.yml alone", function () {
  const repoRoot = process.cwd();
  const reportPath = join(activeDir, "spec-reconciliation.md");
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(repoRoot, USG_SIBLING_UNCITED_FIXTURE.features),
      "--ci", join(repoRoot, USG_SIBLING_UNCITED_FIXTURE.ci, "ci.yml"),
      "--package-json", join(repoRoot, USG_SIBLING_UNCITED_FIXTURE.packageJson),
      "--target", "usg-narrowed-fixture",
      "--format", `md:${reportPath}`,
    ],
    { cwd: activeDir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(reportPath), `expected a report; stderr:\n${result.stderr}`);
  activeMd = readFileSync(reportPath, "utf8");
});

Then("lint:sweep is not counted among the running fitness functions", function () {
  assert.ok(
    activeMd.includes("0 fitness function(s) run, 0 uncited fitness function(s)"),
    `expected NOTHING observed: the caller named one workflow, and lint:sweep runs in ` +
      `another. Sweeping the parent directory off a file argument would widen a scope ` +
      `the caller chose deliberately. Got:\n${activeMd}`,
  );
  assert.ok(
    !activeMd.includes("lint:sweep"),
    `expected lint:sweep absent from the report entirely; got:\n${activeMd}`,
  );
});

Then(
  "lint:nightly reconciles satisfied, with no watermelon raised against it",
  function () {
    assert.ok(
      activeMd.includes("| SCN-TGS-001 | ✓ Evidence Observation satisfies its Evidence Obligation |"),
      `expected the nightly check SATISFIED — lint:nightly is invoked by nightly.yml, so the ` +
        `scenario citing it is telling the truth. Reading ci.yml alone is what makes the tool ` +
        `disagree. Report:\n${activeMd}`,
    );
    assert.ok(
      !activeMd.includes("🍉"),
      `expected NO watermelon anywhere: a watermelon says a cited check is passing but ` +
        `fabricated, and this one genuinely runs. Accusing a real gate of being fake is ` +
        `worse than missing it. Report:\n${activeMd}`,
    );
    assert.equal(
      siblingStatus,
      0,
      `expected the target to reconcile BALANCED once both workflows are read — its only ` +
        `obligation is the fitness one, and it is settled. Got exit ${siblingStatus}. ` +
        `Report:\n${activeMd}`,
    );
  },
);

After({ tags: "@USG" }, function () {
  if (activeDir && existsSync(activeDir)) rmSync(activeDir, { recursive: true, force: true });
});
