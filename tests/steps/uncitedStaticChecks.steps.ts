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

const USG_GUARD_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard/features",
  ci: "tests/fixtures/usg-guard/ci.yml",
  packageJson: "tests/fixtures/usg-guard/package.json",
};

const USG_GUARD_NAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-guard-named/features",
  ci: "tests/fixtures/usg-guard-named/ci.yml",
  packageJson: "tests/fixtures/usg-guard-named/package.json",
};

const USG_SIBLING_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-sibling/features",
  ci: "tests/fixtures/usg-sibling/workflows",
  packageJson: "tests/fixtures/usg-sibling/package.json",
};

let activeFixture: UsgFixture;
let activeDir: string;
let activeMd: string;

let secondDir: string;
let secondMd: string;

Given("a target whose CI runs the lint:foo and lint:bar checks", function () {
  activeFixture = USG_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg001-"));
});

Given("only lint:foo is cited by a fitness scenario", function () {
});

Given("its CI also runs the test and cucumber suites", function () {});

Given("its manifest names the unit and integration runners those suites run", function () {});

Given(
  "a target whose CI runs the domain-purity script, a name matching no convention of ours",
  function () {
    activeFixture = USG_GUARD_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg004-"));
  }
);

Given("no fitness scenario cites domain-purity", function () {
});

Given("a target whose CI runs the domain-purity script under no convention of ours", function () {
  activeFixture = USG_GUARD_NAMED_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg005-"));
});

Given("a fitness scenario cites domain-purity", function () {
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

function ledgerRowCells(md: string, scnId: string): string[] {
  const start = md.indexOf("## Scenario Reconciliations");
  const ledger = start >= 0 ? md.slice(start) : md;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    return line.split("|").map((c) => c.trim())[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for "${scnId}"; got:\n${md}`);
  return row.split("|").map((c) => c.trim());
}

function behaviouralRunnerRows(md: string): string[] {
  return behaviouralRunnersSectionLines(md).filter(
    (line) => line.startsWith("| ") && !line.startsWith("| Tier |") && !line.startsWith("| --- |")
  );
}

function behaviouralRunnersSectionLines(md: string): string[] {
  return reportSectionLines(md, "### Behavioural runners");
}

function reportSectionLines(md: string, heading: string): string[] {
  const start = md.indexOf(heading);
  if (start < 0) return [];
  const cut = md.slice(start);
  const end = cut.indexOf("\n###", 1);
  return (end >= 0 ? cut.slice(0, end) : cut).split("\n");
}

function behaviouralRunnerAccountLines(md: string): string[] {
  return behaviouralRunnersSectionLines(md).filter((line) => line.startsWith("- "));
}

Then(
  "the Static checks section reports lint:bar as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected the counts "2 static check(s) run, 1 uncited static check(s)" — BOTH checks run, ` +
        `and exactly the one no fitness scenario cites is uncited. A reader that resolved no ` +
        `citation at all reports 2 uncited here, which is what the retired rule does over this ` +
        `target: nothing in it carries an @lint= tag any more. Got:\n${activeMd}`
    );

    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("fitness ❓ Evidence Observation cites no Scenario (lint:bar)"),
      `expected the suspense row to carry lint:bar as a cites-no-scenario credit naming the ` +
        `handle that ran; got "${items}" in:\n${activeMd}`
    );

    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(lint:bar)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected lint:bar's credit on the suspense row and on no other; got ${JSON.stringify(bearing)} in:\n${activeMd}`
    );
  }
);

Then(
  "the Static checks section reports domain-purity as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected the counts "1 static check(s) run, 1 uncited static check(s)" — domain-purity ` +
        `is FOUND because nothing takes it out, so it runs, and the seam reaches no scenario ` +
        `for it, so it is uncited. A reader still finding checks by a prefix set reports 0 run ` +
        `here, because this target's script matches no convention of ours. Got:\n${activeMd}`
    );

    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("fitness ❓ Evidence Observation cites no Scenario (domain-purity)"),
      `expected the suspense row to carry domain-purity as a cites-no-scenario credit ` +
        `naming the handle that ran; got "${items}" in:\n${activeMd}`
    );

    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(domain-purity)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected domain-purity's credit on the suspense row and on no other; got ${JSON.stringify(bearing)} in:\n${activeMd}`
    );
  }
);

