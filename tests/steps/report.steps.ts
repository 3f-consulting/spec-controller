/**
 * Step definitions for features/report.feature (the @RPT sectioned renderer).
 *
 * @SCN-RPT-001 — the bidirectional @integration evidence marker (Evidence
 * Manifesto §9). This arm exercises the ctx-threading END-TO-END over the REAL CLI
 * pipeline: runReconcile produces a balance from the tool's own corpus, then
 * writeOutputs threads the RunContext to the markdown renderer and PERSISTS
 * spec-reconciliation.md to a caller-given path (via --format md:<path>). The persisted artifact must
 * open with the Run-provenance header carrying the ctx facts — proving provenance
 * survives the CLI→renderer→disk path, not just an in-memory render. It complements
 * the @unit test that proves the provenance section over renderMarkdown in isolation.
 *
 * The runs/ root is injected to a temp dir, so the convention is exercised without
 * polluting the repo. Self-contained module-level outcome + distinct step text, so it
 * shares no outcome with the other steps files (Cucumber registers steps globally).
 *
 * Evidence: @SCN-RPT-001 — the run-provenance slice.
 */

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

// Persist a run's report under <dir> via the REAL --format output path (writeOutputs) —
// the SOLE output path since the runs/<target>/<ISO>/ auto-archive was removed with
// @SCN-RUN-001; the tool emits solely via --format now. Renders
// spec-reconciliation.md + spec-reconciliation.json (the same pure renderers + IO writer main()
// drives) into <dir> and returns it, so these @RPT arms still assert PERSISTED content
// over the production writer — now the FMT one — rather than the deleted archiver.
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

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let ctx: RunContext;
let inputFlag: string;
let inputValue: string;
let runsRoot: string;
let markdown: string;
let jsonText: string;

// Target-sourcing outcome (@SCN-RPT-001 Update) — the temp dir the REAL CLI
// subprocess routes its markdown into, and the persisted report read back to assert the
// "Target repo:" provenance line the CLI sourced from --target (verbatim / unknown-target).
let targetSourcingDir: string;
let targetSourcingReport: string;

// A reconcilable fixture corpus (reused from the @FMT / evidence observation steps) — the REAL CLI needs a
// feature corpus + result reports to produce a balance whose provenance header we read back.
const TARGET_FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

/**
 * Run the REAL CLI binary as a subprocess, routing markdown to a file, and return the
 * persisted report (@SCN-RPT-001 Update). Anti-watermelon: this exercises the
 * WHOLE binary — argv → ctx.target sourcing → renderers → disk — and reads the persisted
 * "Target repo:" line back, NEVER a helper re-run. `targetArg` is appended as `--target
 * <value>` when given, and OMITTED entirely when undefined (the default → unknown-target
 * path). The subprocess runs in an isolated temp cwd with absolute fixture paths, so no
 * artefacts land in the repo tree.
 */
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
  // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
  // out-of-balance fixture exits 1 (the report is still written IN FULL before the exit
  // code is set). Pure exit-expectation flip 0->1; every content assertion is unchanged.
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

// @SCN-RPT-001
Given(
  "a reconciliation run targeting {string} with the input {string} at the UTC instant {string} and source SHA {string}",
  function (target: string, input: string, iso: string, sourceSha: string) {
    // The input arrives as the flag + value pair as the operator typed it
    // ("--features ../an-adopters-repository/features"); split into the canonical inputs
    // record the RunContext carries.
    const [flag, value] = input.split(/\s+/, 2);
    inputFlag = flag ?? "";
    inputValue = value ?? "";
    ctx = {
      target,
      inputs: { features: inputValue },
      runStart: new Date(iso),
      sourceSha,
      // The TOOL's identity (3F-1916) — fixed fixture values; the real resolver is
      // proven @unit by @SCN-RPT-026. Here the integration proves the ctx→renderer→disk
      // thread carries them across the surfaces.
      toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
      toolVersion: "0.1.0",
    };
    // Inject the runs/ root as a temp dir, so the artifact is persisted without
    // writing into the repo's real runs/ tree.
    runsRoot = mkdtempSync(join(tmpdir(), "spec-controller-rpt-"));
  }
);

