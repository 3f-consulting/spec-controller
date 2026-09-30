import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { parseScenarios, parseUntaggedScenarios, evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObligation, EvidenceObservation, FitnessEvidenceObservation, Ledger, ScenarioReconciliation, QualityCheckReconciliation, EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import { hasBrokenEvidence, isBalanced } from "../../packages/core/src/domain/ledger.js";

let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;
let reconciliation: Ledger;

const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

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

Given("a scenario {string} requiring unit-level evidence", function (scnId: string) {
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @unit @${scnId}`,
    "    Scenario: a fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given(
  "a scenario {string} requiring integration-level evidence",
  function (scnId: string) {
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @integration @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

Given(
  "a scenario {string} requiring both unit-level and integration-level evidence",
  function (scnId: string) {
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @integration @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

Given("a zero-evidence obligation scenario {string}", function (scnId: string) {
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @${scnId}`,
    "    Scenario: a fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a passing unit-level result for {string}", function (scnId: string) {
  evidenceObservations = [{ qualityCheck: "unit", scnId, status: "passed" }];
});

Given("a passing integration-level result for {string}", function (scnId: string) {
  evidenceObservations = [
    { qualityCheck: "integration", scnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
  ];
});

Given("a failing unit-level result for {string}", function (scnId: string) {
  evidenceObservations = [{ qualityCheck: "unit", scnId, status: "failed" }];
});

Given("no integration-level result for {string}", function (scnId: string) {
  evidenceObservations = (evidenceObservations ?? []).filter(
    (o) => !(o.qualityCheck === "integration" && "scnId" in o && o.scnId === scnId)
  );
});

Given("no results are observed", function () {
  evidenceObservations = [];
});

Given("no result matches {string}", function (scnId: string) {
  evidenceObservations = [
    { qualityCheck: "integration", scnId: "SCN-LDG-OTHER", status: "passed" },
  ];
});

Given(
  "a passing unit-level result citing the phantom scenario {string}",
  function (scnId: string) {
    evidenceObservations = [
      { qualityCheck: "unit", scnId, status: "passed", locator: "src/phantom.test.ts" },
    ];
  }
);

Given(
  "a passing fitness credit citing the phantom scenario {string} naming the check {string}",
  function (scnId: string, staticCheck: string) {
    const credit: FitnessEvidenceObservation & { locator: string } = {
      qualityCheck: "fitness",
      staticCheck,
      scnId,
      exists: true,
      enforcedOverRealSource: true,
      locator: "packages/core/src/domain/fitnessChecks.ts",
    };
    evidenceObservations = [credit];
  }
);

Given("a passing unit-level result carrying no scenario id", function () {
  evidenceObservations = [
    { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
  ];
});

let ldg011ScnId: string;

Given("a scenario tagged @e2e", function () {
  ldg011ScnId = "SCN-LDG-011";
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @e2e @${ldg011ScnId}`,
    "    Scenario: an e2e fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a passing cucumber observation citing it", function () {
  const report: CucumberJsonReport = [
    {
      uri: "features/fixture.feature",
      elements: [
        {
          tags: [{ name: "@e2e" }, { name: `@${ldg011ScnId}` }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  evidenceObservations = parseCucumberEvidenceObservations(report, "integration");
});

When("the ledger reconciles the target", function () {
  reconciliation = reconcile(scenarios, evidenceObservations);
  markdown = renderMarkdown(evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false), CTX);
});

Then("the scenario is balanced", function () {
  const { verdict, items } = rowCells(ldg011ScnId);
  assert.match(
    verdict,
    /\bbalanced\b/,
    `expected ${ldg011ScnId}'s verdict cell to read balanced; got "${verdict}"`
  );
  assert.doesNotMatch(
    verdict,
    /out-of-balance/,
    `expected ${ldg011ScnId} not to be out-of-balance; got "${verdict}"`
  );
  assert.equal(
    items,
    "—",
    `expected ${ldg011ScnId} to carry no reconciling items; got "${items}"`
  );
});

Then(
  "it is not reported e2e-missing with a no-evidence-obligation integration observation",
  function () {
    const { items } = rowCells(ldg011ScnId);
    assert.ok(
      !items.includes("Evidence Observation is missing"),
      `expected ${ldg011ScnId} not to carry a missing item; got "${items}"`
    );
    assert.ok(
      !items.includes("Evidence Observation cites a Scenario with no matching Evidence Obligation"),
      `expected ${ldg011ScnId} not to carry a no-evidence-obligation item; got "${items}"`
    );
  }
);

let ldg012ScnId: string;

Given("a scenario tagged @integration", function () {
  ldg012ScnId = "SCN-LDG-012";
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @integration @${ldg012ScnId}`,
    "    Scenario: an integration fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a passing cucumber observation citing the @integration scenario", function () {
  const report: CucumberJsonReport = [
    {
      uri: "features/fixture.feature",
      elements: [
        {
          tags: [{ name: "@integration" }, { name: `@${ldg012ScnId}` }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  evidenceObservations = parseCucumberEvidenceObservations(report, "e2e");
});

Then("the integration obligation is satisfied and the scenario is balanced", function () {
  const { verdict, items } = rowCells(ldg012ScnId);
  assert.match(
    verdict,
    /\bbalanced\b/,
    `expected ${ldg012ScnId}'s verdict cell to read balanced; got "${verdict}"`
  );
  assert.doesNotMatch(
    verdict,
    /out-of-balance/,
    `expected ${ldg012ScnId} not to be out-of-balance; got "${verdict}"`
  );
  assert.equal(
    items,
    "—",
    `expected ${ldg012ScnId} to carry no reconciling items; got "${items}"`
  );
});

let ldg013ScnId: string;

Given("a scenario tagged @unit @e2e", function () {
  ldg013ScnId = "SCN-LDG-013";
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @unit @e2e @${ldg013ScnId}`,
    "    Scenario: a unit-and-e2e fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a passing vitest observation citing the @unit @e2e scenario", function () {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "src/unitAndE2e.test.ts",
        assertionResults: [
          { fullName: `[${ldg013ScnId}] the unit substrate proves the unit tier`, status: "passed" },
        ],
      },
    ],
  };
  evidenceObservations = parseVitestEvidenceObservations(report, "unit");
});

Given("a passing cucumber observation citing the @unit @e2e scenario", function () {
  const report: CucumberJsonReport = [
    {
      uri: "features/fixture.feature",
      elements: [
        {
          tags: [{ name: "@unit" }, { name: "@e2e" }, { name: `@${ldg013ScnId}` }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  evidenceObservations = [
    ...(evidenceObservations ?? []),
    ...parseCucumberEvidenceObservations(report, "integration"),
  ];
});

Then(
  "both the unit and the e2e obligations are satisfied and the scenario is balanced",
  function () {
    const { verdict, items } = rowCells(ldg013ScnId);
    assert.match(
      verdict,
      /\bbalanced\b/,
      `expected ${ldg013ScnId}'s verdict cell to read balanced; got "${verdict}"`
    );
    assert.doesNotMatch(
      verdict,
      /out-of-balance/,
      `expected ${ldg013ScnId} not to be out-of-balance; got "${verdict}"`
    );
    assert.equal(
      items,
      "—",
      `expected ${ldg013ScnId} to carry no reconciling items; got "${items}"`
    );
  }
);

let ldg014ScnId: string;

Given("a scenario tagged @integration @e2e", function () {
  ldg014ScnId = "SCN-LDG-014";
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @integration @e2e @${ldg014ScnId}`,
    "    Scenario: an integration-and-e2e fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a single passing cucumber observation citing it", function () {
  const report: CucumberJsonReport = [
    {
      uri: "features/fixture.feature",
      elements: [
        {
          tags: [{ name: "@integration" }, { name: "@e2e" }, { name: `@${ldg014ScnId}` }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  evidenceObservations = parseCucumberEvidenceObservations(report, "integration");
});

Then(
  "both the integration and the e2e obligations are satisfied and the scenario is balanced",
  function () {
    const { verdict, items } = rowCells(ldg014ScnId);
    assert.match(
      verdict,
      /\bbalanced\b/,
      `expected ${ldg014ScnId}'s verdict cell to read balanced; got "${verdict}"`
    );
    assert.doesNotMatch(
      verdict,
      /out-of-balance/,
      `expected ${ldg014ScnId} not to be out-of-balance; got "${verdict}"`
    );
    assert.equal(
      items,
      "—",
      `expected ${ldg014ScnId} to carry no reconciling items; got "${items}"`
    );
  }
);