Then(
  "lint:foo is attributed to the scenario citing it, not reported uncited",
  function () {
    assert.ok(
      activeMd.includes(
        "| SCN-TGT-001 | ✓ Evidence Observation satisfies its Evidence Obligation |"
      ),
      `expected lint:foo's credit posted to SCN-TGT-001, satisfied — the ` +
        `attribution the citation seam produces. Asserting only that no uncited credit names ` +
        `lint:foo is the weaker claim, and a reader posting the credit to a scenario the corpus ` +
        `never wrote satisfies it too. Got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (lint:foo)"),
      `a fitness scenario cites lint:foo; it must not surface as an uncited static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected lint:foo folded into the running volume (2 run, 1 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

Then(
  "domain-purity is attributed to the scenario citing it, not reported uncited",
  function () {
    assert.ok(
      activeMd.includes(
        "| SCN-TGD-001 | ✓ Evidence Observation satisfies its Evidence Obligation |"
      ),
      `expected domain-purity's credit posted to SCN-TGD-001 — the attribution the citation seam ` +
        `produces. Asserting only that no uncited credit names the handle is the weaker claim, ` +
        `and a reader that dropped the credit satisfies it too. Got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("Evidence Observation cites no Scenario (domain-purity)"),
      `a fitness scenario cites domain-purity; it must not surface as an uncited ` +
        `static-check credit; got:\n${activeMd}`
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 0 uncited static check(s)"),
      `expected domain-purity folded into the running volume and attributed ` +
        `(1 run, 0 uncited static check(s)); got:\n${activeMd}`
    );
  }
);

Then(
  "only lint:foo and lint:bar are counted as fitness checks, not test or cucumber",
  function () {
    assert.ok(
      activeMd.includes("2 static check(s) run, 1 uncited static check(s)"),
      `expected exactly 2 running fitness checks — the two this target registers. test and ` +
        `cucumber run in the same CI, and deriving either re-counts a behavioural run as a ` +
        `gate nobody wrote a threshold for. Got:\n${activeMd}`
    );
    assert.ok(
      !activeMd.includes("(test)") && !activeMd.includes("(cucumber)"),
      `test/cucumber must not surface as uncited fitness credits; got:\n${activeMd}`
    );
  }
);

let siblingStatus: number | null;

Given(
  "a target whose ci.yml runs no static check and whose nightly.yml runs lint:nightly",
  function () {
    activeFixture = USG_SIBLING_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg006-"));
  },
);

Given("a fitness scenario cites lint:nightly", function () {
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

Given("no fitness scenario cites lint:sweep", function () {
});

Then(
  "the Static checks section reports lint:sweep as an uncited static check",
  function () {
    assert.match(
      activeMd,
      /### Static checks/,
      `expected a Static checks section; got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected lint:sweep counted as RUNNING even though only nightly.yml invokes it — ` +
        `a check that leaves the books by moving between workflow files is a red that can ` +
        `be made to go away without fixing anything. Got:\n${activeMd}`,
    );

    const cells = ledgerRowCells(activeMd, "(no scenario)");
    const items = cells[cells.length - 2] ?? "";
    assert.ok(
      items.includes("fitness ❓ Evidence Observation cites no Scenario (lint:sweep)"),
      `expected the suspense row to carry lint:sweep as a cites-no-scenario credit naming ` +
        `the handle that ran; got "${items}" in:\n${activeMd}`,
    );

    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("(lint:sweep)"))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected lint:sweep's credit on the suspense row and on no other; got ` +
        `${JSON.stringify(bearing)} in:\n${activeMd}`,
    );

    assert.notEqual(
      siblingStatus,
      0,
      `expected the uncited check to red the run (3F-2306 made that verdict load-bearing); ` +
        `got exit ${siblingStatus}. Report:\n${activeMd}`,
    );
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

Then("lint:sweep is not counted among the running static checks", function () {
  assert.ok(
    activeMd.includes("0 static check(s) run, 0 uncited static check(s)"),
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

const USG_RUNNERS_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runners/features",
  ci: "tests/fixtures/usg-runners/ci.yml",
  packageJson: "tests/fixtures/usg-runners/package.json",
};

Given("a target that names vitest its unit runner and runs pnpm test in CI", function () {
  activeFixture = USG_RUNNERS_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg011-"));
  const workflow = readFileSync(join(process.cwd(), USG_RUNNERS_FIXTURE.ci), "utf8");
  assert.ok(
    !workflow.includes("vitest"),
    `the usg-runners fixture must not name vitest in its workflow — the manifest hop is the ` +
      `only route to the recognition this scenario is about. Got:\n${workflow}`,
  );
});

Then(
  "the report names vitest the unit runner, recognised at the step that runs it",
  function () {
    assert.match(
      activeMd,
      /### Behavioural runners/,
      `expected the report to account for the steps it recognised as behavioural runners. A ` +
        `step this reader recognises must leave it NAMED rather than silent — the whole ` +
        `argument for a recognition rule this simple is that what it gets wrong is visible. ` +
        `Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("| unit | vitest | Unit tests |"),
      `expected the unit tier's runner named as vitest, recognised at the step GitHub itself ` +
        `displays as "Unit tests". The recognition can only have come through the manifest: ` +
        `ci.yml runs "pnpm test" and never writes the word vitest, so a reader matching the ` +
        `step's command alone reports nothing here. Got:\n${activeMd}`,
    );
    const rows = behaviouralRunnerRows(activeMd);
    assert.deepEqual(
      rows,
      ["| unit | vitest | Unit tests |"],
      `expected exactly one recognised runner over a target naming exactly one; got ` +
        `${JSON.stringify(rows)} in:\n${activeMd}`,
    );
    assert.ok(
      !activeMd.includes("(test)"),
      `expected the runner step NOT to reach the static-check books: this scenario adds a ` +
        `reader and a report line, and moves no verdict. Got:\n${activeMd}`,
    );
  },
);

const USG_OUT_OF_POSITION_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-out-of-position/features",
  ci: "tests/fixtures/usg-runner-out-of-position/ci.yml",
  packageJson: "tests/fixtures/usg-runner-out-of-position/package.json",
};

Given(
  "a target that names vitest its unit runner, runs its unit suite, and runs a check whose command writes a report named after that runner",
  function () {
    activeFixture = USG_OUT_OF_POSITION_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg012-"));
    const workflow = readFileSync(join(process.cwd(), USG_OUT_OF_POSITION_FIXTURE.ci), "utf8");
    const checkCommand = workflow
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("run: pnpm lint:rules"));
    assert.ok(
      checkCommand !== undefined && checkCommand.includes("vitest"),
      `the usg-runner-out-of-position fixture's check step must name the unit runner, or this ` +
        `target poses none of this scenario's question. Got:\n${workflow}`,
    );
    assert.ok(
      !checkCommand.split(/\s+/).includes("vitest"),
      `the check step must name the runner OUT of command position — as a path, a flag or an ` +
        `=-joined argument. A whole token would make the recognition correct. Got: ${checkCommand}`,
    );
  },
);

Then(
  "the report names the unit suite step its runner and no other, and the check is on the books as an uncited static check",
  function () {
    const rows = behaviouralRunnerRows(activeMd);
    assert.deepEqual(
      rows,
      ["| unit | vitest | Unit tests |"],
      `expected the unit runner recognised at the suite step and NOWHERE else. The check step ` +
        `writes a file named after the runner and runs eslint; recognising it would delete a ` +
        `fitness check from this report and say nothing, which is the one direction this axis ` +
        `cannot tolerate. Got ${JSON.stringify(rows)} in:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected the check step counted as a running static check and reported uncited. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("Evidence Observation cites no Scenario (lint:rules)"),
      `expected lint:rules banked on the suspense row — a candidate that cites nothing is ` +
        `surfaced, never dropped. Got:\n${activeMd}`,
    );
  },
);

const USG_RUNNER_NONE_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-none/features",
  ci: "tests/fixtures/usg-runner-none/ci.yml",
  packageJson: "tests/fixtures/usg-runner-none/package.json",
};

const USG_RUNNER_UNNAMED_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-unnamed/features",
  ci: "tests/fixtures/usg-runner-unnamed/ci.yml",
  packageJson: "tests/fixtures/usg-runner-unnamed/package.json",
};

Given("a target that says it has no performance runner", function () {
  activeFixture = USG_RUNNER_NONE_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg016-none-"));
  const runners = runnersBlockOf(USG_RUNNER_NONE_FIXTURE);
  assert.ok(
    Object.hasOwn(runners, "performance") && runners["performance"] === null,
    `the usg-runner-none fixture must say performance is null — a target that omits the key ` +
      `poses the twin's question, not this one. Got: ${JSON.stringify(runners)}`,
  );
});

Given("a second target, alike but for saying nothing about performance", function () {
  secondDir = mkdtempSync(join(tmpdir(), "spec-controller-usg016-unnamed-"));
  const runners = runnersBlockOf(USG_RUNNER_UNNAMED_FIXTURE);
  assert.ok(
    !Object.hasOwn(runners, "performance"),
    `the usg-runner-unnamed fixture must carry no performance key at all. Got: ` +
      `${JSON.stringify(runners)}`,
  );
  for (const part of ["ci.yml", "features/target.feature"] as const) {
    assert.equal(
      readFileSync(join(process.cwd(), "tests/fixtures/usg-runner-none", part), "utf8"),
      readFileSync(join(process.cwd(), "tests/fixtures/usg-runner-unnamed", part), "utf8"),
      `the pair's ${part} must be byte-identical, or the difference between their two reports ` +
        `cannot be attributed to the runner block`,
    );
  }
  assert.deepEqual(
    manifestOf(USG_RUNNER_NONE_FIXTURE)["scripts"],
    manifestOf(USG_RUNNER_UNNAMED_FIXTURE)["scripts"],
    `the pair's scripts must be identical — the runner is recognised through them`,
  );
  const { performance: _stated, ...rest } = runnersBlockOf(USG_RUNNER_NONE_FIXTURE);
  assert.deepEqual(
    rest,
    runners,
    `the pair's runner blocks must differ in the performance entry and nowhere else. Got ` +
      `${JSON.stringify(rest)} against ${JSON.stringify(runners)}`,
  );
});

function manifestOf(fixture: UsgFixture): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), fixture.packageJson), "utf8")) as Record<
    string,
    unknown
  >;
}

function runnersBlockOf(fixture: UsgFixture): Record<string, unknown> {
  const specController = manifestOf(fixture)["specController"] as Record<string, unknown>;
  return specController["runners"] as Record<string, unknown>;
}

When("the reconciliation report is rendered for both targets", function () {
  activeMd = renderReportFor(activeFixture, activeDir);
  secondMd = renderReportFor(USG_RUNNER_UNNAMED_FIXTURE, secondDir);
});

Then("the first target's report says it has no performance runner", function () {
  assert.deepEqual(
    behaviouralRunnerRows(activeMd),
    ["| unit | vitest | Unit tests |"],
    `expected the unit runner still recognised beside a tier stated to have none; got:\n${activeMd}`,
  );
  assert.deepEqual(
    behaviouralRunnerAccountLines(activeMd),
    [
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — no runner: the target names none.",
    ],
    `expected the performance tier reported as HAVING NONE — the target said so — and the two ` +
      `tiers it said nothing about reported unnamed. Got:\n${activeMd}`,
  );
});

Then("the second target's report says its performance runner is unnamed", function () {
  assert.deepEqual(
    behaviouralRunnerAccountLines(secondMd),
    [
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — unnamed: the target has not said.",
    ],
    `expected the performance tier reported UNNAMED over a target that carries no performance ` +
      `key. Got:\n${secondMd}`,
  );
  const first = behaviouralRunnersSectionLines(activeMd);
  const second = behaviouralRunnersSectionLines(secondMd);
  assert.deepEqual(
    first.filter((line) => !second.includes(line)),
    ["- performance — no runner: the target names none."],
    `expected the two reports' runner sections to differ in the performance line ALONE. A ` +
      `difference anywhere else means something other than the runner block moved; no ` +
      `difference at all is the collapse this scenario exists to catch.\nfirst:\n${activeMd}` +
      `\nsecond:\n${secondMd}`,
  );
  assert.deepEqual(
    second.filter((line) => !first.includes(line)),
    ["- performance — unnamed: the target has not said."],
    `expected the silent target's report to carry the unnamed line and nothing else the stated ` +
      `absence's report does not.\nfirst:\n${activeMd}\nsecond:\n${secondMd}`,
  );
});

const USG_NOT_A_TIER_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-runner-not-a-tier/features",
  ci: "tests/fixtures/usg-runner-not-a-tier/ci.yml",
  packageJson: "tests/fixtures/usg-runner-not-a-tier/package.json",
};

