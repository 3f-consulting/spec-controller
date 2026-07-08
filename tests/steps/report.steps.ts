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
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runReconcile, readEvidenceObligations, readEvidenceObservations, readFeatureNames } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { writeOutputs, type OutputPayloads } from "../../packages/spec-controller/src/cli-balance/emit/writer.js";
import type { OutputPlan } from "../../packages/spec-controller/src/cli-balance/emit/format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";

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
// declared corpus + result reports to produce a balance whose provenance header we read back.
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
    join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
    "--features", abs(TARGET_FIXTURE.features),
    "--vitest", abs(TARGET_FIXTURE.vitest),
    "--cucumber", abs(TARGET_FIXTURE.cucumber),
    "--format", `md:${reportPath}`,
  ];
  if (targetArg !== undefined) argv.push("--target", targetArg);
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
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
    0,
    `expected the CLI to exit 0 writing the markdown report; got exit ${result.status}\n` +
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
  "the persisted spec-reconciliation.md opens with a Run provenance header stating the target, the input, the UTC timestamp, and the source SHA",
  function () {
    // The persisted markdown must open with the provenance section carrying all
    // four facts. Each assertion has teeth: drop the provenance emitter (or fail to
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
  "the persisted spec-reconciliation.json parses to an object whose runProvenance outcomes the target, source SHA, UTC timestamp, and input, with the evidenceReconciliation body intact",
  function () {
    // The persisted JSON must parse to a whole-document report whose provenance section is
    // now `runProvenance`. Each assertion has teeth: drop the provenance projection
    // (or fail to thread ctx through writeOutputs → renderJson) and `runProvenance` is absent.
    const parsed = JSON.parse(jsonText) as {
      runProvenance?: {
        target?: string;
        sourceSha?: string | null;
        runTimestamp?: string;
        inputs?: Record<string, string>;
      };
      evidenceReconciliation?: unknown[];
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
      Array.isArray(parsed.evidenceReconciliation),
      `expected the evidenceReconciliation body to survive intact; got:\n${jsonText}`
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
// (countScnOccurrences) against the declared count (parseScenarios), then
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
  "a reconciliation run whose source mentions @SCN ids in non-tag context beyond the declared scenarios",
  function () {
    // the tool's own feature corpus mentions @SCN ids in prose/comments beyond
    // the tag-line declarations; readEvidenceObligations reads the raw-vs-declared delta
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
// evidence observation attributed to a DECLARED scenario, a phantom-id (an @SCN no scenario
// declares), and unattributed evidence observation results (no @SCN). readEvidenceObservations reads the actual report
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
  "a reconciliation run over a target whose Vitest and Cucumber reports span attributed, phantom-id, and unattributed evidence observations",
  function () {
    runsRoot010 = mkdtempSync(join(tmpdir(), "spec-controller-rpt010-"));
  }
);

When("the run writes its artifacts with the evidence observation reconciliation", function () {
  const balance = runReconcile(EVIDENCE_OBSERVATION_OPTS);
  const evidenceObservations = readEvidenceObservations(EVIDENCE_OBSERVATION_OPTS);
  const ctx010: RunContext = {
    target: "evidence observation-fixture",
    inputs: {},
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot010, { balance, ctx: ctx010, evidenceObservations });
  md010 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json010 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then(
  "the persisted spec-reconciliation.md renders the Test volume cut with the balancing identity and spec-reconciliation.json carries evidence-observation atoms that balance by construction",
  function () {
    // The fixture spans the kinds: 3 unit (TGT-001 attributed, PHANTOM-999 phantom evidence observation, one
    // no-@SCN) + 2 integration (TGT-002 attributed, one @smoke no-@SCN) = 5 evidence observations;
    // attributed-to-declared 2, phantom 1, unattributed evidence observation 2 ⇒ 5 = 2 + 1 + 2 (three-way).
    assert.match(
      md010,
      /### Test volume/,
      `expected the persisted spec-reconciliation.md to carry the Test volume cut; got:\n${md010}`
    );
    assert.ok(
      md010.includes("5 evidence observations = 2 attributed + 1 cites-unknown-scenario + 2 cites-no-scenario"),
      `expected the evidence observation identity line "5 evidence observations = 2 attributed + 1 cites-unknown-scenario + 2 cites-no-scenario"; got:\n${md010}`
    );
    assert.ok(
      md010.includes("| unit | 3 |") && md010.includes("| integration | 2 |"),
      `expected the by-level evidence observation table (3 unit / 2 integration); got:\n${md010}`
    );

    // JSON surface: the evidenceObservations atoms, and the identity holds BY CONSTRUCTION.
    // BOTH the phantom DETAIL and the suspense DETAIL dissolved into
    // rows; their COUNTS survive in summary.testVolume, which the identity now reads.
    const parsed = JSON.parse(json010) as {
      summary: { testVolume: { citesUnknownScenario: number; citesNoScenario: number } };
      evidenceObservations?: {
        rawByRuntimeQualityCheck: Record<string, number>;
        attributed: Array<{ count: number }>;
      };
    };
    const obs = parsed.evidenceObservations;
    assert.ok(obs, `expected spec-reconciliation.json to carry an evidenceObservations object; got:\n${json010}`);
    assert.ok(!("phantomEvidenceObservations" in obs!), "expected the phantom (cites-unknown-scenario) detail array to have dissolved from the section");
    assert.ok(!("suspenseEvidenceObservations" in obs!), "expected the suspense (cites-no-scenario) detail array to have dissolved from the section");
    const raw = Object.values(obs.rawByRuntimeQualityCheck).reduce((n, v) => n + v, 0);
    const attributed =
      obs.attributed.reduce((n, a) => n + a.count, 0) + parsed.summary.testVolume.citesUnknownScenario;
    assert.equal(raw, 5, `expected 5 raw evidence observations; got ${raw}`);
    assert.equal(
      raw,
      attributed + parsed.summary.testVolume.citesNoScenario,
      `the evidence-observation identity must balance by construction: raw ${raw} = attributed ${attributed} + cites-no-scenario ${parsed.summary.testVolume.citesNoScenario}`
    );
  }
);

After({ tags: "@SCN-RPT-010" }, function () {
  if (runsRoot010 && existsSync(runsRoot010)) rmSync(runsRoot010, { recursive: true, force: true });
});

// @SCN-RPT-017
// The FULL-UNIFY view fix (3F-1452): the report's evidence-observation views must level a
// runtime observation by the cited scenario's declared tier tag — the SAME rule the reconciler
// uses (@SCN-LDG-011 / 3F-1434) — because the census is now a PROJECTION of the one parsed
// observation set, not a second raw-report walk. The @integration arm drives the REAL reconcile +
// render over a fixture whose cucumber report proves a passing @e2e scenario (SCN-TGT-101) with NO
// vitest evidence: the persisted Test volume must count it under e2e (not the caller-declared
// integration fallback), the JSON `attributed` must carry (SCN-TGT-101, e2e), and the scenario's
// E2e cell must render a count, not ∅. RED on the census's own raw-report walk (which stamps
// cucumber ⇒ integration); GREEN once the census projects the tag-derived parsed set.
const EVIDENCE_OBSERVATION_E2E_OPTS = {
  features: "tests/fixtures/evidence-observation-e2e/features",
  cucumber: "tests/fixtures/evidence-observation-e2e/cucumber.json",
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
  const evidenceObservations = readEvidenceObservations(EVIDENCE_OBSERVATION_E2E_OPTS);
  const ctx017: RunContext = {
    target: "evidence-observation-e2e-fixture",
    inputs: {},
    runStart: new Date("2026-07-08T20:30:17.000Z"),
    sourceSha: null,
  };
  const runDir = persistReport(runsRoot017, { balance, ctx: ctx017, evidenceObservations });
  md017 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
  json017 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
});

Then("Test volume counts the observation under e2e, not integration", function () {
  // The by-level evidence-observation table must count the single cucumber observation under
  // e2e (its cited scenario's declared tier), NOT the caller-declared integration fallback.
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

Then("the scenario appears in attributed at e2e", function () {
  const parsed = JSON.parse(json017) as {
    evidenceObservations?: {
      attributed: Array<{ scnId: string; qualityCheck: string; count: number }>;
    };
  };
  const attributed = parsed.evidenceObservations?.attributed ?? [];
  assert.ok(
    attributed.some((a) => a.scnId === "SCN-TGT-101" && a.qualityCheck === "e2e" && a.count === 1),
    `expected attributed to carry (SCN-TGT-101, e2e, 1); got: ${JSON.stringify(attributed)}`
  );
});

Then("the scenario's E2e cell renders a count, not ∅", function () {
  // The ledger row for SCN-TGT-101 — the E2e cell reads the attributed (SCN-TGT-101, e2e)
  // count. Pre-fix, the census stamped the integration fallback, so the e2e credit landed
  // nowhere the cell reads → ∅. Post-fix (tag-derived projection) it renders the count.
  const row = md017.split("\n").find((l) => l.includes("| SCN-TGT-101 |"));
  assert.ok(row, `expected a ledger row for SCN-TGT-101; got:\n${md017}`);
  assert.ok(
    !row!.includes("∅"),
    `expected SCN-TGT-101's E2e cell to render a count, not ∅; got row:\n${row}`
  );
  // The E2e column carries the attributed count (1) — the cell is the backing count.
  assert.match(
    row!,
    /\| SCN-TGT-101 \| 1 \|/,
    `expected SCN-TGT-101's E2e cell to render the count 1; got row:\n${row}`
  );
});

After({ tags: "@SCN-RPT-017" }, function () {
  if (runsRoot017 && existsSync(runsRoot017)) rmSync(runsRoot017, { recursive: true, force: true });
});

// @SCN-RPT-018
// The MULTI-TAG view mirror (3F-1452): the view-side mirror of the reconciler's @SCN-LDG-014.
// A scenario declaring @integration @e2e proven by a SINGLE passing cucumber observation must be
// counted in BOTH tiers across the views — because parseCucumber emits one observation per declared
// non-unit tier (per-tier emission, @SCN-LDG-014) and the census PROJECTS that parsed set
// (@SCN-RPT-017), tallying the integration and e2e observations for the one scenario independently
// with NO multi-tag-specific census logic. The @integration arm drives the REAL reconcile + render
// over a fixture whose cucumber report proves a passing @integration @e2e scenario (SCN-TGT-102)
// with NO vitest evidence: the persisted Test volume must count it under BOTH integration and e2e,
// and the scenario declares both obligations, so both the Integration and E2e cells must render
// their attributed count, not ∅. Per-tier counting is INHERITED from the parsed set — green on the
// full-unify census; teeth proven by the census unit arm + local mutation (collapsing the parsed
// set to one-per-scenario reds the second tier).
const EVIDENCE_OBSERVATION_INTEGRATION_E2E_OPTS = {
  features: "tests/fixtures/evidence-observation-integration-e2e/features",
  cucumber: "tests/fixtures/evidence-observation-integration-e2e/cucumber.json",
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
    const evidenceObservations = readEvidenceObservations(EVIDENCE_OBSERVATION_INTEGRATION_E2E_OPTS);
    const ctx018: RunContext = {
      target: "evidence-observation-integration-e2e-fixture",
      inputs: {},
      runStart: new Date("2026-07-08T20:30:17.000Z"),
      sourceSha: null,
    };
    const runDir = persistReport(runsRoot018, { balance, ctx: ctx018, evidenceObservations });
    md018 = readFileSync(join(runDir, "spec-reconciliation.md"), "utf8");
    json018 = readFileSync(join(runDir, "spec-reconciliation.json"), "utf8");
  }
);

Then("Test volume counts the single observation under both integration and e2e", function () {
  // parseCucumber emits ONE observation per declared tier from the single scenario pass, and the
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
  // Cross-check the JSON attributed carries BOTH tiers for the one scenario.
  const parsed = JSON.parse(json018) as {
    evidenceObservations?: {
      attributed: Array<{ scnId: string; qualityCheck: string; count: number }>;
    };
  };
  const attributed = parsed.evidenceObservations?.attributed ?? [];
  assert.ok(
    attributed.some((a) => a.scnId === "SCN-TGT-102" && a.qualityCheck === "integration" && a.count === 1),
    `expected attributed to carry (SCN-TGT-102, integration, 1); got: ${JSON.stringify(attributed)}`
  );
  assert.ok(
    attributed.some((a) => a.scnId === "SCN-TGT-102" && a.qualityCheck === "e2e" && a.count === 1),
    `expected attributed to ALSO carry (SCN-TGT-102, e2e, 1); got: ${JSON.stringify(attributed)}`
  );
});

Then("SCN-TGT-102's Integration and E2e cells each render a count, not ∅", function () {
  // The ledger row for SCN-TGT-102 declares BOTH the integration and e2e obligations (its tier
  // tags), and both are discharged by the one cucumber pass. So the Integration column AND the E2e
  // column each read the attributed (SCN-TGT-102, tier) count of 1 — the row reads
  // `| SCN-TGT-102 | 1 | 1 | ...`. If the second tier's credit were lost (census dedup, or a
  // one-per-scenario parse), that cell would collapse to ∅ (declared, no observation) → RED.
  const row = md018.split("\n").find((l) => l.includes("| SCN-TGT-102 |"));
  assert.ok(row, `expected a ledger row for SCN-TGT-102; got:\n${md018}`);
  assert.ok(
    !row!.includes("∅"),
    `expected SCN-TGT-102's Integration and E2e cells to each render a count, not ∅; got row:\n${row}`
  );
  // Columns are in canonical order (integration, then e2e) — both cells carry the count 1.
  assert.match(
    row!,
    /\| SCN-TGT-102 \| 1 \| 1 \|/,
    `expected SCN-TGT-102's Integration and E2e cells to each render the count 1; got row:\n${row}`
  );
});

After({ tags: "@SCN-RPT-018" }, function () {
  if (runsRoot018 && existsSync(runsRoot018)) rmSync(runsRoot018, { recursive: true, force: true });
});

// @SCN-RPT-014
// The untagged-scenarios @integration arm drives the REAL declared-side parse over a
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

When("the run writes its artifacts with the declared corpus", function () {
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
    // re-homed into the ledger-summary declared corpus — there is NO warnings section.
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

When("the run writes its artifacts with the declared corpus over that directory", function () {
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
    // re-homed into the ledger-summary declared corpus — there is NO warnings section.
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
  "a target feature directory whose features declare codes alongside an uncoded one",
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
    // The uncoded XYZ id (no file declares XYZ) falls back to the bare code.
    assert.ok(
      md006.includes("| XYZ | 1 | SCN-XYZ-001 |"),
      `expected the uncoded id to fall back to the bare FFF; got:\n${md006}`
    );
  }
);

After({ tags: "@SCN-RPT-006" }, function () {
  if (runsRoot006 && existsSync(runsRoot006)) rmSync(runsRoot006, { recursive: true, force: true });
});
