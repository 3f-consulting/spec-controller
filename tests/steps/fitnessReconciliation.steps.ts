import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseScenarios, evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { renderMarkdown, runningStaticChecks, hasBrokenEvidence } from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObservation, Ledger } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceReconciliation } from "../../packages/core/src/domain/evidenceReconciliation.js";
import { citationOfCitedRow } from "../../packages/core/src/parse/fitnessCitations.js";
import {
  isFitnessObservation,
  ciRunSteps,
  SCN_ID_SOURCE,
} from "@3f-consulting/spec-controller-core/internal";
import { parseTaggedScenarios } from "../../packages/core/src/parse/scenarios.js";
import type { CiStepRecord } from "../../packages/core/src/parse/ciStepRecord.js";

import { evidenceReconciliationFromSources } from "@3f-consulting/spec-controller-core";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;

const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

let corpusSource: string;

let fitnessCorpus: string;
let fitnessLedger: Ledger;

let plantedCiSource: string;
let plantedScripts: PackageJsonScripts;

let unitCredit: EvidenceObservation;

const CITED_SCRIPT = "lint:feature-codes";

function rowCells(scnId: string): { verdict: string; items: string } {
  const ledgerStart = markdown.indexOf("## Scenario Reconciliations");
  const ledger = ledgerStart >= 0 ? markdown.slice(ledgerStart) : markdown;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").map((c) => c.trim());
    return cells[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${markdown}`);
  const cells = row.split("|").map((c) => c.trim());
  return { verdict: cells[2] ?? "", items: cells[3] ?? "" };
}

Given("a configured row names the scenario the retired tag sits on", function () {
});

function citedScnIdsIn(ciSource: string): string[] {
  return ciSource
    .split(/\r?\n/)
    .map((line) => /^\s*id:\s*(\S+)\s*$/.exec(line.trimEnd())?.[1])
    .filter((id): id is string => id !== undefined && new RegExp(`^${SCN_ID_SOURCE}$`).test(id));
}

Given("that scenario also carries the unit tier tag", function () {
  fitnessCorpus = [
    "@LNT",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @fitness @SCN-AAA-001",
    "    Scenario: the tree stays inside this check's threshold",
  ].join("\n");
});

Given("the unit test for that scenario passes", function () {
  unitCredit = { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" };
});

When("the fitness check and the unit result are observed and reconciled", function () {
  scenarios = parseScenarios(fitnessCorpus);
  evidenceObservations = [unitCredit];

  const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false);
  fitnessLedger = reconciliation.ledger;
  markdown = renderMarkdown(reconciliation, CTX);
});

Given(
  "a scenario tagged with the retired @lint= form naming the runnable handle {string}",
  function (handle: string) {
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the retired form is inert",
      `    @lint=${handle} @SCN-AAA-003`,
      "    Scenario: a behavioural scenario still spelling the retired form",
      "      Given the target source",
    ].join("\n");
  }
);

Given("a @fitness scenario {string}", function (scn: string) {
  assert.equal(scn, "SCN-AAA-001", "the fixture's two-axis scenario is SCN-AAA-001");
});

Given("a @fitness scenario in the corpus carries a different @SCN entirely", function () {
  fitnessCorpus = [
    "@LNT",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @fitness @SCN-AAA-002",
    "    Scenario: a scenario answering a different configured row entirely",
  ].join("\n");
});

Given(
  "a CI step names {string} as answering {string}",
  function (script: string, scn: string) {
    plantedCiSource = [
      "name: CI",
      "jobs:",
      "  ci:",
      "    steps:",
      `      - id: ${scn}`,
      `        run: pnpm ${script}`,
    ].join("\n");
    plantedScripts = { scripts: { [script]: `tsx ${script}.ts` } };
  }
);

When("the fitness check citing an @SCN is observed and reconciled", function () {
  scenarios = parseScenarios(fitnessCorpus);
  evidenceObservations = runningStaticChecks(
    [plantedCiSource],
    plantedScripts,
    NO_RUNNERS,
    (_script, citedByStep) => citationOfCitedRow(citedByStep)
  );

  const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false);
  fitnessLedger = reconciliation.ledger;
  markdown = renderMarkdown(reconciliation, CTX);
});

let lnt018Scns: [string, string];

function lnt018Corpus(hoisted: boolean): string {
  const [first, second] = lnt018Scns;
  return [
    "@FIT",
    "Feature: fitness",
    ...(hoisted ? ["  @fitness"] : []),
    "  Rule: the first check's rule",
    `    @fitness @${first}`,
    "    Scenario: the first check holds",
    "  Rule: the second check's rule",
    `    @fitness @${second}`,
    "    Scenario: the second check holds",
  ].join("\n");
}

Given(
  "two @fitness scenarios {string} and {string}, and no manifest entry naming either",
  function (first: string, second: string) {
    lnt018Scns = [first, second];
    corpusSource = lnt018Corpus(false);
  }
);

Given("the axis tag reaches {string} a second time, hoisted onto its Rule", function (scn: string) {
  assert.equal(scn, lnt018Scns[0], "the fixture hoists the axis tag above the first scenario");
  corpusSource = lnt018Corpus(true);
});

When("the scenario corpus is read", function () {
  scenarios = parseScenarios(corpusSource);
});

Then(
  "each scenario raises exactly one Evidence Obligation, at the quality check {string}, and nothing else",
  function (qualityCheck: string) {
    assert.deepEqual(
      scenarios.map((scenario) => [scenario.scnId, scenario.evidenceObligations]),
      lnt018Scns.map((scnId) => [scnId, [{ qualityCheck }]]),
      `expected each @fitness scenario to raise ONE "${qualityCheck}" Evidence Obligation keyed by ` +
        `its own @SCN and carrying nothing else; got ${JSON.stringify(scenarios)}`
    );
  }
);

Then(
  "the scenario raises no Evidence Obligation at all — the retired form names nothing",
  function () {
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [[]],
      `expected the retired @lint= form to raise NO Evidence Obligation — it supplies no citation, ` +
        `so anything it raised could never be credited and would read missing for ever; ` +
        `got ${JSON.stringify(scenarios)}`
    );
  }
);

Then(
  "the second fitness scenario reconciles missing, naming the check {string}",
  function (check: string) {
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-002");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "missing"]],
      `expected one missing reconciling item naming "${check}"; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );
    assert.equal(
      row?.qualityCheckReconciliations?.[0]?.evidenceObservation,
      undefined,
      "expected the runner-up's missing item to carry no Evidence Observation"
    );
    assert.deepEqual(
      row?.evidenceObservations,
      [],
      "expected NO credit to post to the runner-up's row"
    );

    const { verdict, items } = rowCells("SCN-AAA-002");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the runner-up's verdict cell to read out-of-balance for "${check}"; got "${verdict}"`
    );
    assert.match(
      items,
      /fitness .*missing/,
      `expected the fitness missing reconciling item for "${check}"; got "${items}"`
    );
    assert.match(items, /∅/, `expected the missing item to carry the ∅ glyph; got "${items}"`);
  }
);

