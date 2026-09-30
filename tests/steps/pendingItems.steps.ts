import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScenarios, reconcile, isBalanced, renderMarkdown, assembleRenderInput } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { DEFAULT_DEFERRAL_TAGS } from "../../packages/spec-controller/src/deferralTags.js";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import type { Scenario,
  EvidenceObligation,
  EvidenceObservation,
  Ledger,
  ScenarioReconciliation,
  EvidenceReconciliation,
  RunContext, RenderInput } from "@3f-consulting/spec-controller-core";
import { summaryOf } from "../../packages/core/src/domain/evidenceReconciliation.js";

const pendingConcept = (ledger: Ledger) => ({ summary: summaryOf(ledger, false, false), ledger });

const FIXTURE = join(process.cwd(), "tests/fixtures/pending-tags/features/target.feature");
const SUFFIX_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/suffix-significance.feature"
);
const UNKNOWN_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/unknown-pending.feature"
);

let pendingTag: string;
let obligations: EvidenceObligation[];
let suffixScenarios: Scenario[];
let unknownScenarios: Scenario[];
let pendingCheck: string;
let reconciliation: Ledger;

Given("a planted fixture scenario tagged {string}", function (tag: string) {
  pendingTag = tag;
});

When("the parser derives its evidence obligations", function () {
  assert.ok(pendingTag, "expected a pending tag to have been recorded");
  const source = readFileSync(FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  obligations = scenarios.flatMap((s) => s.evidenceObligations);
});

Then("it raises a pending {string} obligation", function (qualityCheck: string) {
  const pendingAtCheck = obligations.filter(
    (o) => o.qualityCheck === qualityCheck && o.pending === true
  );
  assert.equal(
    pendingAtCheck.length,
    1,
    `expected exactly one pending "${qualityCheck}" obligation derived from the planted fixture; got ${
      pendingAtCheck.length
    } (all obligations: ${JSON.stringify(obligations)})`
  );
  assert.deepEqual(
    pendingAtCheck[0],
    { qualityCheck, pending: true },
    `a pending obligation carries no payload beyond its quality check; got ${JSON.stringify(pendingAtCheck[0])}`
  );
});

Given(
  "the planted suffix-significance fixture — a bare `@integration` scenario alongside an `@integrationpending` one",
  function () {
  }
);

When("the parser derives each scenario's evidence obligations", function () {
  const source = readFileSync(SUFFIX_FIXTURE, "utf8");
  suffixScenarios = parseScenarios(source);
});

Then(
  "the bare `@integration` scenario raises a plain {string} obligation and no pending one",
  function (qualityCheck: string) {
    const scenario = suffixScenarios.find((s) => s.scnId === "SCN-PDS-001");
    assert.ok(scenario, "expected the bare-integration fixture scenario (SCN-PDS-001)");
    const atCheck = scenario.evidenceObligations.filter((o) => o.qualityCheck === qualityCheck);
    assert.equal(
      atCheck.length,
      1,
      `expected exactly one "${qualityCheck}" obligation on the bare scenario; got ${
        atCheck.length
      } (${JSON.stringify(scenario.evidenceObligations)})`
    );
    assert.equal(
      atCheck[0]!.pending,
      undefined,
      `a bare @integration must NOT gain a pending obligation; got ${JSON.stringify(atCheck[0])}`
    );
  }
);

Then(
  "the `@integrationpending` scenario raises a pending {string} obligation and no plain one",
  function (qualityCheck: string) {
    const scenario = suffixScenarios.find((s) => s.scnId === "SCN-PDS-002");
    assert.ok(scenario, "expected the integration-pending fixture scenario (SCN-PDS-002)");
    const atCheck = scenario.evidenceObligations.filter((o) => o.qualityCheck === qualityCheck);
    assert.equal(
      atCheck.length,
      1,
      `expected exactly one "${qualityCheck}" obligation on the pending scenario; got ${
        atCheck.length
      } (${JSON.stringify(scenario.evidenceObligations)})`
    );
    assert.equal(
      atCheck[0]!.pending,
      true,
      `an @integrationpending must gain a pending obligation; got ${JSON.stringify(atCheck[0])}`
    );
  }
);

Given(
  "the planted unknown-pending fixture — an `@foopending` scenario and a plain unknown `@foo` scenario",
  function () {
  }
);

When("the parser derives each unknown scenario's evidence obligations", function () {
  const source = readFileSync(UNKNOWN_FIXTURE, "utf8");
  unknownScenarios = parseScenarios(source);
});

Given(
  "a planted fixture scenario raising a pending {string} obligation",
  function (qualityCheck: string) {
    pendingCheck = qualityCheck;
  }
);

When("the reconciler reconciles it against no observation", function () {
  assert.ok(pendingCheck, "expected a pending quality-check to have been recorded");
  const source = readFileSync(FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  reconciliation = reconcile(scenarios, []);
});

Then(
  "the scenario raises exactly one Pending Item for {string}",
  function (qualityCheck: string) {
    const pendingAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      (s.pendingItems ?? []).filter((p) => p.qualityCheck === qualityCheck)
    );
    assert.equal(
      pendingAtCheck.length,
      1,
      `expected exactly one Pending Item for "${qualityCheck}" across the reconciled fixture; got ${
        pendingAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

const MATCH_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/pending-with-observation.feature"
);

Given(
  "a planted fixture scenario raising a pending {string} obligation, with a matching integration observation citing it",
  function (qualityCheck: string) {
    pendingCheck = qualityCheck;
  }
);

When("the reconciler reconciles the fixture against that matching observation", function () {
  assert.ok(pendingCheck, "expected a pending quality-check to have been recorded");
  const source = readFileSync(MATCH_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const matchingObservation: EvidenceObservation = {
    qualityCheck: "integration",
    scnId: "SCN-PDM-001",
    status: "passed",
  };
  reconciliation = reconcile(scenarios, [matchingObservation]);
});

Then(
  "the matching observation IS flagged no-evidence-obligation — a pending obligation names nothing, so nothing is attributed to it",
  function () {
    const noEvidenceObligation = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "no-evidence-obligation")
    );
    assert.equal(
      noEvidenceObligation.length,
      1,
      `the matching observation MUST be flagged no-evidence-obligation — a pending obligation names nothing; got ${
        noEvidenceObligation.length
      } no-evidence-obligation item(s) (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    assert.equal(
      noEvidenceObligation[0]!.qualityCheck,
      "integration",
      "the no-evidence-obligation credit must be the integration one citing the pending pair"
    );
  }
);

Then(
  "the scenario's row is out of balance and the run exits 1",
  function () {
    const row = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDM-001");
    assert.ok(row, "expected an account for the planted fixture scenario SCN-PDM-001");
    assert.equal(row.verdict, "out-of-balance");
    assert.deepEqual(row.pendingItems, [{ qualityCheck: "integration" }]);
    assert.deepEqual(
      row.reconcilingItems.map((r) => r.outcome),
      ["no-evidence-obligation"],
      `the row's ONLY reconciling item must be the no-evidence-obligation credit — the Pending Item is never ` +
        `one; got ${JSON.stringify(row.reconcilingItems)}`
    );
    assert.equal(
      isBalanced(reconciliation),
      false,
      "the run must NOT be balanced — canon says this run must fail, so exit 1"
    );
  }
);

Then(
  "the scenario posts no both-missing reconciling item — nothing is reconciled",
  function () {
    const bothMissing = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.qualityCheckReconciliations.filter((o) => o.outcome === "both-missing")
    );
    assert.equal(
      bothMissing.length,
      0,
      `an only-pending scenario must post NO both-missing row; got ${
        bothMissing.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

const ERROR_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/pending-with-error.feature"
);

let pendingCheckMixed: string;
let missingCheckMixed: string;

Given(
  "a planted fixture scenario raising a pending {string} obligation alongside a genuinely missing {string} obligation",
  function (pendingCheck: string, missingCheck: string) {
    pendingCheckMixed = pendingCheck;
    missingCheckMixed = missingCheck;
  }
);

When("the reconciler reconciles the mixed fixture against no observation", function () {
  assert.ok(pendingCheckMixed, "expected a pending quality-check to have been recorded");
  assert.ok(missingCheckMixed, "expected a missing quality-check to have been recorded");
  const source = readFileSync(ERROR_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  reconciliation = reconcile(scenarios, []);
});

Then(
  "the missing {string} obligation is the scenario's only reconciling item — its one error",
  function (missingCheck: string) {
    const reconcilingItems = reconciliation.scenarioReconciliations.flatMap(
      (s) => s.reconcilingItems
    );
    assert.equal(
      reconcilingItems.length,
      1,
      `expected exactly one reconciling item (the missing "${missingCheck}" error); got ${
        reconcilingItems.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    assert.deepEqual(
      reconcilingItems[0],
      { qualityCheck: missingCheck, outcome: "missing", evidenceObligation: { qualityCheck: missingCheck } },
      `the one reconciling item must be the missing "${missingCheck}" obligation; got ${JSON.stringify(
        reconcilingItems[0]
      )}`
    );
  }
);

Then(
  "the pending {string} check names no reconciling item and no evidence-obligation outcome — the Pending Item is a structurally distinct category, never counted as an error",
  function (pendingCheck: string) {
    const reconcilingAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.qualityCheck === pendingCheck)
    );
    assert.equal(
      reconcilingAtCheck.length,
      0,
      `the pending "${pendingCheck}" check must name NO reconciling item; got ${
        reconcilingAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    const outcomeAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      s.qualityCheckReconciliations.filter((r) => r.qualityCheck === pendingCheck)
    );
    assert.equal(
      outcomeAtCheck.length,
      0,
      `the pending "${pendingCheck}" check must name NO evidence-obligation outcome; got ${
        outcomeAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
    const pendingAtCheck = reconciliation.scenarioReconciliations.flatMap((s) =>
      (s.pendingItems ?? []).filter((p) => p.qualityCheck === pendingCheck)
    );
    assert.equal(
      pendingAtCheck.length,
      1,
      `the deferred "${pendingCheck}" obligation must be exactly one Pending Item; got ${
        pendingAtCheck.length
      } (rows: ${JSON.stringify(reconciliation.scenarioReconciliations)})`
    );
  }
);

Then(
  "every scenario raises no evidence obligation — the unknown `<x>pending` is ignored exactly like the plain unknown tag",
  function () {
    assert.equal(
      unknownScenarios.length,
      2,
      `expected both planted unknown-tag scenarios; got ${unknownScenarios.length} (${JSON.stringify(
        unknownScenarios
      )})`
    );
    for (const scenario of unknownScenarios) {
      assert.deepEqual(
        scenario.evidenceObligations,
        [],
        `${scenario.scnId} carries a tag outside the recognised lexicon and must derive NO obligation; got ${JSON.stringify(
          scenario.evidenceObligations
        )}`
      );
    }
    const foopending = unknownScenarios.find((s) => s.scnId === "SCN-PDU-001");
    const foo = unknownScenarios.find((s) => s.scnId === "SCN-PDU-003");
    assert.ok(foopending && foo, "expected the @foopending and @foo fixture scenarios");
    assert.deepEqual(
      foopending.evidenceObligations,
      foo.evidenceObligations,
      "an unknown `@foopending` must derive exactly what a plain unknown `@foo` derives (both empty)"
    );
  }
);

const BALANCED_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/only-pending-balanced.feature"
);

Given(
  "a planted fixture — one scenario whose sole obligation is pending, and one carrying a passing unit obligation alongside a pending integration one",
  function () {
  }
);

When("the reconciler reconciles the fixture, the passing unit observation supplied", function () {
  const source = readFileSync(BALANCED_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const passingUnit: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-PDB-002",
    status: "passed",
  };
  reconciliation = reconcile(scenarios, [passingUnit]);
});

Then(
  "both scenarios have verdict balanced — the Pending Item is verdict-neutral",
  function () {
    const sole = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-001");
    const mixed = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-002");
    assert.ok(sole, "expected the sole-pending fixture scenario (SCN-PDB-001)");
    assert.ok(mixed, "expected the passing-unit-plus-pending fixture scenario (SCN-PDB-002)");
    assert.equal(
      sole.verdict,
      "balanced",
      `a scenario whose sole obligation is pending must be balanced; got "${sole.verdict}" (row: ${JSON.stringify(
        sole
      )})`
    );
    assert.equal(
      mixed.verdict,
      "balanced",
      `a scenario carrying a passing unit obligation + a pending integration one must be balanced; got "${mixed.verdict}" (row: ${JSON.stringify(
        mixed
      )})`
    );
    assert.deepEqual(sole.pendingItems ?? [], [{ qualityCheck: "integration" }]);
    assert.deepEqual(mixed.pendingItems ?? [], [{ qualityCheck: "integration" }]);
  }
);

Then("neither scenario names any reconciling item", function () {
  const sole = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-001");
  const mixed = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDB-002");
  assert.deepEqual(
    sole?.reconcilingItems,
    [],
    `the sole-pending scenario must name no reconciling item; got ${JSON.stringify(
      sole?.reconcilingItems
    )}`
  );
  assert.deepEqual(
    mixed?.reconcilingItems,
    [],
    `the passing-unit-plus-pending scenario must name no reconciling item; got ${JSON.stringify(
      mixed?.reconcilingItems
    )}`
  );
});

const RUN_NEUTRAL_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/run-neutral-pending.feature"
);

let wholeRunBalanced: boolean;

Given(
  "a planted fixture whose scenarios' only exceptions are Pending Items — two only-pending scenarios and one carrying a passing unit obligation alongside a deferred integration one",
  function () {
  }
);

When("the reconciler reconciles the whole fixture, the passing unit observation supplied", function () {
  const source = readFileSync(RUN_NEUTRAL_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const passingUnit: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-PDR-003",
    status: "passed",
  };
  reconciliation = reconcile(scenarios, [passingUnit]);
  wholeRunBalanced = isBalanced(reconciliation);
});

Then(
  "the whole Evidence Reconciliation is balanced — isBalanced is true, the run does not fail",
  function () {
    assert.equal(
      wholeRunBalanced,
      true,
      `a run whose only exceptions are Pending Items must not fail — isBalanced true; got ${wholeRunBalanced} (rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations
      )})`
    );
  }
);

Then(
  "the run genuinely carries Pending Items, yet no row names a reconciling item",
  function () {
    const pendingCount = reconciliation.scenarioReconciliations.flatMap(
      (s) => s.pendingItems ?? []
    ).length;
    assert.equal(
      pendingCount,
      3,
      `the run must genuinely carry three Pending Items (the balance is not vacuous); got ${pendingCount} (rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations
      )})`
    );
    const reconcilingCount = reconciliation.scenarioReconciliations.flatMap(
      (s) => s.reconcilingItems
    ).length;
    assert.equal(
      reconcilingCount,
      0,
      `no row may name a reconciling item; got ${reconcilingCount} (rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations
      )})`
    );
  }
);

const COMPOSITION_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/composition.feature"
);

Given(
  "a planted fixture scenario raising `@unit @integrationpending`, with a passing unit observation citing it",
  function () {
  }
);

When(
  "the reconciler reconciles the composition fixture against that passing unit observation",
  function () {
    const source = readFileSync(COMPOSITION_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDC-001",
      status: "passed",
    };
    reconciliation = reconcile(scenarios, [passingUnit]);
  }
);

Then(
  "the unit obligation reconciles satisfied — a genuine reconciling-side balance",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDC-001");
    assert.ok(scenario, "expected the composition fixture scenario (SCN-PDC-001)");
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [
        {
          qualityCheck: "unit",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "unit" },
          evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PDC-001", status: "passed" },
        },
      ],
      `the unit obligation must reconcile satisfied as the scenario's sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
  }
);

Then(
  "the deferred integration obligation is the scenario's one Pending Item, partitioned off",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDC-001");
    assert.ok(scenario, "expected the composition fixture scenario (SCN-PDC-001)");
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the deferred integration obligation must be the scenario's one Pending Item; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
    const integrationOutcomes = scenario.qualityCheckReconciliations.filter(
      (o) => o.qualityCheck === "integration"
    );
    assert.equal(
      integrationOutcomes.length,
      0,
      `the deferred integration obligation must name NO reconciled outcome (it is partitioned off); got ${JSON.stringify(
        integrationOutcomes
      )}`
    );
  }
);

Then(
  "the scenario has verdict balanced and names no reconciling item — the pending and non-pending obligations coexist without interference",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDC-001");
    assert.ok(scenario, "expected the composition fixture scenario (SCN-PDC-001)");
    assert.equal(
      scenario.verdict,
      "balanced",
      `the composition scenario must have verdict balanced; got "${scenario.verdict}" (row: ${JSON.stringify(
        scenario
      )})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `the composition scenario must name no reconciling item; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
  }
);

const RENDER_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/render-pending.feature"
);

let renderedReport: string;

function rowFor(md: string, scnId: string): string {
  const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
  assert.ok(row, `expected a rendered Scenario Reconciliation row for ${scnId} in:\n${md}`);
  return row;
}

Given(
  "a planted render fixture — a balanced-with-pending scenario and one mixing a genuinely-missing unit error with a deferred integration obligation",
  function () {
  }
);

When("the report is rendered from the reconciled fixture", function () {
  const source = readFileSync(RENDER_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const reconciliation = reconcile(scenarios, []);
  const ctx: RunContext = {
    target: "pending-render-fixture",
    inputs: {},
    runStart: new Date("2026-07-10T00:00:00.000Z"),
    sourceSha: null,
  };
  renderedReport = renderMarkdown(pendingConcept(reconciliation), ctx);
});

Then(
  "the balanced scenario's row shows its deferred integration obligation as a Pending Item, labelled distinct from a reconciling item",
  function () {
    const row = rowFor(renderedReport, "SCN-PDL-001");
    assert.match(
      row,
      /⏳ pending: integration/,
      `the balanced-with-pending row must show the Pending Item's ⏳ pending: integration label; got: ${row}`
    );
    assert.match(row, /✓ balanced/, `the sole-pending row must read balanced; got: ${row}`);
    assert.doesNotMatch(
      row,
      /integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/,
      `a Pending Item must never render as a reconciling-item error; got: ${row}`
    );
  }
);