const CANON_TIERS = ["unit", "integration", "e2e", "performance"] as const;

Given("a target whose runner block names a key that is not one of the four tiers", function () {
  activeFixture = USG_NOT_A_TIER_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg019-"));
  const runners = runnersBlockOf(USG_NOT_A_TIER_FIXTURE);
  assert.deepEqual(
    Object.keys(runners).filter((key) => !(CANON_TIERS as readonly string[]).includes(key)),
    ["lint"],
    `the usg-runner-not-a-tier fixture must carry exactly one key outside the four canon tiers. ` +
      `Got: ${JSON.stringify(runners)}`,
  );
  assert.equal(
    runners["unit"],
    "vitest",
    `the fixture must also name a real tier — without it the report carries no recognition, and ` +
      `a reader blind to the whole block satisfies this scenario. Got: ${JSON.stringify(runners)}`,
  );
});

Given("that key names the command of a check its CI runs", function () {
  const scripts = manifestOf(USG_NOT_A_TIER_FIXTURE)["scripts"] as Record<string, string>;
  const runners = runnersBlockOf(USG_NOT_A_TIER_FIXTURE);
  assert.ok(
    scripts["lint:rules"]?.split(/\s+/).includes(runners["lint"] as string),
    `the fixture's lint:rules script must run the command its bogus runner key names, or the ` +
      `key excludes nothing for a reason that has nothing to do with the closure. Got: ` +
      `${JSON.stringify(scripts)} against ${JSON.stringify(runners)}`,
  );
  const workflow = readFileSync(join(process.cwd(), USG_NOT_A_TIER_FIXTURE.ci), "utf8");
  assert.ok(
    workflow.includes("run: pnpm lint:rules"),
    `the fixture's CI must run that check, or no step is available to be wrongly excluded. ` +
      `Got:\n${workflow}`,
  );
});