function assertPhantomRowRendered(scnId: string, script: string): void {
  const { verdict, items } = rowCells(scnId);
  assert.match(
    verdict,
    /out-of-balance/,
    `expected the phantom row's verdict cell to read out-of-balance; got "${verdict}"`
  );
  assert.match(
    items,
    /fitness .*Evidence Observation cites an unknown Scenario/,
    `expected the phantom row to carry the fitness cites-unknown-scenario item; got "${items}"`
  );
  assert.match(items, /👻/, `expected the phantom item to carry the 👻 glyph; got "${items}"`);
  assert.match(
    items,
    new RegExp(`\\(${script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`),
    `expected the phantom item to name the check that ran; got "${items}"`
  );
}

Then(
  "the run's credit posts to a phantom row for the @SCN it cited, naming the check {string}",
  function (script: string) {
    const observation = evidenceObservations.find(
      (o) => isFitnessObservation(o) && o.staticCheck === script
    );
    assert.equal(
      observation?.scnId,
      "SCN-AAA-001",
      `expected the run to carry the @SCN it was stamped with; got ${JSON.stringify(observation)}`
    );

    const phantom = fitnessLedger.scenarioReconciliations.find(
      (row) => row.kind === "phantom-scenario"
    );
    assert.equal(phantom?.scnId, "SCN-AAA-001", "expected a phantom row for the cited @SCN");
    assert.deepEqual(phantom?.evidenceObligations, [], "expected the phantom row to raise nothing");
    assert.deepEqual(
      (phantom?.qualityCheckReconciliations ?? []).map((item) => [
        item.qualityCheck,
        item.staticCheck,
        item.outcome,
      ]),
      [["fitness", script, "cites-unknown-scenario"]],
      `expected one cites-unknown-scenario item naming "${script}"; got ${JSON.stringify(phantom?.qualityCheckReconciliations)}`
    );

    assertPhantomRowRendered("SCN-AAA-001", script);
  }
);

Then("no scenario's row holds that credit", function () {
  const observation = evidenceObservations.find(
    (o) => isFitnessObservation(o) && o.staticCheck === CITED_SCRIPT
  );
  assert.ok(observation, `expected an observation of the running check "${CITED_SCRIPT}"`);
  assert.deepEqual(
    fitnessLedger.scenarioReconciliations
      .filter((row) => row.evidenceObservations.includes(observation))
      .map((row) => [row.kind, row.scnId]),
    [["phantom-scenario", "SCN-AAA-001"]],
    "expected the credit to post to the phantom row and to no other"
  );
});

Then(
  "the scenario's fitness obligation reconciles missing",
  function () {
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
    const item = (row?.qualityCheckReconciliations ?? []).find((i) => i.qualityCheck === "fitness");
    assert.deepEqual(
      [item?.qualityCheck, item?.outcome, item?.evidenceObligation],
      ["fitness", "missing", { qualityCheck: "fitness" }],
      `expected the fitness obligation to reconcile missing; got ${JSON.stringify(item)}`
    );
    assert.equal(
      item?.evidenceObservation,
      undefined,
      `expected the missing fitness item to carry no Evidence Observation; got ${JSON.stringify(item?.evidenceObservation)}`
    );

    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the verdict cell to read out-of-balance for the unobserved check; got "${verdict}"`
    );
    assert.match(
      items,
      /fitness .*missing/,
      `expected the fitness missing reconciling item; got "${items}"`
    );
    assert.match(items, /∅/, `expected the missing item to carry the ∅ glyph; got "${items}"`);
  }
);

Then("its unit obligation reconciles satisfied, omitted from the reconciling items", function () {
  const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
  assert.deepEqual(
    (row?.qualityCheckReconciliations ?? []).find((i) => i.qualityCheck === "unit"),
    {
      qualityCheck: "unit",
      outcome: "satisfied",
      evidenceObligation: { qualityCheck: "unit" },
      evidenceObservation: unitCredit,
    },
    `expected the unit obligation to be answered by the unit credit; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
  );
  assert.equal(
    row?.qualityCheckReconciliations?.length,
    2,
    `expected exactly one reconciling reading per axis; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
  );

  assert.deepEqual(
    (row?.reconcilingItems ?? []).map((i) => i.qualityCheck),
    ["fitness"],
    `expected only the fitness item to remain reconciling; got ${JSON.stringify(row?.reconcilingItems)}`
  );
  const { items } = rowCells("SCN-AAA-001");
  assert.doesNotMatch(
    items,
    /\bunit\b/,
    `expected the balanced unit obligation to be OMITTED from the reconciling items; got "${items}"`
  );
});

function assertSuspenseRowRendered(script: string): void {
  const { verdict, items } = rowCells("(no scenario)");
  assert.match(
    verdict,
    /out-of-balance/,
    `expected the suspense row's verdict cell to read out-of-balance; got "${verdict}"`
  );
  assert.match(
    items,
    /fitness .*Evidence Observation cites no Scenario/,
    `expected the suspense row to carry the fitness cites-no-scenario item; got "${items}"`
  );
  assert.match(
    items,
    new RegExp(`\\(${script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`),
    `expected the suspense item to name the check that ran; got "${items}"`
  );
}