Then(
  "the mixed scenario's row shows the missing unit error and the deferred integration Pending Item as separate, distinctly-labelled categories",
  function () {
    const row = rowFor(renderedReport, "SCN-PDL-002");
    assert.match(
      row,
      /unit ∅ Evidence Observation is missing/,
      `the mixed row must render the genuine unit error as a reconciling item; got: ${row}`
    );
    assert.match(
      row,
      /⏳ pending: integration/,
      `the mixed row must render the deferred obligation as a distinct Pending Item; got: ${row}`
    );
    assert.match(row, /✗ out-of-balance/, `the mixed row is out-of-balance via its unit error; got: ${row}`);
  }
);

Then(
  "no Pending Item is rendered as a reconciling item — the deferred integration check never appears as a missing or failing error",
  function () {
    assert.doesNotMatch(
      renderedReport,
      /integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/,
      `no deferred integration obligation may render as a reconciling-item error in:\n${renderedReport}`
    );
  }
);

const SUMMARY_TALLY_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/summary-tally.feature"
);

let summaryReport: RenderInput;
let summaryRendered: string;

Given(
  "a planted summary-tally fixture — scenarios carrying Pending Items alongside a genuinely-missing error, spanning balanced and out-of-balance",
  function () {
  }
);

When("the report is assembled and rendered from the reconciled fixture", function () {
  const source = readFileSync(SUMMARY_TALLY_FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  const reconciliation = reconcile(scenarios, []);
  const ctx: RunContext = {
    target: "pending-summary-tally-fixture",
    inputs: {},
    runStart: new Date("2026-07-10T00:00:00.000Z"),
    sourceSha: null,
  };
  summaryReport = assembleRenderInput(pendingConcept(reconciliation), ctx);
  summaryRendered = renderMarkdown(pendingConcept(reconciliation), ctx);
});

Then(
  "the materialised summary tallies the Pending Items, a count apart from the scenario balanced and out-of-balance counts",
  function () {
    assert.equal(
      summaryReport.summary.pending,
      3,
      `the summary must tally 3 Pending Items; got ${summaryReport.summary.pending} (summary: ${JSON.stringify(
        summaryReport.summary
      )})`
    );
    assert.equal(
      summaryReport.summary.scenarioReconciliations.balanced,
      1,
      `expected 1 balanced scenario; got ${summaryReport.summary.scenarioReconciliations.balanced}`
    );
    assert.equal(
      summaryReport.summary.scenarioReconciliations.outOfBalance,
      2,
      `expected 2 out-of-balance scenarios; got ${summaryReport.summary.scenarioReconciliations.outOfBalance}`
    );
    assert.notEqual(summaryReport.summary.pending, summaryReport.summary.scenarioReconciliations.balanced);
    assert.notEqual(summaryReport.summary.pending, summaryReport.summary.scenarioReconciliations.outOfBalance);
  }
);

Then(
  "the tally counts Pending Items, not scenarios carrying them — one deferred obligation is one Pending Item",
  function () {
    const totalItems = summaryReport.ledger.scenarioReconciliations.flatMap((s) => s.pendingItems ?? []).length;
    const scenariosCarryingPending = summaryReport.ledger.scenarioReconciliations.filter(
      (s) => (s.pendingItems ?? []).length > 0
    ).length;
    assert.equal(
      summaryReport.summary.pending,
      totalItems,
      `the tally must count Pending Items (${totalItems}), not ${summaryReport.summary.pending}`
    );
    assert.equal(totalItems, 3, `expected 3 Pending Items across the rows; got ${totalItems}`);
    assert.equal(
      scenariosCarryingPending,
      2,
      `expected 2 scenarios carrying pending; got ${scenariosCarryingPending}`
    );
    assert.notEqual(
      summaryReport.summary.pending,
      scenariosCarryingPending,
      `the tally counts items, not scenarios carrying them — it must not equal ${scenariosCarryingPending}`
    );
  }
);

Then(
  "the rendered Evidence reconciliation shows the Pending Items tally, never an out-of-balance leaf at any count",
  function () {
    const iSection = summaryRendered.indexOf("### Evidence reconciliation");
    assert.ok(iSection >= 0, `expected the Evidence reconciliation section in:\n${summaryRendered}`);
    const rest = summaryRendered.slice(iSection + 1);
    const nextHeading = rest.search(/\n#{2,3} /);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    assert.match(
      section,
      /⏳\s*3 Pending Item/,
      `the Evidence reconciliation section must show the Pending Items tally (3); got:\n${section}`
    );
    for (const leaf of [
      "Evidence Observation is missing",
      "Evidence Observation is failing",
      "Evidence Observation is passing but fabricated",
      "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
    ]) {
      assert.match(
        section,
        new RegExp(`↳ ${leaf} `),
        `the out-of-balance leaf decomposition must stay intact (↳ ${leaf}); got:\n${section}`
      );
    }
    assert.doesNotMatch(
      summaryRendered,
      /↳ pending/,
      `a Pending Item must NEVER render as an out-of-balance leaf (↳ pending) in:\n${summaryRendered}`
    );
  }
);

const BALANCED_CONTRAST_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/balanced-contrast.feature"
);