let ldg015ScnId: string;

Given("a scenario tagged @unit only", function () {
  ldg015ScnId = "SCN-LDG-015";
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @unit @${ldg015ScnId}`,
    "    Scenario: a unit-only fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a passing cucumber observation citing the @unit-only scenario", function () {
  const report: CucumberJsonReport = [
    {
      uri: "features/fixture.feature",
      elements: [
        {
          tags: [{ name: "@unit" }, { name: `@${ldg015ScnId}` }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  evidenceObservations = parseCucumberEvidenceObservations(report, "integration");
});

Then("the cucumber observation is reported no-evidence-obligation", function () {
  const { verdict, items } = rowCells(ldg015ScnId);
  const noEvidenceObligation = items
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.includes("Evidence Observation cites a Scenario with no matching Evidence Obligation"));
  assert.ok(
    noEvidenceObligation,
    `expected ${ldg015ScnId} to carry a no-evidence-obligation cucumber observation; got "${items}"`
  );
  assert.ok(
    noEvidenceObligation.includes("integration"),
    `expected the no-evidence-obligation observation at the fallback integration level; got "${noEvidenceObligation}"`
  );
  assert.match(
    verdict,
    /out-of-balance/,
    `expected ${ldg015ScnId} out-of-balance (no-evidence-obligation observation); got "${verdict}"`
  );
});

Then("the @unit obligation remains the scenario's only required evidence", function () {
  const { items } = rowCells(ldg015ScnId);
  const missing = items
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.includes("missing"));
  assert.ok(
    missing,
    `expected the unit obligation required-but-missing (cucumber discharged nothing); got "${items}"`
  );
  assert.ok(
    missing.includes("unit"),
    `expected the missing (required) obligation to be unit; got "${missing}"`
  );
  assert.ok(
    !missing.includes("integration") && !missing.includes("e2e"),
    `expected unit to be the scenario's only required evidence; got "${missing}"`
  );
});

When("the reconciler runs", function () {
  markdown = renderMarkdown(evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false), CTX);
});

Then(
  "the ledger reports {string} as balanced with no reconciling items",
  function (scnId: string) {
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /\bbalanced\b/,
      `expected ${scnId}'s verdict cell to read balanced; got "${verdict}"`
    );
    assert.doesNotMatch(
      verdict,
      /out-of-balance/,
      `expected ${scnId} not to be out-of-balance; got "${verdict}"`
    );
    assert.equal(
      items,
      "—",
      `expected ${scnId} to carry no reconciling items; got "${items}"`
    );
  }
);

Then(
  "the ledger reports {string} as out of balance",
  function (scnId: string) {
    const { verdict } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
    );
  }
);

Then(
  "the ledger reports {string} as a phantom-scenario reconciliation with a cites-unknown-scenario item",
  function (scnId: string) {
    const { items } = rowCells(scnId);
    assert.ok(
      items.includes("Evidence Observation cites an unknown Scenario"),
      `expected ${scnId}'s reconciling items to include cites-unknown-scenario; got "${items}"`
    );
    assert.match(
      markdown,
      /phantom-scenario/,
      `expected the ledger to name ${scnId} a phantom-scenario reconciliation; got:\n${markdown}`
    );
  }
);

Then("the phantom-scenario {string} is out of balance", function (scnId: string) {
  const { verdict } = rowCells(scnId);
  assert.match(
    verdict,
    /out-of-balance/,
    `expected phantom-scenario ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
  );
});

Then(
  "the phantom-scenario {string}'s item carries the check {string} and no locator key",
  function (scnId: string, staticCheck: string) {
    const rows = reconcile(scenarios, evidenceObservations).scenarioReconciliations;
    const phantom = rows.find((row) => row.scnId === scnId);
    assert.ok(
      phantom,
      `expected a phantom row for ${scnId}; got rows: ${rows.map((r) => r.scnId).join(", ")}`
    );
    const [item] = phantom!.qualityCheckReconciliations;
    assert.equal(
      item?.staticCheck,
      staticCheck,
      `expected the phantom item to carry the check "${staticCheck}"; got ${JSON.stringify(item)}`
    );
    assert.ok(
      !("locator" in (item ?? {})),
      `expected the phantom item to carry no locator key; got ${JSON.stringify(item)}`
    );
  }
);

Then(
  "the ledger reports a suspense-scenario reconciliation {string} with a cites-no-scenario item",
  function (scnId: string) {
    const { items } = rowCells(scnId);
    assert.ok(
      items.includes("Evidence Observation cites no Scenario"),
      `expected ${scnId}'s reconciling items to include cites-no-scenario; got "${items}"`
    );
    assert.match(
      markdown,
      /suspense-scenario/,
      `expected the ledger to name ${scnId} a suspense-scenario reconciliation; got:\n${markdown}`
    );
  }
);

Then("the suspense-scenario is out of balance", function () {
  const { verdict } = rowCells("(no scenario)");
  assert.match(
    verdict,
    /out-of-balance/,
    `expected the suspense-scenario's verdict cell to read out-of-balance; got "${verdict}"`
  );
});

Then(
  "the ledger reports {string} with a no-evidence-obligation item at {word}",
  function (scnId: string, qualityCheck: string) {
    const { verdict, items } = rowCells(scnId);
    assert.ok(
      items.includes("Evidence Observation cites a Scenario with no matching Evidence Obligation"),
      `expected ${scnId}'s reconciling items to include a no-evidence-obligation item; got "${items}"`
    );
    assert.ok(
      items.includes(qualityCheck),
      `expected ${scnId}'s no-evidence-obligation item to be at ${qualityCheck}; got "${items}"`
    );
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
    );
  }
);

Then(
  "the ledger reports {string} with a both-missing item",
  function (scnId: string) {
    const { items } = rowCells(scnId);
    assert.ok(
      items.includes("Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"),
      `expected ${scnId}'s reconciling items to include a both-missing item; got "${items}"`
    );
    assert.ok(
      !markdown.includes("## Warnings"),
      `expected NO "## Warnings" section (dissolved); got:\n${markdown}`
    );
  }
);

Then("{string} is not reported as both-missing", function (scnId: string) {
  const { items } = rowCells(scnId);
  assert.ok(
    !items.includes("Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"),
    `expected ${scnId} not to be reported as both-missing; got "${items}"`
  );
});

let ldg016AncestorScnId: string;
let ldg016LeafScnId: string;

function creditsFor(scnId: string): EvidenceObservation[] {
  return (evidenceObservations ?? []).filter(
    (o) => o.qualityCheck !== "fitness" && o.scnId === scnId
  );
}

Given(
  "a scenario cited by an ancestor describe and a scenario self-cited by a leaf beneath it",
  function () {
    ldg016AncestorScnId = "SCN-ANC-016";
    ldg016LeafScnId = "SCN-LEA-016";
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${ldg016AncestorScnId}`,
      "    Scenario: the scenario the grouping describe cites",
      "      Given a fixture step",
      "",
      `    @unit @${ldg016LeafScnId}`,
      "    Scenario: the scenario the child it self-cites",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

Given(
  "a passing vitest report whose one leaf self-cites and whose sibling leaf does not",
  function () {
    const report: VitestJsonReport = {
      testResults: [
        {
          name: "packages/core/src/citation.test.ts",
          assertionResults: [
            {
              fullName: `[${ldg016AncestorScnId}] the grouping describe > [${ldg016LeafScnId}] the leaf proves its own scenario`,
              title: `[${ldg016LeafScnId}] the leaf proves its own scenario`,
              status: "passed",
            },
            {
              fullName: `[${ldg016AncestorScnId}] the grouping describe > the bare sibling leaf proves the ancestor's`,
              title: "the bare sibling leaf proves the ancestor's",
              status: "passed",
            },
          ],
        },
      ],
    };
    evidenceObservations = parseVitestEvidenceObservations(report, "unit");
  }
);