Then(
  "the run of {string} cites no scenario and its credit posts to suspense",
  function (script: string) {
    const observation = evidenceObservations
      .filter(isFitnessObservation)
      .find((o) => o.staticCheck === script);
    assert.ok(observation, `expected a run of ${script} to be observed over the real CI config`);
    assert.equal(
      observation.scnId,
      undefined,
      `expected ${script}'s run to cite no scenario; got ${JSON.stringify(observation)}`
    );

    assert.deepEqual(
      fitnessLedger.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation))
        .map((row) => row.kind),
      ["suspense-scenario"],
      `expected ${script}'s credit to post to the suspense row and to no other`
    );

    const suspense = fitnessLedger.scenarioReconciliations.find(
      (row) => row.kind === "suspense-scenario"
    );
    assert.ok(
      (suspense?.qualityCheckReconciliations ?? []).some(
        (item) => item.staticCheck === script && item.outcome === "cites-no-scenario"
      ),
      `expected a cites-no-scenario item naming ${script}; got ${JSON.stringify(suspense?.qualityCheckReconciliations)}`
    );

    assertSuspenseRowRendered(script);
  }
);

Then(
  "the third fitness scenario reconciles satisfied for {string} alone, absorbing no credit meant for another row",
  function (check: string) {
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-003");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "satisfied"]],
      `expected SCN-AAA-003 to reconcile satisfied for "${check}" and nothing else; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );

    assert.deepEqual(
      (row?.evidenceObservations ?? []).map(
        (observation) => (observation as { staticCheck?: string }).staticCheck
      ),
      ["lint:feature-codes"],
      `expected only the run citing this @SCN to credit SCN-AAA-003; got ${JSON.stringify(row?.evidenceObservations)}`
    );

    const { verdict, items } = rowCells("SCN-AAA-003");
    assert.match(verdict, /\bbalanced\b/, `expected a balanced verdict cell; got "${verdict}"`);
    assert.doesNotMatch(verdict, /out-of-balance/, `expected not out-of-balance; got "${verdict}"`);
    assert.equal(items, "—", `expected no reconciling items on SCN-AAA-003; got "${items}"`);
  }
);

let halfConvertedOpts: { features: string; ci: string; packageJson: string };
let halfConvertedReconciliation: EvidenceReconciliation;

Given(
  "a target's corpus carries two scenarios on the fitness axis and only the first is cited by anything its CI ran",
  function () {
    const fixture = join(process.cwd(), "tests/fixtures/scn-lnt-020");
    halfConvertedOpts = {
      features: join(fixture, "features"),
      ci: join(fixture, "ci.yml"),
      packageJson: join(fixture, "package.json"),
    };
    const source = readFileSync(join(halfConvertedOpts.features, "target.feature"), "utf8");
    assert.deepEqual(
      parseTaggedScenarios(source)
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-HCV-001", "SCN-HCV-002"],
      "expected the planted corpus to carry exactly two scenarios on the fitness axis"
    );
    assert.deepEqual(
      readFileSync(halfConvertedOpts.ci, "utf8")
        .split(/\r?\n/)
        .map((line) => /^\s*id:\s*(\S+)\s*$/.exec(line.trimEnd())?.[1])
        .filter((id): id is string => id !== undefined),
      ["SCN-HCV-001"],
      "expected the planted pipeline to state the FIRST scenario's @SCN and no other"
    );
  }
);

When("that target's evidence is reconciled", function () {
  halfConvertedReconciliation = runReconcile(halfConvertedOpts);
  markdown = renderMarkdown(halfConvertedReconciliation, CTX);
});

Then(
  "the first reads satisfied, the second's fitness Evidence Obligation reads missing, its row is out of balance, and nothing on the report names it a second time",
  function () {
    const rows = halfConvertedReconciliation.ledger.scenarioReconciliations;
    const cited = rows.find((row) => row.scnId === "SCN-HCV-001");
    const uncited = rows.find((row) => row.scnId === "SCN-HCV-002");

    for (const [scnId, row] of [
      ["SCN-HCV-001", cited],
      ["SCN-HCV-002", uncited],
    ] as const) {
      assert.deepEqual(
        row?.evidenceObligations,
        [{ qualityCheck: "fitness" }],
        `expected ${scnId} to raise its fitness Evidence Obligation from its TAG; ` +
          `got ${JSON.stringify(row?.evidenceObligations)}`
      );
    }

    assert.deepEqual(
      (cited?.qualityCheckReconciliations ?? []).map((item) => item.outcome),
      ["satisfied"],
      `expected the cited scenario to be answered by its own step; got ${JSON.stringify(cited?.qualityCheckReconciliations)}`
    );
    assert.equal(cited?.verdict, "balanced", "expected the cited scenario's row to balance");

    assert.deepEqual(
      (uncited?.reconcilingItems ?? []).map((item) => item.outcome),
      ["missing"],
      `expected the uncited scenario's obligation to reconcile MISSING; got ${JSON.stringify(uncited?.reconcilingItems)}`
    );
    assert.equal(
      uncited?.verdict,
      "out-of-balance",
      "expected the uncited scenario's row to be out of balance"
    );

    assert.doesNotMatch(
      markdown.replace(/\s+/g, " "),
      /no configured row names/,
      `expected no census line naming a scenario no entry declares; got:\n${markdown}`
    );
  }
);

let annotatedFixture: string;
let annotatedCiSource: string;
let annotatedReconciliation: EvidenceReconciliation;