let balancedContrastReport: string;

Given(
  "a planted balanced-contrast fixture — a clean-balanced scenario alongside a balanced-with-pending one, both verdict balanced",
  function () {
  }
);

When(
  "the report is rendered from the reconciled balanced-contrast fixture, the clean-balanced scenario's unit observation supplied",
  function () {
    const source = readFileSync(BALANCED_CONTRAST_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDD-001",
      status: "passed",
    };
    const reconciliation = reconcile(scenarios, [passingUnit]);
    const ctx: RunContext = {
      target: "pending-balanced-contrast-fixture",
      inputs: {},
      runStart: new Date("2026-07-10T00:00:00.000Z"),
      sourceSha: null,
    };
    balancedContrastReport = renderMarkdown(pendingConcept(reconciliation), ctx);
  }
);

Then(
  "the clean-balanced scenario's balanced row shows the em-dash placeholder — nothing outstanding",
  function () {
    const row = rowFor(balancedContrastReport, "SCN-PDD-001");
    assert.match(row, /✓ balanced/, `the clean-balanced row must read balanced; got: ${row}`);
    assert.match(
      row,
      /\|\s*—\s*\|/,
      `the clean-balanced row's exceptions cell must be the em-dash placeholder; got: ${row}`
    );
    assert.doesNotMatch(
      row,
      /⏳/,
      `the clean-balanced row must carry no pending label; got: ${row}`
    );
  }
);