Then(
  "the self-citing leaf is attributed to the leaf-cited scenario, not to the ancestor",
  function () {
    const leafCredits = creditsFor(ldg016LeafScnId);
    assert.equal(
      leafCredits.length,
      1,
      `expected the self-citing leaf to be attributed to ${ldg016LeafScnId} (exactly one credit); got ${leafCredits.length} — the ancestor's citation shadowed the leaf's own`
    );
    assert.deepEqual(
      leafCredits[0],
      {
        qualityCheck: "unit",
        scnId: ldg016LeafScnId,
        status: "passed",
        locator: "packages/core/src/citation.test.ts",
      },
      `expected the leaf's credit to be a passing unit observation citing ${ldg016LeafScnId}`
    );
  }
);

Then(
  "the ancestor scenario carries exactly one crediting observation — the bare sibling leaf",
  function () {
    const ancestorCredits = creditsFor(ldg016AncestorScnId);
    assert.equal(
      ancestorCredits.length,
      1,
      `expected ${ldg016AncestorScnId} to carry exactly one crediting observation (the bare sibling leaf); got ${ancestorCredits.length} — a spurious second credit stolen from the self-citing leaf`
    );
    assert.deepEqual(
      ancestorCredits[0],
      {
        qualityCheck: "unit",
        scnId: ldg016AncestorScnId,
        status: "passed",
        locator: "packages/core/src/citation.test.ts",
      },
      `expected the ancestor's one credit to be a passing unit observation citing ${ldg016AncestorScnId}`
    );
  }
);

Then("both scenarios are balanced", function () {
  for (const scnId of [ldg016AncestorScnId, ldg016LeafScnId]) {
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /\bbalanced\b/,
      `expected ${scnId}'s verdict cell to read balanced; got "${verdict}"`
    );
    assert.doesNotMatch(
      verdict,
      /out-of-balance/,
      `expected ${scnId} not to be out-of-balance; got "${verdict}"`
    );
    assert.equal(
      items,
      "—",
      `expected ${scnId} to carry no reconciling items; got "${items}"`
    );
  }
});

let ldg032AncestorScnId: string;
let ldg032ProseScnId: string;

Given(
  "a scenario cited by an ancestor describe and a second scenario named only in a leaf's prose",
  function () {
    ldg032AncestorScnId = "SCN-ANC-032";
    ldg032ProseScnId = "SCN-PDX-032";
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${ldg032AncestorScnId}`,
      "    Scenario: the scenario the grouping describe cites",
      "      Given a fixture step",
      "",
      `    @unit @${ldg032ProseScnId}`,
      "    Scenario: the scenario the leaf only mentions",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

Given(
  "a passing vitest report whose one leaf names the second scenario in prose beneath the citing describe",
  function () {
    const report: VitestJsonReport = {
      testResults: [
        {
          name: "packages/core/src/prose.test.ts",
          assertionResults: [
            {
              fullName: `[${ldg032AncestorScnId}] the grouping describe > mirrors what ${ldg032ProseScnId} does`,
              title: `mirrors what ${ldg032ProseScnId} does`,
              status: "passed",
            },
          ],
        },
      ],
    };
    evidenceObservations = parseVitestEvidenceObservations(report, "unit");
  }
);

Then(
  "the leaf is attributed to the ancestor-cited scenario, not to the one its prose names",
  function () {
    const ancestorCredits = creditsFor(ldg032AncestorScnId);
    assert.equal(
      ancestorCredits.length,
      1,
      `expected ${ldg032AncestorScnId} to carry exactly one crediting observation (the leaf falling through to it); got ${ancestorCredits.length} — the leaf's prose mention shadowed the describe's citation`
    );
    assert.deepEqual(
      ancestorCredits[0],
      {
        qualityCheck: "unit",
        scnId: ldg032AncestorScnId,
        status: "passed",
        locator: "packages/core/src/prose.test.ts",
      },
      `expected the leaf's credit to be a passing unit observation citing ${ldg032AncestorScnId}`
    );
  }
);

Then("the prose-named scenario carries no crediting observation", function () {
  const proseCredits = creditsFor(ldg032ProseScnId);
  assert.equal(
    proseCredits.length,
    0,
    `expected ${ldg032ProseScnId} to carry no crediting observation — the leaf only NAMES it; got ${proseCredits.length}`
  );
});

let ldg033CorpusScnId: string;
const LDG033_PROSE_FIXTURE_ID = "SCN-PDX-033";
const LDG033_PROSE_CROSS_REFERENCE_ID = "SCN-PDR-033";

Given(
  "a scenario in the corpus and a fixture id that names nothing in it",
  function () {
    ldg033CorpusScnId = "SCN-LDG-033";
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${ldg033CorpusScnId}`,
      "    Scenario: the one scenario the corpus holds",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

Given(
  "a passing vitest report whose one assertion names both ids in prose, bracketing neither",
  function () {
    const report: VitestJsonReport = {
      testResults: [
        {
          name: "packages/core/src/prose.test.ts",
          assertionResults: [
            {
              fullName: `the tally block > drops ${LDG033_PROSE_FIXTURE_ID} when the check is not running (@${LDG033_PROSE_CROSS_REFERENCE_ID})`,
              title: `drops ${LDG033_PROSE_FIXTURE_ID} when the check is not running (@${LDG033_PROSE_CROSS_REFERENCE_ID})`,
              status: "passed",
            },
          ],
        },
      ],
    };
    evidenceObservations = parseVitestEvidenceObservations(report, "unit");
  }
);

Then(
  "the assertion cites no scenario and its credit posts to the suspense row",
  function () {
    assert.deepEqual(
      evidenceObservations,
      [
        {
          qualityCheck: "unit",
          scnId: null,
          status: "passed",
          locator: "packages/core/src/prose.test.ts",
        },
      ],
      "expected the prose-only assertion to emit one uncited credit"
    );
    const suspense = reconciliation.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario"
    );
    assert.ok(
      suspense,
      `expected a suspense-scenario row carrying the uncited credit; got rows: ${reconciliation.scenarioReconciliations
        .map((s) => s.scnId)
        .join(", ")}`
    );
  }
);

Then("neither prose-named id mints a phantom scenario", function () {
  const posted = reconciliation.scenarioReconciliations
    .map((s) => s.scnId)
    .filter((id): id is string => id !== null && id !== undefined);
  assert.ok(
    posted.includes(ldg033CorpusScnId),
    `expected the corpus scenario ${ldg033CorpusScnId} to hold a row; got rows: ${posted.join(", ")}`
  );
  for (const proseId of [LDG033_PROSE_FIXTURE_ID, LDG033_PROSE_CROSS_REFERENCE_ID]) {
    assert.ok(
      !posted.includes(proseId),
      `expected ${proseId} to reach no ledger row — it is named in prose, not cited; got rows: ${posted.join(", ")}`
    );
  }
});

Then(
  "the reconciling items for {string} are {string}",
  function (scnId: string, expected: string) {
    const { items } = rowCells(scnId);
    for (const type of expected.split(",").map((t) => t.trim())) {
      assert.ok(
        items.includes(type),
        `expected ${scnId}'s reconciling items to include "${type}"; got "${items}"`
      );
    }
  }
);

let ldg017ScnId: string;
const LDG017_FILE = "packages/core/src/harness.test.ts";
const LDG017_MESSAGE = "Error: Cannot find package '@cucumber/tag-expressions'";