// @SCN-RPT-001
When("the run writes its markdown artifact", function () {
  // Drive the real pipeline: reconcile the tool's own corpus → a balance, then
  // persist it through the seam with the RunContext threaded for provenance.
  const balance = runReconcile({});
  const runDir = persistReport(runsRoot, { balance, ctx });
  markdown = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

// @SCN-RPT-001
Then(
  "the persisted spec-reconciliation.md opens with a Run provenance header stating the target, the input, the UTC timestamp, the source SHA, the tool SHA, and the tool version",
  function () {
    // The persisted markdown must open with the provenance section carrying all
    // facts. Each assertion has teeth: drop the provenance emitter (or fail to
    // thread ctx through writeOutputs) and the header is absent, so this reds.
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
    // The TOOL's identity (3F-1916) — which spec-controller produced the run.
    assert.ok(
      typeof ctx.toolSha === "string" && markdown.includes(`- Tool SHA: ${ctx.toolSha}`),
      `expected the provenance header to outcome the tool SHA "${ctx.toolSha}"; got:\n${markdown}`
    );
    assert.ok(
      typeof ctx.toolVersion === "string" && markdown.includes(`- Tool version: ${ctx.toolVersion}`),
      `expected the provenance header to outcome the tool version "${ctx.toolVersion}"; got:\n${markdown}`
    );
    // The provenance header opens the report — above the per-scenario table.
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

// @SCN-RPT-001
// Target sourcing over the REAL CLI (Fork A). The CLI sources ctx.target from
// --target VERBATIM — no resolution — so the persisted "Target repo:" line is exactly the
// operator's --target value. Anti-watermelon: the WHOLE binary runs as a subprocess and the
// persisted report is read back; a CLI that guessed the target REDS.
When("the real CLI writes a markdown report with --target {string}", function (target: string) {
  targetSourcingReport = runCliForTarget(target);
});

// @SCN-RPT-001
Then(
  "the persisted report's Run provenance outcomes {string} verbatim",
  function (expectedLine: string) {
    // Teeth: the persisted "Target repo:" line must carry the --target value verbatim — no
    // resolution, no basename guessing. The old resolveTarget honoured an explicit --target
    // too, so this arm pins that the verbatim path survives the rewire (a regression pin).
    assert.ok(
      targetSourcingReport.includes(`- ${expectedLine}`),
      `expected the persisted Run provenance to outcome "- ${expectedLine}"; got:\n${targetSourcingReport}`
    );
  }
);

// @SCN-RPT-001
// The omit path — the genuinely-NEW behaviour. With NO --target the CLI must record
// "unknown-target", NOT basename(dirname(--features)). The old resolveTarget guessed
// "evidence observation" from the fixture path here, so this arm REDS on the old code and GREENS once the
// resolution dies — the load-bearing red→green of the Update.
When("the real CLI writes a markdown report with no --target flag", function () {
  targetSourcingReport = runCliForTarget(undefined);
});

// @SCN-RPT-001
Then(
  "the persisted report's Run provenance outcomes {string}",
  function (expectedLine: string) {
    // Teeth: with --target omitted the "Target repo:" line must read the explicit default
    // "unknown-target" — never a guess derived from --features (the degenerate "." is now
    // impossible). The old basename(dirname(--features)) resolution rendered "evidence observation" here.
    assert.ok(
      targetSourcingReport.includes(`- ${expectedLine}`),
      `expected the persisted Run provenance to outcome "- ${expectedLine}"; got:\n${targetSourcingReport}`
    );
  }
);

// @SCN-RPT-002
// The JSON arm reuses the RPT-001 Given (it already builds the ctx + runsRoot), then
// drives the real pipeline to PERSIST spec-reconciliation.json and round-trips its
// provenance — proving the machine surface carries the same non-derivable run facts
// across the CLI→renderer→disk path (a consumed contract surface), not just an
// in-memory render. Complements the @unit test over renderJson in isolation.
When("the run writes its JSON artifact", function () {
  const balance = runReconcile({});
  const runDir = persistReport(runsRoot, { balance, ctx });
  jsonText = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

// @SCN-RPT-002
Then(
  "the persisted spec-reconciliation.json parses to an object whose runProvenance outcomes the target, source SHA, tool SHA, tool version, UTC timestamp, and input, with the evidenceReconciliation body intact",
  function () {
    // The persisted JSON must parse to a whole-document report whose provenance section is
    // now `runProvenance`. Each assertion has teeth: drop the provenance projection
    // (or fail to thread ctx through writeOutputs → renderJson) and `runProvenance` is absent.
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
    assert.equal(
      parsed.runProvenance.target,
      ctx.target,
      `expected runProvenance.target "${ctx.target}"; got "${parsed.runProvenance.target}"`
    );
    assert.equal(
      parsed.runProvenance.sourceSha,
      ctx.sourceSha,
      `expected runProvenance.sourceSha "${ctx.sourceSha}"; got "${parsed.runProvenance.sourceSha}"`
    );
    // The TOOL's identity, distinct from the target's sourceSha (3F-1916).
    assert.equal(
      parsed.runProvenance.toolSha,
      ctx.toolSha,
      `expected runProvenance.toolSha "${ctx.toolSha}"; got "${parsed.runProvenance.toolSha}"`
    );
    assert.equal(
      parsed.runProvenance.toolVersion,
      ctx.toolVersion,
      `expected runProvenance.toolVersion "${ctx.toolVersion}"; got "${parsed.runProvenance.toolVersion}"`
    );
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
    // The reconciliation body must survive intact alongside runProvenance. The retired
    // `warnings` key must be ABSENT — a zero-evidence scenario is a both-missing row.
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

// @SCN-RPT-008
// The excluded-occurrence arm drives the REAL CLI pipeline END-TO-END over
// the tool's own corpus: readEvidenceObligations reconciles raw @SCN occurrences
// (countScnOccurrences) against the parsed scenario count (parseScenarios), then
// writeOutputs threads the EvidenceObligations to BOTH renderers and PERSISTS
// spec-reconciliation.md + spec-reconciliation.json. Both persisted artifacts must carry the
// excluded fact and AGREE on the number — proving the scenarios.ts→corpus→
// both-renderers→disk wiring is critical-path (not covered by RPT-001's ctx thread).
// Self-contained module-level outcome + distinct step text (Cucumber registers globally).
let evidenceObligations008: EvidenceObligations;
let runsRoot008: string;
let md008: string;
let json008: string;

Given(
  "a reconciliation run whose source mentions @SCN ids in non-tag context beyond the scenarios",
  function () {
    // the tool's own feature corpus mentions @SCN ids in prose/comments beyond
    // the tag lines; readEvidenceObligations reads the raw-vs-parsed delta
    // over that real corpus (the same discoverFeatures corpus runReconcile reads).
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
    // The spec-controller corpus mentions @SCN ids in non-tag context, so the excluded
    // delta is > 0 — has teeth (a zero delta would make the scenario's premise false).
    const excluded = evidenceObligations008.excludedOccurrences;
    assert.ok(
      excluded > 0,
      `expected the spec-controller corpus to mention @SCN ids in non-tag context (excluded > 0); got ${excluded}`
    );
    // Markdown surface: outcomes "N @SCN ids seen in non-tag context, excluded".
    assert.ok(
      md008.includes(`${excluded} @SCN ids seen in non-tag context, excluded`),
      `expected spec-reconciliation.md to outcome the excluded count ${excluded}; got:\n${md008}`
    );
    // JSON surface: carries the SAME excluded count on a evidenceObligations object.
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

// @SCN-RPT-010
// The evidence observation-reconciliation @integration arm drives the REAL file-read pipeline over a
// fixture target whose Vitest / Cucumber reports span every observation kind: an
// evidence observation attributed to a scenario, a phantom-id (an @SCN no scenario
// carries), and cites-no-scenario evidence observation results (no @SCN). readEvidenceObservations reads the actual report
// FILES (readJsonIfPresent) → countRuntimeEvidenceObservationKinds, then writeOutputs threads the evidence observation to
// BOTH renderers and PERSISTS spec-reconciliation.md + spec-reconciliation.json. The persisted
// markdown must carry the ### Test volume cut + the identity line, and the persisted
// JSON's evidence observation atoms must BALANCE by construction (raw = attributed + suspense) —
// proving the readEvidenceObservations→countRuntimeEvidenceObservationKinds→both-renderers→disk wiring on real file data, not
// just an in-memory aggregate. Self-contained module outcome + distinct step text.
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
    // The fixture spans the kinds: 3 unit (TGT-001 attributed, PHANTOM-999 phantom evidence observation, one
    // no-@SCN) + 2 integration (TGT-002 attributed, one @smoke no-@SCN) = 5 evidence observations;
    // attributed-to-scenario 2, phantom 1, suspense 2 ⇒ 5 = 2 + 1 + 2 (three-way).
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

    // JSON surface: the `evidenceObservations` section is RETIRED (3F-2103). The raw totals re-home
    // onto `summary.rawByRuntimeQualityCheck`; the identity holds BY CONSTRUCTION off the Ledger
    // fold (both the phantom and suspense counts live in `summary.testVolume`).
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

// @SCN-RPT-017
// The FULL-UNIFY view fix (3F-1452): the report's evidence-observation views must level a
// runtime observation by the cited scenario's own tier tag — the SAME rule the reconciler
// uses (@SCN-LDG-011 / 3F-1434) — because the counting is a FOLD OVER THE LEDGER'S POSTED CREDITS
// (`runtimeObservationTally`, @SCN-RMD-003), not a second raw-report walk. The census module that
// did that second walk is RETIRED (3F-2102/3F-2104), and its `attributed[]` went with it. The
// @integration arm drives the REAL reconcile + render over a fixture whose cucumber report proves a
// passing @e2e scenario (SCN-TGT-101) with NO vitest evidence: the persisted Test volume must count
// it under e2e (not the caller-supplied integration fallback), the JSON must show the e2e credit
// POSTED to SCN-TGT-101's ledger row, and the scenario's E2e cell must render a count, not ∅. RED
// on a level taken from the caller-supplied quality-check (cucumber ⇒ integration); GREEN on the
// tag-derived level the parse carries and the fold counts. The unit arm lives on the fold's own
// spanning corpus — `runtimeObservationTally.test.ts`'s raw-per-quality-check leaf (3F-2357).
const EVIDENCE_OBSERVATION_E2E_OPTS = {
  features: "tests/fixtures/evidence-observation-e2e/features",
  cucumber: "tests/fixtures/evidence-observation-e2e/cucumber.json",
  // THE FIXTURE'S OWN MANIFEST, NAMED RATHER THAN DEFAULTED (3F-3471). `runReconcile` falls back to
  // `"package.json"` — this tool's — so a target fixture that does not name one is reconciled
  // against spec-controller's `specController` config: its fitness rows and a `notChecks` list
  // written for a different repository. The fixture is the target, so the target's manifest is the
  // one to read.
  packageJson: "tests/fixtures/evidence-observation-e2e/package.json",
  // NB: no vitest report — the @e2e obligation is discharged solely by the cucumber run.
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
  // The by-level evidence-observation table must count the single cucumber observation under
  // e2e (its cited scenario's own tier tag), NOT the caller-supplied integration fallback.
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
  // The retired census's `attributed[]` is gone; the e2e credit is visible where it POSTED —
  // on SCN-TGT-101's ledger row (@SCN-LDG-022), the non-parallel-store source (retire, don't
  // relocate). The tag-derived level put it at e2e, not the caller-supplied integration fallback.
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
  // The ledger row for SCN-TGT-101 — the E2e cell reads its observation count STRAIGHT off the
  // posted credits (@SCN-RPT-011 / @SCN-LDG-022). Pre-fix, the census stamped the integration
  // fallback, so the e2e credit landed nowhere the cell reads → ∅. Post-fix (the tag-derived
  // level, counted by the fold) it renders the count.
  const row = md017.split("\n").find((l) => l.includes("| SCN-TGT-101 |"));
  assert.ok(row, `expected a ledger row for SCN-TGT-101; got:\n${md017}`);
  assert.ok(
    !row!.includes("∅"),
    `expected SCN-TGT-101's E2e cell to render a count, not ∅; got row:\n${row}`
  );
  // The E2e column carries the two-sided cell — named (E) with one observed credit → E/1.
  assert.match(
    row!,
    /\| SCN-TGT-101 \| E\/1 \|/,
    `expected SCN-TGT-101's E2e cell to render E/1 (named, one observation); got row:\n${row}`
  );
});

After({ tags: "@SCN-RPT-017" }, function () {
  if (runsRoot017 && existsSync(runsRoot017)) rmSync(runsRoot017, { recursive: true, force: true });
});

// @SCN-RPT-018
// The MULTI-TAG view mirror (3F-1452): the view-side mirror of the reconciler's @SCN-LDG-014.
// A scenario NAMING @integration @e2e proven by a SINGLE passing cucumber observation must be
// counted in BOTH tiers across the views — because parseCucumber emits one observation per named
// non-unit tier (per-tier emission, @SCN-LDG-014) and each emitted observation POSTS AS ITS OWN
// CREDIT on the scenario's ledger row (@SCN-LDG-022). The census that once re-derived these counts
// is RETIRED (3F-2102/3F-2104), and `attributed[]` went with it: Test volume is the fold over the
// posted credits (`runtimeObservationTally`, @SCN-RMD-003) and the cell reads its count straight off
// those same credits (@SCN-RPT-011), so the integration and e2e observations for the one scenario
// are tallied independently with NO multi-tag-specific logic and no second derivation to disagree.
// The @integration arm drives the REAL reconcile + render over a fixture whose cucumber report
// proves a passing @integration @e2e scenario (SCN-TGT-102) with NO vitest evidence: the persisted
// Test volume must count it under BOTH integration and e2e, and the scenario NAMES both
// obligations, so both the Integration and E2e cells must render their credit count, not ∅.
// Per-tier counting is INHERITED from the parsed set. The @unit arm is the renderer's half, proven
// in isolation over the cell-grid corpus in markdown.test.ts (the leaf cited [SCN-RPT-018]).
const EVIDENCE_OBSERVATION_INTEGRATION_E2E_OPTS = {
  features: "tests/fixtures/evidence-observation-integration-e2e/features",
  cucumber: "tests/fixtures/evidence-observation-integration-e2e/cucumber.json",
  // The fixture's own manifest, for the reason given on EVIDENCE_OBSERVATION_E2E_OPTS above
  // (3F-3471): defaulted, this target reconciles against spec-controller's manifest, not its own.
  packageJson: "tests/fixtures/evidence-observation-integration-e2e/package.json",
  // NB: no vitest report — the @integration and @e2e obligations are both discharged by the one
  // cucumber pass (the multi-tag ruling: one execution exercises the integrated tiers, LDG-014).
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
  // parseCucumber emits ONE observation per named tier from the single scenario pass, and the
  // census projects both — so the by-level Test volume table counts the scenario under integration
  // AND e2e (each 1). A census that deduped by scnId (ignoring level) or a parse that collapsed the
  // multi-tag scenario to one tier would leave the second tier at 0 → RED here.
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
  // Cross-check the posted credits carry BOTH tiers for the one scenario — read off the LEDGER row
  // (@SCN-LDG-022), where they posted; the retired census's `attributed[]` re-represented them.
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
  // The ledger row for SCN-TGT-102 NAMES BOTH the integration and e2e obligations (its tier
  // tags), and both are discharged by the one cucumber pass. So the Integration column AND the E2e
  // column each render their two-sided cell — named (I / E) with one observed credit → the row
  // reads `| SCN-TGT-102 | I/1 | E/1 | ...`. If the second tier's credit were lost (census dedup, or
  // a one-per-scenario parse), that cell would collapse to E/- (named, no observation) → RED.
  const row = md018.split("\n").find((l) => l.includes("| SCN-TGT-102 |"));
  assert.ok(row, `expected a ledger row for SCN-TGT-102; got:\n${md018}`);
  assert.ok(
    !row!.includes("∅"),
    `expected SCN-TGT-102's Integration and E2e cells to each render a count, not ∅; got row:\n${row}`
  );
  // Columns are in canonical order (integration, then e2e) — both cells named with one observed
  // credit each → I/1 then E/1.
  assert.match(
    row!,
    /\| SCN-TGT-102 \| I\/1 \| E\/1 \|/,
    `expected SCN-TGT-102's Integration and E2e cells to each render their two-sided cell (I/1, E/1); got row:\n${row}`
  );
});

After({ tags: "@SCN-RPT-018" }, function () {
  if (runsRoot018 && existsSync(runsRoot018)) rmSync(runsRoot018, { recursive: true, force: true });
});

// @SCN-RPT-011
// The ledger cell's four-way encoding, driven through the REAL reconcile + render over a fixture
// target spanning EVERY cell case (the class @SCN-RPT-017 / @SCN-RPT-018 established: a cell bug
// is only caught by the real pipeline, never by a hand-built balance). The fixture corpus
// (tests/fixtures/evidence-cell-grid) carries: SCN-CEL-001 named+met at unit and lint;
// SCN-CEL-002 named+missing at integration (and absent at the other columns); SCN-CEL-003
// @e2e-only, cited by a VITEST unit observation — the NO-EVIDENCE-OBLIGATION credit-side row (@SCN-LDG-008),
// kept OUT of `attributed` by the census, so its Unit cell must read (1), NOT ∅ (the SCN-CLI-054
// shape — RED before the fix); and SCN-CEL-004 whose unit obligation is @unitpending — deferred,
// so it names NOTHING (3F-1858): the vitest observation citing it reconciles NO-EVIDENCE-OBLIGATION and posts
// a no-evidence-obligation row on SCN-CEL-004's account, so its Unit cell reads (1) off that no-evidence-obligation row.
// Both (N) shapes here are ONE shape now — a no-evidence-obligation credit — since 3F-1858 folded the pending
// pair out of the active set (the old "attributed at a pending pair" account no longer exists).
const EVIDENCE_CELL_GRID_OPTS = {
  features: "tests/fixtures/evidence-cell-grid/features",
  vitest: "tests/fixtures/evidence-cell-grid/vitest.json",
  cucumber: "tests/fixtures/evidence-cell-grid/cucumber.json",
  ci: "tests/fixtures/evidence-cell-grid/ci.yml",
  packageJson: "tests/fixtures/evidence-cell-grid/package.json",
};
let runsRoot011: string;
let md011: string;

/**
 * The LEDGER's row for one scenario id — scoped to the ledger table (from its header row on), so
 * it can never pick up the same scenario's row in an earlier section (the static-checks table
 * lists SCN-CEL-001 too, and it renders BEFORE the ledger).
 */
function cellGridRow(scnId: string): string {
  const ledger = md011.slice(md011.indexOf("| Scenario | Lint |"));
  const row = ledger.split("\n").find((l) => l.startsWith(`| ${scnId} |`));
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${md011}`);
  return row!;
}

/**
 * The four EVIDENCE cells of a ledger row (Lint, Unit, Integration, E2e) — the row's cells
 * between the scenario id and the Verdict. Compared as an array so a failure diffs the cells
 * themselves (`∅` vs `(1)`), not a bare true/false.
 */
function cellGridCells(scnId: string): string[] {
  const parts = cellGridRow(scnId)
    .split("|")
    .map((c) => c.trim());
  // parts: ["", scnId, Lint, Unit, Integration, E2e, Verdict, Reconciling items, ""]
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
  /^each scenario row carries one cell per corpus column \(Lint first, then the runtime levels present\) with the two-sided obligation-then-observation encoding — an evidence-obligation letter, an observation count, or blank$/,
  function () {
    // The corpus NAMES lint + unit + integration + e2e (never performance), so the header is
    // Lint first, then the runtime levels present in canonical order — no Performance column.
    assert.ok(
      md011.includes("| Scenario | Lint | Unit | Integration | E2e | Verdict | Reconciling items |"),
      `expected the corpus-driven header (Lint, Unit, Integration, E2e); got:\n${md011}`
    );
    // named & met → letter/count (SCN-CEL-001: one lint guard present, one unit observation).
    assert.deepStrictEqual(
      cellGridCells("SCN-CEL-001"),
      ["L/1", "U/1", "", ""],
      "expected SCN-CEL-001 (named and met at lint + unit) to render Lint L/1, Unit U/1, then blank"
    );
    // named & missing → letter/-; the columns it neither names nor is cited at → blank.
    assert.deepStrictEqual(
      cellGridCells("SCN-CEL-002"),
      ["", "", "I/-", ""],
      "expected SCN-CEL-002 (named, no observation) to render Integration I/- and blank elsewhere"
    );
  }
);

Then(/^the scenario whose only state at a quality-check is no-evidence-obligation renders a no-evidence-obligation observation there — a dash for the evidence obligation, the count for the observation$/, function () {
  // SCN-CEL-003 NAMES @e2e ONLY; a vitest unit test cites it → the reconciler posts an
  // `no-evidence-obligation` credit-side row at unit, carried on the row's evidenceObservations. The two-sided
  // cell reads NO evidence obligation (left `-`) and ONE observed credit (right 1) → -/1. Its E2e evidence obligation is met
  // by an e2e credit → E/1. A cell that mistook the no-evidence-obligation credit for an evidence obligation would read E/-
  // ("missing" — write the test), contradicting the row's own Reconciling-items column.
  assert.deepStrictEqual(
    cellGridCells("SCN-CEL-003"),
    ["", "-/1", "", "E/1"],
    "expected SCN-CEL-003's Unit cell to render -/1 — the no-evidence-obligation observation — not a named-and-missing cell"
  );
});

Then(
  /^the scenario whose obligation at a quality-check is pending, with observations citing it at that pair, renders a no-evidence-obligation observation there — because the credit is now no-evidence-obligation, not attributed$/,
  function () {
    // SCN-CEL-004's unit obligation is @unitpending — deferred, so it names NOTHING. Since 3F-1858
    // folded the pending pair out of the active obligation set, the vitest observation citing it
    // reconciles NO-EVIDENCE-OBLIGATION and posts a no-evidence-obligation row on SCN-CEL-004 → no evidence obligation (left `-`), one
    // observed credit (right 1) → -/1. Read straight off evidenceObservations (multiplicity-correct),
    // the cell shows the credit with no evidence-obligation letter — the same shape as any other no-evidence-obligation credit.
    assert.deepStrictEqual(
      cellGridCells("SCN-CEL-004"),
      ["", "-/1", "", ""],
      "expected SCN-CEL-004's Unit cell to render -/1 — a credit reconciling no-evidence-obligation at a PENDING pair"
    );
  }
);

Then("no cell-key legend precedes the ledger table — the grid speaks for itself", function () {
  const iKey = md011.indexOf("| Cell | Meaning |");
  const iTable = md011.indexOf("| Scenario | Lint |");
  assert.ok(iKey < 0, `expected NO cell key legend in the persisted report; got:\n${md011}`);
  assert.ok(iTable >= 0, `expected the ledger grid table in the persisted report; got:\n${md011}`);
});

After({ tags: "@SCN-RPT-011" }, function () {
  if (runsRoot011 && existsSync(runsRoot011)) rmSync(runsRoot011, { recursive: true, force: true });
});

// @SCN-RPT-014
// The untagged-scenarios @integration arm drives the REAL obligation-side parse over a
// fixture feature dir mixing @SCN-tagged and untagged scenarios: readEvidenceObligations runs
// the new parseUntaggedScenarios over the actual files and pairs each untagged scenario
// with its feature-file locator, then writeOutputs threads the EvidenceObligations to BOTH
// renderers and PERSISTS spec-reconciliation.md + spec-reconciliation.json. The persisted markdown
// must list the untagged scenarios with `feature : scenario` locators, and the JSON's
// evidenceObligations.untaggedScenarios must carry them — proving the header-parse + file-pairing
// on real files (NOT covered by RPT-008, which only threads excludedOccurrences).
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
    // The fixture has two untagged scenarios (a plain Scenario and a Scenario Outline);
    // its @SCN-tagged scenario and the Examples: data table must NOT be counted. The census
    // re-homed into the ledger-summary scenario corpus — there is NO warnings section.
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
    // The tagged scenario is NOT listed as untagged.
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

// @SCN-RPT-015
// The prose-only-codes @integration arm drives the REAL cross-corpus parse over a fixture
// feature dir: readEvidenceObligations runs the new proseOnlyCodes over the actual files —
// classifying each @SCN occurrence as a tag or a prose mention, then the dangling
// difference — and writeOutputs threads the EvidenceObligations to BOTH renderers and
// PERSISTS spec-reconciliation.md + spec-reconciliation.json. The persisted markdown must list the
// dangling code, and the JSON's evidenceObligations.proseOnlyCodes must carry it — proving the
// tag-vs-prose classification on real files (NOT covered by the earlier corpus arms).
const PROSEONLY_FEATURES = "tests/fixtures/proseonly/features";
let runsRoot015: string;
let md015: string;
let json015: string;

Given("a target feature directory mentioning an @SCN code only in prose", function () {
  runsRoot015 = mkdtempSync(join(tmpdir(), "spec-controller-rpt015-"));
});

When("the run writes its artifacts with the scenario corpus over that directory", function () {
  const opts = { features: PROSEONLY_FEATURES };
  const balance = runReconcile(opts);
  const evidenceObligations = readEvidenceObligations(PROSEONLY_FEATURES);
  const ctx015: RunContext = {
    target: "proseonly-fixture",
    inputs: {},
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot015, { balance, ctx: ctx015, evidenceObligations });
  md015 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json015 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md lists the prose-only code and spec-reconciliation.json carries it on evidenceObligations",
  function () {
    // The fixture mentions SCN-POC-999 only in prose (never tagged) — the one dangling
    // code; the tagged SCN-POC-001 (also mentioned in prose) must NOT be flagged. The census
    // re-homed into the ledger-summary scenario corpus — there is NO warnings section.
    assert.ok(
      !md015.includes("## Warnings"),
      `expected NO "## Warnings" section (dissolved); got:\n${md015}`
    );
    assert.ok(
      md015.includes("1 @SCN code(s) appear only in prose, never as a tag:") &&
        md015.includes("- SCN-POC-999"),
      `expected the prose-only code SCN-POC-999 to be listed; got:\n${md015}`
    );
    assert.ok(
      !md015.includes("- SCN-POC-001"),
      `expected the tagged SCN-POC-001 NOT to be flagged prose-only; got:\n${md015}`
    );

    const parsed = JSON.parse(json015) as {
      evidenceObligations?: { proseOnlyCodes?: string[] };
    };
    assert.deepEqual(
      parsed.evidenceObligations?.proseOnlyCodes,
      ["SCN-POC-999"],
      `expected spec-reconciliation.json evidenceObligations.proseOnlyCodes = ["SCN-POC-999"]; got:\n${json015}`
    );
  }
);

After({ tags: "@SCN-RPT-015" }, function () {
  if (runsRoot015 && existsSync(runsRoot015)) rmSync(runsRoot015, { recursive: true, force: true });
});

// @SCN-RPT-006
// The by-feature full-name @integration arm drives the REAL plumbing: readFeatureNames
// runs discoverFeatures over a fixture feature dir (a @CVL-coded feature + an uncoded one),
// retaining the featureCode→slug map that scenariosFromFeatures discards, then
// writeOutputs threads it (5th sibling arg) to the markdown renderer and PERSISTS
// spec-reconciliation.md. The persisted by-feature cut must name the coded feature in full
// ("config-vocabulary-lint (CVL)") and fall back to the bare code for the uncoded id
// ("XYZ") — proving the discoverFeatures→map→disk path the render-only @unit can't.
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
    // The @CVL-coded feature renders as "<slug> (<FFF>)"; never the bare "| CVL |".
    assert.ok(
      md006.includes("| config-vocabulary-lint (CVL) | 1 | SCN-CVL-001 |"),
      `expected the coded feature named in full; got:\n${md006}`
    );
    assert.ok(
      !md006.includes("| CVL |"),
      `expected NO bare "| CVL |" row (the full name replaces it); got:\n${md006}`
    );
    // The uncoded XYZ id (no file registers XYZ) falls back to the bare code.
    assert.ok(
      md006.includes("| XYZ | 1 | SCN-XYZ-001 |"),
      `expected the uncoded id to fall back to the bare FFF; got:\n${md006}`
    );
  }
);

After({ tags: "@SCN-RPT-006" }, function () {
  if (runsRoot006 && existsSync(runsRoot006)) rmSync(runsRoot006, { recursive: true, force: true });
});

// @SCN-RPT-023
// The census-is-a-fold-over-the-Ledger @integration arm. It drives the REAL cucumber-report
// read, which is where the `broken` + REAL-`scnId` shape is actually PRODUCED: the fixture's
// cucumber.json carries an AMBIGUOUS step (@SCN-LDG-019) on a scenario that DID cite its @SCN,
// so parseCucumberEvidenceObservations emits an observation with broken:true AND scnId
// "SCN-AMB-001" — the shape no hand-built fixture would think to write.
//
// The census used to count that credit `attributed` (it had no `broken` branch at all; its only
// suspense test was scnId === null) while the reconciler posted it to SUSPENSE. Canon settles it
// for the reconciler: a proof that never ran cannot discharge or fail an obligation. Folding the
// census over the Ledger therefore MOVES the count — attributed −1, suspense +1 — and this arm is
// what names the move.
//
// NOTE the identity is asserted here as a COMPLETENESS check only, never as the proof of the
// move: raw = attributed + no-evidence-obligation + phantom + suspense balances identically BEFORE and AFTER
// the fold, because the terms move and the sum does not. The load-bearing assertions are the two
// that name WHICH bucket the credit is in.
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
    // THE MOVE, first half — read off the LEDGER (@SCN-LDG-022), the reconciler's own ruling, not a
    // retired parallel census. SCN-AMB-001's credit carries its scnId and its scenario NAMES
    // integration, so every "cites a real scenario at a named pair" test says attributed. It is
    // NOT: the proof never ran, so it posts to SUSPENSE — and SCN-AMB-001's own row carries no
    // credit at all.
    const parsed = JSON.parse(json023) as { ledger: { scenarioReconciliations: Rpt023Row[] } };
    const amb001 = parsed.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-AMB-001");
    assert.ok(amb001, `expected a ledger row for SCN-AMB-001; got:\n${json023}`);
    assert.equal(
      amb001!.evidenceObservations.length,
      0,
      `expected SCN-AMB-001's broken credit posted to NOTHING on its row; got: ${JSON.stringify(amb001!.evidenceObservations)}`
    );
    // ...and the fold did not simply empty the tally: SCN-AMB-002's clean credit, at the SAME
    // quality-check, is still on its own row. Without this the assertion above passes vacuously.
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
    // THE MOVE, second half — the credit did not vanish, it MOVED: the suspense row carries exactly
    // one broken credit.
    const parsed = JSON.parse(json023) as {
      ledger: { scenarioReconciliations: Rpt023Row[] };
      summary: { rawByRuntimeQualityCheck: Record<string, number>; testVolume: { onScenario: number; onPhantomScenario: number; onSuspenseScenario: number } };
    };
    const suspense = parsed.ledger.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    assert.ok(suspense, `expected a suspense row; got:\n${json023}`);
    const broken = suspense!.evidenceObservations.filter((o) => o.broken === true);
    assert.equal(broken.length, 1, `expected the broken credit counted ONCE on suspense; got: ${JSON.stringify(suspense!.evidenceObservations)}`);
    // The rendered Test volume cut agrees — the view cannot drift from the fold (they ARE the rows).
    assert.ok(
      md023.includes("2 evidence observations = 1 on scenarios + 0 on phantom scenarios + 1 on the suspense scenario"),
      `expected the Test volume identity line "2 evidence observations = 1 on scenarios + 0 on phantom scenarios + 1 on the suspense scenario"; got:\n${md023}`
    );
    // COMPLETENESS ONLY: raw = onScenario + onPhantomScenario + onSuspenseScenario balances by
    // construction off the Ledger fold. It proves no credit vanished; the two ledger assertions
    // above prove the credit is in the right account.
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

// @SCN-RPT-027
// The Run provenance names every stream the run was handed (3F-3155 / 3F-3184). Two arms,
// both reading a PERSISTED Inputs block back off disk: the first threads a ctx carrying the
// two optional streams through the production writer, the second runs the REAL CLI binary as
// a subprocess so the flags travel argv -> reconcileInputsOf -> ctx.inputs -> renderer -> disk
// without this file ever constructing the object under test.
let ctx027: RunContext;
let runsRoot027: string;
let markdown027: string;
let cliDir027: string;
let cliReport027: string;
const RPT027_INPUTS = {
  features: "tests/fixtures/scn-lnt-022/features",
  packageJson: "tests/fixtures/scn-lnt-022/package.json",
  measurements: "tests/fixtures/scn-lnt-022/measurements.json",
  // THE FITNESS STREAM, WHICH IS THE CI RUN'S OWN STEP RECORD SINCE 3F-3272. The scenario says
  // "a fitness stream" and means the axis's credit stream; which document that is belongs in this
  // binding, not in the Gherkin. It was the fitness pass's cucumber report until the pass went.
  ciSteps: "tests/fixtures/scn-lnt-022/ci-steps.json",
};

// @SCN-RPT-027
Given(
  "a reconciliation run handed a measurement stream and a fitness stream alongside its feature corpus",
  function () {
    ctx027 = {
      target: "streams-target",
      inputs: {
        features: RPT027_INPUTS.features,
        packageJson: RPT027_INPUTS.packageJson,
        measurements: RPT027_INPUTS.measurements,
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

// @SCN-RPT-027
When("the run writes its markdown artifact for the streams it was handed", function () {
  const balance = runReconcile({});
  const runDir = persistReport(runsRoot027, { balance, ctx: ctx027 });
  markdown027 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
});

// @SCN-RPT-027
Then(
  "the persisted report's Inputs block names the measurement stream and the fitness stream, after the streams it already named",
  function () {
    // Teeth: today the canonical flag list stops at --package-json, so neither line is
    // rendered and both assertions red. The ORDER assertion is the second half — the two
    // streams are APPENDED, so no line that was already rendered moves.
    const measurementLine = `  - \`--measurements ${RPT027_INPUTS.measurements}\``;
    const fitnessLine = `  - \`--ci-steps ${RPT027_INPUTS.ciSteps}\``;
    const packageJsonLine = `  - \`--package-json ${RPT027_INPUTS.packageJson}\``;
    assert.ok(
      markdown027.includes(measurementLine),
      `expected the persisted Inputs block to name the measurement stream as "${measurementLine}"; got:\n${markdown027.slice(0, 800)}`
    );
    assert.ok(
      markdown027.includes(fitnessLine),
      `expected the persisted Inputs block to name the fitness stream as "${fitnessLine}"; got:\n${markdown027.slice(0, 800)}`
    );
    assert.ok(
      markdown027.indexOf(packageJsonLine) < markdown027.indexOf(measurementLine) &&
        markdown027.indexOf(measurementLine) < markdown027.indexOf(fitnessLine),
      `expected the two streams appended after --package-json, in that order; got:\n${markdown027.slice(0, 800)}`
    );
  }
);

// @SCN-RPT-027
// The REAL binary, over a fixture corpus that is self-consistent with its own measurement stream
// and its own CI step record (tests/fixtures/scn-lnt-022 — one static check, one measured), so the
// run BALANCES and the arm reds on the provenance block rather than on a verdict.
When(
  "the real CLI reconciles a fixture corpus handed both a measurement stream and a fitness stream",
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
        "--measurements", abs(RPT027_INPUTS.measurements),
        "--ci-steps", abs(RPT027_INPUTS.ciSteps),
        "--format", `md:${reportPath}`,
      ],
      // RUN FROM A DIRECTORY WITH NO PIPELINE OF ITS OWN, which is the only way to leave `--ci`
      // genuinely unsupplied and still be about this fixture (@SCN-USG-004, 3F-3343). The flag
      // defaults to `.github/workflows` RESOLVED AGAINST THE CWD, so a run standing in this
      // repository reads this repository's pipeline — and since every step of it is a candidate,
      // that would bank spec-controller's own checks on a fixture's ledger. The assertion below
      // requires `--ci` to be named NOWHERE in the Inputs block, so supplying it is not available:
      // the cwd is what has to move. Every path this run is handed is already absolute.
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

// @SCN-RPT-027
Then(
  "the persisted report's Inputs block names every stream that run received",
  function () {
    // Teeth: the four flags this run was handed must ALL be named. The CLI already carried
    // measurements and fitness on ctx.inputs; until the canonical list admits them the
    // renderer drops them silently, which is exactly the ambiguity this scenario closes.
    for (const flag of ["--features", "--package-json", "--measurements", "--ci-steps"]) {
      assert.ok(
        cliReport027.includes(`  - \`${flag} `),
        `expected the persisted Inputs block to name "${flag}"; got:\n${cliReport027.slice(0, 800)}`
      );
    }
    // And nothing the run was NOT handed is named — the presence filter is unchanged.
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

// @SCN-RPT-028
// The Run provenance names every stream the run did NOT get (3F-3155 / 3F-3185). Three
// PERSISTED renders through the production writer pin the derivation's three readings — some
// streams handed, all of them handed, none of them handed — and a fourth arm runs the REAL CLI
// binary with three flags deliberately withheld, so the withholding travels argv ->
// reconcileInputsOf -> ctx.inputs -> renderer -> disk without this file constructing the object
// under test. The @unit arms live in packages/core/src/{provenance/provenance,render/markdown}.test.ts.
let runsRoot028: string;
let markdownPartial028: string;
let markdownEvery028: string;
let markdownNone028: string;
let cliDir028: string;
let cliReport028: string;
const RPT028_HANDED = {
  features: "tests/fixtures/scn-lnt-022/features",
  packageJson: "tests/fixtures/scn-lnt-022/package.json",
  measurements: "tests/fixtures/scn-lnt-022/measurements.json",
  ciSteps: "tests/fixtures/scn-lnt-022/ci-steps.json",
};
/** The three canonical flags the CLI arm deliberately withholds, in canonical render order. */
const RPT028_WITHHELD = ["--vitest", "--cucumber", "--ci"];

/** The one rendered "- Not supplied:" line, or a stated null when the render carries none. */
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

// @SCN-RPT-028
Given("a reconciliation run handed only some of the streams the tool can read", function () {
  runsRoot028 = mkdtempSync(join(tmpdir(), "spec-controller-rpt028-"));
});

// @SCN-RPT-028
When("that run writes its markdown artifact", function () {
  const balance = runReconcile({});
  const render = (inputs: RunContext["inputs"], suffix: string): string => {
    const dir = join(runsRoot028, suffix);
    mkdirSync(dir, { recursive: true });
    const runDir = persistReport(dir, { balance, ctx: ctx028(inputs) });
    return readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  };
  markdownPartial028 = render(
    { features: RPT028_HANDED.features, measurements: RPT028_HANDED.measurements },
    "partial"
  );
  markdownEvery028 = render(
    {
      features: RPT028_HANDED.features,
      vitest: "vitest.json",
      cucumber: "cucumber.json",
      ci: ".github/workflows",
      packageJson: RPT028_HANDED.packageJson,
      measurements: RPT028_HANDED.measurements,
      ciSteps: RPT028_HANDED.ciSteps,
    },
    "every"
  );
  markdownNone028 = render({}, "none");
});

// @SCN-RPT-028
Then(
  "the persisted report names the streams it was not handed, on a line of its own beneath the ones it was",
  function () {
    // Teeth: no such line exists today, so this reds on a null. assert.equal on the WHOLE
    // rendered line rather than assert.ok on a membership test — cucumber's formatter drops an
    // assert.ok message in favour of "-false +true", and a membership check would green on a
    // line that also named a stream the run WAS handed.
    assert.equal(
      notSuppliedLine(markdownPartial028),
      "- Not supplied: `--vitest`, `--cucumber`, `--ci`, `--package-json`, `--ci-steps`"
    );
    // Beneath the Inputs list, above the timestamp — met while the reader is still reading
    // what the run was handed, not after the SHAs.
    const iMeasurements = markdownPartial028.indexOf(`  - \`--measurements ${RPT028_HANDED.measurements}\``);
    const iNotSupplied = markdownPartial028.indexOf("- Not supplied:");
    const iTimestamp = markdownPartial028.indexOf("- Run timestamp (UTC):");
    assert.equal(
      iMeasurements < iNotSupplied && iNotSupplied < iTimestamp,
      true,
      `expected the not-supplied line between the Inputs list and the timestamp; got offsets ` +
        `measurements=${iMeasurements} notSupplied=${iNotSupplied} timestamp=${iTimestamp}`
    );
  }
);

// @SCN-RPT-028
Then("a run handed every stream says nothing about absence at all", function () {
  assert.equal(notSuppliedLine(markdownEvery028), null);
});

// @SCN-RPT-028
Then(
  "a run handed nothing still reports its inputs as none specified, and names every canonical stream as not supplied",
  function () {
    // The empty-Inputs branch stays REACHABLE. Threading absent entries into the Inputs list
    // would kill it silently; a separate line cannot, and this is what says so.
    assert.equal(
      markdownNone028.split("\n").includes("- Inputs: none specified"),
      true,
      `expected the none-specified Inputs branch to survive; got:\n${markdownNone028.slice(0, 800)}`
    );
    assert.equal(
      notSuppliedLine(markdownNone028),
      "- Not supplied: `--features`, `--vitest`, `--cucumber`, `--ci`, `--package-json`, `--measurements`, `--ci-steps`"
    );
  }
);

// @SCN-RPT-028
// The REAL binary over tests/fixtures/scn-lnt-022 — the corpus that is self-consistent with its
// own measurement stream and step record, so the run BALANCES (exit 0) and the arm's teeth are the
// provenance block rather than a verdict. Three flags are withheld and four are handed, so one
// run carries BOTH sides of the discrimination: the line names exactly the withheld three.
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
        "--measurements", abs(RPT028_HANDED.measurements),
        "--ci-steps", abs(RPT028_HANDED.ciSteps),
        "--format", `md:${reportPath}`,
      ],
      // RUN FROM A DIRECTORY WITH NO PIPELINE OF ITS OWN, which is the only way to leave `--ci`
      // genuinely unsupplied and still be about this fixture (@SCN-USG-004, 3F-3343 — as at @SCN-RPT-027). The flag
      // defaults to `.github/workflows` RESOLVED AGAINST THE CWD, so a run standing in this
      // repository reads this repository's pipeline — and since every step of it is a candidate,
      // that would bank spec-controller's own checks on a fixture's ledger. The assertion below
      // requires `--ci` to be named NOWHERE in the Inputs block, so supplying it is not available:
      // the cwd is what has to move. Every path this run is handed is already absolute.
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

// @SCN-RPT-028
Then(
  "the persisted report names exactly the withheld streams as not supplied, and none of the streams that run received",
  function () {
    // BOTH SIDES FROM ONE RUN. The equality names the withheld three and, by being an equality,
    // refuses the four the run WAS handed — a line that named a supplied stream would red here
    // just as loudly as a line that named none of the withheld ones.
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