Then("the report names that key as one it does not recognise", function () {
  assert.deepEqual(
    behaviouralRunnerAccountLines(activeMd),
    [
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — unnamed: the target has not said.",
      "- lint — not a tier: the runner block is keyed by the four canon tiers, and this key excludes nothing.",
    ],
    `expected the bogus key NAMED on the report as one the tool does not recognise. Partitioning ` +
      `it out silently is the same class of fault as dropping a step silently: the consumer ` +
      `wrote something and believes it took effect. Got:\n${activeMd}`,
  );
  assert.deepEqual(
    behaviouralRunnerRows(activeMd),
    ["| unit | vitest | Unit tests |"],
    `expected the unit tier recognised and the bogus key recognising nothing. A row for lint ` +
      `means the key was honoured; no row at all means the reader is blind to the block and the ` +
      `line above passed for the wrong reason. Got:\n${activeMd}`,
  );
});

Then("the check is on the books as an uncited static check", function () {
  assert.ok(
    activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
    `expected the check the bogus key names still counted as a running static check. A key that ` +
      `excluded it would read 0 run over a pipeline running one. Got:\n${activeMd}`,
  );
  assert.ok(
    activeMd.includes("Evidence Observation cites no Scenario (lint:rules)"),
    `expected lint:rules banked on the suspense row — surfaced, never dropped. Got:\n${activeMd}`,
  );
});

const USG_NOT_CHECKS_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-not-checks/features",
  ci: "tests/fixtures/usg-not-checks/ci.yml",
  packageJson: "tests/fixtures/usg-not-checks/package.json",
};

function notChecksOf(fixture: UsgFixture): string[] {
  const specController = manifestOf(fixture)["specController"] as Record<string, unknown>;
  return specController["notChecks"] as string[];
}

function workflowOf(fixture: UsgFixture): string {
  return readFileSync(join(process.cwd(), fixture.ci), "utf8");
}

function excludedStepLines(md: string): string[] {
  return reportSectionLines(md, "### Excluded steps").filter((line) => line.startsWith("- "));
}

Given("a target that names one check step of its pipeline a non-check", function () {
  activeFixture = USG_NOT_CHECKS_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg015-"));
  assert.equal(
    notChecksOf(USG_NOT_CHECKS_FIXTURE)[0],
    "ci.yml:ci:Rule check",
    `the usg-not-checks fixture must name its excluded step fully qualified. Got: ` +
      `${JSON.stringify(notChecksOf(USG_NOT_CHECKS_FIXTURE))}`,
  );
  const workflow = workflowOf(USG_NOT_CHECKS_FIXTURE);
  assert.ok(
    workflow.includes("name: Rule check") && workflow.includes("run: pnpm lint:rules"),
    `the fixture's pipeline must run that step, or there is nothing for the entry to exclude. ` +
      `Got:\n${workflow}`,
  );
  const scripts = manifestOf(USG_NOT_CHECKS_FIXTURE)["scripts"] as Record<string, string>;
  assert.ok(
    Object.keys(scripts).includes("lint:rules"),
    `the excluded step must run a script the current discovery rule already finds. Got: ` +
      `${JSON.stringify(scripts)}`,
  );
});

Given("a sibling check step no entry of its names", function () {
  const workflow = workflowOf(USG_NOT_CHECKS_FIXTURE);
  assert.ok(
    workflow.includes("name: Sweep check") && workflow.includes("run: pnpm lint:sweep"),
    `the fixture must run a SECOND check, or "the excluded one is off the books" is satisfied by ` +
      `a reader that discovers nothing at all. Got:\n${workflow}`,
  );
  assert.ok(
    !notChecksOf(USG_NOT_CHECKS_FIXTURE).includes("ci.yml:ci:Sweep check"),
    `the control must be named by no entry, or it is not a control. Got: ` +
      `${JSON.stringify(notChecksOf(USG_NOT_CHECKS_FIXTURE))}`,
  );
});

Given("an entry that names no step its pipeline runs", function () {
  const entries = notChecksOf(USG_NOT_CHECKS_FIXTURE);
  const stale = entries[1];
  assert.equal(
    stale,
    "ci.yml:ci:Circular-import check",
    `the fixture must carry a second entry, the Sweep check's old name. Got: ${JSON.stringify(entries)}`,
  );
  assert.ok(
    stale.startsWith("ci.yml:ci:"),
    `the stale entry must be well-formed, or it names nothing for a reason other than the rename`,
  );
  assert.ok(
    !workflowOf(USG_NOT_CHECKS_FIXTURE).includes("Circular-import check"),
    `the fixture's pipeline must NOT run a step of that name, or the entry is not stale at all`,
  );
});