Given(
  "a scenario whose only proving test lived in a vitest file that failed to collect",
  function () {
    ldg017ScnId = "SCN-HNS-017";
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${ldg017ScnId}`,
      "    Scenario: the scenario whose proof was in the broken file",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

Given("a vitest report whose file carries a collection failure and zero assertions", function () {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: LDG017_FILE,
        status: "failed",
        message: LDG017_MESSAGE,
        assertionResults: [],
      },
    ],
  };
  evidenceObservations = parseVitestEvidenceObservations(report, "unit");
});

Then(
  "the suspense scenario carries a broken reconciling item naming the collection-failed file and its error",
  function () {
    const suspense = reconciliation.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario"
    );
    assert.ok(
      suspense,
      `expected a suspense-scenario row carrying the collection failure; got rows: ${reconciliation.scenarioReconciliations
        .map((s) => `${s.scnId}(${s.kind})`)
        .join(", ")}`
    );
    const broken = suspense.reconcilingItems.filter((i) => i.outcome === "broken");
    assert.equal(
      broken.length,
      1,
      `expected exactly one broken reconciling item on the suspense row; got ${broken.length} (items: ${JSON.stringify(suspense.reconcilingItems)})`
    );
    assert.equal(
      broken[0]!.locator,
      LDG017_FILE,
      `expected the broken item to name the collection-failed file "${LDG017_FILE}"; got "${broken[0]!.locator}"`
    );
    assert.equal(
      broken[0]!.message,
      LDG017_MESSAGE,
      `expected the broken item to carry the vitest collection error; got "${broken[0]!.message}"`
    );
  }
);

Then("the broken item is not reported as cites-no-scenario", function () {
  const suspense = reconciliation.scenarioReconciliations.find(
    (s) => s.kind === "suspense-scenario"
  );
  assert.ok(suspense, "expected a suspense-scenario row");
  assert.equal(
    suspense.reconcilingItems.filter((i) => i.outcome === "cites-no-scenario").length,
    0,
    `expected the collection failure NOT to be folded into cites-no-scenario; got ${JSON.stringify(suspense.reconcilingItems)}`
  );
});

Then(
  "the scenario whose proof was in the collection-failed file still reads missing",
  function () {
    const { verdict, items } = rowCells(ldg017ScnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${ldg017ScnId} to stay out-of-balance; got "${verdict}"`
    );
    assert.ok(
      items.includes("missing"),
      `expected ${ldg017ScnId} to still read missing; got "${items}"`
    );
  }
);

const LDG018_BROKEN_FILE = "packages/core/src/collection-failed.test.ts";
const LDG018_MESSAGE = "Error: Cannot find package '@cucumber/tag-expressions'";
let ldg018BrokenRun: Ledger;
let ldg018SoundRun: Ledger;

function ldg018CleanlyCollectingRun(): Ledger {
  const soundFeature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @integrationpending @SCN-HNS-019",
    "    Scenario: the scenario deferring its integration obligation",
    "      Given a fixture step",
  ].join("\n");
  return reconcile(
    parseScenarios(soundFeature),
    parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "packages/core/src/collects-fine.test.ts",
            status: "passed",
            assertionResults: [
              {
                fullName: "[SCN-HNS-019] the scenario deferring its integration obligation",
                status: "passed",
              },
            ],
          },
        ],
      } satisfies VitestJsonReport,
      "unit"
    )
  );
}

Given(
  "a run whose vitest report carries a collection-failed file, and a second run whose report collects cleanly but defers an obligation",
  function () {
    const brokenFeature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @unit @SCN-HNS-018",
      "    Scenario: the scenario whose proof was in the broken file",
      "      Given a fixture step",
    ].join("\n");
    ldg018BrokenRun = reconcile(
      parseScenarios(brokenFeature),
      parseVitestEvidenceObservations(
        {
          testResults: [
            {
              name: LDG018_BROKEN_FILE,
              status: "failed",
              message: LDG018_MESSAGE,
              assertionResults: [],
            },
          ],
        } satisfies VitestJsonReport,
        "unit"
      )
    );

    ldg018SoundRun = ldg018CleanlyCollectingRun();
  }
);

When("the ledger reconciles both runs", function () {
  assert.ok(ldg018BrokenRun, "expected the collection-failed run to have been reconciled");
  assert.ok(ldg018SoundRun, "expected the cleanly-collecting run to have been reconciled");
});

Then("the run carrying the collection failure reports broken evidence", function () {
  assert.equal(
    hasBrokenEvidence(ldg018BrokenRun),
    true,
    `expected the collection-failed run to carry broken evidence; rows: ${JSON.stringify(
      ldg018BrokenRun.scenarioReconciliations.map((s) => ({
        scnId: s.scnId,
        items: s.reconcilingItems.map((i) => i.outcome),
      }))
    )}`
  );
});

Then(
  "the run that merely defers an obligation reports no broken evidence — a Pending Item does not make a run unsound",
  function () {
    assert.equal(
      hasBrokenEvidence(ldg018SoundRun),
      false,
      `expected the cleanly-collecting run to carry NO broken evidence; rows: ${JSON.stringify(
        ldg018SoundRun.scenarioReconciliations.map((s) => ({
          scnId: s.scnId,
          items: s.reconcilingItems.map((i) => i.outcome),
        }))
      )}`
    );
    assert.ok(
      ldg018SoundRun.scenarioReconciliations.some((s) => s.pendingItems.length > 0),
      "expected the control run to actually carry a Pending Item (else it proves nothing about independence)"
    );
  }
);

Then(
  "soundness is derived from the reconciling items, never stored on the reconciliation",
  function () {
    assert.deepEqual(
      Object.keys(ldg018BrokenRun).sort(),
      ["scenarioReconciliations"],
      `expected the Ledger to carry no stored soundness field; got keys ${JSON.stringify(
        Object.keys(ldg018BrokenRun)
      )}`
    );
  }
);

let ldg019ScnId: string;
const LDG019_FEATURE = "features/ambiguous.feature";
const LDG019_STEP = "Given the step two definitions both match";

Given("a scenario whose only proving step is matched by two step definitions", function () {
  ldg019ScnId = "SCN-HNS-020";
  const feature = [
    "@LDG",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @integration @${ldg019ScnId}`,
    "    Scenario: the scenario whose proving step is ambiguous",
    "      Given a fixture step",
  ].join("\n");
  scenarios = parseScenarios(feature);
});

Given("a cucumber report whose step for that scenario is ambiguous", function () {
  const report: CucumberJsonReport = [
    {
      uri: LDG019_FEATURE,
      elements: [
        {
          tags: [{ name: "@integration" }, { name: `@${ldg019ScnId}` }],
          steps: [
            { keyword: "Given ", name: "the step two definitions both match", result: { status: "ambiguous", duration: 0 } },
          ],
        },
      ],
    },
  ];
  evidenceObservations = parseCucumberEvidenceObservations(report, "integration");
});

Then(
  "the suspense scenario carries a broken reconciling item naming the ambiguous step and its feature file",
  function () {
    const suspense = reconciliation.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario"
    );
    assert.ok(
      suspense,
      `expected a suspense-scenario row carrying the ambiguous step; got rows: ${reconciliation.scenarioReconciliations
        .map((s) => `${s.scnId}(${s.kind})`)
        .join(", ")}`
    );
    const broken = suspense.reconcilingItems.filter((i) => i.outcome === "broken");
    assert.equal(
      broken.length,
      1,
      `expected exactly one broken reconciling item on the suspense row; got ${broken.length} (items: ${JSON.stringify(suspense.reconcilingItems)})`
    );
    assert.equal(
      broken[0]!.locator,
      LDG019_FEATURE,
      `expected the broken item to name the feature file "${LDG019_FEATURE}"; got "${broken[0]!.locator}"`
    );
    const message = broken[0]!.message ?? "";
    assert.ok(
      message.includes(LDG019_STEP),
      `expected the broken item's message to NAME the ambiguous step ("${LDG019_STEP}"); got "${message}"`
    );
    assert.match(
      message,
      /step definitions match/i,
      `expected the broken item's message to say two or more step definitions match the step; got "${message}"`
    );
  }
);

Then("the scenario whose proof was the ambiguous step still reads missing", function () {
  const { verdict, items } = rowCells(ldg019ScnId);
  assert.match(
    verdict,
    /out-of-balance/,
    `expected ${ldg019ScnId} to stay out-of-balance; got "${verdict}"`
  );
  assert.ok(
    items.includes("missing"),
    `expected ${ldg019ScnId} to still read missing; got "${items}"`
  );
});