Then(
  "the balanced-with-pending scenario's balanced row shows the ⏳ pending label instead — owed work, never an error",
  function () {
    const row = rowFor(balancedContrastReport, "SCN-PDD-002");
    assert.match(row, /✓ balanced/, `the balanced-with-pending row must read balanced; got: ${row}`);
    assert.match(
      row,
      /⏳ pending: integration/,
      `the balanced-with-pending row must show the ⏳ pending: integration label; got: ${row}`
    );
    assert.doesNotMatch(
      row,
      /\|\s*—\s*\|/,
      `the balanced-with-pending row must NOT be the clean-balanced em-dash; got: ${row}`
    );
    assert.doesNotMatch(
      row,
      /integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/,
      `a Pending Item must never render as a reconciling-item error; got: ${row}`
    );
  }
);

Then(
  "the two balanced rows read differently at a glance — the pending row is not the clean-balanced em-dash",
  function () {
    const cleanRow = rowFor(balancedContrastReport, "SCN-PDD-001");
    const pendingRow = rowFor(balancedContrastReport, "SCN-PDD-002");
    const exceptionsCell = (row: string): string => (row.split("|")[3] ?? "").trim();
    const cleanCell = exceptionsCell(cleanRow);
    const pendingCell = exceptionsCell(pendingRow);
    assert.equal(cleanCell, "—", `the clean-balanced exceptions cell must be the em-dash; got: "${cleanCell}"`);
    assert.notEqual(
      pendingCell,
      cleanCell,
      `the balanced-with-pending exceptions cell ("${pendingCell}") must differ from the clean-balanced em-dash ("${cleanCell}") — the two balanced rows must read differently`
    );
    assert.match(
      pendingCell,
      /⏳ pending: integration/,
      `the balanced-with-pending exceptions cell must carry the ⏳ pending: integration label; got: "${pendingCell}"`
    );
  }
);