Then(
  "the report names the excluded step, and its check is off the books while the sibling's is on them",
  function () {
    assert.deepEqual(
      excludedStepLines(activeMd).filter((line) => line.includes("— excluded:")),
      [
        "- ci.yml:ci:Rule check — excluded: the target names this step a non-check.",
        "- ci.yml:ci:pnpm install --frozen-lockfile — excluded: the target names this step a non-check.",
      ],
      `expected the excluded step NAMED on the report. A step that simply vanished is the silence ` +
        `this axis exists to end, arriving with the consumer's own signature on it. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected one of the pipeline's two checks counted: the excluded one off the books and the ` +
        `sibling still on them. Two means the entry excluded nothing; nought means it took the ` +
        `control with it. Got:\n${activeMd}`,
    );
    assert.ok(
      !activeMd.includes("(lint:rules)"),
      `expected the excluded step's check off the books entirely — not merely uncounted. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("Evidence Observation cites no Scenario (lint:sweep)"),
      `expected the sibling check still banked on the suspense row. Without it the line above ` +
        `passes over a reader that discovered nothing. Got:\n${activeMd}`,
    );
  },
);

Then("the report names the entry that matched no step", function () {
  assert.deepEqual(
    excludedStepLines(activeMd),
    [
      "- ci.yml:ci:Rule check — excluded: the target names this step a non-check.",
      "- ci.yml:ci:pnpm install --frozen-lockfile — excluded: the target names this step a non-check.",
      "- ci.yml:ci:Circular-import check — matches no step: the entry names nothing this run read.",
    ],
    `expected the stale entry NAMED as matching nothing. It is a fact about the consumer's ` +
      `manifest only this run can see: they wrote a line, it hides nothing, and dropping it is ` +
      `the same fault as dropping a step. Got:\n${activeMd}`,
  );
});

const USG_RECONCILER_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-reconciler/features",
  ci: "tests/fixtures/usg-reconciler/ci.yml",
  packageJson: "tests/fixtures/usg-reconciler/package.json",
};

function reconcilerStepLines(md: string): string[] {
  return reportSectionLines(md, "### The reconciler").filter((line) => line.startsWith("- "));
}

function scriptsOf(fixture: UsgFixture): Record<string, string> {
  return manifestOf(fixture)["scripts"] as Record<string, string>;
}

Given(
  "a target whose pipeline runs the reconciliation and dumps the step record it reads",
  function () {
    activeFixture = USG_RECONCILER_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg014-"));
    const workflow = workflowOf(USG_RECONCILER_FIXTURE);
    const scripts = scriptsOf(USG_RECONCILER_FIXTURE);
    assert.ok(
      workflow.includes("name: Self-reconciliation balance") &&
        workflow.includes("run: pnpm lint:reconcile") &&
        scripts["lint:reconcile"]?.includes("spec-controller balance"),
      `the fixture's pipeline must invoke the reconciliation through its manifest. Got:\n${workflow}\n` +
        `${JSON.stringify(scripts)}`,
    );
    assert.ok(
      workflow.includes("name: Dump this run's step record") &&
        workflow.includes("toJSON(steps)") &&
        workflow.includes("run: pnpm lint:dump"),
      `the fixture must dump the step record through the expression that produces it. Got:\n${workflow}`,
    );
    assert.deepEqual(
      ["lint:reconcile", "lint:dump"].filter((name) => Object.keys(scripts).includes(name)),
      ["lint:reconcile", "lint:dump"],
      `both reconciler steps must run a script the current discovery rule already finds. Got: ` +
        `${JSON.stringify(scripts)}`,
    );
  },
);

Given("a manifest that says nothing about either step", function () {
  assert.ok(
    !Object.keys(manifestOf(USG_RECONCILER_FIXTURE)).includes("specController"),
    `the fixture must configure NOTHING, or "by construction" is untested: a consumer's own ` +
      `exclusions would produce the identical report. Got: ` +
      `${JSON.stringify(Object.keys(manifestOf(USG_RECONCILER_FIXTURE)))}`,
  );
});

Given("an ordinary check step of the same pipeline", function () {
  const workflow = workflowOf(USG_RECONCILER_FIXTURE);
  assert.ok(
    workflow.includes("name: Sweep check") && workflow.includes("run: pnpm lint:sweep"),
    `the fixture must run a check that is NOT the reconciler, or "neither reaches the books" is ` +
      `satisfied by a reader that discovers nothing at all. Got:\n${workflow}`,
  );
});

Then(
  "the report accounts for both steps as the reconciler, and neither is on the books while the ordinary check is",
  function () {
    assert.deepEqual(
      reconcilerStepLines(activeMd),
      [
        "- ci.yml:ci:Dump this run's step record — the reconciler: this step writes the step record the reconciliation reads.",
        "- ci.yml:ci:Self-reconciliation balance — the reconciler: this step runs the reconciliation this report is.",
      ],
      `expected both halves of the reconciler NAMED on the report. A step that simply vanished is ` +
        `the silence this axis exists to end, and the reconciler vanishing is that silence over ` +
        `the one step no consumer can be asked to account for. Got:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes("1 static check(s) run, 1 uncited static check(s)"),
      `expected only the ordinary check counted: the reconciler and its dump off the books and ` +
        `the sweep still on them. Three means the reconciler reconciles itself — its own citation ` +
        `unsatisfiable, so out of balance for ever; nought means the control went with it. ` +
        `Got:\n${activeMd}`,
    );
    for (const handle of ["lint:reconcile", "lint:dump"]) {
      assert.ok(
        !activeMd.includes(`(${handle})`),
        `expected ${handle} off the books entirely — not merely uncounted. Got:\n${activeMd}`,
      );
    }
    assert.ok(
      activeMd.includes("Evidence Observation cites no Scenario (lint:sweep)"),
      `expected the ordinary check still banked on the suspense row. Without it the line above ` +
        `passes over a reader that discovered nothing. Got:\n${activeMd}`,
    );
  },
);

Then("the report names nothing the target excluded", function () {
  assert.ok(
    !activeMd.includes("### Excluded steps"),
    `expected NO consumer-exclusion section: the reconciler is excluded by construction, and a ` +
      `report crediting the target's own configuration for it would be crediting a list that ` +
      `does not exist. Got:\n${activeMd}`,
  );
});