Then(
  "the run reports broken evidence — an ambiguous harness makes the run unsound",
  function () {
    assert.equal(
      hasBrokenEvidence(reconciliation),
      true,
      `expected the ambiguous-step run to carry broken evidence; rows: ${JSON.stringify(
        reconciliation.scenarioReconciliations.map((s) => ({
          scnId: s.scnId,
          items: s.reconcilingItems.map((i) => i.outcome),
        }))
      )}`
    );
  }
);

let ldg020Scenarios: Scenario[];
let ldg020Reconciliation: Ledger;

Given(
  "a scenario tagged @unit whose {word} carries @integration, with a passing unit test and no integration evidence",
  function (ancestor: string) {
    const source =
      ancestor === "Feature"
        ? "@AAA @integration\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n"
        : "@AAA\nFeature: alpha\n\n  @integration\n  Rule: alpha behaves\n\n    @unit @SCN-AAA-001\n    Scenario: alpha works\n      Given a thing\n";

    ldg020Scenarios = parseScenarios(source);

    evidenceObservations = [
      {
        scnId: "SCN-AAA-001",
        qualityCheck: "unit",
        status: "passed",
        locator: "packages/core/src/alpha.test.ts",
      },
    ];
  },
);

When("the ledger reconciles the run", function () {
  ldg020Reconciliation = reconcile(ldg020Scenarios, evidenceObservations);
});

Then("the scenario raises both the unit and the integration obligation", function () {
  assert.equal(
    ldg020Scenarios.length,
    1,
    `expected exactly ONE scenario (no phantom from the Rule's tag block); got ${ldg020Scenarios.length}`,
  );
  const named = ldg020Scenarios[0]!.evidenceObligations.map((o) => o.qualityCheck).sort();
  assert.deepEqual(
    named,
    ["integration", "unit"],
    `expected the scenario to name BOTH tiers — cucumber names both — but it named [${named.join(", ")}]. ` +
      `The inherited tier is invisible: an obligation never named can never reconcile missing.`,
  );
});

Then("the integration obligation reconciles missing", function () {
  const row = ldg020Reconciliation.scenarioReconciliations.find(
    (r: ScenarioReconciliation) => r.scnId === "SCN-AAA-001",
  );
  assert.ok(row, "expected a reconciliation row for SCN-AAA-001");
  const integration = row.qualityCheckReconciliations.find(
    (o: QualityCheckReconciliation) => o.qualityCheck === "integration",
  );
  assert.ok(
    integration,
    "expected an INTEGRATION reconciliation on the row — the inherited obligation must be reconciled, not dropped",
  );
  assert.equal(
    integration.outcome,
    "missing",
    `expected the integration obligation to reconcile MISSING (nothing proves it); got ${integration.outcome}`,
  );
});

Then(
  "the run is out-of-balance — never balanced on an obligation cucumber names",
  function () {
    assert.equal(
      isBalanced(ldg020Reconciliation),
      false,
      `expected the run to be OUT-OF-BALANCE — cucumber names an integration tier that nothing ` +
        `proves — but the ledger read it as BALANCED. That is the false-green this scenario exists to close.`,
    );
  },
);

let ldg021Reconciliation: EvidenceReconciliation;
let ldg021UntaggedName: string;

Given(
  "a corpus with one @SCN-tagged scenario, proven and passing, and one scenario carrying no @SCN",
  function () {
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  Scenario: beta must never lose the customer's money
    Given a payment
    When it is processed twice
    Then the customer is charged once
`;
    ldg021UntaggedName = "beta must never lose the customer's money";

    scenarios = parseScenarios(source);
    const untagged = parseUntaggedScenarios(source);
    assert.deepEqual(
      untagged,
      [ldg021UntaggedName],
      "the fixture must contain exactly the one untagged scenario",
    );

    evidenceObservations = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed", locator: "a.test.ts" },
    ];
    ldg021Reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, untagged, false, false);
  },
);

When("the ledger reconciles that corpus", function () {
  assert.ok(ldg021Reconciliation, "the reconciliation must exist");
});

Then(
  "the untagged scenario has its own out-of-balance row, reconciling no-scn-code",
  function () {
    const row = ldg021Reconciliation.ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === ldg021UntaggedName,
    );
    assert.ok(
      row,
      `expected the untagged scenario "${ldg021UntaggedName}" to have its OWN row — it is a real ` +
        `scenario cucumber runs, not a phantom and not suspense — but the ledger has no row for it.`,
    );
    assert.equal(row.kind, "scenario", "the untagged scenario is an ORDINARY Scenario Reconciliation");
    assert.equal(row.verdict, "out-of-balance");
    assert.deepEqual(
      row.qualityCheckReconciliations.map((o: QualityCheckReconciliation) => o.outcome),
      ["no-scn-code"],
      "the obligation has no @SCN code for an observation to link to — the debit twin of cites-no-scenario",
    );
  },
);

Then(
  "the run is out-of-balance — a scenario the ledger cannot link is never a clean run",
  function () {
    assert.equal(
      isBalanced(ldg021Reconciliation.ledger),
      false,
      `expected the run to be OUT-OF-BALANCE — a scenario carrying no @SCN can never be proven, so ` +
        `the ledger cannot certify this run clean — but isBalanced read it as BALANCED. That is the ` +
        `false-green this scenario exists to close.`,
    );
  },
);

let ldgPostingLedger: EvidenceReconciliation;
let ldgPostingObservations: EvidenceObservation[];
let ldg022ExpectedAccount: Map<EvidenceObservation, string>;
let ldg022PendingCredit: EvidenceObservation;

function ldg022UncitedAndPhantomCredits(): Record<
  "phantom" | "uncited" | "broken" | "citedFitnessCredit" | "uncitedFitnessCredit",
  EvidenceObservation
> {
  return {
    phantom: {
      scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed", locator: "d.test.ts",
    },
    uncited: {
      scnId: null, qualityCheck: "unit", status: "passed", locator: "e.test.ts",
    },
    broken: {
      scnId: null, qualityCheck: "unit", status: "failed", broken: true,
      locator: "f.test.ts", message: "failed to collect",
    },
    citedFitnessCredit: {
      scnId: "SCN-AAA-004",
      qualityCheck: "fitness", staticCheck: "lint:named", exists: true, enforcedOverRealSource: true,
    },
    uncitedFitnessCredit: {
      qualityCheck: "fitness", staticCheck: "lint:nobody-cites-this", exists: true, enforcedOverRealSource: false,
    },
  };
}

const LDG022_SOURCE = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: a satisfied credit
    Given a thing

  @unit @SCN-AAA-002
  Scenario: a no-evidence-obligation credit at a check no scenario names
    Given a thing

  @unitpending @SCN-AAA-003
  Scenario: a pending-cited credit
    Given a thing

  @fitness @SCN-AAA-004
  Scenario: the fitness scenario nothing but its tag declares
`;

Given(
  "a run whose credits span every shape — satisfied, no-evidence-obligation, pending-cited, phantom, uncited, broken, a cited fitness check and an uncited one",
  function () {
    scenarios = parseScenarios(LDG022_SOURCE);

    const satisfied: EvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed", locator: "a.test.ts",
    };
    const noEvidenceObligation: EvidenceObservation = {
      scnId: "SCN-AAA-002", qualityCheck: "integration", status: "passed", locator: "b.test.ts",
    };
    ldg022PendingCredit = {
      scnId: "SCN-AAA-003", qualityCheck: "unit", status: "passed", locator: "c.test.ts",
    };
    const { phantom, uncited, broken, citedFitnessCredit, uncitedFitnessCredit } =
      ldg022UncitedAndPhantomCredits();

    ldgPostingObservations = [satisfied, noEvidenceObligation, ldg022PendingCredit,
      phantom, uncited, broken, citedFitnessCredit, uncitedFitnessCredit];
    evidenceObservations = ldgPostingObservations;

    ldg022ExpectedAccount = new Map<EvidenceObservation, string>([
      [satisfied, "SCN-AAA-001"],
      [noEvidenceObligation, "SCN-AAA-002"],
      [ldg022PendingCredit, "SCN-AAA-003"],
      [phantom, "SCN-ZZZ-999"],
      [uncited, "(no scenario)"],
      [broken, "(no scenario)"],
      [citedFitnessCredit, "SCN-AAA-004"],
      [uncitedFitnessCredit, "(no scenario)"],
    ]);
  },
);

When("the ledger reconciles that run", function () {
  ldgPostingLedger = evidenceReconciliationOf(scenarios, ldgPostingObservations, [], false, false);
});

const ldg022AccountsHolding = (obs: EvidenceObservation): string[] =>
  ldgPostingLedger.ledger.scenarioReconciliations
    .filter((r: ScenarioReconciliation) => (r.evidenceObservations ?? []).includes(obs))
    .map((r: ScenarioReconciliation) => r.scnId);

Then("every evidence observation posts to exactly one ledger account", function () {
  for (const obs of ldgPostingObservations) {
    const accounts = ldg022AccountsHolding(obs);
    assert.equal(
      accounts.length,
      1,
      `expected the credit ${JSON.stringify(obs)} to post to EXACTLY ONE ledger account, but it ` +
        `posted to ${accounts.length} (${JSON.stringify(accounts)}). An entry that posts nowhere ` +
        `CEASES TO EXIST — the double-entry invariant "every entry posts somewhere" must be ` +
        `structurally expressible, and a double-post is a second copy of the same fact.`,
    );
  }
  const posted = ldgPostingLedger.ledger.scenarioReconciliations.flatMap(
    (r: ScenarioReconciliation) => r.evidenceObservations ?? [],
  );
  assert.equal(
    posted.length,
    ldgPostingObservations.length,
    `expected the ledger to hold EXACTLY the ${ldgPostingObservations.length} credits the run ` +
      `produced; it holds ${posted.length}`,
  );
});

Then("each credit is findable in the account its citation names", function () {
  for (const [obs, expected] of ldg022ExpectedAccount) {
    assert.deepEqual(
      ldg022AccountsHolding(obs),
      [expected],
      `expected the credit ${JSON.stringify(obs)} to be findable in account "${expected}" — the ` +
        `account is what the credit CITES, never what it reconciles to.`,
    );
  }
});

Then(
  "the credit citing a pending quality-check is posted and findable",
  function () {
    const account = ldgPostingLedger.ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === "SCN-AAA-003",
    );
    assert.ok(account, "expected an account for the pending-naming scenario SCN-AAA-003");
    assert.deepEqual(
      account.evidenceObservations,
      [ldg022PendingCredit],
      `expected the pending-cited credit to POST to SCN-AAA-003's account and be findable there. ` +
        `With nowhere for a posted entry to sit it simply CEASED TO EXIST. A misclassification ` +
        `should MISFILE an entry, not vaporise it.`,
    );
  },
);