const INCONCLUSIVE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/inconclusive-classification.feature"
);

let classificationResult: string;
let classificationScenarios: Scenario[];
let classificationReport: CucumberJsonReport;

Given(
  "a planted integration evidence obligation and a cucumber report whose step status is {string}",
  function (result: string) {
    classificationResult = result;
    const source = readFileSync(INCONCLUSIVE_FIXTURE, "utf8");
    classificationScenarios = parseScenarios(source);
    classificationReport = [
      {
        uri: "features/inconclusive-classification.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-PDN-001" }],
            steps: [{ result: { status: result } }],
          },
        ],
      },
    ];
  }
);

When(
  "the cucumber reader parses the report and the reconciler reconciles the obligation",
  function () {
    const observations = parseCucumberEvidenceObservations(classificationReport, "integration");
    reconciliation = reconcile(classificationScenarios, observations);
  }
);

Then(
  "the integration evidence obligation reconciles {string}",
  function (outcome: string) {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDN-001");
    assert.ok(scenario, "expected the named fixture scenario (SCN-PDN-001)");
    const integrationOutcomes = scenario.qualityCheckReconciliations.filter(
      (o) => o.qualityCheck === "integration"
    );
    assert.equal(
      integrationOutcomes.length,
      1,
      `expected exactly one reconciled integration obligation on SCN-PDN-001; got ${
        integrationOutcomes.length
      } (${JSON.stringify(scenario.qualityCheckReconciliations)})`
    );
    assert.equal(
      integrationOutcomes[0]!.outcome,
      outcome,
      `the named integration obligation for a "${classificationResult}" observation must reconcile "${outcome}"; got "${
        integrationOutcomes[0]!.outcome
      }" (row: ${JSON.stringify(scenario)})`
    );
  }
);

const UNDEFINED_NOT_PENDING_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/undefined-not-pending.feature"
);

let antiLeniencyScenarios: Scenario[];
let antiLeniencyReport: CucumberJsonReport;

Given(
  "a planted integration evidence obligation carrying no pending flag, and a cucumber report whose step is undefined",
  function () {
    const source = readFileSync(UNDEFINED_NOT_PENDING_FIXTURE, "utf8");
    antiLeniencyScenarios = parseScenarios(source);
    antiLeniencyReport = [
      {
        uri: "features/undefined-not-pending.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-PDA-001" }],
            steps: [{ result: { status: "undefined" } }],
          },
        ],
      },
    ];
  }
);

When(
  "the cucumber reader drops the undefined step and the reconciler reconciles the obligation",
  function () {
    const observations = parseCucumberEvidenceObservations(antiLeniencyReport, "integration");
    reconciliation = reconcile(antiLeniencyScenarios, observations);
  }
);

Then(
  "the scenario verdict is out-of-balance, its integration obligation a missing reconciling item",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDA-001");
    assert.ok(scenario, "expected the named fixture scenario (SCN-PDA-001)");
    assert.equal(
      scenario.verdict,
      "out-of-balance",
      `an undefined step for a named, non-pending integration obligation must leave the scenario out-of-balance; got "${
        scenario.verdict
      }" (row: ${JSON.stringify(scenario)})`
    );
    const missing = scenario.reconcilingItems.filter(
      (o) => o.qualityCheck === "integration" && o.outcome === "missing"
    );
    assert.equal(
      missing.length,
      1,
      `the integration obligation must be the scenario's one missing reconciling item; got ${
        missing.length
      } (reconcilingItems: ${JSON.stringify(scenario.reconcilingItems)})`
    );
  }
);

Then(
  "the scenario raises no Pending Item — the undefined step is not excused as pending",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDA-001");
    assert.ok(scenario, "expected the named fixture scenario (SCN-PDA-001)");
    assert.deepEqual(
      scenario.pendingItems,
      [],
      `an undefined step with no <qc>pending deferral must raise no Pending Item — it is not excused as pending; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
  }
);

const VITEST_INCONCLUSIVE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/vitest-inconclusive-classification.feature"
);

let vitestClassificationResult: string;
let vitestClassificationScenarios: Scenario[];
let vitestClassificationReport: VitestJsonReport;

Given(
  "a planted unit evidence obligation and a vitest report whose assertion status is {string}",
  function (result: string) {
    vitestClassificationResult = result;
    const source = readFileSync(VITEST_INCONCLUSIVE_FIXTURE, "utf8");
    vitestClassificationScenarios = parseScenarios(source);
    vitestClassificationReport = {
      testResults: [
        {
          name: "packages/core/src/parse/vitest-inconclusive.test.ts",
          assertionResults: [{ fullName: "[SCN-PDV-001] a named unit obligation", status: result }],
        },
      ],
    };
  }
);

When(
  "the vitest reader parses the report and the reconciler reconciles the obligation",
  function () {
    const observations = parseVitestEvidenceObservations(vitestClassificationReport, "unit");
    reconciliation = reconcile(vitestClassificationScenarios, observations);
  }
);

Then(
  "the unit evidence obligation reconciles {string}",
  function (outcome: string) {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDV-001");
    assert.ok(scenario, "expected the named fixture scenario (SCN-PDV-001)");
    const unitOutcomes = scenario.qualityCheckReconciliations.filter((o) => o.qualityCheck === "unit");
    assert.equal(
      unitOutcomes.length,
      1,
      `expected exactly one reconciled unit obligation on SCN-PDV-001; got ${
        unitOutcomes.length
      } (${JSON.stringify(scenario.qualityCheckReconciliations)})`
    );
    assert.equal(
      unitOutcomes[0]!.outcome,
      outcome,
      `the named unit obligation for a "${vitestClassificationResult}" observation must reconcile "${outcome}"; got "${
        unitOutcomes[0]!.outcome
      }" (row: ${JSON.stringify(scenario)})`
    );
  }
);