const USG_ACTION_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-action/features",
  ci: "tests/fixtures/usg-action/ci.yml",
  packageJson: "tests/fixtures/usg-action/package.json",
};

const USG_ACTION_REFERENCE = "github/codeql-action/analyze@v3";

function suspenseRowCredits(md: string): string {
  const cells = ledgerRowCells(md, "(no scenario)");
  return cells[cells.length - 2] ?? "";
}

Given(
  "a target whose pipeline runs a quality check as an action rather than a command",
  function () {
    activeFixture = USG_ACTION_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg013-"));
    assert.ok(
      workflowOf(USG_ACTION_FIXTURE).includes(
        `      - uses: ${USG_ACTION_REFERENCE}\n      - run: pnpm domain-purity`,
      ),
      `the fixture must run its check as an UNNAMED action step, or the scenario poses no ` +
        `question about a step that carries no command and no name of its own. Got:\n` +
        `${workflowOf(USG_ACTION_FIXTURE)}`,
    );
    assert.deepEqual(
      Object.keys(scriptsOf(USG_ACTION_FIXTURE)),
      ["domain-purity"],
      `the target must define no script for the action, or the action reaches the books through ` +
        `the manifest hop rather than by being a step`,
    );
  },
);

Given("a check step of the same pipeline that runs a command", function () {
  const workflow = workflowOf(USG_ACTION_FIXTURE);
  assert.ok(
    workflow.includes("- run: pnpm domain-purity"),
    `the fixture must run a SECOND check as an ordinary command, or a reader that discovered ` +
      `nothing at all satisfies the claim below. Got:\n${workflow}`,
  );
  const specController = manifestOf(USG_ACTION_FIXTURE)["specController"] as Record<string, unknown>;
  assert.deepEqual(
    specController["fitnessChecks"],
    undefined,
    `the control's handle must name no configured row, or its credit lands on the suspense row ` +
      `for a second reason and stops being a control for this one`,
  );
  assert.ok(
    !readFileSync(
      join(process.cwd(), USG_ACTION_FIXTURE.features, "target.feature"),
      "utf8",
    ).includes("@domain-purity"),
    `no scenario of the target's corpus may carry the control's bare check tag, or the control ` +
      `is attributed rather than uncited`,
  );
});

Then(
  "the report posts the action to the suspense row, named by the action reference it uses",
  function () {
    assert.ok(
      suspenseRowCredits(activeMd).includes(
        `fitness ❓ Evidence Observation cites no Scenario (${USG_ACTION_REFERENCE})`,
      ),
      `expected the action on the books as an uncited static check, named by the action ` +
        `reference GitHub itself displays for a step carrying no name of its own. A reader that ` +
        `discards every uses: step drops a real check and says nothing — the silence this axis ` +
        `exists to end, arriving by a different route. Got "${suspenseRowCredits(activeMd)}" in:\n` +
        `${activeMd}`,
    );
    const bearing = activeMd
      .slice(activeMd.indexOf("## Scenario Reconciliations"))
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes(`(${USG_ACTION_REFERENCE})`))
      .map((line) => line.split("|").map((c) => c.trim())[1]);
    assert.deepEqual(
      bearing,
      ["(no scenario)"],
      `expected the action's credit on the suspense row and on no other; got ` +
        `${JSON.stringify(bearing)} in:\n${activeMd}`,
    );
  },
);

Then("the command check is on the books beside it", function () {
  assert.ok(
    activeMd.includes("2 static check(s) run, 2 uncited static check(s)"),
    `expected BOTH steps of the pipeline counted — the action and the command check. One means ` +
      `the reader gained a half and lost a half; nought means it discovered nothing at all. ` +
      `Got:\n${activeMd}`,
  );
  assert.ok(
    suspenseRowCredits(activeMd).includes(
      "fitness ❓ Evidence Observation cites no Scenario (domain-purity)",
    ),
    `expected the command check still banked on the suspense row. Without it the assertion ` +
      `above passes over a reader that discovered nothing. Got:\n${activeMd}`,
  );
});

After({ tags: "@USG" }, function () {
  if (activeDir && existsSync(activeDir)) rmSync(activeDir, { recursive: true, force: true });
  if (secondDir && existsSync(secondDir)) rmSync(secondDir, { recursive: true, force: true });
});

const USG_NEW_CLIENT_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-new-client/features",
  ci: "tests/fixtures/usg-new-client/ci.yml",
  packageJson: "tests/fixtures/usg-new-client/package.json",
};

const USG_NEW_CLIENT_CANDIDATES = [
  "actions/checkout@v4",
  "actions/setup-node@v4",
  "github/codeql-action/analyze@v3",
  "lint",
  "pnpm install --frozen-lockfile",
  "test",
  "typecheck",
];

const USG_NEW_CLIENT_SUITE_HANDLE = "test";

let newClientStatus: number | null;
let newClientStderr: string;

Given("a target whose configuration names no runners and no non-checks", function () {
  activeFixture = USG_NEW_CLIENT_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg017-"));
  assert.deepEqual(
    manifestOf(USG_NEW_CLIENT_FIXTURE)["specController"],
    {},
    `the fixture's manifest must configure NOTHING, or the report below is a report about ` +
      `whatever it configured instead of about a consumer who configured nothing`,
  );
});

