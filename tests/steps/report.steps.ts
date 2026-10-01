import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runReconcile, readEvidenceObligations, readFeatureNames } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { writeOutputs, type OutputPayloads } from "../../packages/spec-controller/src/cli-balance/emit/writer.js";
import type { OutputPlan } from "../../packages/spec-controller/src/cli-balance/emit/format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

function persistReport(dir: string, payloads: OutputPayloads): string {
  const plan: OutputPlan = {
    outputs: [
      { fmt: "md", dest: { kind: "file", path: join(dir, "spec-reconciliation.md") } },
      { fmt: "json", dest: { kind: "file", path: join(dir, "spec-reconciliation.json") } },
    ],
  };
  writeOutputs(plan, payloads);
  return dir;
}

let ctx: RunContext;
let inputFlag: string;
let inputValue: string;
let runsRoot: string;
let markdown: string;
let jsonText: string;

let targetSourcingDir: string;
let targetSourcingReport: string;

const TARGET_FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

function runCliForTarget(targetArg: string | undefined): string {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  targetSourcingDir = mkdtempSync(join(tmpdir(), "spec-controller-rpt001-target-"));
  const reportPath = join(targetSourcingDir, "spec-reconciliation.md");
  const argv = [
    ...SPEC_CONTROLLER_ARGV,
    "balance",
    "--features", abs(TARGET_FIXTURE.features),
    "--vitest", abs(TARGET_FIXTURE.vitest),
    "--cucumber", abs(TARGET_FIXTURE.cucumber),
    "--format", `md:${reportPath}`,
  ];
  if (targetArg !== undefined) argv.push("--target", targetArg);
  const result = spawnSync(NODE, argv, {
    cwd: targetSourcingDir,
    encoding: "utf8",
  });
  assert.equal(
    result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
  );
  assert.equal(
    result.status,
    1,
    `expected the CLI to exit 1 (out-of-balance) writing the markdown report; got exit ${result.status}\n` +
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  assert.ok(
    existsSync(reportPath),
    `expected the CLI to persist ${reportPath}; it does not exist`
  );
  return readFileSync(reportPath, "utf8");
}

Given(
  "a reconciliation run targeting {string} with the input {string} at the UTC instant {string} and source SHA {string}",
  function (target: string, input: string, iso: string, sourceSha: string) {
    const [flag, value] = input.split(/\s+/, 2);
    inputFlag = flag ?? "";
    inputValue = value ?? "";
    ctx = {
      target,
      inputs: { features: inputValue },
      runStart: new Date(iso),
      sourceSha,
      toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
      toolVersion: "0.1.0",
    };
    runsRoot = mkdtempSync(join(tmpdir(), "spec-controller-rpt-"));
  }
);

When("the run writes its markdown artifact", function () {
  const balance = runReconcile({});
  const runDir = persistReport(runsRoot, { balance, ctx });
  markdown = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md opens with a Run provenance header stating the target, the input, the UTC timestamp, the source SHA, the tool SHA, and the tool version",
  function () {
    assert.match(
      markdown,
      /## Run provenance/,
      `expected the persisted spec-reconciliation.md to carry a Run provenance header; got:\n${markdown}`
    );
    assert.ok(
      markdown.includes(ctx.target),
      `expected the provenance header to outcome the target "${ctx.target}"; got:\n${markdown}`
    );
    assert.ok(
      markdown.includes(inputFlag) && markdown.includes(inputValue),
      `expected the provenance header to outcome the input "${inputFlag} ${inputValue}"; got:\n${markdown}`
    );
    assert.match(
      markdown,
      /2026-06-27T08:17:53Z/,
      `expected the provenance header to outcome the UTC run timestamp; got:\n${markdown}`
    );
    assert.ok(
      typeof ctx.sourceSha === "string" && markdown.includes(ctx.sourceSha),
      `expected the provenance header to outcome the source SHA "${ctx.sourceSha}"; got:\n${markdown}`
    );
    assert.ok(
      typeof ctx.toolSha === "string" && markdown.includes(`- Tool SHA: ${ctx.toolSha}`),
      `expected the provenance header to outcome the tool SHA "${ctx.toolSha}"; got:\n${markdown}`
    );
    assert.ok(
      typeof ctx.toolVersion === "string" && markdown.includes(`- Tool version: ${ctx.toolVersion}`),
      `expected the provenance header to outcome the tool version "${ctx.toolVersion}"; got:\n${markdown}`
    );
    assert.ok(
      markdown.indexOf("## Run provenance") < markdown.indexOf("| Scenario |"),
      `expected the provenance header to open the report, above the scenario table; got:\n${markdown}`
    );
  }
);

After({ tags: "@SCN-RPT-001" }, function () {
  if (runsRoot && existsSync(runsRoot)) rmSync(runsRoot, { recursive: true, force: true });
  if (targetSourcingDir && existsSync(targetSourcingDir)) {
    rmSync(targetSourcingDir, { recursive: true, force: true });
  }
});

When("the real CLI writes a markdown report with --target {string}", function (target: string) {
  targetSourcingReport = runCliForTarget(target);
});

Then(
  "the persisted report's Run provenance outcomes {string} verbatim",
  function (expectedLine: string) {
    assert.ok(
      targetSourcingReport.includes(`- ${expectedLine}`),
      `expected the persisted Run provenance to outcome "- ${expectedLine}"; got:\n${targetSourcingReport}`
    );
  }
);

When("the real CLI writes a markdown report with no --target flag", function () {
  targetSourcingReport = runCliForTarget(undefined);
});

Then(
  "the persisted report's Run provenance outcomes {string}",
  function (expectedLine: string) {
    assert.ok(
      targetSourcingReport.includes(`- ${expectedLine}`),
      `expected the persisted Run provenance to outcome "- ${expectedLine}"; got:\n${targetSourcingReport}`
    );
  }
);

When("the run writes its JSON artifact", function () {
  const balance = runReconcile({});
  const runDir = persistReport(runsRoot, { balance, ctx });
  jsonText = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then(
  "the persisted spec-reconciliation.json parses to an object whose runProvenance outcomes the target, source SHA, tool SHA, tool version, UTC timestamp, and input, with the evidenceReconciliation body intact",
  function () {
    const parsed = JSON.parse(jsonText) as {
      runProvenance?: {
        target?: string;
        sourceSha?: string | null;
        toolSha?: string | null;
        toolVersion?: string;
        runTimestamp?: string;
        inputs?: Record<string, string>;
      };
      ledger?: { scenarioReconciliations: unknown[] };
    };

    assert.ok(
      parsed.runProvenance,
      `expected the persisted spec-reconciliation.json to carry a top-level runProvenance object; got:\n${jsonText}`
    );
    for (const key of ["target", "sourceSha", "toolSha", "toolVersion"] as const) {
      const got: string | null | undefined = parsed.runProvenance[key];
      assert.equal(got, ctx[key], `expected runProvenance.${key} "${ctx[key]}"; got "${got}"`);
    }
    assert.match(
      parsed.runProvenance.runTimestamp ?? "",
      /2026-06-27T08:17:53Z/,
      `expected runProvenance.runTimestamp in UTC; got "${parsed.runProvenance.runTimestamp}"`
    );
    assert.equal(
      parsed.runProvenance.inputs?.[inputFlag.replace(/^--/, "")],
      inputValue,
      `expected runProvenance.inputs to carry the input "${inputFlag} ${inputValue}"; got ${JSON.stringify(parsed.runProvenance.inputs)}`
    );
    assert.ok(
      Array.isArray(parsed.ledger?.scenarioReconciliations),
      `expected the ledger body to survive intact; got:\n${jsonText}`
    );
    assert.ok(
      !("warnings" in (JSON.parse(jsonText) as object)),
      `expected NO retired "warnings" key; got:\n${jsonText}`
    );
  }
);

After({ tags: "@SCN-RPT-002" }, function () {
  if (runsRoot && existsSync(runsRoot)) rmSync(runsRoot, { recursive: true, force: true });
});

let evidenceObligations008: EvidenceObligations;
let runsRoot008: string;
let md008: string;
let json008: string;

Given(
  "a reconciliation run whose source mentions @SCN ids in non-tag context beyond the scenarios",
  function () {
    evidenceObligations008 = readEvidenceObligations();
    runsRoot008 = mkdtempSync(join(tmpdir(), "spec-controller-rpt008-"));
  }
);

When("the run writes its markdown and JSON artifacts", function () {
  const balance = runReconcile({});
  const ctx008: RunContext = {
    target: "spec-controller",
    inputs: {},
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot008, { balance, ctx: ctx008, evidenceObligations: evidenceObligations008 });
  md008 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json008 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md outcomes {string} and the persisted spec-reconciliation.json carries the same excluded count on a evidenceObligations object",
  function (_phrase: string) {
    const excluded = evidenceObligations008.excludedOccurrences;
    assert.ok(
      excluded > 0,
      `expected the spec-controller corpus to mention @SCN ids in non-tag context (excluded > 0); got ${excluded}`
    );
    assert.ok(
      md008.includes(`${excluded} @SCN ids seen in non-tag context, excluded`),
      `expected spec-reconciliation.md to outcome the excluded count ${excluded}; got:\n${md008}`
    );
    const parsed = JSON.parse(json008) as {
      evidenceObligations?: { excludedOccurrences?: number };
    };
    assert.ok(
      parsed.evidenceObligations,
      `expected spec-reconciliation.json to carry a evidenceObligations object; got:\n${json008}`
    );
    assert.equal(
      parsed.evidenceObligations.excludedOccurrences,
      excluded,
      `expected the JSON excluded count to agree with the markdown's ${excluded}; got ${parsed.evidenceObligations.excludedOccurrences}`
    );
  }
);

After({ tags: "@SCN-RPT-008" }, function () {
  if (runsRoot008 && existsSync(runsRoot008)) rmSync(runsRoot008, { recursive: true, force: true });
});

const EVIDENCE_OBSERVATION_OPTS = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};
let runsRoot010: string;
let md010: string;
let json010: string;

Given(
  "a reconciliation run over a target whose Vitest and Cucumber reports span attributed, phantom-id, and cites-no-scenario evidence observations",
  function () {
    runsRoot010 = mkdtempSync(join(tmpdir(), "spec-controller-rpt010-"));
  }
);

When("the run writes its artifacts with the evidence observation reconciliation", function () {
  const balance = runReconcile(EVIDENCE_OBSERVATION_OPTS);
  const ctx010: RunContext = {
    target: "evidence observation-fixture",
    inputs: {},
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot010, { balance, ctx: ctx010, withRuntimeObservations: true });
  md010 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json010 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md renders the Test volume cut with the balancing identity and spec-reconciliation.json carries evidence-observation atoms that balance by construction",
  function () {
    assert.match(
      md010,
      /### Test volume/,
      `expected the persisted spec-reconciliation.md to carry the Test volume cut; got:\n${md010}`
    );
    assert.ok(
      md010.includes("5 evidence observations = 2 on scenarios + 1 on phantom scenarios + 2 on the suspense scenario"),
      `expected the evidence observation identity line "5 evidence observations = 2 on scenarios + 1 on phantom scenarios + 2 on the suspense scenario"; got:\n${md010}`
    );
    assert.ok(
      md010.includes("| unit | 3 |") && md010.includes("| integration | 2 |"),
      `expected the by-level evidence observation table (3 unit / 2 integration); got:\n${md010}`
    );

    const parsed = JSON.parse(json010) as {
      summary: {
        rawByRuntimeQualityCheck: Record<string, number>;
        testVolume: { onScenario: number; onPhantomScenario: number; onSuspenseScenario: number };
      };
      evidenceObservations?: unknown;
    };
    assert.ok(
      !("evidenceObservations" in parsed),
      `expected NO evidenceObservations section (retired); got:\n${json010}`
    );
    const raw = Object.values(parsed.summary.rawByRuntimeQualityCheck).reduce((n, v) => n + v, 0);
    const tv = parsed.summary.testVolume;
    assert.equal(raw, 5, `expected 5 raw evidence observations; got ${raw}`);
    assert.equal(
      raw,
      tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario,
      `the evidence-observation identity must balance by construction: raw ${raw} = onScenario ${tv.onScenario} + onPhantomScenario ${tv.onPhantomScenario} + onSuspenseScenario ${tv.onSuspenseScenario}`
    );
  }
);

After({ tags: "@SCN-RPT-010" }, function () {
  if (runsRoot010 && existsSync(runsRoot010)) rmSync(runsRoot010, { recursive: true, force: true });
});

const EVIDENCE_OBSERVATION_E2E_OPTS = {
  features: "tests/fixtures/evidence-observation-e2e/features",
  cucumber: "tests/fixtures/evidence-observation-e2e/cucumber.json",
  packageJson: "tests/fixtures/evidence-observation-e2e/package.json",
};
let runsRoot017: string;
let md017: string;
let json017: string;

Given(
  "a target whose cucumber report has a passing @e2e scenario with no vitest evidence",
  function () {
    runsRoot017 = mkdtempSync(join(tmpdir(), "spec-controller-rpt017-"));
  }
);

When("the reconciliation report is rendered for that @e2e-via-cucumber target", function () {
  const balance = runReconcile(EVIDENCE_OBSERVATION_E2E_OPTS);
  const ctx017: RunContext = {
    target: "evidence-observation-e2e-fixture",
    inputs: {},
    runStart: new Date("2026-07-08T20:30:17.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot017, { balance, ctx: ctx017, withRuntimeObservations: true });
  md017 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json017 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then("Test volume counts the observation under e2e, not integration", function () {
  assert.match(
    md017,
    /### Test volume/,
    `expected the persisted spec-reconciliation.md to carry the Test volume cut; got:\n${md017}`
  );
  assert.ok(
    md017.includes("| e2e | 1 |"),
    `expected the Test volume by-level table to count the observation under e2e (| e2e | 1 |); got:\n${md017}`
  );
  assert.ok(
    md017.includes("| integration | 0 |"),
    `expected the Test volume by-level table to count ZERO under integration (| integration | 0 |); got:\n${md017}`
  );
});

Then("the e2e credit posts to that scenario's ledger row", function () {
  const parsed = JSON.parse(json017) as {
    ledger: { scenarioReconciliations: Array<{ scnId: string; evidenceObservations: Array<{ qualityCheck: string }> }> };
  };
  const row = parsed.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-TGT-101");
  assert.ok(row, `expected a ledger row for SCN-TGT-101; got:\n${json017}`);
  const e2eCredits = row!.evidenceObservations.filter((o) => o.qualityCheck === "e2e");
  assert.equal(
    e2eCredits.length,
    1,
    `expected SCN-TGT-101's row to carry ONE e2e credit; got: ${JSON.stringify(row!.evidenceObservations)}`
  );
});

Then("the scenario's E2e cell renders a count, not ∅", function () {
  const row = md017.split("\n").find((l) => l.includes("| SCN-TGT-101 |"));
  assert.ok(row, `expected a ledger row for SCN-TGT-101; got:\n${md017}`);
  assert.ok(
    !row!.includes("∅"),
    `expected SCN-TGT-101's E2e cell to render a count, not ∅; got row:\n${row}`
  );
  assert.match(
    row!,
    /\| SCN-TGT-101 \| E\/1 \|/,
    `expected SCN-TGT-101's E2e cell to render E/1 (named, one observation); got row:\n${row}`
  );
});

After({ tags: "@SCN-RPT-017" }, function () {
  if (runsRoot017 && existsSync(runsRoot017)) rmSync(runsRoot017, { recursive: true, force: true });
});

const EVIDENCE_OBSERVATION_INTEGRATION_E2E_OPTS = {
  features: "tests/fixtures/evidence-observation-integration-e2e/features",
  cucumber: "tests/fixtures/evidence-observation-integration-e2e/cucumber.json",
  packageJson: "tests/fixtures/evidence-observation-integration-e2e/package.json",
};
let runsRoot018: string;
let md018: string;
let json018: string;

Given(
  "a target whose cucumber report has a single passing @integration @e2e scenario tagged SCN-TGT-102",
  function () {
    runsRoot018 = mkdtempSync(join(tmpdir(), "spec-controller-rpt018-"));
  }
);

When(
  "the reconciliation report is rendered for that @integration @e2e-via-cucumber target",
  function () {
    const balance = runReconcile(EVIDENCE_OBSERVATION_INTEGRATION_E2E_OPTS);
    const ctx018: RunContext = {
      target: "evidence-observation-integration-e2e-fixture",
      inputs: {},
      runStart: new Date("2026-07-08T20:30:17.000Z"),
      sourceSha: null,
    };
    const runDir = persistReport(runsRoot018, { balance, ctx: ctx018, withRuntimeObservations: true });
    md018 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
    json018 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
  }
);

Then("Test volume counts the single observation under both integration and e2e", function () {
  assert.match(
    md018,
    /### Test volume/,
    `expected the persisted spec-reconciliation.md to carry the Test volume cut; got:\n${md018}`
  );
  assert.ok(
    md018.includes("| integration | 1 |"),
    `expected the Test volume by-level table to count the observation under integration (| integration | 1 |); got:\n${md018}`
  );
  assert.ok(
    md018.includes("| e2e | 1 |"),
    `expected the Test volume by-level table to ALSO count the observation under e2e (| e2e | 1 |); got:\n${md018}`
  );
  const parsed = JSON.parse(json018) as {
    ledger: { scenarioReconciliations: Array<{ scnId: string; evidenceObservations: Array<{ qualityCheck: string }> }> };
  };
  const row = parsed.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-TGT-102");
  assert.ok(row, `expected a ledger row for SCN-TGT-102; got:\n${json018}`);
  const credits = row!.evidenceObservations;
  assert.equal(
    credits.filter((o) => o.qualityCheck === "integration").length,
    1,
    `expected SCN-TGT-102's row to carry ONE integration credit; got: ${JSON.stringify(credits)}`
  );
  assert.equal(
    credits.filter((o) => o.qualityCheck === "e2e").length,
    1,
    `expected SCN-TGT-102's row to ALSO carry ONE e2e credit; got: ${JSON.stringify(credits)}`
  );
});

Then("SCN-TGT-102's Integration and E2e cells each render a count, not ∅", function () {
  const row = md018.split("\n").find((l) => l.includes("| SCN-TGT-102 |"));
  assert.ok(row, `expected a ledger row for SCN-TGT-102; got:\n${md018}`);
  assert.ok(
    !row!.includes("∅"),
    `expected SCN-TGT-102's Integration and E2e cells to each render a count, not ∅; got row:\n${row}`
  );
  assert.match(
    row!,
    /\| SCN-TGT-102 \| I\/1 \| E\/1 \|/,
    `expected SCN-TGT-102's Integration and E2e cells to each render their two-sided cell (I/1, E/1); got row:\n${row}`
  );
});

After({ tags: "@SCN-RPT-018" }, function () {
  if (runsRoot018 && existsSync(runsRoot018)) rmSync(runsRoot018, { recursive: true, force: true });
});

const EVIDENCE_CELL_GRID_OPTS = {
  features: "tests/fixtures/evidence-cell-grid/features",
  vitest: "tests/fixtures/evidence-cell-grid/vitest.json",
  cucumber: "tests/fixtures/evidence-cell-grid/cucumber.json",
  ci: "tests/fixtures/evidence-cell-grid/ci.yml",
  packageJson: "tests/fixtures/evidence-cell-grid/package.json",
};
let runsRoot011: string;
let md011: string;

function cellGridRow(scnId: string): string {
  const ledger = md011.slice(md011.indexOf("| Scenario | Fitness |"));
  const row = ledger.split("\n").find((l) => l.startsWith(`| ${scnId} |`));
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${md011}`);
  return row!;
}

function cellGridCells(scnId: string): string[] {
  const parts = cellGridRow(scnId)
    .split("|")
    .map((c) => c.trim());
  return parts.slice(2, 6);
}

Given(
  "a reconciliation over a corpus spanning every cell case — a satisfied obligation, a missing one, a no-evidence-obligation observation citing a scenario that never named that quality-check, a pending obligation with observations citing it at that pair, and a column absent for the scenario",
  function () {
    runsRoot011 = mkdtempSync(join(tmpdir(), "spec-controller-rpt011-"));
  }
);

When("the ledger is rendered", function () {
  const balance = runReconcile(EVIDENCE_CELL_GRID_OPTS);
  const ctx011: RunContext = {
    target: "evidence-cell-grid-fixture",
    inputs: {},
    runStart: new Date("2026-07-14T22:00:11.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot011, { balance, ctx: ctx011, withRuntimeObservations: true });
  md011 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

Then(
  /^each scenario row carries one cell per corpus column \(Fitness first, then the runtime levels present\) with the two-sided obligation-then-observation encoding — an evidence-obligation letter, an observation count, or blank$/,
  function () {
    assert.ok(
      md011.includes("| Scenario | Fitness | Unit | Integration | E2e | Verdict | Reconciling items |"),
      `expected the corpus-driven header (Fitness, Unit, Integration, E2e); got:\n${md011}`
    );
    assert.deepStrictEqual(
      cellGridCells("SCN-CEL-001"),
      ["F/1", "U/1", "", ""],
      "expected SCN-CEL-001 (named and met at fitness + unit) to render Fitness F/1, Unit U/1, then blank"
    );
    assert.deepStrictEqual(
      cellGridCells("SCN-CEL-002"),
      ["", "", "I/-", ""],
      "expected SCN-CEL-002 (named, no observation) to render Integration I/- and blank elsewhere"
    );
  }
);

Then(/^the scenario whose only state at a quality-check is no-evidence-obligation renders a no-evidence-obligation observation there — a dash for the evidence obligation, the count for the observation$/, function () {
  assert.deepStrictEqual(
    cellGridCells("SCN-CEL-003"),
    ["", "-/1", "", "E/1"],
    "expected SCN-CEL-003's Unit cell to render -/1 — the no-evidence-obligation observation — not a named-and-missing cell"
  );
});

Then(
  /^the scenario whose obligation at a quality-check is pending, with observations citing it at that pair, renders a no-evidence-obligation observation there — because the credit is now no-evidence-obligation, not attributed$/,
  function () {
    assert.deepStrictEqual(
      cellGridCells("SCN-CEL-004"),
      ["", "-/1", "", ""],
      "expected SCN-CEL-004's Unit cell to render -/1 — a credit reconciling no-evidence-obligation at a PENDING pair"
    );
  }
);

Then("no cell-key legend precedes the ledger table — the grid speaks for itself", function () {
  const iKey = md011.indexOf("| Cell | Meaning |");
  const iTable = md011.indexOf("| Scenario | Fitness |");
  assert.ok(iKey < 0, `expected NO cell key legend in the persisted report; got:\n${md011}`);
  assert.ok(iTable >= 0, `expected the ledger grid table in the persisted report; got:\n${md011}`);
});

After({ tags: "@SCN-RPT-011" }, function () {
  if (runsRoot011 && existsSync(runsRoot011)) rmSync(runsRoot011, { recursive: true, force: true });
});

const UNTAGGED_FEATURES = "tests/fixtures/untagged/features";
let runsRoot014: string;
let md014: string;
let json014: string;

Given(
  "a target feature directory mixing @SCN-tagged and untagged scenarios",
  function () {
    runsRoot014 = mkdtempSync(join(tmpdir(), "spec-controller-rpt014-"));
  }
);

When("the run writes its artifacts with the scenario corpus", function () {
  const opts = { features: UNTAGGED_FEATURES };
  const balance = runReconcile(opts);
  const evidenceObligations = readEvidenceObligations(UNTAGGED_FEATURES);
  const ctx014: RunContext = {
    target: "untagged-fixture",
    inputs: {},
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot014, { balance, ctx: ctx014, evidenceObligations });
  md014 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json014 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md lists the untagged scenarios with feature locators and spec-reconciliation.json carries them on evidenceObligations",
  function () {
    assert.ok(
      !md014.includes("## Warnings"),
      `expected NO "## Warnings" section (dissolved); got:\n${md014}`
    );
    assert.ok(
      md014.includes("2 scenario(s) carry no @SCN tag:"),
      `expected the untagged-scenario count line; got:\n${md014}`
    );
    assert.ok(
      md014.includes("- sample.feature : an untagged scenario with no anchor") &&
        md014.includes("- sample.feature : an untagged outline with no anchor"),
      `expected both untagged scenarios with feature locators; got:\n${md014}`
    );
    assert.ok(
      !md014.includes("a tagged scenario with an anchor"),
      `expected the @SCN-tagged scenario NOT to be flagged untagged; got:\n${md014}`
    );

    const parsed = JSON.parse(json014) as {
      evidenceObligations?: { untaggedScenarios?: Array<{ feature: string; scenario: string }> };
    };
    assert.ok(
      parsed.evidenceObligations?.untaggedScenarios,
      `expected spec-reconciliation.json evidenceObligations.untaggedScenarios; got:\n${json014}`
    );
    assert.equal(
      parsed.evidenceObligations.untaggedScenarios.length,
      2,
      `expected 2 untagged scenarios on JSON; got ${JSON.stringify(parsed.evidenceObligations.untaggedScenarios)}`
    );
  }
);

After({ tags: "@SCN-RPT-014" }, function () {
  if (runsRoot014 && existsSync(runsRoot014)) rmSync(runsRoot014, { recursive: true, force: true });
});

const BYFEATURE_FEATURES = "tests/fixtures/byfeature/features";
let runsRoot006: string;
let md006: string;

Given(
  "a target feature directory whose features carry codes alongside an uncoded one",
  function () {
    runsRoot006 = mkdtempSync(join(tmpdir(), "spec-controller-rpt006-"));
  }
);

When("the run writes its artifacts with the feature-name map", function () {
  const opts = { features: BYFEATURE_FEATURES };
  const balance = runReconcile(opts);
  const featureNames = readFeatureNames(BYFEATURE_FEATURES);
  const ctx006: RunContext = {
    target: "byfeature-fixture",
    inputs: {},
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot006, { balance, ctx: ctx006, featureNames });
  md006 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md by-feature cut names the coded feature in full and falls back to the bare code for the uncoded id",
  function () {
    assert.ok(
      md006.includes("| config-vocabulary-lint (CVL) | 1 | SCN-CVL-001 |"),
      `expected the coded feature named in full; got:\n${md006}`
    );
    assert.ok(
      !md006.includes("| CVL |"),
      `expected NO bare "| CVL |" row (the full name replaces it); got:\n${md006}`
    );
    assert.ok(
      md006.includes("| XYZ | 1 | SCN-XYZ-001 |"),
      `expected the uncoded id to fall back to the bare FFF; got:\n${md006}`
    );
  }
);

After({ tags: "@SCN-RPT-006" }, function () {
  if (runsRoot006 && existsSync(runsRoot006)) rmSync(runsRoot006, { recursive: true, force: true });
});

const BYFEATURE_PHANTOM = "tests/fixtures/byfeature-phantom";
let runsRoot030: string;
let md030: string;

Given(
  "a corpus whose evidence cites a scenario no feature file names, beside an out-of-balance scenario",
  function () {
    runsRoot030 = mkdtempSync(join(tmpdir(), "spec-controller-rpt030-"));
  }
);

When("that corpus is reconciled and its report written", function () {
  const opts = {
    features: `${BYFEATURE_PHANTOM}/features`,
    vitest: `${BYFEATURE_PHANTOM}/vitest.json`,
    packageJson: `${BYFEATURE_PHANTOM}/package.json`,
    ci: BYFEATURE_PHANTOM,
  };
  const balance = runReconcile(opts);
  const ctx030: RunContext = {
    target: "byfeature-phantom-fixture",
    inputs: {},
    runStart: new Date("2026-09-19T12:00:00.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot030, {
    balance,
    ctx: ctx030,
    featureNames: readFeatureNames(opts.features),
    withRuntimeObservations: true,
  });
  md030 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

Then(
  "the by-feature total line counts the phantom-scenario row as out of balance and not grouped by feature, and its counts add up to the header's out-of-balance and total",
  function () {
    const expected =
      "1 of 2 scenario rows out of balance, grouped by feature; 1 phantom-scenario row(s) out of " +
      "balance, not grouped by feature (no feature file names them).";
    assert.ok(md030.includes(expected), `expected the by-feature sentence "${expected}"; got:\n${md030}`);
    assert.ok(md030.includes("| target (BFP) | 1 | SCN-BFP-002 |"), `expected the one grouped row; got:\n${md030}`);
    assert.ok(!/\| [^|]* \| \d+ \| [^|]*SCN-BFP-099/.test(md030), `expected no table row for the phantom; got:\n${md030}`);
    const header = /\| Scenario Reconciliation \| (\d+) \| (\d+) \| (\d+) \|/.exec(md030);
    assert.ok(header, `expected the header's Scenario Reconciliation row; got:\n${md030}`);
    const [total, , outOfBalance] = header.slice(1).map(Number) as [number, number, number];
    const sentence = /(\d+) of (\d+) scenario rows out of balance[^;.]*; (\d+) phantom-scenario row\(s\)/.exec(md030);
    assert.ok(sentence, `expected a sentence naming the phantom count; got:\n${md030}`);
    const [grouped, scenarioRows, phantom] = sentence.slice(1).map(Number) as [number, number, number];
    assert.equal(grouped + phantom, outOfBalance, "the sentence's out-of-balance rows add up to the header's");
    assert.equal(scenarioRows + phantom, total, "the sentence's rows add up to the header's total");
  }
);

After({ tags: "@SCN-RPT-030" }, function () {
  if (runsRoot030 && existsSync(runsRoot030)) rmSync(runsRoot030, { recursive: true, force: true });
});

const BROKEN_ATTRIBUTION_OPTS = {
  features: "tests/fixtures/broken-attribution/features",
  cucumber: "tests/fixtures/broken-attribution/cucumber.json",
};
let runsRoot023: string;
let md023: string;
let json023: string;

Given(
  "a corpus whose cucumber run reports an ambiguous step for a scenario that cites a real @SCN at a named quality-check",
  function () {
    runsRoot023 = mkdtempSync(join(tmpdir(), "spec-controller-rpt023-"));
  }
);

When("the run reconciles and the report is rendered", function () {
  const balance = runReconcile(BROKEN_ATTRIBUTION_OPTS);
  const ctx023: RunContext = {
    target: "broken-attribution-fixture",
    inputs: {},
    runStart: new Date("2026-07-17T09:00:00.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot023, { balance, ctx: ctx023, withRuntimeObservations: true });
  md023 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json023 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

interface Rpt023Row {
  scnId: string;
  kind: string;
  evidenceObservations: Array<{ scnId?: string | null; qualityCheck: string; broken?: boolean }>;
}

Then(
  "the broken observation is not counted among that scenario's attributed evidence",
  function () {
    const parsed = JSON.parse(json023) as { ledger: { scenarioReconciliations: Rpt023Row[] } };
    const amb001 = parsed.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-AMB-001");
    assert.ok(amb001, `expected a ledger row for SCN-AMB-001; got:\n${json023}`);
    assert.equal(
      amb001!.evidenceObservations.length,
      0,
      `expected SCN-AMB-001's broken credit posted to NOTHING on its row; got: ${JSON.stringify(amb001!.evidenceObservations)}`
    );
    const amb002 = parsed.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-AMB-002");
    assert.ok(amb002, `expected a ledger row for SCN-AMB-002; got:\n${json023}`);
    assert.deepEqual(
      amb002!.evidenceObservations.map((o) => o.qualityCheck),
      ["integration"],
      `expected ONLY SCN-AMB-002's clean integration credit on its row; got: ${JSON.stringify(amb002!.evidenceObservations)}`
    );
  }
);

Then(
  "it is counted once on the suspense scenario, and the Test volume identity still balances",
  function () {
    const parsed = JSON.parse(json023) as {
      ledger: { scenarioReconciliations: Rpt023Row[] };
      summary: { rawByRuntimeQualityCheck: Record<string, number>; testVolume: { onScenario: number; onPhantomScenario: number; onSuspenseScenario: number } };
    };
    const suspense = parsed.ledger.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    assert.ok(suspense, `expected a suspense row; got:\n${json023}`);
    const broken = suspense!.evidenceObservations.filter((o) => o.broken === true);
    assert.equal(broken.length, 1, `expected the broken credit counted ONCE on suspense; got: ${JSON.stringify(suspense!.evidenceObservations)}`);
    assert.ok(
      md023.includes("2 evidence observations = 1 on scenarios + 0 on phantom scenarios + 1 on the suspense scenario"),
      `expected the Test volume identity line "2 evidence observations = 1 on scenarios + 0 on phantom scenarios + 1 on the suspense scenario"; got:\n${md023}`
    );
    const raw = Object.values(parsed.summary.rawByRuntimeQualityCheck).reduce((n, v) => n + v, 0);
    const tv = parsed.summary.testVolume;
    assert.equal(raw, 2, `expected 2 raw runtime observations; got ${raw}`);
    assert.equal(
      raw,
      tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario,
      `the identity must balance: raw ${raw} != onScenario ${tv.onScenario} + onPhantomScenario ${tv.onPhantomScenario} + onSuspenseScenario ${tv.onSuspenseScenario}`
    );
  }
);

After({ tags: "@SCN-RPT-023" }, function () {
  if (runsRoot023 && existsSync(runsRoot023)) rmSync(runsRoot023, { recursive: true, force: true });
});

let ctx027: RunContext;
let runsRoot027: string;
let markdown027: string;
let cliDir027: string;
let cliReport027: string;
const RPT027_INPUTS = {
  features: "tests/fixtures/rpt-streams/features",
  packageJson: "tests/fixtures/rpt-streams/package.json",
  ciSteps: "tests/fixtures/rpt-streams/ci-steps.json",
};

Given(
  "a reconciliation run handed a fitness stream alongside its feature corpus",
  function () {
    ctx027 = {
      target: "streams-target",
      inputs: {
        features: RPT027_INPUTS.features,
        packageJson: RPT027_INPUTS.packageJson,
        ciSteps: RPT027_INPUTS.ciSteps,
      },
      runStart: new Date("2026-09-06T15:00:00.000Z"),
      sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
      toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
      toolVersion: "0.1.0",
    };
    runsRoot027 = mkdtempSync(join(tmpdir(), "spec-controller-rpt027-"));
  }
);

When("the run writes its markdown artifact for the streams it was handed", function () {
  const balance = runReconcile({});
  const runDir = persistReport(runsRoot027, { balance, ctx: ctx027 });
  markdown027 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

Then(
  "the persisted report's Inputs block names the fitness stream, after the streams it already named",
  function () {
    const fitnessLine = `  - \`--ci-steps ${RPT027_INPUTS.ciSteps}\``;
    const packageJsonLine = `  - \`--package-json ${RPT027_INPUTS.packageJson}\``;
    assert.ok(
      markdown027.includes(fitnessLine),
      `expected the persisted Inputs block to name the fitness stream as "${fitnessLine}"; got:\n${markdown027.slice(0, 800)}`
    );
    assert.ok(
      markdown027.includes(packageJsonLine) && markdown027.indexOf(packageJsonLine) < markdown027.indexOf(fitnessLine),
      `expected the fitness stream appended after --package-json; got:\n${markdown027.slice(0, 800)}`
    );
  }
);

When(
  "the real CLI reconciles a fixture corpus handed a fitness stream",
  function () {
    const repoRoot = process.cwd();
    const abs = (p: string): string => join(repoRoot, p);
    cliDir027 = mkdtempSync(join(tmpdir(), "spec-controller-rpt027-cli-"));
    const reportPath = join(cliDir027, "spec-reconciliation.md");
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", abs(RPT027_INPUTS.features),
        "--package-json", abs(RPT027_INPUTS.packageJson),
        "--ci-steps", abs(RPT027_INPUTS.ciSteps),
        "--format", `md:${reportPath}`,
      ],
      { cwd: cliDir027, encoding: "utf8" }
    );
    assert.equal(
      result.error,
      undefined,
      `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
    );
    assert.equal(
      result.status,
      0,
      `expected the CLI to exit 0 (this fixture corpus balances); got exit ${result.status}\n` +
        `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    assert.ok(existsSync(reportPath), `expected the CLI to persist ${reportPath}; it does not exist`);
    cliReport027 = readFileSync(reportPath, "utf8");
  }
);

Then(
  "the persisted report's Inputs block names every stream that run received",
  function () {
    for (const flag of ["--features", "--package-json", "--ci-steps"]) {
      assert.ok(
        cliReport027.includes(`  - \`${flag} `),
        `expected the persisted Inputs block to name "${flag}"; got:\n${cliReport027.slice(0, 800)}`
      );
    }
    for (const flag of ["--vitest", "--cucumber", "--ci"]) {
      assert.ok(
        !cliReport027.includes(`  - \`${flag} `),
        `expected the Inputs block NOT to name "${flag}" — the run was not handed it; got:\n${cliReport027.slice(0, 800)}`
      );
    }
  }
);

After({ tags: "@SCN-RPT-027" }, function () {
  if (runsRoot027 && existsSync(runsRoot027)) rmSync(runsRoot027, { recursive: true, force: true });
  if (cliDir027 && existsSync(cliDir027)) rmSync(cliDir027, { recursive: true, force: true });
});

let runsRoot028: string;
let markdownPartial028: string;
let markdownEvery028: string;
let markdownNone028: string;
let cliDir028: string;
let cliReport028: string;
const RPT028_HANDED = {
  features: "tests/fixtures/rpt-streams/features",
  packageJson: "tests/fixtures/rpt-streams/package.json",
  ciSteps: "tests/fixtures/rpt-streams/ci-steps.json",
};
const RPT028_WITHHELD = ["--vitest", "--cucumber", "--ci"];

function notSuppliedLine(markdown: string): string | null {
  return markdown.split("\n").find((line) => line.startsWith("- Not supplied:")) ?? null;
}

function ctx028(inputs: RunContext["inputs"]): RunContext {
  return {
    target: "absent-streams-target",
    inputs,
    runStart: new Date("2026-09-06T15:30:00.000Z"),
    sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
    toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
    toolVersion: "0.1.0",
  };
}

Given("a reconciliation run handed only some of the streams the tool can read", function () {
  runsRoot028 = mkdtempSync(join(tmpdir(), "spec-controller-rpt028-"));
});

When("that run writes its markdown artifact", function () {
  const balance = runReconcile({});
  const render = (inputs: RunContext["inputs"], suffix: string): string => {
    const dir = join(runsRoot028, suffix);
    mkdirSync(dir, { recursive: true });
    const runDir = persistReport(dir, { balance, ctx: ctx028(inputs) });
    return readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  };
  markdownPartial028 = render(
    { features: RPT028_HANDED.features, ciSteps: RPT028_HANDED.ciSteps },
    "partial"
  );
  markdownEvery028 = render(
    {
      features: RPT028_HANDED.features,
      vitest: "vitest.json",
      cucumber: "cucumber.json",
      ci: ".github/workflows",
      packageJson: RPT028_HANDED.packageJson,
      ciSteps: RPT028_HANDED.ciSteps,
    },
    "every"
  );
  markdownNone028 = render({}, "none");
});

Then(
  "the persisted report names the streams it was not handed, on a line of its own beneath the ones it was",
  function () {
    assert.equal(
      notSuppliedLine(markdownPartial028),
      "- Not supplied: `--vitest`, `--cucumber`, `--ci`, `--package-json`"
    );
    const iCiSteps = markdownPartial028.indexOf(`  - \`--ci-steps ${RPT028_HANDED.ciSteps}\``);
    const iNotSupplied = markdownPartial028.indexOf("- Not supplied:");
    const iTimestamp = markdownPartial028.indexOf("- Run timestamp (UTC):");
    assert.equal(
      iCiSteps > -1 && iCiSteps < iNotSupplied && iNotSupplied < iTimestamp,
      true,
      `expected the not-supplied line between the Inputs list and the timestamp; got offsets ` +
        `ciSteps=${iCiSteps} notSupplied=${iNotSupplied} timestamp=${iTimestamp}`
    );
  }
);

Then("a run handed every stream says nothing about absence at all", function () {
  assert.equal(notSuppliedLine(markdownEvery028), null);
});

Then(
  "a run handed nothing still reports its inputs as none specified, and names every canonical stream as not supplied",
  function () {
    assert.equal(
      markdownNone028.split("\n").includes("- Inputs: none specified"),
      true,
      `expected the none-specified Inputs branch to survive; got:\n${markdownNone028.slice(0, 800)}`
    );
    assert.equal(
      notSuppliedLine(markdownNone028),
      "- Not supplied: `--features`, `--vitest`, `--cucumber`, `--ci`, `--package-json`, `--ci-steps`"
    );
  }
);

When(
  "the real CLI reconciles a fixture corpus with three of its streams withheld",
  function () {
    const repoRoot = process.cwd();
    const abs = (p: string): string => join(repoRoot, p);
    cliDir028 = mkdtempSync(join(tmpdir(), "spec-controller-rpt028-cli-"));
    const reportPath = join(cliDir028, "spec-reconciliation.md");
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", abs(RPT028_HANDED.features),
        "--package-json", abs(RPT028_HANDED.packageJson),
        "--ci-steps", abs(RPT028_HANDED.ciSteps),
        "--format", `md:${reportPath}`,
      ],
      { cwd: cliDir028, encoding: "utf8" }
    );
    assert.equal(
      result.error,
      undefined,
      `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
    );
    assert.equal(
      result.status,
      0,
      `expected the CLI to exit 0 (this fixture corpus balances); got exit ${result.status}\n` +
        `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    assert.equal(existsSync(reportPath), true, `expected the CLI to persist ${reportPath}; it does not exist`);
    cliReport028 = readFileSync(reportPath, "utf8");
  }
);

Then(
  "the persisted report names exactly the withheld streams as not supplied, and none of the streams that run received",
  function () {
    assert.equal(
      notSuppliedLine(cliReport028),
      `- Not supplied: ${RPT028_WITHHELD.map((flag) => `\`${flag}\``).join(", ")}`
    );
  }
);

After({ tags: "@SCN-RPT-028" }, function () {
  if (runsRoot028 && existsSync(runsRoot028)) rmSync(runsRoot028, { recursive: true, force: true });
  if (cliDir028 && existsSync(cliDir028)) rmSync(cliDir028, { recursive: true, force: true });
});