Then(
  "the run's verdict and reconciling items are unchanged — posting classifies nothing",
  function () {
    assert.deepEqual(
      ldgPostingLedger.ledger.scenarioReconciliations.map((r: ScenarioReconciliation) => [
        r.scnId,
        r.verdict,
        r.reconcilingItems.map((i: QualityCheckReconciliation) => i.outcome),
      ]),
      [
        ["SCN-AAA-001", "balanced", []],
        ["SCN-AAA-002", "out-of-balance", ["missing", "no-evidence-obligation"]],
        ["SCN-AAA-003", "out-of-balance", ["no-evidence-obligation"]],
        ["SCN-AAA-004", "balanced", []],
        ["SCN-ZZZ-999", "out-of-balance", ["cites-unknown-scenario"]],
        ["(no scenario)", "out-of-balance", ["broken", "cites-no-scenario", "cites-no-scenario"]],
      ],
      "posting must not add, drop or retype a single reconciling item — an entry posts here " +
        "whatever it later reconciles to. Posting is NOT classifying.",
    );
    assert.equal(
      isBalanced(ldgPostingLedger.ledger),
      false,
      "the whole-run verdict — and so the exit code — is unchanged by this slice",
    );
  },
);

let ldg035Ledger: Ledger;
let ldg035Credit: FitnessEvidenceObservation;

Given(
  "two fitness scenarios {string} and {string} whose rows share the retired characteristic word {string}",
  function (firstScn: string, secondScn: string, check: string) {
    void check;
    const source = [
      "@AAA",
      "Feature: alpha",
      "",
      `  @fitness @${firstScn}`,
      "  Scenario: the first row raising the shared check",
      "",
      `  @fitness @${secondScn}`,
      "  Scenario: the second row raising the shared check",
    ].join("\n");
    scenarios = parseScenarios(source);
  },
);

Given(
  "a fitness credit citing only {string}",
  function (cited: string) {
    ldg035Credit = {
      scnId: cited,
      qualityCheck: "fitness",
      staticCheck: "lint:complexity",
      exists: true,
      enforcedOverRealSource: true,
    };
    evidenceObservations = [ldg035Credit];
  },
);

When("the ledger reconciles that shared-check run", function () {
  ldg035Ledger = reconcile(scenarios, evidenceObservations, []);
});

Then(
  "the row {string} reconciles satisfied, holding the credit",
  function (scnId: string) {
    const row = ldg035Ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === scnId,
    );
    const item = (row?.qualityCheckReconciliations ?? []).find(
      (i: QualityCheckReconciliation) => i.qualityCheck === "fitness",
    );
    assert.deepEqual(
      [item?.qualityCheck, item?.outcome],
      ["fitness", "satisfied"],
      `expected the cited row "${scnId}" to reconcile satisfied; got ${JSON.stringify(item)}`,
    );
    assert.equal(
      item?.evidenceObservation,
      ldg035Credit,
      `expected the cited row "${scnId}" to hold the credit that names it`,
    );
  },
);

Then(
  "the row {string} reconciles missing, holding no credit",
  function (scnId: string) {
    const row = ldg035Ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === scnId,
    );
    const item = (row?.qualityCheckReconciliations ?? []).find(
      (i: QualityCheckReconciliation) => i.qualityCheck === "fitness",
    );
    assert.deepEqual(
      [item?.qualityCheck, item?.outcome],
      ["fitness", "missing"],
      `expected the uncited row "${scnId}" to reconcile missing; got ${JSON.stringify(item)}`,
    );
    assert.equal(
      item?.evidenceObservation,
      undefined,
      `expected the uncited row "${scnId}" to hold NO Evidence Observation — the credit posted ` +
        `to "${ldg035Credit.scnId}", never here`,
    );
  },
);

let ldg023ExpectedAccount: Map<EvidenceObligation, string>;
let ldg023Obligations: EvidenceObligation[];
let ldg023PendingObligation: EvidenceObligation;