Given(
  "a target whose CI runs a check for each of the two @fitness scenarios its corpus carries",
  function () {
    annotatedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-031");
    assert.deepEqual(
      parseTaggedScenarios(
        readFileSync(join(annotatedFixture, "features/target.feature"), "utf8")
      )
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-001", "SCN-CVT-002"],
      "expected two @fitness scenarios, one per check the planted pipeline runs"
    );
    annotatedCiSource = readFileSync(join(annotatedFixture, "ci.yml"), "utf8");
    assert.deepEqual(
      ciRunSteps([annotatedCiSource]).map((step) => step.command),
      ["pnpm lint:alpha", "pnpm lint:beta"],
      "expected the planted workflow to invoke each row's own script from a plain run: step"
    );
  }
);

Given("only the first check's step states the @SCN of the scenario it answers", function () {
  assert.deepEqual(
    ciRunSteps([annotatedCiSource]).map((step) => [step.command, step.id]),
    [
      ["pnpm lint:alpha", "SCN-CVT-001"],
      ["pnpm lint:beta", undefined],
    ],
    "expected the first check's step to state its scenario's @SCN and the second to state none"
  );
});

When(
  "that target's evidence is reconciled from its manifest, its corpus and its workflow",
  function () {
    annotatedReconciliation = evidenceReconciliationFromSources({
      featureSources: [
        readFileSync(join(annotatedFixture, "features/target.feature"), "utf8"),
      ],
      untaggedScenarios: [],
      packageJson: JSON.parse(
        readFileSync(join(annotatedFixture, "package.json"), "utf8")
      ) as PackageJsonScripts,
      ciSources: [annotatedCiSource],
      ciSourceNames: ["ci.yml"],
      runtimeObservations: [],
      deferralTags: [],
    });
  }
);

Then(
  "the first check's run credits the scenario its step names and that scenario balances, and the second run cites no scenario",
  function () {
    assert.deepEqual(
      annotatedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied"]]],
        ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "missing"]]],
        [
          "(no scenario)",
          "suspense-scenario",
          "out-of-balance",
          [["lint:beta", "cites-no-scenario"]],
        ],
      ],
      `expected the annotated check's credit on its own row and the unannotated one in suspense; ` +
        `got ${JSON.stringify(annotatedReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.deepEqual(
      annotatedReconciliation.ledger.scenarioReconciliations
        .find((row) => row.scnId === "SCN-CVT-001")
        ?.evidenceObservations.filter(isFitnessObservation)
        .map((observation) => [observation.staticCheck, observation.scnId]),
      [["lint:alpha", "SCN-CVT-001"]],
      "expected the credited run to carry the handle that ran and the @SCN its step states"
    );
  }
);

let failedStepFixture: string;
let failedStepRecord: CiStepRecord;
let failedStepReconciliation: EvidenceReconciliation;

Given(
  "a target whose corpus carries one @fitness scenario, with a CI step stating its @SCN",
  function () {
    failedStepFixture = join(process.cwd(), "tests/fixtures/scn-lnt-028");
    const manifest = JSON.parse(
      readFileSync(join(failedStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts;
    assert.deepEqual(
      parseTaggedScenarios(readFileSync(join(failedStepFixture, "features/target.feature"), "utf8"))
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-001"],
      "expected the planted corpus to carry exactly one @fitness scenario"
    );
    assert.deepEqual(
      citedScnIdsIn(readFileSync(join(failedStepFixture, "ci.yml"), "utf8")),
      ["SCN-CVT-001"],
      "expected the planted pipeline to state that scenario's @SCN on the step that answers it"
    );
    assert.deepEqual(
      runningStaticChecks(
        [readFileSync(join(failedStepFixture, "ci.yml"), "utf8")],
        manifest as PackageJsonScripts,
        NO_RUNNERS
      ).map((observation) => observation.staticCheck),
      ["Checkout", "Complexity", "Dump this run's step record"],
      "expected the derivation reader to see every step, so the isolation below is the composition's rather than a prefix rule's oversight"
    );
  }
);

Given(
  "its CI run's record says that check's step failed, on a record whose remaining step succeeded",
  function () {
    failedStepRecord = JSON.parse(
      readFileSync(join(failedStepFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    assert.deepEqual(
      Object.entries(failedStepRecord).map(([id, step]) => [id, step.outcome, step.conclusion]),
      [
        ["SCN-CVT-001", "failure", "failure"],
        ["dump-the-step-record", "success", "success"],
      ],
      "expected the check's step to have failed unlaundered, on a record whose remaining step succeeded"
    );
  }
);

When("that target's evidence is reconciled with what its CI run recorded", function () {
  failedStepReconciliation = evidenceReconciliationFromSources({
    featureSources: [readFileSync(join(failedStepFixture, "features/target.feature"), "utf8")],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(failedStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [readFileSync(join(failedStepFixture, "ci.yml"), "utf8")],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: failedStepRecord,
  });
});

Then(
  "that scenario's Evidence Obligation reads failing, carrying the observation of the step that failed it, and the run is out of balance rather than unsound",
  function () {
    assert.deepEqual(
      failedStepReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "failing"]]]],
      `expected the failed step's row to read failing; got ` +
        JSON.stringify(failedStepReconciliation.ledger.scenarioReconciliations)
    );
    assert.deepEqual(
      failedStepReconciliation.ledger.scenarioReconciliations
        .find((row) => row.scnId === "SCN-CVT-001")
        ?.evidenceObservations.filter(isFitnessObservation)
        .map((observation) => [observation.staticCheck, observation.scnId]),
      [["SCN-CVT-001", "SCN-CVT-001"]],
      "expected the failing row to carry the observation of the step that failed it"
    );
    assert.equal(
      hasBrokenEvidence(failedStepReconciliation.ledger),
      false,
      "expected a check that ran and found violations to leave the run sound"
    );
  }
);