Given("a pipeline of ordinary steps, the target's own test suite among them", function () {
  const workflow = workflowOf(USG_NEW_CLIENT_FIXTURE);
  for (const step of ["- uses: actions/checkout@v4", "- uses: github/codeql-action/analyze@v3"]) {
    assert.ok(
      workflow.includes(step),
      `the pipeline must run steps in BOTH forms, or "every step" is a claim about half of one. ` +
        `Missing "${step}" in:\n${workflow}`,
    );
  }
  assert.ok(
    workflow.includes("      - name: Unit tests\n        run: pnpm test"),
    `the pipeline must run the target's own unit suite, or the arm asserting that a suite step ` +
      `is a candidate asserts nothing. Got:\n${workflow}`,
  );
  assert.equal(
    scriptsOf(USG_NEW_CLIENT_FIXTURE)[USG_NEW_CLIENT_SUITE_HANDLE],
    "vitest run",
    `the suite step must reach a real runner through the manifest, or naming one tier would not ` +
      `take it out and the false positive this scenario reports would have no remedy`,
  );
});

When("the target's first reconciliation is rendered", function () {
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
      "--target", "usg-new-client-fixture",
      "--format", `md:${reportPath}`,
    ],
    { cwd: activeDir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(
    existsSync(reportPath),
    `expected a report to be written; stderr:\n${result.stderr}`,
  );
  newClientStatus = result.status;
  newClientStderr = result.stderr;
  activeMd = readFileSync(reportPath, "utf8");
});

Then(
  "the report posts every step of that pipeline to the suspense row, the test suite among them",
  function () {
    const credits = suspenseRowCredits(activeMd);
    const banked = USG_NEW_CLIENT_CANDIDATES.filter((handle) =>
      credits.includes(`fitness ❓ Evidence Observation cites no Scenario (${handle})`),
    );
    assert.deepEqual(
      banked,
      USG_NEW_CLIENT_CANDIDATES,
      `expected EVERY step of the pipeline on the suspense row. A consumer who has configured ` +
        `nothing has taken nothing out of discovery, so a step missing here is a check the tool ` +
        `saw and said nothing about — the silence this axis exists to end. Got ` +
        `"${credits}" in:\n${activeMd}`,
    );
    assert.ok(
      activeMd.includes(
        `${USG_NEW_CLIENT_CANDIDATES.length} static check(s) run, ` +
          `${USG_NEW_CLIENT_CANDIDATES.length} uncited static check(s)`,
      ),
      `expected exactly the pipeline's ${USG_NEW_CLIENT_CANDIDATES.length} steps counted and ` +
        `every one of them uncited. Got:\n${activeMd}`,
    );
    assert.ok(
      banked.includes(USG_NEW_CLIENT_SUITE_HANDLE),
      `expected the target's own unit suite on the books as a candidate. With no runner named it ` +
        `is a step like any other: the false positive is the direction this axis chose, it is ` +
        `visible, and it is one line of the consumer's own configuration to correct. Got ` +
        `"${credits}"`,
    );
  },
);

Then("the report asks the target to configure nothing", function () {
  assert.equal(
    newClientStderr,
    "",
    `expected the run to say nothing: a target that has configured nothing is a supported state, not an ` +
      `incomplete one. Got stderr:\n${newClientStderr}`,
  );
  for (const section of ["### Excluded steps", "### Behavioural runners"]) {
    assert.ok(
      !activeMd.includes(section),
      `expected no "${section}" section: this target configured nothing, so there is nothing ` +
        `for one to account for. Got:\n${activeMd}`,
    );
  }
});

Then("the run does not balance", function () {
  assert.equal(
    newClientStatus,
    1,
    `expected the first run to fail: every candidate cites nothing, so every one of them posts ` +
      `to suspense and the accounts do not agree. Got exit ${newClientStatus}. Report:\n${activeMd}`,
  );
  assert.ok(
    activeMd.includes("**OUT-OF-BALANCE**"),
    `expected the verdict to say so in the report as well as in the exit code. Got:\n${activeMd}`,
  );
});

const USG_SCOPE_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-scope/features",
  ci: "tests/fixtures/usg-scope/workflows",
  packageJson: "tests/fixtures/usg-scope/package.json",
};

const USG_SCOPE_ROWS = [
  "| ci.yml | ci | 4 | 2 |",
  "| nightly.yml | audit | 1 | 1 |",
  "| nightly.yml | sweep | 2 | 2 |",
];

function discoveryScopeRows(md: string): string[] {
  return reportSectionLines(md, "### Discovery scope").filter(
    (line) => line.startsWith("| ") && !line.startsWith("| Workflow |") && !line.startsWith("| --- |")
  );
}

function scopeWorkflowOf(file: string): string {
  return readFileSync(join(process.cwd(), USG_SCOPE_FIXTURE.ci, file), "utf8");
}

Given("a target whose pipeline is two workflows, the second of them running two jobs", function () {
  activeFixture = USG_SCOPE_FIXTURE;
  activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg020-"));
  const nightly = scopeWorkflowOf("nightly.yml");
  for (const job of ["  sweep:", "  audit:"]) {
    assert.ok(
      nightly.includes(job),
      `the second workflow must run more than one job, or "names every job" is a claim about a ` +
        `pipeline that has one. Missing "${job}" in:\n${nightly}`,
    );
  }
  assert.ok(
    nightly.indexOf("  sweep:") < nightly.indexOf("  audit:"),
    `the second workflow must write its jobs in an order sorting has to change, or a reader ` +
      `emitting them as it met them agrees with a reader that sorts. Got:\n${nightly}`,
  );
  const specController = manifestOf(USG_SCOPE_FIXTURE)["specController"] as Record<string, unknown>;
  assert.deepEqual(
    specController["runners"],
    { unit: "vitest" },
    `the manifest must name a runner one step of ci.yml runs, or steps and candidates agree ` +
      `everywhere and the pair asserts nothing`,
  );
  assert.deepEqual(
    specController["notChecks"],
    ["ci.yml:ci:Install"],
    `the manifest must name one step of ci.yml a non-check, for the same reason`,
  );
});