Given(
  "a run whose scenarios raise obligations of every shape — a runtime obligation, a fitness obligation carrying its bare check, and a pending one",
  function () {
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: a runtime obligation
    Given a thing

  @integration @SCN-AAA-002
  Scenario: a runtime obligation at another check
    Given a thing

  @unitpending @SCN-AAA-003
  Scenario: a pending obligation that earns no reconciled row
    Given a thing

  @fitness @SCN-AAA-004
  Scenario: a fitness obligation its configured row names
`;
    scenarios = parseScenarios(source);

    const namedOf = (scnId: string): EvidenceObligation[] =>
      scenarios.find((s: Scenario) => s.scnId === scnId)!.evidenceObligations;

    const [aaa001Unit] = namedOf("SCN-AAA-001");
    const [aaa002Integration] = namedOf("SCN-AAA-002");
    ldg023PendingObligation = namedOf("SCN-AAA-003")[0]!;
    const [aaa004Fitness] = namedOf("SCN-AAA-004");

    ldg023Obligations = [aaa001Unit!, aaa002Integration!, ldg023PendingObligation, aaa004Fitness!];

    ldg023ExpectedAccount = new Map<EvidenceObligation, string>([
      [aaa001Unit!, "SCN-AAA-001"],
      [aaa002Integration!, "SCN-AAA-002"],
      [ldg023PendingObligation, "SCN-AAA-003"],
      [aaa004Fitness!, "SCN-AAA-004"],
    ]);

    ldgPostingObservations = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed", locator: "a.test.ts" },
      { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed", locator: "d.test.ts" },
      { scnId: null, qualityCheck: "unit", status: "passed", locator: "e.test.ts" },
    ];
    evidenceObservations = ldgPostingObservations;
  },
);

const ldg023AccountsHolding = (obligation: EvidenceObligation): string[] =>
  ldgPostingLedger.ledger.scenarioReconciliations
    .filter((r: ScenarioReconciliation) => (r.evidenceObligations ?? []).includes(obligation))
    .map((r: ScenarioReconciliation) => r.scnId);

Then("every evidence obligation posts to its own scenario's account", function () {
  for (const obligation of ldg023Obligations) {
    assert.deepEqual(
      ldg023AccountsHolding(obligation),
      [ldg023ExpectedAccount.get(obligation)],
      `the debit ${JSON.stringify(obligation)} must post to EXACTLY ONE account — the scenario ` +
        `that named it. Every entry posts somewhere, and to one place.`,
    );
  }

  const posted = ldgPostingLedger.ledger.scenarioReconciliations.flatMap(
    (r: ScenarioReconciliation) => r.evidenceObligations ?? [],
  );
  assert.equal(
    posted.length,
    ldg023Obligations.length,
    `expected the ledger to hold EXACTLY the ${ldg023Obligations.length} debits the run named`,
  );
});

Then("each debit is findable on its account, keyed by quality-check", function () {
  const accountFor = (scnId: string): ScenarioReconciliation | undefined =>
    ldgPostingLedger.ledger.scenarioReconciliations.find((r: ScenarioReconciliation) => r.scnId === scnId);

  const findDebit = (scnId: string, qualityCheck: string): EvidenceObligation | undefined =>
    (accountFor(scnId)?.evidenceObligations ?? []).find(
      (o: EvidenceObligation) => o.qualityCheck === qualityCheck,
    );

  assert.ok(findDebit("SCN-AAA-001", "unit"), "the runtime debit is findable by quality-check");
  assert.deepEqual(
    findDebit("SCN-AAA-004", "fitness"),
    { qualityCheck: "fitness" },
    "the fitness debit is findable by quality-check, and it is the WHOLE obligation: one @fitness " +
      "scenario is one check, keyed by its own @SCN, so it names no characteristic (3F-3570)",
  );
  assert.ok(findDebit("SCN-AAA-002", "integration"), "each scenario's own debit is on its own account");

  assert.deepEqual(accountFor("SCN-ZZZ-999")?.evidenceObligations, [], "a phantom names nothing");
  assert.deepEqual(accountFor("(no scenario)")?.evidenceObligations, [], "suspense names nothing");
});

Then(
  "the pending obligation is posted and findable, though it earns no reconciled row",
  function () {
    const account = ldgPostingLedger.ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === "SCN-AAA-003",
    );
    assert.deepEqual(
      ldg023AccountsHolding(ldg023PendingObligation),
      ["SCN-AAA-003"],
      "THE DEBIT-SIDE MIRROR of the load-bearing credit: a pending obligation partitions off " +
        "BEFORE the observation match and earns no QualityCheckReconciliation at all. It must " +
        "post ANYWAY — posting is not classifying.",
    );
    assert.deepEqual(
      account?.qualityCheckReconciliations,
      [],
      "...and it STILL earns no reconciled row. What pending DOES on the ledger is unchanged " +
        "by this slice.",
    );
  },
);

Then(
  "the run's verdict and reconciling items are unchanged — debit-posting classifies nothing",
  function () {
    assert.deepEqual(
      ldgPostingLedger.ledger.scenarioReconciliations.map((r: ScenarioReconciliation) => [
        r.scnId,
        r.verdict,
        r.reconcilingItems.map((i: QualityCheckReconciliation) => i.outcome),
      ]),
      [
        ["SCN-AAA-001", "balanced", []],
        ["SCN-AAA-002", "out-of-balance", ["missing"]],
        ["SCN-AAA-003", "balanced", []],
        ["SCN-AAA-004", "out-of-balance", ["missing"]],
        ["SCN-ZZZ-999", "out-of-balance", ["cites-unknown-scenario"]],
        ["(no scenario)", "out-of-balance", ["cites-no-scenario"]],
      ],
      "posting must not add, drop or retype a single reconciling item — a debit posts here " +
        "whatever it later reconciles to. Posting is NOT classifying.",
    );
    assert.equal(
      isBalanced(ldgPostingLedger.ledger),
      false,
      "the whole-run verdict — and so the exit code — is unchanged by this slice",
    );
  },
);

let ldg026ScnId: string;

let ldgDebitSubject:
  | { reconciliation: QualityCheckReconciliation; expectedObligation: EvidenceObligation }
  | undefined;

Given(
  "a scenario {string} requiring @unit with no matching evidence observation",
  function (scnId: string) {
    ldg026ScnId = scnId;
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
    ldgPostingObservations = [];
  },
);

function ldg026UnitReconciliation(): QualityCheckReconciliation {
  const row = ldgPostingLedger.ledger.scenarioReconciliations.find(
    (r: ScenarioReconciliation) => r.scnId === ldg026ScnId,
  );
  assert.ok(row, `expected a ledger row for ${ldg026ScnId}`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: QualityCheckReconciliation) => o.qualityCheck === "unit",
  );
  assert.ok(
    qcr,
    `expected a unit Quality Check Reconciliation on ${ldg026ScnId}; got ${JSON.stringify(row.qualityCheckReconciliations)}`,
  );
  return qcr;
}

Then("its unit Quality Check Reconciliation has outcome {string}", function (outcome: string) {
  const reconciliation = ldg026UnitReconciliation();
  ldgDebitSubject = { reconciliation, expectedObligation: { qualityCheck: "unit" } };
  assert.equal(
    reconciliation.outcome,
    outcome,
    `expected ${ldg026ScnId}'s unit reconciliation to read "${outcome}"`,
  );
});

Then("it carries the evidence obligation it reconciles \\(the debit side)", function () {
  assert.ok(
    ldgDebitSubject,
    "the debit-side subject reconciliation must be established by a preceding outcome step",
  );
  assert.deepEqual(
    ldgDebitSubject.reconciliation.evidenceObligation,
    ldgDebitSubject.expectedObligation,
    `expected the missing reconciliation to carry its evidence obligation (the debit side); got ${JSON.stringify(ldgDebitSubject.reconciliation.evidenceObligation)}`,
  );
});

Then("it carries no evidence observation \\(the credit side is absent)", function () {
  const observation = (ldg026UnitReconciliation() as { evidenceObservation?: unknown })
    .evidenceObservation;
  assert.equal(
    observation,
    undefined,
    `expected the missing reconciliation to carry NO evidence observation (credit side absent); got ${JSON.stringify(observation)}`,
  );
});

Then("the JSON projects that evidence obligation on the reconciliation", function () {
  const json = JSON.parse(renderJson(ldgPostingLedger, CTX));
  const row = json.ledger.scenarioReconciliations.find(
    (r: { scnId: string }) => r.scnId === ldg026ScnId,
  );
  assert.ok(row, `expected the JSON to carry a row for ${ldg026ScnId}`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: { qualityCheck?: string }) => o.qualityCheck === "unit",
  );
  assert.ok(qcr, `expected the JSON row to carry a unit Quality Check Reconciliation`);
  assert.deepEqual(
    qcr.evidenceObligation,
    { qualityCheck: "unit" },
    `expected the JSON to project the evidence obligation on the reconciliation; got ${JSON.stringify(qcr)}`,
  );
});

let ldg027ScnId: string;