const COMMUNITY_TAGS_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/community-tags.feature"
);
const COMMUNITY_TAG_TO_SCN: Record<string, string> = {
  "@wip": "SCN-PDW-001",
  "@ignore": "SCN-PDW-002",
  "@skip": "SCN-PDW-003",
  "@todo": "SCN-PDW-004",
  "@pending": "SCN-PDW-005",
};
let communityTag: string;
let communityScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying the community tag {string} alongside a `@unit` and an `@integration` obligation",
  function (tag: string) {
    communityTag = tag;
  }
);

When(
  "the parser derives the scenario's evidence obligations and the reconciler reconciles it against no observation",
  function () {
    const scnId = COMMUNITY_TAG_TO_SCN[communityTag];
    assert.ok(scnId, `unexpected community tag "${communityTag}"`);
    const source = readFileSync(COMMUNITY_TAGS_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    communityScenario = scenarios.find((s) => s.scnId === scnId);
    assert.ok(communityScenario, `expected the planted fixture scenario ${scnId} to parse`);
    reconciliation = reconcile([communityScenario], []);
  }
);

Then(
  "both the unit and integration evidence obligations are deferred — pending, overriding their observation-derived outcome",
  function () {
    const obligations = communityScenario!.evidenceObligations;
    const unit = obligations.find((o) => o.qualityCheck === "unit");
    const integration = obligations.find((o) => o.qualityCheck === "integration");
    assert.ok(
      unit && unit.pending === true,
      `expected a pending unit obligation on the ${communityTag} scenario; got ${JSON.stringify(obligations)}`
    );
    assert.ok(
      integration && integration.pending === true,
      `expected a pending integration obligation on the ${communityTag} scenario; got ${JSON.stringify(obligations)}`
    );
  }
);

Then(
  "the scenario raises two Pending Items and has verdict balanced — no reconciling item",
  function () {
    const [row] = reconciliation.scenarioReconciliations;
    assert.ok(row, "expected exactly one reconciled scenario row");
    const pendingCount = (row.pendingItems ?? []).length;
    assert.equal(
      pendingCount,
      2,
      `the ${communityTag} scenario must raise two Pending Items (both deferred obligations); got ${pendingCount} (row: ${JSON.stringify(row)})`
    );
    assert.equal(
      row.verdict,
      "balanced",
      `a scenario whose only exceptions are Pending Items is balanced; got "${row.verdict}" (row: ${JSON.stringify(row)})`
    );
    assert.equal(
      row.reconcilingItems.length,
      0,
      `no reconciling item may be named — the deferred obligations are Pending Items, not errors; got ${JSON.stringify(row.reconcilingItems)}`
    );
  }
);

const OBLIGATION_SCOPE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/obligation-scope.feature"
);

let obligationScopeScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying `@unit @integrationpending` and NO community deferral tag, with a passing unit observation citing it",
  function () {
  }
);

When(
  "the parser derives the scenario's evidence obligations and the reconciler reconciles it against that passing unit observation",
  function () {
    const source = readFileSync(OBLIGATION_SCOPE_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    obligationScopeScenario = scenarios.find((s) => s.scnId === "SCN-PDO-001");
    assert.ok(obligationScopeScenario, "expected the planted fixture scenario SCN-PDO-001 to parse");
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDO-001",
      status: "passed",
    };
    reconciliation = reconcile([obligationScopeScenario], [passingUnit]);
  }
);

Then(
  "only the integration obligation is deferred pending — the bare unit obligation is not, so the `@integrationpending` scope is the single check",
  function () {
    const obligations = obligationScopeScenario!.evidenceObligations;
    const unit = obligations.find((o) => o.qualityCheck === "unit");
    const integration = obligations.find((o) => o.qualityCheck === "integration");
    assert.ok(
      unit && unit.pending === undefined,
      `the bare @unit obligation must NOT be deferred (obligation-scope, not scenario-scope); got ${JSON.stringify(obligations)}`
    );
    assert.ok(
      integration && integration.pending === true,
      `the @integrationpending obligation must be deferred pending; got ${JSON.stringify(obligations)}`
    );
  }
);

Then(
  "the unit obligation reconciles satisfied and the deferred integration one is the scenario's single Pending Item — verdict balanced, no reconciling item",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDO-001");
    assert.ok(scenario, "expected the reconciled fixture scenario (SCN-PDO-001)");
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [
        {
          qualityCheck: "unit",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "unit" },
          evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PDO-001", status: "passed" },
        },
      ],
      `the un-deferred unit obligation must reconcile satisfied as the sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the deferred integration obligation must be the scenario's single Pending Item; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
    assert.equal(
      scenario.verdict,
      "balanced",
      `the obligation-scope scenario must have verdict balanced; got "${scenario.verdict}" (row: ${JSON.stringify(scenario)})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `no reconciling item may be named — the deferred integration is a Pending Item, the unit is satisfied; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
  }
);

const COMPOSE_SCOPE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/compose-scope.feature"
);

let composeScopeScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying `@wip` over a bare `@unit` and an obligation-scope `@integrationpending`",
  function () {
  }
);

When(
  "the parser derives the composition scenario's evidence obligations and the reconciler reconciles it against no observation",
  function () {
    const source = readFileSync(COMPOSE_SCOPE_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    composeScopeScenario = scenarios.find((s) => s.scnId === "SCN-PDP-001");
    assert.ok(composeScopeScenario, "expected the planted fixture scenario SCN-PDP-001 to parse");
    reconciliation = reconcile([composeScopeScenario], []);
  }
);

Then(
  "the unit obligation is deferred by the scenario-scope `@wip` and the integration obligation by the obligation-scope `@integrationpending` — both pending, one from each source",
  function () {
    const obligations = composeScopeScenario!.evidenceObligations;
    const unit = obligations.find((o) => o.qualityCheck === "unit");
    const integration = obligations.find((o) => o.qualityCheck === "integration");
    assert.ok(
      unit && unit.pending === true,
      `the bare @unit obligation must be deferred by the scenario-scope @wip; got ${JSON.stringify(obligations)}`
    );
    assert.ok(
      integration && integration.pending === true,
      `the @integration obligation must be deferred by the obligation-scope @integrationpending (and @wip); got ${JSON.stringify(obligations)}`
    );
  }
);

Then(
  "the scenario raises two Pending Items and has verdict balanced — no reconciling item, the two deferral sources composing without interference",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDP-001");
    assert.ok(scenario, "expected the reconciled fixture scenario (SCN-PDP-001)");
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      `both deferred obligations must be Pending Items, one from each source; got ${JSON.stringify(
        scenario.pendingItems
      )}`
    );
    assert.equal(
      scenario.verdict,
      "balanced",
      `a scenario whose only exceptions are Pending Items is balanced; got "${scenario.verdict}" (row: ${JSON.stringify(scenario)})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `no reconciling item may be named — both deferred obligations are Pending Items, not errors; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [],
      `no obligation reconciles — both are partitioned off as Pending Items; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
  }
);