Then(
  "the report names every workflow and every job it read, with the steps it read from each and how many of them became candidates",
  function () {
    assert.deepEqual(
      [...discoveryScopeRows(activeMd)].sort(),
      [...USG_SCOPE_ROWS].sort(),
      `expected the report to name each workflow, each job, the steps it read from each and how ` +
        `many became candidates. A bare total says nothing about how many jobs it came from, ` +
        `which is the half of the scope question a consumer cannot ask any other way. Got:\n` +
        `${activeMd}`,
    );
  },
);

Then("the scope it names reads in one settled order", function () {
  assert.deepEqual(
    discoveryScopeRows(activeMd),
    USG_SCOPE_ROWS,
    `expected the scope sorted by workflow and then by job. The fixture's nightly.yml writes ` +
      `sweep before audit, so this order is not the one the pipeline was read in. Got:\n${activeMd}`,
  );
});

const USG_IDENTITY_FIXTURE: UsgFixture = {
  features: "tests/fixtures/usg-identity/features",
  ci: "tests/fixtures/usg-identity/ci.yml",
  packageJson: "tests/fixtures/usg-identity/package.json",
};

const USG_IDENTITY_ROW = "| 10 | 4 | 1 | 2 | 3 | 10 |";

function stepAccountingRows(md: string): string[] {
  return reportSectionLines(md, "### Step accounting").filter(
    (line) =>
      line.startsWith("| ") && !line.startsWith("| Steps read |") && !line.startsWith("| --- |"),
  );
}

function stepAccountingVerdict(md: string): string[] {
  return reportSectionLines(md, "### Step accounting").filter((line) => line.startsWith("- "));
}

function scopeStepsRead(md: string): number[] {
  return discoveryScopeRows(md).map((row) => Number(row.split("|").map((c) => c.trim())[3]));
}

Given(
  "a target whose pipeline holds every disposition this reader has — checks, the runner its manifest names, the reconciliation itself, and steps it calls non-checks",
  function () {
    activeFixture = USG_IDENTITY_FIXTURE;
    activeDir = mkdtempSync(join(tmpdir(), "spec-controller-usg018-"));
    const workflow = workflowOf(USG_IDENTITY_FIXTURE);
    const specController = manifestOf(USG_IDENTITY_FIXTURE)["specController"] as Record<
      string,
      unknown
    >;
    assert.deepEqual(
      specController["runners"],
      { unit: "vitest" },
      `the manifest must name exactly one runner, or the runner column is nought and the identity ` +
        `holds over a reader that cannot recognise one at all`,
    );
    assert.equal(
      (specController["notChecks"] as string[]).length,
      3,
      `the manifest must call three steps non-checks, or the excluded column is nought. Got: ` +
        `${JSON.stringify(specController["notChecks"])}`,
    );
    assert.ok(
      workflow.includes("run: pnpm lint:reconcile") && workflow.includes("toJSON(steps)"),
      `the pipeline must run the reconciliation and dump the step record it reads, or the ` +
        `reconciler column is nought. Got:\n${workflow}`,
    );
    assert.ok(
      workflow.includes("uses: github/codeql-action/analyze@v3"),
      `one candidate must be an action rather than a command: a run:-only reading is the ` +
        `historical shape of exactly the fault this identity is here to catch. Got:\n${workflow}`,
    );
    const dispositions = USG_IDENTITY_ROW.split("|")
      .map((cell) => cell.trim())
      .slice(2, 6);
    assert.equal(
      new Set(dispositions).size,
      4,
      `the four dispositions must carry four different counts, or a swapped attribution is ` +
        `invisible. Got: ${JSON.stringify(dispositions)}`,
    );
  },
);

Then(
  "the report states how many steps it read and how many of them it accounted for, and the two agree",
  function () {
    const [row] = stepAccountingRows(activeMd);
    assert.ok(
      row,
      `expected the report to state the steps it read and the steps it accounted for. Four ` +
        `exhaustive dispositions is a claim about code no reader can check by reading, and a step ` +
        `dropped on a branch nobody enumerated posts no row and reds nothing — only the count ` +
        `sees it. Got:\n${activeMd}`,
    );
    const cells = row.split("|").map((cell) => cell.trim());
    const stepsRead = Number(cells[1]);
    const accountedFor = Number(cells[6]);
    if (accountedFor !== stepsRead) {
      assert.fail(
        `expected every step this run read to be accounted for. The report states ${stepsRead} ` +
          `step(s) read and ${accountedFor} accounted for, so ` +
          `${Math.abs(stepsRead - accountedFor)} ` +
          `step(s) of this pipeline reached none of the four dispositions — or reached two. That ` +
          `is a step seen and dropped in silence, which is the fault this whole axis exists to ` +
          `end, and no section naming what a step BECAME can see it. Got:\n${activeMd}`,
      );
    }
    const scopeTotal = scopeStepsRead(activeMd).reduce((total, steps) => total + steps, 0);
    if (stepsRead !== scopeTotal) {
      assert.fail(
        `expected the steps accounted for to be the steps the scope section says were read; got ` +
          `${stepsRead} against ${scopeTotal}. Nought against nought satisfies the identity while ` +
          `proving nothing. Got:\n${activeMd}`,
      );
    }
    assert.deepEqual(
      stepAccountingVerdict(activeMd),
      ["- every step this run read is accounted for."],
      `expected the report to say so in words as well as figures, and to name the shortfall where ` +
        `there is one. Got:\n${activeMd}`,
    );
  },
);

Then("each disposition carries the count that pipeline gives it", function () {
  assert.deepEqual(
    stepAccountingRows(activeMd),
    [USG_IDENTITY_ROW],
    `expected four candidates, one runner, two reconciler steps and three the manifest calls ` +
      `non-checks, over ten steps read. Got:\n${activeMd}`,
  );
});