Given(
  "a scenario {string} cited by a credit at a quality-check it never named",
  function (scnId: string) {
    ldg027ScnId = scnId;
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
    ldgPostingObservations = [
      { qualityCheck: "integration", scnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    ];
  },
);

function ldg027NoEvidenceObligationReconciliation(): QualityCheckReconciliation {
  const row = ldgPostingLedger.ledger.scenarioReconciliations.find(
    (r: ScenarioReconciliation) => r.scnId === ldg027ScnId,
  );
  assert.ok(row, `expected a ledger row for ${ldg027ScnId}`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: QualityCheckReconciliation) => o.outcome === "no-evidence-obligation",
  );
  assert.ok(
    qcr,
    `expected a no-evidence-obligation Quality Check Reconciliation on ${ldg027ScnId}; got ${JSON.stringify(row.qualityCheckReconciliations)}`,
  );
  return qcr;
}

Then("its Quality Check Reconciliation has outcome {string}", function (outcome: string) {
  assert.equal(
    ldg027NoEvidenceObligationReconciliation().outcome,
    outcome,
    `expected ${ldg027ScnId}'s reconciliation to read "${outcome}"`,
  );
});

Then("it carries the evidence observation it reconciles \\(the credit side)", function () {
  const qcr = ldg027NoEvidenceObligationReconciliation();
  assert.deepEqual(
    qcr.evidenceObservation,
    { qualityCheck: "integration", scnId: ldg027ScnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    `expected the no-evidence-obligation reconciliation to carry its evidence observation (the credit side); got ${JSON.stringify(qcr.evidenceObservation)}`,
  );
});

Then("it carries no evidence obligation \\(the debit side is absent)", function () {
  const obligation = (ldg027NoEvidenceObligationReconciliation() as { evidenceObligation?: unknown })
    .evidenceObligation;
  assert.equal(
    obligation,
    undefined,
    `expected the no-evidence-obligation reconciliation to carry NO evidence obligation (debit side absent); got ${JSON.stringify(obligation)}`,
  );
});

Then("the JSON projects that evidence observation on the reconciliation", function () {
  const json = JSON.parse(renderJson(ldgPostingLedger, CTX));
  const row = json.ledger.scenarioReconciliations.find(
    (r: { scnId: string }) => r.scnId === ldg027ScnId,
  );
  assert.ok(row, `expected the JSON to carry a row for ${ldg027ScnId}`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: { outcome?: string }) => o.outcome === "no-evidence-obligation",
  );
  assert.ok(qcr, `expected the JSON row to carry a no-evidence-obligation Quality Check Reconciliation`);
  assert.deepEqual(
    qcr.evidenceObservation,
    { qualityCheck: "integration", scnId: ldg027ScnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    `expected the JSON to project the evidence observation on the reconciliation; got ${JSON.stringify(qcr)}`,
  );
});

const LDG028_ABSENT_CHECK = "ldg028-absent-guard";
const LDG028_ABSENT_HANDLE = `lint:${LDG028_ABSENT_CHECK}`;
let ldg028ScnId: string;

Given(
  "a scenario {string} requiring a fitness check absent from both package.json and CI",
  function (scnId: string) {
    ldg028ScnId = scnId;
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @fitness @${scnId}`,
      "    Scenario: a fixture scenario",
    ].join("\n");
    scenarios = parseScenarios(
      feature);
    ldgPostingObservations = [
      {
        scnId,
        qualityCheck: "fitness",
        staticCheck: LDG028_ABSENT_HANDLE,
        exists: false,
        enforcedOverRealSource: false,
      },
    ];
  },
);

function ldg028LintReconciliation(): QualityCheckReconciliation {
  const row = ldgPostingLedger.ledger.scenarioReconciliations.find(
    (r: ScenarioReconciliation) => r.scnId === ldg028ScnId,
  );
  assert.ok(row, `expected a ledger row for ${ldg028ScnId}`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: QualityCheckReconciliation) => o.qualityCheck === "fitness",
  );
  assert.ok(
    qcr,
    `expected a fitness Quality Check Reconciliation on ${ldg028ScnId}; got ${JSON.stringify(row.qualityCheckReconciliations)}`,
  );
  return qcr;
}

Then("its fitness Quality Check Reconciliation has outcome {string}", function (outcome: string) {
  const reconciliation = ldg028LintReconciliation();
  ldgDebitSubject = {
    reconciliation,
    expectedObligation: { qualityCheck: "fitness" },
  };
  assert.equal(
    reconciliation.outcome,
    outcome,
    `expected ${ldg028ScnId}'s fitness reconciliation to read "${outcome}"`,
  );
});

Then(
  "it carries no evidence observation — an absent guard's \\{exists:false} is an absence, not an observation",
  function () {
    const observation = (ldg028LintReconciliation() as { evidenceObservation?: unknown })
      .evidenceObservation;
    assert.equal(
      observation,
      undefined,
      `expected the fitness missing reconciliation to carry NO evidence observation — an absent guard's {exists:false} is an absence; got ${JSON.stringify(observation)}`,
    );
  },
);

let ldg029UntaggedName: string;

Given("a corpus with one scenario carrying no @SCN", function () {
  const source = `@LDG
Feature: fixture

  Scenario: an untagged scenario carrying no @SCN
    Given a step
`;
  ldg029UntaggedName = "an untagged scenario carrying no @SCN";
  scenarios = parseScenarios(source);
  const untagged = parseUntaggedScenarios(source);
  assert.deepEqual(
    untagged,
    [ldg029UntaggedName],
    "the fixture must contain exactly the one untagged scenario",
  );
  ldg021Reconciliation = evidenceReconciliationOf(scenarios, [], untagged, false, false);
});

function ldg029Reconciliation(): QualityCheckReconciliation {
  const row = ldg021Reconciliation.ledger.scenarioReconciliations.find(
    (r: ScenarioReconciliation) => r.scnId === ldg029UntaggedName,
  );
  assert.ok(row, `expected a ledger row for the untagged scenario "${ldg029UntaggedName}"`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: QualityCheckReconciliation) => o.outcome === "no-scn-code",
  );
  assert.ok(
    qcr,
    `expected a no-scn-code Quality Check Reconciliation on the untagged scenario; got ${JSON.stringify(row.qualityCheckReconciliations)}`,
  );
  return qcr;
}

Then(
  "the untagged scenario's Quality Check Reconciliation has outcome {string}",
  function (outcome: string) {
    const reconciliation = ldg029Reconciliation();
    assert.equal(
      reconciliation.outcome,
      outcome,
      `expected the untagged scenario's reconciliation to read "${outcome}"`,
    );
  },
);

Then(
  "it carries a scenario-scope evidence obligation — empty, with no qualityCheck and no staticCheck",
  function () {
    const obligation = (ldg029Reconciliation() as { evidenceObligation?: unknown })
      .evidenceObligation;
    assert.deepEqual(
      obligation,
      {},
      `expected the no-scn-code reconciliation to carry a scenario-scope evidence obligation {} (the debit side); got ${JSON.stringify(obligation)}`,
    );
  },
);

Then("it carries no evidence observation", function () {
  const observation = (ldg029Reconciliation() as { evidenceObservation?: unknown })
    .evidenceObservation;
  assert.equal(
    observation,
    undefined,
    `expected the no-scn-code reconciliation to carry NO evidence observation; got ${JSON.stringify(observation)}`,
  );
});

Then(
  "the scenario-level evidence obligations stay empty, so the census and markdown are unchanged",
  function () {
    const row = ldg021Reconciliation.ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === ldg029UntaggedName,
    );
    assert.ok(row, `expected a ledger row for the untagged scenario "${ldg029UntaggedName}"`);
    assert.deepEqual(
      row.evidenceObligations,
      [],
      `expected the untagged scenario's scenario-level evidenceObligations to stay EMPTY (census untouched); got ${JSON.stringify(row.evidenceObligations)}`,
    );
    const markdown = renderMarkdown(ldg021Reconciliation, CTX);
    assert.ok(
      markdown.includes(ldg029UntaggedName),
      "expected the renderer to carry the untagged scenario by name in the markdown",
    );
  },
);