let unannotatedFixture: string;
let unannotatedCiSource: string;
let unannotatedReconciliation: EvidenceReconciliation;

Given(
  "a target whose CI runs every static check its manifest holds, and states the code of none of them",
  function () {
    unannotatedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-029");
    const manifest = JSON.parse(
      readFileSync(join(unannotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    assert.deepEqual(
      citedScnIdsIn(readFileSync(join(unannotatedFixture, "ci.yml"), "utf8")),
      [],
      "expected a target whose pipeline states no @SCN at all"
    );
    unannotatedCiSource = readFileSync(join(unannotatedFixture, "ci.yml"), "utf8");
    assert.deepEqual(
      ciRunSteps([unannotatedCiSource]).map((step) => step.id),
      [undefined, undefined, undefined, undefined, undefined],
      "expected an unannotated pipeline — no CI step stating the code of anything"
    );
  }
);

Given(
  "that CI also checks out its tree, sets up its toolchain, installs its dependencies and builds it",
  function () {
    assert.deepEqual(
      ciRunSteps([unannotatedCiSource]).map((step) => step.command),
      [
        "pnpm install --frozen-lockfile",
        "pnpm build",
        "pnpm lint:alpha",
        "pnpm lint:beta",
        "pnpm typecheck",
      ],
      "expected the planted workflow to run its two non-check commands beside its three checks"
    );
    const manifest = JSON.parse(
      readFileSync(join(unannotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { staticChecks?: unknown; notChecks?: unknown } };
    assert.deepEqual(
      [Object.keys(manifest.scripts ?? {}).includes("build"), manifest.specController?.notChecks],
      [
        true,
        [
          "ci.yml:quality:Checkout",
          "ci.yml:quality:Set up Node",
          "ci.yml:quality:Install",
          "ci.yml:quality:Build",
        ],
      ],
      "expected `build` to be a real script of this manifest that the target names a non-check"
    );
  }
);

When("that target's evidence is reconciled from its manifest and its workflow", function () {
  unannotatedReconciliation = evidenceReconciliationFromSources({
    featureSources: [],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(unannotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [unannotatedCiSource],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
});

Then(
  "every check the pipeline ran is on the one suspense row citing no scenario, and the steps the target named non-checks are off the books",
  function () {
    assert.deepEqual(
      unannotatedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        [
          "(no scenario)",
          "suspense-scenario",
          "out-of-balance",
          [
            ["lint:alpha", "cites-no-scenario"],
            ["lint:beta", "cites-no-scenario"],
            ["typecheck", "cites-no-scenario"],
          ],
        ],
      ],
      `expected every check in suspense citing no scenario and no step but a check reported at all; ` +
        `got ${JSON.stringify(unannotatedReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.deepEqual(
      unannotatedReconciliation.ledger.scenarioReconciliations[0]?.evidenceObservations
        .filter(isFitnessObservation)
        .map((observation) => [observation.staticCheck, observation.scnId]),
      [
        ["lint:alpha", undefined],
        ["lint:beta", undefined],
        ["typecheck", undefined],
      ],
      "expected each uncited check to carry the handle that ran and no citation at all"
    );
  }
);

let swallowedRedFixture: string;
let swallowedRedRecord: CiStepRecord;
let swallowedRedReconciliation: EvidenceReconciliation;

Given(
  "a target whose corpus carries one @fitness scenario, with a CI step stating its @SCN, and whose CI lets that step red without failing the job",
  function () {
    swallowedRedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-030");
    const manifest = JSON.parse(
      readFileSync(join(swallowedRedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts;
    assert.deepEqual(
      parseTaggedScenarios(
        readFileSync(join(swallowedRedFixture, "features/target.feature"), "utf8")
      )
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-001"],
      "expected the planted corpus to carry exactly one @fitness scenario"
    );
    const ciSource = readFileSync(join(swallowedRedFixture, "ci.yml"), "utf8");
    assert.deepEqual(
      ciRunSteps([ciSource]).map((step) => [step.id, step.abortsJob]),
      [
        ["SCN-CVT-001", false],
        ["dump-the-step-record", true],
      ],
      "expected the planted workflow's check step to be one whose red its job swallows"
    );
    assert.deepEqual(
      runningStaticChecks([ciSource], manifest as PackageJsonScripts, NO_RUNNERS).map(
        (observation) => observation.staticCheck
      ),
      ["Checkout", "Complexity", "Dump this run's step record"],
      "expected the derivation reader to see every step, so the isolation below is the composition's rather than a prefix rule's oversight"
    );
  }
);

Given(
  "its CI run's record says that step failed, while the job it sat in was told it succeeded",
  function () {
    swallowedRedRecord = JSON.parse(
      readFileSync(join(swallowedRedFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    assert.deepEqual(
      Object.entries(swallowedRedRecord).map(([id, step]) => [id, step.outcome, step.conclusion]),
      [
        ["SCN-CVT-001", "failure", "success"],
        ["dump-the-step-record", "success", "success"],
      ],
      "expected the check's step to have failed while telling its job it succeeded"
    );
  }
);

When("that target's evidence is reconciled with the record that run wrote about itself", function () {
  swallowedRedReconciliation = evidenceReconciliationFromSources({
    featureSources: [readFileSync(join(swallowedRedFixture, "features/target.feature"), "utf8")],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(swallowedRedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [readFileSync(join(swallowedRedFixture, "ci.yml"), "utf8")],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: swallowedRedRecord,
  });
});

Then(
  "that scenario's Evidence Obligation reads failing off what the step did, and nothing is read off what the job was told",
  function () {
    assert.deepEqual(
      swallowedRedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "failing"]]]],
      `expected the swallowed red to read failing off the step's own result; got ` +
        JSON.stringify(swallowedRedReconciliation.ledger.scenarioReconciliations)
    );
    assert.deepEqual(
      swallowedRedReconciliation.ledger.scenarioReconciliations
        .find((row) => row.scnId === "SCN-CVT-001")
        ?.evidenceObservations.filter(isFitnessObservation)
        .map((observation) => [observation.staticCheck, observation.scnId]),
      [["SCN-CVT-001", "SCN-CVT-001"]],
      "expected the failing row to carry the observation of the step whose red the job swallowed"
    );
    assert.equal(
      hasBrokenEvidence(swallowedRedReconciliation.ledger),
      false,
      "expected a check that ran and found violations to leave the run sound"
    );
  }
);

let succeededStepFixture: string;
let succeededStepRecord: CiStepRecord;
let succeededStepReconciliation: EvidenceReconciliation;

Given(
  "a target whose corpus carries two @fitness scenarios, each with a CI step stating its @SCN",
  function () {
    succeededStepFixture = join(process.cwd(), "tests/fixtures/scn-lnt-021");
    const manifest = JSON.parse(
      readFileSync(join(succeededStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { checkRegistry?: unknown } };
    assert.deepEqual(
      citedScnIdsIn(readFileSync(join(succeededStepFixture, "ci.yml"), "utf8")),
      ["SCN-CVT-001", "SCN-CVT-002"],
      "expected the planted pipeline to state each scenario's @SCN on the step that answers it"
    );
    assert.equal(
      manifest.specController?.checkRegistry,
      undefined,
      "expected the planted target to configure NO check registry — the hop this route retires"
    );
    const source = readFileSync(join(succeededStepFixture, "features/target.feature"), "utf8");
    assert.deepEqual(
      parseTaggedScenarios(source)
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => [scenario.scnId, scenario.tags.includes("complexity")]),
      [
        ["SCN-CVT-001", false],
        ["SCN-CVT-002", false],
      ],
      "expected the planted corpus to carry both scenarios on the axis and no other tag"
    );
    const ciSource = readFileSync(join(succeededStepFixture, "ci.yml"), "utf8");
    assert.deepEqual(
      ciRunSteps([ciSource]).map((step) => step.id),
      ["SCN-CVT-001", "SCN-CVT-002", "dump-the-step-record"],
      "expected each check's step to state the code of the row it runs, beside the record's own step"
    );
    assert.deepEqual(
      runningStaticChecks([ciSource], manifest as PackageJsonScripts, NO_RUNNERS).map(
        (observation) => observation.staticCheck
      ),
      ["Checkout", "Complexity", "Dump this run's step record", "Traceability"],
      "expected the derivation reader to see every step, so the isolation below is the composition's rather than a prefix rule's oversight"
    );
  }
);

Given(
  "its CI run's record says both of those checks' steps succeeded, beside the step that wrote the record",
  function () {
    succeededStepRecord = JSON.parse(
      readFileSync(join(succeededStepFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    assert.deepEqual(
      Object.entries(succeededStepRecord).map(([id, step]) => [id, step.outcome]),
      [
        ["SCN-CVT-001", "success"],
        ["SCN-CVT-002", "success"],
        ["dump-the-step-record", "success"],
      ],
      "expected both check steps to have succeeded, beside the step that wrote the record"
    );
  }
);

When("that target's evidence is reconciled with the record its own CI run wrote", function () {
  succeededStepReconciliation = evidenceReconciliationFromSources({
    featureSources: [
      readFileSync(join(succeededStepFixture, "features/target.feature"), "utf8"),
    ],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(succeededStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [readFileSync(join(succeededStepFixture, "ci.yml"), "utf8")],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: succeededStepRecord,
  });
});

function creditedRowShape(row: EvidenceReconciliation["ledger"]["scenarioReconciliations"][number]) {
  return [
    row.scnId,
    row.kind,
    row.verdict,
    row.qualityCheckReconciliations.map((item) => [
      item.qualityCheck,
      item.outcome,
      item.evidenceObservation !== undefined && isFitnessObservation(item.evidenceObservation)
        ? [
            item.evidenceObservation.scnId,
            item.evidenceObservation.exists,
            item.evidenceObservation.enforcedOverRealSource,
          ]
        : null,
    ]),
  ];
}

Then(
  "each scenario is credited by the step citing its own @SCN, both Evidence Obligations read satisfied, and the run balances",
  function () {
    assert.deepEqual(
      succeededStepReconciliation.ledger.scenarioReconciliations.map(creditedRowShape),
      [
        ["SCN-CVT-001", "scenario", "balanced", [["fitness", "satisfied", ["SCN-CVT-001", true, true]]]],
        ["SCN-CVT-002", "scenario", "balanced", [["fitness", "satisfied", ["SCN-CVT-002", true, true]]]],
      ],
      `expected each row to be credited by the step citing its OWN @SCN, both facts observed off the ` +
        `run; got ${JSON.stringify(succeededStepReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.equal(
      succeededStepReconciliation.ledger.scenarioReconciliations.length,
      2,
      "expected no third row for the step that wrote the record"
    );
    assert.deepEqual(
      succeededStepReconciliation.summary.staticChecks,
      { runningStaticCheckCount: 2, uncitedStaticCheckCount: 0 },
      "expected exactly the two configured checks counted as having run, and none uncited"
    );
    assert.equal(
      hasBrokenEvidence({
        scenarioReconciliations: succeededStepReconciliation.ledger.scenarioReconciliations,
      }),
      false,
      "expected two checks that ran and held to leave the run sound"
    );
  }
);

let readingsFixture: string;
let readingsRecord: CiStepRecord;
let readingsReconciliation: EvidenceReconciliation;

Given(
  "a target whose corpus carries four @fitness scenarios, each answered by a step of its CI",
  function () {
    readingsFixture = join(process.cwd(), "tests/fixtures/scn-lnt-026");
    assert.deepEqual(
      parseTaggedScenarios(readFileSync(join(readingsFixture, "features/target.feature"), "utf8"))
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-001", "SCN-CVT-002", "SCN-CVT-003", "SCN-CVT-004"],
      "expected the planted corpus to carry four @fitness scenarios"
    );
    assert.deepEqual(
      citedScnIdsIn(readFileSync(join(readingsFixture, "ci.yml"), "utf8")),
      ["SCN-CVT-001", "SCN-CVT-002", "SCN-CVT-003", "SCN-CVT-004"],
      "expected the planted pipeline to state each scenario's @SCN on the step that answers it"
    );
  }
);

Given(
  "its CI run's record says the first check's step succeeded, the second's failed, the third's was skipped, and the fourth's carries a status nobody anticipated",
  function () {
    readingsRecord = JSON.parse(
      readFileSync(join(readingsFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    assert.deepEqual(
      Object.entries(readingsRecord).map(([id, step]) => [id, step.outcome, step.conclusion]),
      [
        ["SCN-CVT-001", "success", "success"],
        ["SCN-CVT-002", "failure", "failure"],
        ["SCN-CVT-003", "skipped", "skipped"],
        ["SCN-CVT-004", "neutral", "neutral"],
        ["dump-the-step-record", "success", "success"],
      ],
      "expected the four check steps written down as succeeded, failed, skipped and a status nobody anticipated, beside the step that wrote the record"
    );
  }
);

When(
  "that target's evidence is reconciled with the single record that run wrote about all four steps",
  function () {
    readingsReconciliation = evidenceReconciliationFromSources({
      featureSources: [readFileSync(join(readingsFixture, "features/target.feature"), "utf8")],
      untaggedScenarios: [],
      packageJson: JSON.parse(
        readFileSync(join(readingsFixture, "package.json"), "utf8")
      ) as PackageJsonScripts,
      ciSources: [readFileSync(join(readingsFixture, "ci.yml"), "utf8")],
      ciSourceNames: ["ci.yml"],
      runtimeObservations: [],
      deferralTags: [],
      ciStepRecord: readingsRecord,
    });
  }
);

function readingRowShape(row: EvidenceReconciliation["ledger"]["scenarioReconciliations"][number]) {
  return [
    row.scnId,
    row.kind,
    row.verdict,
    row.qualityCheckReconciliations.map((item) => [
      item.staticCheck,
      item.outcome,
      item.evidenceObservation !== undefined && isFitnessObservation(item.evidenceObservation)
        ? item.evidenceObservation.status
        : null,
    ]),
  ];
}

function assertBrokenReadingsNamed(markdown: string): void {
  assert.match(
    markdown,
    /SCN-CVT-003: the CI run's record says this check's step was skipped — so the check did not run\./,
    "expected the run-integrity section to name the skipped row and repeat what the record said"
  );
  assert.match(
    markdown,
    /SCN-CVT-004: the CI run's record says this check's step ended `neutral` — so the check did not run\./,
    "expected the run-integrity section to name the row whose status nobody anticipated, and repeat that status"
  );
}

Then(
  "the first row balances on a credit saying its check found nothing, the second reads failing off what its check found, and neither of the last two is credited — each is broken evidence naming what the record said about it, and the run is unsound",
  function () {
    assert.deepEqual(
      readingsReconciliation.ledger.scenarioReconciliations.map(readingRowShape),
      [
        ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied", "passed"]]],
        ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "failing", "failed"]]],
        ["SCN-CVT-003", "scenario", "out-of-balance", [[undefined, "missing", null]]],
        ["SCN-CVT-004", "scenario", "out-of-balance", [[undefined, "missing", null]]],
        ["(no scenario)", "suspense-scenario", "out-of-balance", [
          [undefined, "broken", null],
          [undefined, "broken", null],
        ]],
      ],
      `expected the succeeded step's row balanced, the failed step's row failing off its own ` +
        `verdict, and the last two credited by nothing with a broken item apiece on the suspense ` +
        `row; got ${JSON.stringify(readingsReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.deepEqual(
      readingsReconciliation.summary.staticChecks,
      { runningStaticCheckCount: 2, uncitedStaticCheckCount: 0 },
      "expected exactly two static checks counted as having run — the two whose steps said what the check did"
    );
    assert.equal(
      hasBrokenEvidence({
        scenarioReconciliations: readingsReconciliation.ledger.scenarioReconciliations,
      }),
      true,
      "expected the run to be stamped unsound by the two broken credits"
    );
    assertBrokenReadingsNamed(renderMarkdown(readingsReconciliation, CTX));
  }
);

let severedFixture: string;
let severedCiSource: string;
let severedReconciliation: EvidenceReconciliation;

Given("a target whose corpus names three static checks its CI runs", function () {
  severedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-032");
  const manifest = JSON.parse(
    readFileSync(join(severedFixture, "package.json"), "utf8")
  ) as PackageJsonScripts & {
    specController?: { fitnessChecks?: unknown };
  };
  assert.deepEqual(
    parseTaggedScenarios(readFileSync(join(severedFixture, "features/target.feature"), "utf8"))
      .filter((scenario) => scenario.tags.includes("fitness"))
      .map((scenario) => scenario.scnId),
    ["SCN-CVT-001", "SCN-CVT-002", "SCN-CVT-003"],
    "expected all three @fitness scenarios, one per script of this manifest"
  );
  assert.deepEqual(
    Object.keys(manifest.scripts ?? {}),
    ["lint:alpha", "lint:beta", "lint:gamma"],
    "expected each of the three checks to exist as a script under the one discovered prefix"
  );
  severedCiSource = readFileSync(join(severedFixture, "ci.yml"), "utf8");
  assert.deepEqual(
    ciRunSteps([severedCiSource]).map((step) => step.command),
    ["pnpm lint:alpha", "pnpm lint:gamma", "pnpm lint:beta"],
    "expected the planted workflow to invoke each check's own script from a plain run: step"
  );
});

Given(
  "the first check's step carries continue-on-error, the second's job carries it, and the third's red is the job's verdict",
  function () {
    assert.deepEqual(
      ciRunSteps([severedCiSource]).map((step) => [
        step.command,
        step.abortsJob,
        step.abortsJob ? null : step.continuesOnError.carriedBy,
      ]),
      [
        ["pnpm lint:alpha", false, "step"],
        ["pnpm lint:gamma", true, null],
        ["pnpm lint:beta", false, "job"],
      ],
      "expected one check severed on its step, one on its job, and one whose red is still the job's verdict"
    );
  }
);

When(
  "that target's evidence is reconciled from its manifest, its corpus and the two jobs of its workflow",
  function () {
    severedReconciliation = evidenceReconciliationFromSources({
      featureSources: [
        readFileSync(join(severedFixture, "features/target.feature"), "utf8"),
      ],
      untaggedScenarios: [],
      packageJson: JSON.parse(
        readFileSync(join(severedFixture, "package.json"), "utf8")
      ) as PackageJsonScripts,
      ciSources: [severedCiSource],
      ciSourceNames: ["ci.yml"],
      runtimeObservations: [],
      deferralTags: [],
    });
  }
);

Then(
  "the first two rows read the watermelon and leave balanced, and the third reconciles satisfied",
  function () {
    assert.deepEqual(
      severedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        ["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
        ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
        ["SCN-CVT-003", "scenario", "balanced", [[undefined, "satisfied"]]],
      ],
      `expected both severed checks to read the watermelon and the sibling to stay satisfied; ` +
        `got ${JSON.stringify(severedReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.deepEqual(
      severedReconciliation.ledger.scenarioReconciliations
        .filter((row) => row.scnId !== "SCN-CVT-003")
        .flatMap((row) => row.evidenceObservations)
        .filter(isFitnessObservation)
        .map((observation) => [
          observation.staticCheck,
          observation.exists,
          observation.enforcedOverRealSource,
          observation.scnId,
        ]),
      [
        ["lint:alpha", true, false, "SCN-CVT-001"],
        ["lint:beta", true, false, "SCN-CVT-002"],
      ],
      "expected each severed check to be OBSERVED as one that exists and enforces nothing, on the row it cites"
    );
  }
);

let uncitedSeveredFixture: string;
let uncitedSeveredMd: string;

Given(
  "a target running two static checks no scenario cites, one of them behind continue-on-error",
  function () {
    uncitedSeveredFixture = join(process.cwd(), "tests/fixtures/scn-lnt-033");
    const manifest = JSON.parse(
      readFileSync(join(uncitedSeveredFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    assert.deepEqual(
      Object.keys(manifest.scripts ?? {}),
      ["lint:advisory", "lint:enforced"],
      "expected exactly two checks, each a script under the one discovered prefix"
    );
    assert.deepEqual(
      citedScnIdsIn(readFileSync(join(uncitedSeveredFixture, "ci.yml"), "utf8")),
      [],
      "expected NEITHER step to state an @SCN, so the citation seam treats them identically"
    );
    const corpus = readFileSync(
      join(uncitedSeveredFixture, "features/target.feature"),
      "utf8"
    );
    assert.deepEqual(
      ["SCN-CVT-001", "SCN-CVT-002"].filter((scn) => corpus.includes(`@${scn}`)),
      [],
      "expected the corpus to carry neither check's row id — an uncited check is one nothing names"
    );
    assert.deepEqual(
      ciRunSteps([readFileSync(join(uncitedSeveredFixture, "ci.yml"), "utf8")]).map((step) => [
        step.command,
        step.abortsJob,
      ]),
      [
        ["pnpm lint:advisory", false],
        ["pnpm lint:enforced", true],
      ],
      "expected one check the job's verdict survives and one whose red IS that verdict"
    );
  }
);

When(
  "that target's census is taken from its manifest, its corpus and its workflow",
  function () {
    const reportDir = mkdtempSync(join(tmpdir(), "spec-controller-lnt033-"));
    const reportPath = join(reportDir, "spec-reconciliation.md");
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", join(uncitedSeveredFixture, "features"),
        "--ci", join(uncitedSeveredFixture, "ci.yml"),
        "--package-json", join(uncitedSeveredFixture, "package.json"),
        "--target", "lnt033-fixture",
        "--format", `md:${reportPath}`,
      ],
      { cwd: reportDir, encoding: "utf8" }
    );
    assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
    assert.equal(
      result.status,
      1,
      `expected exit 1 (out-of-balance) writing the report; got ${result.status}\nstderr:\n${result.stderr}`
    );
    uncitedSeveredMd = readFileSync(reportPath, "utf8");
  }
);

Then(
  "the census reports two static checks run and two uncited static checks, so the named count it implies is nil",
  function () {
    const censusLine = uncitedSeveredMd
      .split("\n")
      .find((line) => /static check\(s\) run, \d+ uncited static check\(s\)\./.test(line));
    assert.equal(
      censusLine,
      "2 static check(s) run, 2 uncited static check(s).",
      `expected the severed check to count in BOTH census counts — it ran, and nothing names it — ` +
        `so the named count it implies is 2 − 2 = 0. Whether it enforces is its row's answer ` +
        `(the watermelon), not the census's.`
    );

    const ledgerSection = uncitedSeveredMd.slice(
      uncitedSeveredMd.indexOf("## Scenario Reconciliations")
    );
    for (const handle of ["lint:advisory", "lint:enforced"]) {
      const bearing = ledgerSection
        .split("\n")
        .filter((line) => line.startsWith("|") && line.includes(`(${handle})`))
        .map((line) => line.split("|").map((cell) => cell.trim())[1]);
      assert.deepEqual(
        bearing,
        ["(no scenario)"],
        `expected ${handle} banked as a cites-no-scenario credit on the suspense row and on no ` +
          `other; got ${JSON.stringify(bearing)} in:\n${uncitedSeveredMd}`
      );
    }
  }
);