const OVERRIDE_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/deferral-overrides-observation.feature"
);

let filteredOutScenario: ScenarioReconciliation | undefined;
let pendingStatusScenario: ScenarioReconciliation | undefined;

Given(
  "a planted fixture — a `@skip @integration` scenario filtered out of the run, and a `@wip @integration` scenario reporting a cucumber pending status",
  function () {
  }
);

When(
  "the parser derives each scenario's obligations and the reconciler reconciles each against its observation side — the filtered-out one against no observation, the pending-status one against the reader's dropped output",
  function () {
    const source = readFileSync(OVERRIDE_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    const filteredOut = scenarios.find((s) => s.scnId === "SCN-PDF-001");
    const pendingStatus = scenarios.find((s) => s.scnId === "SCN-PDF-002");
    assert.ok(filteredOut, "expected the planted filtered-out fixture scenario (SCN-PDF-001)");
    assert.ok(pendingStatus, "expected the planted pending-status fixture scenario (SCN-PDF-002)");

    const filteredOutReconciliation = reconcile([filteredOut], []);
    filteredOutScenario = filteredOutReconciliation.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PDF-001"
    );

    const pendingStatusReport: CucumberJsonReport = [
      {
        uri: "features/deferral-overrides-observation.feature",
        elements: [
          {
            tags: [{ name: "@wip" }, { name: "@integration" }, { name: "@SCN-PDF-002" }],
            steps: [{ result: { status: "pending" } }],
          },
        ],
      },
    ];
    const droppedObservations = parseCucumberEvidenceObservations(pendingStatusReport, "integration");
    assert.deepEqual(
      droppedObservations,
      [],
      `the cucumber reader must DROP the pending-status step as inconclusive (missing by absence); got ${JSON.stringify(
        droppedObservations
      )}`
    );
    const pendingStatusReconciliation = reconcile([pendingStatus], droppedObservations);
    pendingStatusScenario = pendingStatusReconciliation.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PDF-002"
    );
  }
);

Then(
  "the filtered-out scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the absent observation",
  function () {
    assert.ok(filteredOutScenario, "expected the reconciled filtered-out row (SCN-PDF-001)");
    assert.deepEqual(
      filteredOutScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the filtered-out scenario's integration obligation must be a Pending Item; got ${JSON.stringify(
        filteredOutScenario.pendingItems
      )}`
    );
    const missing = filteredOutScenario.reconcilingItems.filter(
      (r) => r.qualityCheck === "integration" && r.outcome === "missing"
    );
    assert.equal(
      missing.length,
      0,
      `the deferral must override the absent observation — no missing reconciling item; got ${JSON.stringify(
        filteredOutScenario.reconcilingItems
      )}`
    );
  }
);

Then(
  "the pending-status scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the dropped observation",
  function () {
    assert.ok(pendingStatusScenario, "expected the reconciled pending-status row (SCN-PDF-002)");
    assert.deepEqual(
      pendingStatusScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the pending-status scenario's integration obligation must be a Pending Item; got ${JSON.stringify(
        pendingStatusScenario.pendingItems
      )}`
    );
    const missing = pendingStatusScenario.reconcilingItems.filter(
      (r) => r.qualityCheck === "integration" && r.outcome === "missing"
    );
    assert.equal(
      missing.length,
      0,
      `the deferral must override the dropped observation — no missing reconciling item; got ${JSON.stringify(
        pendingStatusScenario.reconcilingItems
      )}`
    );
  }
);

Then(
  "each scenario has verdict balanced and names no reconciling item — the pending flag governs regardless of the observation side",
  function () {
    for (const scenario of [filteredOutScenario, pendingStatusScenario]) {
      assert.ok(scenario, "expected both reconciled fixture rows");
      assert.equal(
        scenario.verdict,
        "balanced",
        `a scenario whose only exception is a Pending Item is balanced; got "${scenario.verdict}" (row: ${JSON.stringify(
          scenario
        )})`
      );
      assert.deepEqual(
        scenario.reconcilingItems,
        [],
        `no reconciling item may be named — the deferred obligation is a Pending Item, not an error; got ${JSON.stringify(
          scenario.reconcilingItems
        )}`
      );
      assert.deepEqual(
        scenario.qualityCheckReconciliations,
        [],
        `no obligation reconciles — the integration obligation is partitioned off as a Pending Item; got ${JSON.stringify(
          scenario.qualityCheckReconciliations
        )}`
      );
    }
  }
);

const UNRECOGNISED_TAG_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/unrecognised-tag.feature"
);

let unrecognisedTagScenario: Scenario | undefined;

Given(
  "a planted fixture scenario carrying an unrecognised `@foo` tag alongside a `@unit` evidence obligation, with a passing unit observation citing it",
  function () {
  }
);

When(
  "the parser derives the unrecognised-tag scenario's evidence obligations and the reconciler reconciles it against that passing unit observation",
  function () {
    const source = readFileSync(UNRECOGNISED_TAG_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source);
    unrecognisedTagScenario = scenarios.find((s) => s.scnId === "SCN-PDZ-001");
    assert.ok(unrecognisedTagScenario, "expected the planted fixture scenario SCN-PDZ-001 to parse");
    const passingUnit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-PDZ-001",
      status: "passed",
    };
    reconciliation = reconcile([unrecognisedTagScenario], [passingUnit]);
  }
);

Then(
  "the unit obligation is not deferred — the unrecognised tag carries no special meaning, so it has no pending flag",
  function () {
    const obligations = unrecognisedTagScenario!.evidenceObligations;
    assert.deepEqual(
      obligations,
      [{ qualityCheck: "unit" }],
      `the unrecognised @foo tag must defer nothing — the bare @unit obligation stays plain (no pending flag); got ${JSON.stringify(
        obligations
      )}`
    );
  }
);

Then(
  "the unit obligation reconciles satisfied and the scenario raises no Pending Item — verdict balanced, no reconciling item",
  function () {
    const scenario = reconciliation.scenarioReconciliations.find((s) => s.scnId === "SCN-PDZ-001");
    assert.ok(scenario, "expected the reconciled fixture scenario (SCN-PDZ-001)");
    assert.deepEqual(
      scenario.qualityCheckReconciliations,
      [
        {
          qualityCheck: "unit",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "unit" },
          evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PDZ-001", status: "passed" },
        },
      ],
      `the un-deferred unit obligation must reconcile satisfied as the sole reconciled evidence obligation; got ${JSON.stringify(
        scenario.qualityCheckReconciliations
      )}`
    );
    assert.deepEqual(
      scenario.pendingItems ?? [],
      [],
      `an unrecognised tag must raise NO Pending Item; got ${JSON.stringify(scenario.pendingItems)}`
    );
    assert.equal(
      scenario.verdict,
      "balanced",
      `the negative-boundary scenario must have verdict balanced; got "${scenario.verdict}" (row: ${JSON.stringify(
        scenario
      )})`
    );
    assert.deepEqual(
      scenario.reconcilingItems,
      [],
      `no reconciling item may be named — the unit obligation reconciles satisfied on its observation; got ${JSON.stringify(
        scenario.reconcilingItems
      )}`
    );
  }
);

const CONFIG_EXTENDS_FIXTURE = join(process.cwd(), "tests/fixtures/pending-tags/config-extends");

let configuredScenario: ScenarioReconciliation | undefined;
let builtinScenario: ScenarioReconciliation | undefined;

Given(
  'a planted target repo whose package.json configures the deferral tag "@deferred", alongside a feature carrying a `@deferred @integration` scenario and a built-in `@wip @integration` one',
  function () {
  }
);

When(
  "the balance reconciler ingests the target — reading specController.deferralTags from its package.json and threading the extended set through the parser",
  function () {
    const reconciliation = runReconcile({
      features: join(CONFIG_EXTENDS_FIXTURE, "features"),
      packageJson: join(CONFIG_EXTENDS_FIXTURE, "package.json"),
    });
    configuredScenario = reconciliation.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-CFG-001");
    builtinScenario = reconciliation.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-CFG-002");
  }
);

Then(
  "the project-configured `@deferred` scenario's integration obligation is a Pending Item — deferred like a built-in, verdict balanced, no reconciling item",
  function () {
    assert.ok(configuredScenario, "expected the reconciled configured-tag row (SCN-CFG-001)");
    assert.deepEqual(
      configuredScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the @deferred scenario's integration obligation must be a Pending Item (config defers it like a built-in); got ${JSON.stringify(
        configuredScenario.pendingItems
      )}`
    );
    assert.equal(
      configuredScenario.verdict,
      "balanced",
      `the configured-tag scenario must be balanced (its only exception is a Pending Item); got "${configuredScenario.verdict}" (row: ${JSON.stringify(
        configuredScenario
      )})`
    );
    assert.deepEqual(
      configuredScenario.reconcilingItems,
      [],
      `no reconciling item may be named — the configured deferral makes the integration obligation a Pending Item, not a missing error; got ${JSON.stringify(
        configuredScenario.reconcilingItems
      )}`
    );
  }
);

Then(
  "the built-in `@wip` scenario still defers its integration obligation as a Pending Item — config extends the recognised set, never replaces it",
  function () {
    assert.ok(builtinScenario, "expected the reconciled built-in-tag row (SCN-CFG-002)");
    assert.deepEqual(
      builtinScenario.pendingItems ?? [],
      [{ qualityCheck: "integration" }],
      `the built-in @wip scenario must still defer its integration obligation as a Pending Item (config extends, never replaces); got ${JSON.stringify(
        builtinScenario.pendingItems
      )}`
    );
    assert.equal(
      builtinScenario.verdict,
      "balanced",
      `the built-in-tag scenario must be balanced; got "${builtinScenario.verdict}" (row: ${JSON.stringify(
        builtinScenario
      )})`
    );
    assert.deepEqual(
      builtinScenario.reconcilingItems,
      [],
      `no reconciling item may be named — the built-in deferral makes the integration obligation a Pending Item; got ${JSON.stringify(
        builtinScenario.reconcilingItems
      )}`
    );
  }
);

const NO_OBLIGATIONS_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/scenario-scope-no-obligations.feature"
);
let noObligationsReport: string;
let noObligationsRow: ScenarioReconciliation | undefined;

Given(
  "a planted fixture scenario carrying a bare `@wip` deferral tag and raising no evidence obligations",
  function () {
  }
);

When(
  "the parser derives its obligations and the reconciler and renderer run the full pipeline over it",
  function () {
    const source = readFileSync(NO_OBLIGATIONS_FIXTURE, "utf8");
    const scenarios: Scenario[] = parseScenarios(source, DEFAULT_DEFERRAL_TAGS);
    const rec = reconcile(scenarios, []);
    noObligationsRow = rec.scenarioReconciliations.find((r) => r.scnId === "SCN-PDX-001");
    const ctx: RunContext = {
      target: "no-obligations-fixture",
      inputs: {},
      runStart: new Date("2026-07-10T00:00:00.000Z"),
      sourceSha: null,
    };
    noObligationsReport = renderMarkdown(pendingConcept(rec), ctx);
  }
);

Then(
  "the scenario synthesises one scenario-scope Pending Item and has verdict balanced — not the both-missing out-of-balance row",
  function () {
    const row = noObligationsRow;
    assert.ok(row, "expected the bare-@wip scenario to reconcile to a row");
    assert.equal(
      (row.pendingItems ?? []).length,
      1,
      `the bare-@wip scenario must synthesise exactly one scenario-scope Pending Item; got ${JSON.stringify(row.pendingItems)}`
    );
    assert.equal(
      row.pendingItems[0]!.qualityCheck,
      undefined,
      `the synthesised Pending Item is scenario-scope — no specific quality-check; got ${JSON.stringify(row.pendingItems[0])}`
    );
    assert.equal(
      row.verdict,
      "balanced",
      `a deferred scenario is balanced-with-pending, not out-of-balance; got "${row.verdict}" (row: ${JSON.stringify(row)})`
    );
    assert.equal(
      row.qualityCheckReconciliations.filter((o) => o.outcome === "both-missing").length,
      0,
      `the deferred scenario must NOT post a both-missing row; got ${JSON.stringify(row.qualityCheckReconciliations)}`
    );
  }
);

Then(
  "the rendered row shows a check-less `⏳ pending` marker — scenario-scope, naming no specific quality-check",
  function () {
    const row = rowFor(noObligationsReport, "SCN-PDX-001");
    assert.match(
      row,
      /⏳ pending(?![:\w])/,
      `the scenario-scope Pending Item must render a check-less ⏳ pending; got: ${row}`
    );
    assert.doesNotMatch(
      row,
      /⏳ pending:/,
      `a scenario-scope Pending Item names no quality-check — no "pending: <check>"; got: ${row}`
    );
    assert.match(row, /✓ balanced/, `the deferred scenario reads balanced; got: ${row}`);
  }
);
