/**
 * Step definitions for features/ledger.feature (the @LDG runtime spine).
 *
 * @SCN-LDG-001 / @SCN-LDG-002 / @SCN-LDG-003 / @SCN-LDG-005 — bidirectional
 * evidence markers for features/ledger.feature (Evidence Manifesto §9). The
 * @integration arm exercises the parse → reconcile → render wiring end-to-end
 * (cross-component), complementing the @unit tests that prove reconcile() in
 * isolation.
 *
 * The verdict model reframes the Then assertions onto the binary scenario VERDICT
 * (balanced | out-of-balance) and the LIST of reconciling items. Assertions are
 * ROW-SCOPED to the scenario's own row CELLS — not a bare regex over the whole
 * report, which would be toothless (the summary line names every verdict, so a
 * loose /out-of-balance/ or /balanced/ match would pass regardless of the row's
 * actual verdict). Cell-scoping gives the assertions
 * teeth: each reds under a wrong-verdict mutation of the reconcile core.
 */

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
import type { Scenario, EvidenceObligation, EvidenceObservation, StaticCheckEvidenceObservation, Ledger, ScenarioReconciliation, QualityCheckReconciliation, EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";
// The whole-run soundness predicate (@SCN-LDG-018), imported by MODULE PATH rather than from the
// package barrel. The barrel re-exports it too (3F-1651 put it there); the module path is the
// in-repo route, and deep module imports into packages/ are the established shape in these step
// files (cliBalance.steps.ts, report.steps.ts, pendingItems.steps.ts).
import { hasBrokenEvidence, isBalanced } from "../../packages/core/src/domain/ledger.js";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;
// The reconciliation the When produced, retained alongside its rendering (@SCN-LDG-017).
let reconciliation: Ledger;

// A RunContext fixture — the sibling provenance arg renderMarkdown now requires.
// These @LDG assertions are ROW-SCOPED to the verdict table, so the
// provenance header above it leaves them byte-green (the Scenario-CRUD Read).
const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

/**
 * Extract a scenario's OWN ledger row, split into its cells. The ledger
 * row is `| <scnId> | <verdict> | <reconciling items> |`; this returns the verdict and
 * items CELLS so an assertion scopes to the row, not the whole report.
 *
 * Matched on the FIRST cell equalling the scnId — NOT a bare `includes(scnId)` — so the
 * scnId mention in the "Out-of-balance by feature" cut (`| LDG | 1 | SCN-LDG-004 |`,
 * which the reformat moved ABOVE the ledger) can't shadow the ledger row.
 */
function rowCells(scnId: string): { verdict: string; items: string } {
  // Scope to the `## Scenario Reconciliations` section: the reformat moved the
  // ledger to the end and added summary cuts above it (the by-feature table) that
  // mention the scnId, so search only the ledger and match the scnId in the FIRST cell.
  const ledgerStart = markdown.indexOf("## Scenario Reconciliations");
  const ledger = ledgerStart >= 0 ? markdown.slice(ledgerStart) : markdown;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").map((c) => c.trim());
    return cells[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${markdown}`);
  const cells = row.split("|").map((c) => c.trim());
  // cells: ['', scnId, verdict, items, ''].
  return { verdict: cells[2] ?? "", items: cells[3] ?? "" };
}

// @SCN-LDG-001
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

// @SCN-LDG-003
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

// @SCN-LDG-004
Given(
  "a scenario {string} requiring both unit-level and integration-level evidence",
  function (scnId: string) {
    // The two co-located tier tags produce TWO evidence obligations — the multi-obligation case.
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

// @SCN-LDG-010
Given("a zero-evidence obligation scenario {string}", function (scnId: string) {
  // No tier tag at all → ZERO evidence obligations. Its @SCN is nonetheless cited by a stray
  // credit (the next Given) — the negative twin of both-missing.
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

// @SCN-LDG-001
Given("a passing unit-level result for {string}", function (scnId: string) {
  evidenceObservations = [{ qualityCheck: "unit", scnId, status: "passed" }];
});

// @SCN-LDG-008
Given("a passing integration-level result for {string}", function (scnId: string) {
  // A passing integration credit citing a REAL scenario — but at the integration
  // quality-check, which the scenario did NOT name (it names unit). It posts to a real
  // account against no evidence obligation → no-evidence-obligation. Carries a locator (the where-to-fix, ruling Q5).
  evidenceObservations = [
    { qualityCheck: "integration", scnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
  ];
});

// @SCN-LDG-002
Given("a failing unit-level result for {string}", function (scnId: string) {
  evidenceObservations = [{ qualityCheck: "unit", scnId, status: "failed" }];
});

// @SCN-LDG-004
Given("no integration-level result for {string}", function (scnId: string) {
  // Leave the observed side carrying NO integration result for this scenario — its
  // required integration evidence is missing, so it reconciles to required-but-
  // missing ALONGSIDE the failing-unit's failing. Defensive: drop any
  // integration result if a prior step added one (here none has).
  evidenceObservations = (evidenceObservations ?? []).filter(
    (o) => !(o.qualityCheck === "integration" && "scnId" in o && o.scnId === scnId)
  );
});

// @SCN-LDG-009
Given("no results are observed", function () {
  // The both-missing case: NO evidence observation cites this scenario — the observed
  // side is entirely empty, so a zero-evidence obligation scenario reconciles to zero rows
  // on BOTH sides. Distinct phrasing from "no result matches {string}" (which seeds a
  // stray credit for a DIFFERENT scenario) — here nothing is observed at all.
  evidenceObservations = [];
});

// @SCN-LDG-003
Given("no result matches {string}", function (scnId: string) {
  // A required ledger entry never recorded: the only observed result is for a
  // DIFFERENT scenario, so nothing matches SCN-LDG-003 at integration level. This
  // pins "no MATCHING result" (the join keys on scnId), not merely "no results".
  evidenceObservations = [
    { qualityCheck: "integration", scnId: "SCN-LDG-OTHER", status: "passed" },
  ];
});

// @SCN-LDG-006
Given(
  "a passing unit-level result citing the phantom scenario {string}",
  function (scnId: string) {
    // A credit citing an @SCN id that NO scenario matches — a phantom credit
    // (posting to a non-existent account). It carries a locator (the where-to-fix,
    // ruling Q5) so the phantom row can surface it on its cites-unknown-scenario item.
    evidenceObservations = [
      { qualityCheck: "unit", scnId, status: "passed", locator: "src/phantom.test.ts" },
    ];
  }
);

// @SCN-LDG-034 — the FITNESS-axis twin of SCN-LDG-006's runtime credit above: a lint credit
// citing an @SCN no scenario carries also posts to the phantom account. It carries a value
// for the check that ran — its whole where-to-fix — and, deliberately, a `locator` too: no
// StaticCheckEvidenceObservation route ever populates one, but the shape can carry one (the same
// width-subtyping corner outcomeRules.test.ts's @SCN-LDG-034 @unit arm pins), and the item
// must not surface it even so. The intersection type states what an external caller may
// legally hand in; it is not a cast past the contract (see that arm's docblock at length).
Given(
  "a passing lint credit citing the phantom scenario {string} naming the check {string}",
  function (scnId: string, staticCheck: string) {
    const credit: StaticCheckEvidenceObservation & { locator: string } = {
      qualityCheck: "lint",
      staticCheck,
      scnId,
      exists: true,
      enforcedOverRealSource: true,
      locator: "packages/core/src/domain/fitnessChecks.ts",
    };
    evidenceObservations = [credit];
  }
);

// @SCN-LDG-007
Given("a passing unit-level result carrying no scenario id", function () {
  // A runtime credit carrying NO @SCN anchor at all (scnId null) — it cites no scenario,
  // so it posts to the SUSPENSE scenario. It carries a locator (the where-to-fix, ruling
  // Q5) so the suspense row can surface it on its cites-no-scenario item.
  evidenceObservations = [
    { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
  ];
});

// @SCN-LDG-011 — the cited scenario for the tag-derivation headline. The scnId is
// stored so the later "citing it" / "the scenario is balanced" steps refer to the same one.
let ldg011ScnId: string;

// @SCN-LDG-011
Given("a scenario tagged @e2e", function () {
  // Its @e2e tag raises a single e2e evidence obligation — the obligation a cucumber-sourced
  // observation must discharge once its level is DERIVED from this same tag.
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

// @SCN-LDG-011
Given("a passing cucumber observation citing it", function () {
  // A passing cucumber JSON report citing the @e2e scenario, run through the REAL
  // parser with the JS-ecosystem fallback ("integration") — so this @integration arm
  // exercises the tag-derivation seam end-to-end: the observation's level is DERIVED from
  // the scenario's own @e2e tag, NOT stamped from the fallback source level. Before the
  // fix the parser stamped "integration", so the e2e obligation went missing and the
  // integration observation was no-evidence-obligation.
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

// @SCN-LDG-011
When("the ledger reconciles the target", function () {
  // The reconciliation is RETAINED alongside its rendering (@SCN-LDG-017): a `broken` item's
  // where-to-fix payload (the collection-failed file's locator + the vitest message) lives on
  // the reconciling item, and the markdown surface that NAMES it is a later sub-issue's work —
  // so LDG-017's payload assertions read the reconciliation the pipeline produced, while its
  // "still reads missing" assertion stays row-scoped on the rendered ledger, as every other
  // @LDG scenario's. Every pre-existing step reads `markdown` exactly as before.
  reconciliation = reconcile(scenarios, evidenceObservations);
  markdown = renderMarkdown(evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false), CTX);
});

// @SCN-LDG-011
Then("the scenario is balanced", function () {
  // Row-scoped to the @e2e scenario's OWN row: its verdict cell reads balanced (and NOT
  // out-of-balance), and it carries no reconciling items — the e2e obligation is discharged
  // by the derived-e2e observation. Reds while the observation is stamped integration (the
  // obligation is then missing and the observation no-evidence-obligation → out-of-balance).
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

// @SCN-LDG-011
Then(
  "it is not reported e2e-missing with a no-evidence-obligation integration observation",
  function () {
    // The specific false-red this fix retires: row-scoped to the @e2e scenario's items cell,
    // it must carry NEITHER a missing item (the e2e obligation unmet) NOR a no-evidence-obligation item
    // (the integration observation with no obligation). Both appear together while the level is
    // taken from the source rather than the tag.
    const { items } = rowCells(ldg011ScnId);
    // Reconciling items render the outcome's canon description, not the handle (3F-1626).
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

// @SCN-LDG-012 — the cited scenario for the derivation-not-hardcode regression pin. Its
// own fixtures (distinct step text) leave LDG-011's steps byte-untouched; only the generic
// "the ledger reconciles the target" When is shared.
let ldg012ScnId: string;

// @SCN-LDG-012
Given("a scenario tagged @integration", function () {
  // Its @integration tag raises a single integration evidence obligation — the obligation a
  // cucumber-sourced observation must discharge once its level is DERIVED from this same tag.
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

// @SCN-LDG-012
Given("a passing cucumber observation citing the @integration scenario", function () {
  // A passing cucumber JSON report citing the @integration scenario, run through the REAL
  // parser with a CONTRASTING non-integration fallback ("e2e") — deliberately NOT the
  // JS-ecosystem "integration". This is the whole point of LDG-012 over the old hardcode:
  // the observation's integration level can ONLY come from DERIVING the scenario's own
  // @integration tag, never from the source fallback (the retired CUCUMBER_QUALITY_CHECK=
  // "integration" hardcode supplied integration by COINCIDENCE). If the parser ignored the tag
  // and used the fallback, the level would be e2e and the integration obligation would go
  // missing (out of balance) — which is exactly the mutation that proves this pin's teeth.
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

// @SCN-LDG-012
Then("the integration obligation is satisfied and the scenario is balanced", function () {
  // Row-scoped to the @integration scenario's OWN row: its verdict reads balanced (and NOT
  // out-of-balance) and it carries no reconciling items — the integration obligation is
  // discharged by the derived-integration observation, with NO missing item (obligation unmet)
  // and NO no-evidence-obligation item (an observation at the wrong level). Reds if the observation is
  // levelled anything but integration (missing + no-evidence-obligation → out of balance).
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

// @SCN-LDG-013 — the cited scenario for the split ACROSS RUNNERS. Its own fixtures (distinct
// step text: a vitest report AND a cucumber report) leave LDG-011/012's steps byte-untouched;
// only the generic "the ledger reconciles the target" When is shared.
let ldg013ScnId: string;

// @SCN-LDG-013
Given("a scenario tagged @unit @e2e", function () {
  // BOTH a @unit and an @e2e tier tag → TWO evidence obligations. @unit is discharged by a vitest
  // observation; @e2e by a cucumber observation whose level is DERIVED from this same @e2e tag —
  // the single-non-unit-tag case of the multi-tag ruling, the split across runners.
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

// @SCN-LDG-013
Given("a passing vitest observation citing the @unit @e2e scenario", function () {
  // A passing vitest JSON report citing the @unit @e2e scenario, run through the REAL vitest
  // reader at the JS-ecosystem unit default → a unit observation. Vitest is the unit substrate:
  // its level is NOT derived (a unit test can only prove @unit, and its JSON carries no tier tag
  // to derive from). This discharges the @unit obligation. Seeds the observed side; the cucumber
  // observation is APPENDED next so BOTH tiers are observed.
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

// @SCN-LDG-013
Given("a passing cucumber observation citing the @unit @e2e scenario", function () {
  // A passing cucumber JSON report citing the SAME @unit @e2e scenario, run through the REAL
  // cucumber reader with the JS-ecosystem "integration" fallback. deriveLevel reads the
  // scenario's own @e2e tier tag (the @unit tag is NOT a non-unit tier → inert for cucumber;
  // unit is vitest's job) → exactly ONE e2e observation. APPENDED to the vitest unit observation
  // so the observed side carries BOTH tiers: vitest→unit, cucumber→e2e — the split across runners.
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

// @SCN-LDG-013
Then(
  "both the unit and the e2e obligations are satisfied and the scenario is balanced",
  function () {
    // Row-scoped to the @unit @e2e scenario's OWN row: verdict reads balanced (and NOT
    // out-of-balance) with NO reconciling items — BOTH obligations discharged, the @unit by the
    // vitest observation and the @e2e by the derived-e2e cucumber observation. Reds if deriveLevel
    // stops deriving @e2e (e2e missing + integration no-evidence-obligation → out of balance) or if the vitest
    // observation is levelled off unit (@unit missing → out of balance).
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

// @SCN-LDG-014 — the cited scenario for the multi-tag ruling's teeth. Distinct step text keeps
// LDG-011/012/013's steps byte-untouched; only the generic "the ledger reconciles the target"
// When is shared.
let ldg014ScnId: string;

// @SCN-LDG-014
Given("a scenario tagged @integration @e2e", function () {
  // BOTH an @integration and an @e2e tier tag → TWO non-unit evidence obligations. A SINGLE
  // cucumber run must discharge BOTH — the observation's per-tier emission is derived from these
  // same two tags. The multi-tag ruling's teeth: LDG-011/012/013 were single-tier instances.
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

// @SCN-LDG-014
Given("a single passing cucumber observation citing it", function () {
  // ONE passing cucumber JSON report citing the @integration @e2e scenario, run through the REAL
  // parser with the JS-ecosystem "integration" fallback. From this SINGLE pass the parser must
  // emit ONE observation PER named non-unit tier — an integration observation AND an e2e
  // observation, same scnId — so BOTH obligations are discharged and the scenario balances.
  // Before per-tier emission the parser emitted ONE observation (the first tier), so the OTHER
  // tier went missing (and the emitted tier, when it was the wrong one, no-evidence-obligation) → out of
  // balance: exactly the red this scenario pins.
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

// @SCN-LDG-014
Then(
  "both the integration and the e2e obligations are satisfied and the scenario is balanced",
  function () {
    // Row-scoped to the @integration @e2e scenario's OWN row: verdict reads balanced (and NOT
    // out-of-balance) with NO reconciling items — BOTH non-unit obligations discharged from the
    // ONE cucumber run (integration by the integration observation, e2e by the e2e observation).
    // Reds while the parser emits a single observation: the un-emitted tier is then missing
    // (and any wrong-tier observation no-evidence-obligation) → out of balance.
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

// @SCN-LDG-015 — the NEGATIVE BOUNDARY of the general rule. Distinct step text keeps
// LDG-011/012/013/014's steps byte-untouched; only the generic When is shared.
let ldg015ScnId: string;

// @SCN-LDG-015
Given("a scenario tagged @unit only", function () {
  // ONLY a @unit tier tag → exactly ONE evidence obligation: unit. There is NO non-unit
  // obligation for a cucumber observation to discharge — the negative boundary.
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

// @SCN-LDG-015
Given("a passing cucumber observation citing the @unit-only scenario", function () {
  // A passing cucumber JSON report citing the @unit-only scenario, run through the REAL parser
  // with the JS-ecosystem "integration" fallback. deriveLevels finds NO non-unit tier tag (@unit
  // is inert for cucumber — unit is vitest's substrate, never derived), so it falls back to the
  // single caller-supplied level (integration) — a check this @unit-only scenario never named.
  // The observation therefore discharges NO obligation and is NO-EVIDENCE-OBLIGATION. Crucially it does NOT
  // discharge the @unit obligation: cucumber must never manufacture a unit discharge.
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

// @SCN-LDG-015
Then("the cucumber observation is reported no-evidence-obligation", function () {
  // Row-scoped to the @unit-only scenario's OWN row: the cucumber observation posts to this
  // scenario's account (it cites it) at a check the scenario never named → a NO-EVIDENCE-OBLIGATION
  // credit-side item (at the fallback integration level). The row's verdict is out-of-balance
  // (a no-evidence-obligation item is a non-satisfied reconciling item). Reds under a mutation that lets
  // cucumber DERIVE a unit level from the @unit tag — the observation would then DISCHARGE the
  // unit obligation (satisfied, balanced) and no no-evidence-obligation item would appear.
  const { verdict, items } = rowCells(ldg015ScnId);
  const noEvidenceObligation = items
    .split(";")
    .map((s) => s.trim())
    // The item renders the outcome's canon description, not the handle (3F-1626).
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

// @SCN-LDG-015
Then("the @unit obligation remains the scenario's only required evidence", function () {
  // Row-scoped: the scenario's ONLY named (required) obligation is unit — and it is
  // required-but-MISSING here (no vitest observation was supplied; the cucumber observation
  // discharged NOTHING). No non-unit obligation was manufactured: the only non-unit tier present
  // is the NO-EVIDENCE-OBLIGATION cucumber credit (a credit, not a named obligation). Reds under a mutation
  // that derives unit for cucumber (the unit obligation would be wrongly satisfied — no missing).
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
  // Unit is the ONLY required evidence: no non-unit tier appears as a named (missing) obligation
  // — integration is present only as the no-evidence-obligation credit, not manufactured into an obligation.
  assert.ok(
    !missing.includes("integration") && !missing.includes("e2e"),
    `expected unit to be the scenario's only required evidence; got "${missing}"`
  );
});

// @SCN-LDG-001
When("the reconciler runs", function () {
  markdown = renderMarkdown(evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false), CTX);
});

// @SCN-LDG-001
Then(
  "the ledger reports {string} as balanced with no reconciling items",
  function (scnId: string) {
    // Row-scoped + has teeth: the scenario's OWN verdict CELL must read balanced
    // and NOT out-of-balance, and its reconciling-items CELL must be empty (the
    // em-dash placeholder). Under a balanced→out-of-balance mutation the verdict
    // cell reads "out-of-balance" and the items cell lists an item, so this reds.
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

// @SCN-LDG-002, @SCN-LDG-003, @SCN-LDG-005
Then(
  "the ledger reports {string} as out of balance",
  function (scnId: string) {
    // Row-scoped to the scenario's OWN verdict cell (not a bare /out-of-balance/
    // over the whole report) — has teeth: under an out-of-balance→balanced mutation
    // the cell reads "balanced" and this reds.
    const { verdict } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
    );
  }
);

// @SCN-LDG-006
Then(
  "the ledger reports {string} as a phantom-scenario reconciliation with a cites-unknown-scenario item",
  function (scnId: string) {
    // Row-scoped to the phantom scenario's OWN ledger row: its reconciling-items cell must
    // carry the cites-unknown-scenario item (only a phantom emits it), and the report must
    // name it a phantom-scenario (the P count). Reds if no phantom row is emitted/rendered.
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

// @SCN-LDG-006
Then("the phantom-scenario {string} is out of balance", function (scnId: string) {
  // Row-scoped to the phantom scenario's OWN verdict cell — a phantom is ALWAYS out of
  // balance (it reconciles a credit against no evidence obligation).
  const { verdict } = rowCells(scnId);
  assert.match(
    verdict,
    /out-of-balance/,
    `expected phantom-scenario ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
  );
});

// @SCN-LDG-034
Then(
  "the phantom-scenario {string}'s item carries the check {string} and no locator key",
  function (scnId: string, staticCheck: string) {
    // Structural, not a markdown regex: the phantom row's OWN item carries the check it has a
    // value for (its whole where-to-fix) and omits `locator` — absent, not undefined — even
    // though a credit-shaped value could carry one. Reds under a mutant that re-admits the key.
    // Recomputed rather than read off the shared `reconciliation` fixture: "the reconciler
    // runs" (this scenario's When, shared with SCN-LDG-006/007/008) only renders `markdown`.
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

// @SCN-LDG-007
Then(
  "the ledger reports a suspense-scenario reconciliation {string} with a cites-no-scenario item",
  function (scnId: string) {
    // Row-scoped to the suspense scenario's OWN ledger row (sentinel id "(no scenario)"):
    // its reconciling-items cell must carry the cites-no-scenario item (only a suspense row
    // emits it), and the report must name it a suspense-scenario. Reds if no suspense row is
    // emitted/rendered.
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

// @SCN-LDG-007
Then("the suspense-scenario is out of balance", function () {
  // Row-scoped to the suspense scenario's OWN verdict cell — a suspense scenario is ALWAYS
  // out of balance (it reconciles a credit against no scenario at all).
  const { verdict } = rowCells("(no scenario)");
  assert.match(
    verdict,
    /out-of-balance/,
    `expected the suspense-scenario's verdict cell to read out-of-balance; got "${verdict}"`
  );
});

// @SCN-LDG-008, @SCN-LDG-010
Then(
  "the ledger reports {string} with a no-evidence-obligation item at {word}",
  function (scnId: string, qualityCheck: string) {
    // Row-scoped to the REAL scenario's OWN ledger row: its reconciling-items cell must carry
    // a no-evidence-obligation item at the named quality-check (a credit citing this real scenario at a
    // level it never named). Reds if the no-evidence-obligation credit is silently swallowed (counted as
    // attributed) rather than surfaced as a credit-side reconciling item on the row. The row's
    // verdict is out-of-balance (a no-evidence-obligation item is a non-satisfied reconciling item).
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

// @SCN-LDG-009
Then(
  "the ledger reports {string} with a both-missing item",
  function (scnId: string) {
    // Row-scoped to the scenario's OWN ledger row: its reconciling-items cell must carry a
    // both-missing item — the degenerate Quality Check Reconciliation a scenario
    // emits when it reconciles to zero rows on BOTH sides (no evidence obligation, no evidence observation).
    // Reds if the scenario is instead swept to a warnings surface (the earlier behaviour)
    // and so carries NO ledger row at all, or if it is mis-reported as any other outcome.
    const { items } = rowCells(scnId);
    // Reconciling items render the outcome's canon description, not the handle (3F-1626).
    assert.ok(
      items.includes("Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"),
      `expected ${scnId}'s reconciling items to include a both-missing item; got "${items}"`
    );
    // The warnings section has dissolved entirely — the both-missing row is its only home.
    assert.ok(
      !markdown.includes("## Warnings"),
      `expected NO "## Warnings" section (dissolved); got:\n${markdown}`
    );
  }
);

// @SCN-LDG-010
Then("{string} is not reported as both-missing", function (scnId: string) {
  // The both-missing boundary (@SCN-LDG-009): a zero-evidence obligation scenario CITED by a stray
  // credit has an evidence observation, so it is no-evidence-obligation, NOT both-missing. Row-scoped to the
  // scenario's OWN ledger row — its reconciling-items cell carries no both-missing marker.
  // (NOT a whole-report check: the trial-balance cause table legitimately names the
  // neither-side `both-missing` group at count 0 for every report.)
  const { items } = rowCells(scnId);
  assert.ok(
    !items.includes("Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"),
    `expected ${scnId} not to be reported as both-missing; got "${items}"`
  );
});

// @SCN-LDG-016 — MOST-SPECIFIC-CITATION-WINS. Two fixture scenarios: the one the grouping
// `describe` cites (the ANCESTOR) and the one a child `it` self-cites (the LEAF). Their own
// fixtures (distinct step text) leave LDG-011/012/013/014/015's steps byte-untouched; only the
// generic "the ledger reconciles the target" When is shared.
let ldg016AncestorScnId: string;
let ldg016LeafScnId: string;

/**
 * The CREDITING OBSERVATIONS for one scenario — the credit-side entries the parse arm attributed
 * to it. This is the attribution SET the LDG-016 Thens assert on: the ledger's row model carries
 * a verdict and reconciling items, NOT a per-row credit COUNT, so a spurious SECOND credit on an
 * already-satisfied obligation is invisible in the rendered row (the ancestor reads `balanced`
 * under the old reader AND the new one). Counting the credits is what gives the mirror symptom
 * teeth. The `qualityCheck !== "lint"` guard narrows the EvidenceObservation union to the runtime
 * shape (a guard observation carries no scnId).
 */
function creditsFor(scnId: string): EvidenceObservation[] {
  return (evidenceObservations ?? []).filter(
    (o) => o.qualityCheck !== "lint" && o.scnId === scnId
  );
}

// @SCN-LDG-016
Given(
  "a scenario cited by an ancestor describe and a scenario self-cited by a leaf beneath it",
  function () {
    // TWO scenarios, both @unit (one unit obligation each): the one a grouping `describe` cites
    // in its bracket, and the one a child
    // `it` cites in its OWN title. Each must end up discharged by exactly the assertion that
    // cites it — the whole point of most-specific-wins.
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

// @SCN-LDG-016
Given(
  "a passing vitest report whose one leaf self-cites and whose sibling leaf does not",
  function () {
    // A REAL-SHAPED vitest JSON report: one grouping `describe` carrying the ancestor's bracket
    // citation, two `it`s beneath it. Vitest emits BOTH names per assertion — `fullName` is the
    // ancestor PATH (describe → it, so it LEADS with the describe's citation) and `title` is the
    // assertion's OWN name. Run through the REAL vitest reader at the JS-ecosystem unit default.
    //
    //   1. The SELF-CITING leaf: its `title` cites the leaf scenario; its `fullName` leads with
    //      the ancestor's citation. First-match-on-the-concatenation SHADOWS it — the ancestor
    //      wins and the leaf's own scenario is never credited (it reconciles `missing`).
    //   2. The BARE sibling leaf: no citation of its own, so the ancestor path is the ONLY
    //      citation — it still credits the ancestor (the fallback half of the rule; this is what
    //      keeps the "describe carries the bracket, plain `it`s beneath" style working).
    const report: VitestJsonReport = {
      testResults: [
        {
          name: "packages/core/src/citation.test.ts",
          assertionResults: [
            {
              // FIX TO CANON (3F-2368): the leaf's self-citation was written `@SCN-…` —
              // Cucumber's step-block marker form — in a fixture standing for a VITEST title,
              // where canon's form is the bracket (evidence-manifesto.md). Only the
              // sigil-agnostic reader made the fixture pass. The assertions below are
              // unchanged; the property proved is unchanged.
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

// @SCN-LDG-016
Then(
  "the self-citing leaf is attributed to the leaf-cited scenario, not to the ancestor",
  function () {
    // ATTRIBUTION-SET IDENTITY, not a balance boolean: the leaf-cited scenario must carry EXACTLY
    // ONE crediting observation — the self-citing leaf's. Under the shadowing reader the ancestor's
    // bracket citation wins the first match, so the leaf-cited scenario carries ZERO credits and
    // reconciles `missing`: this reds with `got 0`. (A "the leaf scenario is balanced" check would
    // red too, but says nothing about WHOSE credit balanced it — the count is what pins the
    // attribution.) Its `status`/`qualityCheck` are pinned too: a `passed` unit credit, so the
    // scenario's unit obligation is genuinely DISCHARGED by this assertion.
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

// @SCN-LDG-016
Then(
  "the ancestor scenario carries exactly one crediting observation — the bare sibling leaf",
  function () {
    // The MIRROR SYMPTOM, and the reason a balance boolean has no teeth here: under the shadowing
    // reader the ancestor takes TWO credits (its own bare sibling leaf AND the self-citing leaf it
    // stole) for its ONE unit obligation — yet still renders `balanced`, so only a COUNT catches
    // it. Exactly one credit ⇒ the spurious double-credit is gone and the ancestor is discharged
    // by the assertion that actually cites it. Reds with `got 2` under the unfixed reader.
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

// @SCN-LDG-016
Then("both scenarios are balanced", function () {
  // The through-the-ledger confirmation: with the credits attributed to the scenarios that cite
  // them, BOTH unit obligations are discharged and BOTH rows read balanced with no reconciling
  // items. Row-scoped to each scenario's OWN cells. Under the shadowing reader the leaf-cited
  // scenario is `missing` (out of balance) — the false-red this fix retires — while the ancestor
  // is balanced regardless, which is exactly why the two Thens above (not this one) are the
  // load-bearing assertions.
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

// @SCN-LDG-032 — the ancestor's cited scenario and the id the leaf names only in prose.
let ldg032AncestorScnId: string;
let ldg032ProseScnId: string;

// @SCN-LDG-032
Given(
  "a scenario cited by an ancestor describe and a second scenario named only in a leaf's prose",
  function () {
    // BOTH are real corpus scenarios, each raising one unit obligation — deliberately, so the
    // prose-named one has a genuine account the reader COULD have posted to. That is what makes
    // the shadowing symptom legible: under the sigil-free reader the mention did not mint a
    // phantom, it moved a real credit onto the wrong real row, which no phantom check catches.
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

// @SCN-LDG-032
Given(
  "a passing vitest report whose one leaf names the second scenario in prose beneath the citing describe",
  function () {
    // A REAL-SHAPED report through the REAL reader: the describe carries the bracket, the leaf
    // carries only prose that happens to name another scenario — the ordinary shape of a test
    // whose subject is a comparison. Under the sigil-free reader the leaf's mention won the
    // first match and the ancestor's bracket never got read.
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

// @SCN-LDG-032
Then(
  "the leaf is attributed to the ancestor-cited scenario, not to the one its prose names",
  function () {
    // Attribution-set IDENTITY, not a balance boolean — @SCN-LDG-016's reason, which applies
    // with more force here: the ancestor reads `balanced` under BOTH readers, because under the
    // old one the stolen credit balanced it just as well. Only WHOSE credit it is has teeth.
    // Reds with 0 under the sigil-free reader.
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

// @SCN-LDG-032
Then("the prose-named scenario carries no crediting observation", function () {
  // The MIRROR symptom, and the one a phantom check cannot see: the prose-named scenario is
  // REAL, so the stolen credit landed on a legitimate row and the ledger read balanced while
  // both attributions were wrong. Zero credits ⇒ a mention earns nothing. Reds with 1 under the
  // sigil-free reader. Its unit obligation now goes `missing`, which is the honest verdict — no
  // assertion proves it.
  const proseCredits = creditsFor(ldg032ProseScnId);
  assert.equal(
    proseCredits.length,
    0,
    `expected ${ldg032ProseScnId} to carry no crediting observation — the leaf only NAMES it; got ${proseCredits.length}`
  );
});

// @SCN-LDG-033 — the two ids the prose-only assertion names, neither of them bracketed. The
// first is a fixture id no corpus scenario matches (the shape the defect was filed against);
// the second is an @-prefixed cross-reference (the shape that was live in the repository).
let ldg033CorpusScnId: string;
const LDG033_PROSE_FIXTURE_ID = "SCN-PDX-033";
const LDG033_PROSE_CROSS_REFERENCE_ID = "SCN-PDR-033";

// @SCN-LDG-033
Given(
  "a scenario in the corpus and a fixture id that names nothing in it",
  function () {
    // ONE real scenario, so the corpus has an account the reader could have posted to, and a
    // second id present only as fixture data. The contrast is the point: after the change the
    // prose-named ids reach no row at all, real or phantom.
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

// @SCN-LDG-033
Given(
  "a passing vitest report whose one assertion names both ids in prose, bracketing neither",
  function () {
    // A REAL-SHAPED vitest report run through the REAL reader. The assertion's title reads the
    // way this repository's own titles read — a fixture id named in the sentence, a cross-
    // reference in parentheses — and neither is bracketed, so neither is a citation. Under the
    // sigil-free reader the FIRST prose token won, and the assertion credited an id no corpus
    // scenario carries: a phantom scenario, out of balance, from a test that was doing nothing
    // wrong.
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

// @SCN-LDG-033
Then(
  "the assertion cites no scenario and its credit posts to the suspense row",
  function () {
    // The credit itself carries `scnId: null` — an uncited observation, which the ledger already
    // knows how to carry (@SCN-LDG-007) — and the reconciliation posts it to the suspense row.
    // Reds under the sigil-free reader with the first prose token as the scnId.
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

// @SCN-LDG-033
Then("neither prose-named id mints a phantom scenario", function () {
  // The mirror assertion, and the one that names the symptom the class produced: a phantom row
  // is what a promoted prose token creates, and under the sigil-free reader the fixture id got
  // exactly that. Row identity is asserted over the WHOLE reconciliation, not just the phantom
  // kind, so a prose id reaching ANY row — phantom, or a real one it does not prove — reds here.
  // The corpus scenario itself must still be there, or the assertion would pass vacuously on an
  // empty ledger.
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

// @SCN-LDG-002, @SCN-LDG-003, @SCN-LDG-005
Then(
  "the reconciling items for {string} are {string}",
  function (scnId: string, expected: string) {
    // Every expected reconciling-item TYPE must appear in the scenario's items
    // CELL — the renderer lists EVERY non-balanced item. Comma-separated
    // for the multi-item case (LDG-004 will exercise that); single item
    // here. Row-scoped, so it reds if the scenario is mis-reported as balanced.
    const { items } = rowCells(scnId);
    for (const type of expected.split(",").map((t) => t.trim())) {
      assert.ok(
        items.includes(type),
        `expected ${scnId}'s reconciling items to include "${type}"; got "${items}"`
      );
    }
  }
);

// BROKEN, NOT ABSENT (@SCN-LDG-017) — the @integration arm, through the REAL parse→reconcile
// pipeline (where the false-`missing` actually manifested). Distinct step wording throughout, so
// LDG-001…016's steps stay byte-untouched; only the generic "the ledger reconciles the target"
// When is shared.
let ldg017ScnId: string;
const LDG017_FILE = "packages/core/src/harness.test.ts";
const LDG017_MESSAGE = "Error: Cannot find package '@cucumber/tag-expressions'";

// @SCN-LDG-017
Given(
  "a scenario whose only proving test lived in a vitest file that failed to collect",
  function () {
    // ONE @unit scenario, built through the REAL scenario reader. Its proof lives in the
    // file that failed to collect — so NO observation citing it arrives, and its own row is
    // honestly `missing` at its own resolution. What must change is the RUN: the collection
    // failure has to be on the ledger, not swallowed.
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

// @SCN-LDG-017
Given("a vitest report whose file carries a collection failure and zero assertions", function () {
  // A REAL-SHAPED vitest JSON report for a COLLECTION failure: the file reports
  // `status: "failed"` with a `message`, and ZERO assertionResults (the file named no test — it
  // never got that far). Run through the REAL vitest reader. Under the assertion-only reader this
  // yields NOTHING at all, so the run carries no trace of the failure.
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

// @SCN-LDG-017
Then(
  "the suspense scenario carries a broken reconciling item naming the collection-failed file and its error",
  function () {
    // The item is on the SUSPENSE row (sentinel id "(no scenario)") — a collection failure names
    // no test, so it cites no @SCN and can post to no scenario's account. EXACTLY ONE item, and it
    // carries the WHERE-TO-FIX: the file locator + the vitest message (the remedy payload — this
    // is what sends the reader to the harness rather than to a blank test file). Reds with zero
    // rows under the assertion-only reader (the suspense row is not posted at all).
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

// @SCN-LDG-017
Then("the broken item is not reported as cites-no-scenario", function () {
  // The SIBLING it must not collapse into: both land in suspense because they name no scenario,
  // but `cites-no-scenario` is a COMPLETED test that cited nothing, while `broken` is an ERRORED
  // suite that never ran. Folding the collection failure into `cites-no-scenario` would hide the
  // remedy (fix the harness) behind the wrong one (add a citation). Reds under a fold that
  // reuses the existing uncited-credit mapping.
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

// @SCN-LDG-017
Then(
  "the scenario whose proof was in the collection-failed file still reads missing",
  function () {
    // The scenario's OWN row is UNCHANGED and honest at its own resolution: no evidence citing it
    // arrived, so its unit obligation is `missing`. The fix does NOT relabel the scenario's row —
    // it adds the run-level finding that explains WHY the evidence is absent. Row-scoped to the
    // scenario's own cells on the rendered ledger, as every other @LDG assertion.
    const { verdict, items } = rowCells(ldg017ScnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${ldg017ScnId} to stay out-of-balance; got "${verdict}"`
    );
    // The cell renders the outcome's CANON DESCRIPTION (3F-1626), so `missing` reads as
    // "Evidence Observation is missing" — matched as the sibling "reconciling items for X are Y"
    // steps do (a substring over the row's own items cell).
    assert.ok(
      items.includes("missing"),
      `expected ${ldg017ScnId} to still read missing; got "${items}"`
    );
  }
);

// UNSOUND IS A PROPERTY OF THE RUN (@SCN-LDG-018) — the @integration arm, through the REAL
// parse→reconcile pipeline (two runs, reconciled side by side, so the predicate is exercised at
// BOTH polarities in one scenario).
//
// `hasBrokenEvidence` is imported by MODULE PATH (see the file header), not from the package
// barrel, which re-exports it as well since 3F-1651.
const LDG018_BROKEN_FILE = "packages/core/src/collection-failed.test.ts";
const LDG018_MESSAGE = "Error: Cannot find package '@cucumber/tag-expressions'";
// The two reconciliations the When produces: the run whose suite failed to collect, and the
// sound-but-deferring control.
let ldg018BrokenRun: Ledger;
let ldg018SoundRun: Ledger;

// @SCN-LDG-018
Given(
  "a run whose vitest report carries a collection-failed file, and a second run whose report collects cleanly but defers an obligation",
  function () {
    // TWO runs, both built through the REAL scenario reader + the REAL vitest reader.
    //
    // Run A (UNSOUND): one @unit scenario whose proof lived in a file that failed to
    // collect — the file reports `status: "failed"` with a message and ZERO assertionResults, so
    // it names no test, cites no @SCN, and posts a `broken` item to the suspense row.
    //
    // Run B (SOUND): a scenario deferring its integration obligation (`@integrationpending`) plus
    // a cleanly-collected proving file for its unit obligation. It carries a Pending Item and NO
    // broken evidence — the CONTROL that gives the predicate its teeth: soundness must key on the
    // `broken` outcome specifically, not on "the run carries something unusual".
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

    const soundFeature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @unit @integrationpending @SCN-HNS-019",
      "    Scenario: the scenario deferring its integration obligation",
      "      Given a fixture step",
    ].join("\n");
    ldg018SoundRun = reconcile(
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
);

// @SCN-LDG-018
When("the ledger reconciles both runs", function () {
  // Both reconciliations are produced in the Given (the real pipeline runs there); this When is
  // the ledger's act, kept for GWT shape. Assert the fixtures are what the Thens claim to read.
  assert.ok(ldg018BrokenRun, "expected the collection-failed run to have been reconciled");
  assert.ok(ldg018SoundRun, "expected the cleanly-collecting run to have been reconciled");
});

// @SCN-LDG-018
Then("the run carrying the collection failure reports broken evidence", function () {
  // The predicate under test, over REAL reconcile output: a `broken` item exists SOMEWHERE on the
  // run (it sits on the suspense row — a collection failure is attributable to no scenario), so
  // the run is UNSOUND. Reds before `hasBrokenEvidence` scans for the `broken` outcome.
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

// @SCN-LDG-018
Then(
  "the run that merely defers an obligation reports no broken evidence — a Pending Item does not make a run unsound",
  function () {
    // The CONTROL arm, and the INDEPENDENCE of the three whole-run predicates: this run carries a
    // Pending Item (its deferred integration obligation) yet NO broken evidence — it is sound.
    // Reds under a predicate that keys on "anything unusual on the run" (e.g. a pendingItems or a
    // reconcilingItems length scan) rather than on the `broken` outcome specifically.
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

// @SCN-LDG-018
Then(
  "soundness is derived from the reconciling items, never stored on the reconciliation",
  function () {
    // DERIVED, NEVER STORED (parent 3F-1642's decision of record): no soundness flag is written
    // onto the Ledger — the same no-drift reason `isBalanced` and
    // `hasPendingItems` derive. The reconciliation carries EXACTLY its rows.
    assert.deepEqual(
      Object.keys(ldg018BrokenRun).sort(),
      ["scenarioReconciliations"],
      `expected the Ledger to carry no stored soundness field; got keys ${JSON.stringify(
        Object.keys(ldg018BrokenRun)
      )}`
    );
  }
);

// BROKEN IS READER-AGNOSTIC (@SCN-LDG-019) — the @integration arm, through the REAL
// parse→reconcile pipeline (where the false-`missing` manifests). Cucumber's instance of `broken`:
// a step matched by TWO step definitions is reported `ambiguous`, so the step CANNOT run — a
// broken harness, not an absent test. Distinct step wording throughout, so LDG-001…018's steps
// stay byte-untouched; the generic "the ledger reconciles the target" When and LDG-017's "the
// broken item is not reported as cites-no-scenario" Then are SHARED (the latter is the same
// assertion over the same suspense row — reader-agnostic, exactly as the Rule now is).
let ldg019ScnId: string;
const LDG019_FEATURE = "features/ambiguous.feature";
const LDG019_STEP = "Given the step two definitions both match";

// @SCN-LDG-019
Given("a scenario whose only proving step is matched by two step definitions", function () {
  // ONE @integration scenario, built through the REAL scenario reader. Its proof is the
  // cucumber scenario whose step is ambiguous — the step never runs, so NO passing/failing
  // observation citing it can arrive, and its own row is honestly `missing` at its own resolution.
  // What must change is the RUN: the ambiguity has to be ON the ledger, not swallowed by the
  // inconclusive drop.
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

// @SCN-LDG-019
Given("a cucumber report whose step for that scenario is ambiguous", function () {
  // A REAL-SHAPED cucumber JSON report for an AMBIGUOUS step: the step's result object is exactly
  // `{ status: "ambiguous", duration: 0 }` — cucumber emits NO `error_message` for it (the
  // "Multiple step definitions match: …" detail is pretty-formatter-only), so the reader must
  // SYNTHESISE the what-broke message from the step it names. Run through the REAL cucumber
  // reader. Under the inconclusive-drop reader this yields NOTHING at all, so the run carries no
  // trace of the ambiguity and the scenario reads as an unwritten test.
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

// @SCN-LDG-019
Then(
  "the suspense scenario carries a broken reconciling item naming the ambiguous step and its feature file",
  function () {
    // The item is on the SUSPENSE row (sentinel id "(no scenario)") — a broken credit posts to no
    // scenario's account, whatever it cites (the fail-safe). EXACTLY ONE item, carrying the
    // WHERE-TO-FIX (the feature file) and the WHAT-BROKE (the synthesised message naming the
    // ambiguous step and saying two or more step definitions match it, so it never ran). The
    // message states what broke; it prescribes no cure. Reds with zero rows under the
    // inconclusive-drop reader (no suspense row is posted at all).
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

// @SCN-LDG-019
Then("the scenario whose proof was the ambiguous step still reads missing", function () {
  // THE FAIL-SAFE'S TEETH, at the @integration resolution. This is the FIRST case in the codebase
  // that emits a `broken` observation CARRYING AN scnId (vitest's collection failure is
  // citation-less by construction), so the reconciler's guard — which excludes a broken
  // observation from the obligation match WHATEVER scnId it carries — is finally exercised over a
  // real reader's output. The scenario's OWN row stays honest at its own resolution: no evidence
  // that RAN cites it, so its integration obligation is `missing` BY ABSENCE. The broken credit
  // neither discharges it nor fails it. (Pinned under BOTH status values in the @unit arm,
  // reconcile.test.ts [SCN-LDG-019].)
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

// @SCN-LDG-019
Then(
  "the run reports broken evidence — an ambiguous harness makes the run unsound",
  function () {
    // Soundness is a property of the RUN (@SCN-LDG-018), and it is reader-agnostic exactly as
    // `broken` now is: an ambiguous cucumber step makes the whole run unsound, for the same reason
    // a collection-failed vitest file does — evidence that never materialised leaves every
    // `missing` in the run SUSPECT. Reds under the inconclusive drop (no broken item exists, so
    // the run reads sound while a harness is broken).
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

/**
 * @SCN-LDG-020 (3F-1775) — the PARSED corpus is what CUCUMBER runs.
 *
 * @integration is the TEETH here. The @unit arm proves parseScenarios resolves inheritance; only
 * driving the REAL reconciliation end-to-end (parse → reconcile → verdict) shows what that fixes:
 * the run flipping from BALANCED to OUT-OF-BALANCE. The bug was never in one function — it was
 * that an obligation cucumber names was never RAISED, so its absence could not reconcile
 * `missing`, and the whole ledger balanced over a hole.
 */

/** The scenario corpus + observations LDG-020's Given builds, and the verdict they reconcile to. */
let ldg020Scenarios: Scenario[];
let ldg020Reconciliation: Ledger;

// @SCN-LDG-020
Given(
  "a scenario tagged @unit whose {word} carries @integration, with a passing unit test and no integration evidence",
  function (ancestor: string) {
    // The SAME meaning to cucumber in both shapes: the scenario names unit AND integration.
    // Only the line the tier is written on differs — and that is precisely what the old tag-line
    // scan could not see.
    const source =
      ancestor === "Feature"
        ? "@AAA @integration\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n"
        : "@AAA\nFeature: alpha\n\n  @integration\n  Rule: alpha behaves\n\n    @unit @SCN-AAA-001\n    Scenario: alpha works\n      Given a thing\n";

    ldg020Scenarios = parseScenarios(source);

    // The unit tier is proven and PASSES. NOTHING proves the integration tier — so the run's
    // truth is out-of-balance, and a tool that reads it as balanced is lying.
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

// @SCN-LDG-020
When("the ledger reconciles the run", function () {
  ldg020Reconciliation = reconcile(ldg020Scenarios, evidenceObservations);
});

// @SCN-LDG-020
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

// @SCN-LDG-020
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

// @SCN-LDG-020
Then(
  "the run is out-of-balance — never balanced on an obligation cucumber names",
  function () {
    // THE FALSE-GREEN, CLOSED. Before the AST extraction this run reconciled BALANCED (exit 0):
    // the integration obligation was never raised, so its missing evidence was invisible and
    // the ledger balanced over a hole. The verdict is the only place that shows it.
    assert.equal(
      isBalanced(ldg020Reconciliation),
      false,
      `expected the run to be OUT-OF-BALANCE — cucumber names an integration tier that nothing ` +
        `proves — but the ledger read it as BALANCED. That is the false-green this scenario exists to close.`,
    );
  },
);

/**
 * @SCN-LDG-021 (3F-1774) — uncoded work is never invisible.
 *
 * @integration is the TEETH. The @unit arm proves reconcile emits the row; only driving the real
 * scenario-corpus read (parseScenarios + parseUntaggedScenarios) THROUGH reconcile to a verdict
 * shows what that fixes: the run flipping from BALANCED to OUT-OF-BALANCE. The bug was never in
 * one function — it was that a scenario cucumber runs contributed NOTHING to the ledger, so the
 * tool printed "1 scenario(s) carry no @SCN tag" and called the run clean in the same breath.
 */

let ldg021Reconciliation: EvidenceReconciliation;
let ldg021UntaggedName: string;

// @SCN-LDG-021
Given(
  "a corpus with one @SCN-tagged scenario, proven and passing, and one scenario carrying no @SCN",
  function () {
    // The untagged scenario describes REAL behaviour that NOTHING proves. Cucumber runs it.
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

    // The tagged scenario is proven and PASSES. On its own, the run would be BALANCED — which is
    // precisely why the untagged scenario's invisibility was a false-green and not a nuisance.
    evidenceObservations = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed", locator: "a.test.ts" },
    ];
    ldg021Reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, untagged, false, false);
  },
);

// @SCN-LDG-021
When("the ledger reconciles that corpus", function () {
  // Reconciled in the Given (the corpus read and the reconcile are one act here); this step marks
  // the boundary so the scenario reads as the ledger's own When, like its siblings.
  assert.ok(ldg021Reconciliation, "the reconciliation must exist");
});

// @SCN-LDG-021
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
    // ORDINARY, not phantom, not suspense: the suspense definition does not move.
    assert.equal(row.kind, "scenario", "the untagged scenario is an ORDINARY Scenario Reconciliation");
    assert.equal(row.verdict, "out-of-balance");
    assert.deepEqual(
      row.qualityCheckReconciliations.map((o: QualityCheckReconciliation) => o.outcome),
      ["no-scn-code"],
      "the obligation has no @SCN code for an observation to link to — the debit twin of cites-no-scenario",
    );
  },
);

// @SCN-LDG-021
Then(
  "the run is out-of-balance — a scenario the ledger cannot link is never a clean run",
  function () {
    // THE FALSE-GREEN, CLOSED. Before this, the tagged scenario reconciled satisfied, the untagged
    // one contributed nothing, and the run exited 0 BALANCED — over a scenario that says "the
    // customer is charged once" and that nothing proves.
    assert.equal(
      isBalanced(ldg021Reconciliation.ledger),
      false,
      `expected the run to be OUT-OF-BALANCE — a scenario carrying no @SCN can never be proven, so ` +
        `the ledger cannot certify this run clean — but isBalanced read it as BALANCED. That is the ` +
        `false-green this scenario exists to close.`,
    );
  },
);

/**
 * @SCN-LDG-022 (3F-1846) — every evidence observation posts to EXACTLY ONE ledger account, never to
 * none. Under the one posting rule both axes CITE, so exactly-one is universal rather than the
 * runtime half of a weaker "at least one" (3F-2621): the corpus below spans a CITED fitness credit
 * and an UNCITED one alongside every runtime shape, and the teeth are against a drop AND a
 * double-post together.
 *
 * @integration is the TEETH. The @unit arm proves `reconcile` populates the account's
 * `evidenceObservations`; only driving the FULL credit corpus through in one run shows the
 * property that matters — EXHAUSTION and UNIQUENESS together, over every credit shape at once.
 * The bug was never in one branch: it was that the model had nowhere for a posted entry to SIT, so
 * a credit citing a pending quality-check CEASED TO EXIST. A misclassification should misfile an
 * entry, not vaporise it — posting is indifferent to what the entry reconciles to.
 *
 * The assertions are IDENTITY-scoped (each input observation object found in exactly one account
 * over this single-obligation corpus), not count-scoped: a count would pass under a double-post that
 * cancelled a drop.
 */

let ldgPostingLedger: EvidenceReconciliation;
let ldgPostingObservations: EvidenceObservation[];
/** The account each credit is EXPECTED to post to, keyed by the observation's identity. */
let ldg022ExpectedAccount: Map<EvidenceObservation, string>;
let ldg022PendingCredit: EvidenceObservation;

// @SCN-LDG-022
Given(
  "a run whose credits span every shape — satisfied, no-evidence-obligation, pending-cited, phantom, uncited, broken, a cited fitness check and an uncited one",
  function () {
    // SCN-AAA-003 carries @unitpending — a DEFERRED obligation. The credit citing it below is the
    // LOAD-BEARING case: before this scenario it vanished from the model entirely, because there
    // was nowhere for a posted entry to sit. It posts and is findable WHATEVER it reconciles to.
    //
    // SCN-AAA-004 is the FITNESS half of the span — a STEPLESS scenario carrying the bare check
    // `named`, which is what raises a fitness obligation now that the technique has left the tag.
    const source = `@AAA
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

  @named @SCN-AAA-004
  Scenario: the fitness scenario carrying the bare check named
`;
    scenarios = parseScenarios(source, [], ["named"]);

    const satisfied: EvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed", locator: "a.test.ts",
    };
    // Cites a REAL scenario at a check it never named → `no-evidence-obligation`, on SCN-AAA-002's OWN row.
    const noEvidenceObligation: EvidenceObservation = {
      scnId: "SCN-AAA-002", qualityCheck: "integration", status: "passed", locator: "b.test.ts",
    };
    // THE LOAD-BEARING CREDIT — cites a PENDING quality-check. It posts whatever its outcome.
    ldg022PendingCredit = {
      scnId: "SCN-AAA-003", qualityCheck: "unit", status: "passed", locator: "c.test.ts",
    };
    // Cites an @SCN no feature carries → posts to that PHANTOM account.
    const phantom: EvidenceObservation = {
      scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed", locator: "d.test.ts",
    };
    // Cites NO scenario → SUSPENSE.
    const uncited: EvidenceObservation = {
      scnId: null, qualityCheck: "unit", status: "passed", locator: "e.test.ts",
    };
    // The proof NEVER RAN — it named no test, so it cites no scenario → SUSPENSE (@SCN-LDG-017).
    const broken: EvidenceObservation = {
      scnId: null, qualityCheck: "unit", status: "failed", broken: true,
      locator: "f.test.ts", message: "failed to collect",
    };
    // A CITED fitness credit — the citation seam resolved `lint:named` to SCN-AAA-004's bare
    // `named` check and stamped that @SCN on the run, so it posts to exactly one row by the SAME
    // rule the runtime credits above use. Note the two words differ (`lint:named` the runnable
    // handle, `named` the bare check): only the citation can join them.
    const citedFitnessCredit: EvidenceObservation = {
      scnId: "SCN-AAA-004",
      qualityCheck: "lint", staticCheck: "lint:named", checkTag: "named", exists: true, enforcedOverRealSource: true,
    };
    // An UNCITED fitness credit: the seam reached no @SCN for it — no fitness scenario carries its
    // check — so it belongs to no row → SUSPENSE, where it reconciles `cites-no-scenario`. The
    // fitness twin of the uncited runtime credit above, not a second rule.
    const uncitedFitnessCredit: EvidenceObservation = {
      qualityCheck: "lint", staticCheck: "lint:nobody-cites-this", exists: true, enforcedOverRealSource: false,
    };

    ldgPostingObservations = [
      satisfied, noEvidenceObligation, ldg022PendingCredit, phantom, uncited, broken, citedFitnessCredit, uncitedFitnessCredit,
    ];
    evidenceObservations = ldgPostingObservations;

    // THE POSTING RULE IS THE CITATION, never the outcome.
    ldg022ExpectedAccount = new Map<EvidenceObservation, string>([
      [satisfied, "SCN-AAA-001"],
      [noEvidenceObligation, "SCN-AAA-002"],
      [ldg022PendingCredit, "SCN-AAA-003"],
      [phantom, "SCN-ZZZ-999"],
      [uncited, "(no scenario)"],
      [broken, "(no scenario)"],
      // The fitness axis, by the SAME rule: cited → the one row it cites; uncited → suspense.
      [citedFitnessCredit, "SCN-AAA-004"],
      [uncitedFitnessCredit, "(no scenario)"],
    ]);

  },
);

// @SCN-LDG-022, @SCN-LDG-023 — the shared posting When: the credit half (LDG-022) and the debit
// half (LDG-023) reconcile the same way; each Given stocks `scenarios` (the debits) and
// `ldgPostingObservations` (the credits) with the corpus its property needs.
When("the ledger reconciles that run", function () {
  ldgPostingLedger = evidenceReconciliationOf(scenarios, ldgPostingObservations, [], false, false);
});

/** Every account an observation posted to — the uniqueness/exhaustion probe. */
const ldg022AccountsHolding = (obs: EvidenceObservation): string[] =>
  ldgPostingLedger.ledger.scenarioReconciliations
    .filter((r: ScenarioReconciliation) => (r.evidenceObservations ?? []).includes(obs))
    .map((r: ScenarioReconciliation) => r.scnId);

// @SCN-LDG-022
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
  // EXHAUSTION the other way: no account invents a credit the run never produced.
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

// @SCN-LDG-022
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

// @SCN-LDG-022
Then(
  "the credit citing a pending quality-check is posted and findable",
  function () {
    const account = ldgPostingLedger.ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === "SCN-AAA-003",
    );
    assert.ok(account, "expected an account for the pending-naming scenario SCN-AAA-003");
    // POSTED — the whole point, and the WHOLE of this step's claim. Before this scenario, this
    // credit existed nowhere in the model. It posts and is findable WHATEVER it reconciles to;
    // what it reconciles to is the reconciler's business, asserted where that rule lives.
    assert.deepEqual(
      account.evidenceObservations,
      [ldg022PendingCredit],
      `expected the pending-cited credit to POST to SCN-AAA-003's account and be findable there. ` +
        `With nowhere for a posted entry to sit it simply CEASED TO EXIST. A misclassification ` +
        `should MISFILE an entry, not vaporise it.`,
    );
  },
);

// @SCN-LDG-022
Then(
  "the run's verdict and reconciling items are unchanged — posting classifies nothing",
  function () {
    // Pinned as LITERALS, never as a re-reconcile of the same inputs (which would compare the
    // engine to itself and assert nothing). These are the outcomes the RECONCILER produces over
    // this corpus, and posting must leave every one of them untouched.
    assert.deepEqual(
      ldgPostingLedger.ledger.scenarioReconciliations.map((r: ScenarioReconciliation) => [
        r.scnId,
        r.verdict,
        r.reconcilingItems.map((i: QualityCheckReconciliation) => i.outcome),
      ]),
      [
        ["SCN-AAA-001", "balanced", []],
        ["SCN-AAA-002", "out-of-balance", ["missing", "no-evidence-obligation"]],
        // The pending-cited credit reconciles `no-evidence-obligation` (3F-1858): a pending obligation
        // raises no Evidence Obligation, so nothing is named at that pair and the credit is
        // an ordinary no-evidence-obligation one. It used to reconcile to NOTHING — posting to no account,
        // run balanced, exit 0 — which was the false-green, not behaviour. Posting still
        // classifies nothing: this row's outcome is the RECONCILER's, asserted where that rule
        // lives (@SCN-PND-005); it is pinned here only to keep this exhaustion snapshot honest.
        ["SCN-AAA-003", "out-of-balance", ["no-evidence-obligation"]],
        // The fitness scenario: its bare `named` check is wired and green, so it reconciles
        // satisfied against the credit that CITES it.
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

/**
 * @SCN-LDG-035 (3F-3409) — a static-check credit discharges only the obligation on the row whose
 * @SCN it cites, even when a second row raises the SAME characteristic.
 *
 * The MEASURED axis pinned this shape for its own credits until it retired (3F-3516): two
 * stepless scenarios sharing one measured check, each answered by its own measurement. This
 * scenario is the STATIC axis's pin — the shape that axis had never had pinned, because the two scenarios
 * whose deletion left the gap (@SCN-LNT-008, @SCN-LNT-012) proved it through the retired
 * first-in-corpus / registry routes rather than the configured-row route that survives them.
 *
 * `configuredFitnessChecks` carries BOTH scnIds against the same characteristic — the converted
 * route is keyed per-@SCN (`FitnessCheckIndex`), so two rows sharing one characteristic string is
 * an ordinary corpus, not a collision. Only one static-check credit exists, citing one of the two.
 */

let ldg035Ledger: Ledger;
let ldg035Credit: StaticCheckEvidenceObservation;

// @SCN-LDG-035
Given(
  "two fitness scenarios {string} and {string} both raising the check {string}",
  function (firstScn: string, secondScn: string, check: string) {
    const fitnessChecks = new Map([
      [firstScn, { characteristic: check }],
      [secondScn, { characteristic: check }],
    ]);
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
    scenarios = parseScenarios(source, [], [], fitnessChecks);
  },
);

// @SCN-LDG-035
Given(
  "a static-check credit citing only {string}, naming the check {string}",
  function (cited: string, check: string) {
    // THE SAME OBJECT SHAPE LDG-022's CITED FITNESS CREDIT USES — `staticCheck` the runnable
    // handle (the where-to-fix), `checkTag` the bare characteristic the match compares.
    ldg035Credit = {
      scnId: cited,
      qualityCheck: "lint",
      staticCheck: `lint:${check}`,
      checkTag: check,
      exists: true,
      enforcedOverRealSource: true,
    };
    evidenceObservations = [ldg035Credit];
  },
);

// @SCN-LDG-035
When("the ledger reconciles that shared-check run", function () {
  ldg035Ledger = reconcile(scenarios, evidenceObservations, []);
});

// @SCN-LDG-035
Then(
  "the row {string} reconciles satisfied on the check {string}, holding the credit",
  function (scnId: string, check: string) {
    const row = ldg035Ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === scnId,
    );
    const item = (row?.qualityCheckReconciliations ?? []).find(
      (i: QualityCheckReconciliation) => i.qualityCheck === "lint",
    );
    assert.deepEqual(
      [item?.staticCheck, item?.outcome],
      [check, "satisfied"],
      `expected the cited row "${scnId}" to reconcile satisfied on "${check}"; got ${JSON.stringify(item)}`,
    );
    assert.equal(
      item?.evidenceObservation,
      ldg035Credit,
      `expected the cited row "${scnId}" to hold the credit that names it`,
    );
  },
);

// @SCN-LDG-035
Then(
  "the row {string} reconciles missing on the check {string}, holding no credit",
  function (scnId: string, check: string) {
    // THE DISCRIMINATOR. Under the bare `o.scnId === scnId` mutant neutered to `true`, this row's
    // own match would find the SAME credit — checkTag alone matches, since both rows share it —
    // and this row would wrongly reconcile satisfied off a credit that never cited it.
    const row = ldg035Ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === scnId,
    );
    const item = (row?.qualityCheckReconciliations ?? []).find(
      (i: QualityCheckReconciliation) => i.qualityCheck === "lint",
    );
    assert.deepEqual(
      [item?.staticCheck, item?.outcome],
      [check, "missing"],
      `expected the uncited row "${scnId}" to reconcile missing on "${check}"; got ${JSON.stringify(item)}`,
    );
    assert.equal(
      item?.evidenceObservation,
      undefined,
      `expected the uncited row "${scnId}" to hold NO Evidence Observation — the credit posted ` +
        `to "${ldg035Credit.scnId}", never here`,
    );
  },
);

/**
 * @SCN-LDG-023 (3F-1847) — the evidence obligations a scenario raises post to its ledger account.
 *
 * The DEBIT half of LDG-022's posting. @integration is the TEETH here for the same reason: the
 * @unit arm proves `reconcile` populates one account's `evidenceObligations`; only driving the FULL
 * scenario corpus through in one run shows EXHAUSTION and UNIQUENESS together — every raised
 * debit posts, to its OWN account, and to exactly one.
 *
 * Assertions are IDENTITY-scoped (each raised obligation object must be found on exactly one
 * account), never count-scoped: a count would pass under a double-post that cancelled a drop.
 */

/** The account each debit is EXPECTED to post to, keyed by the obligation's identity. */
let ldg023ExpectedAccount: Map<EvidenceObligation, string>;
let ldg023Obligations: EvidenceObligation[];
let ldg023PendingObligation: EvidenceObligation;

// @SCN-LDG-023
Given(
  "a run whose scenarios raise obligations of every shape — a runtime obligation, a fitness obligation carrying its bare check, and a pending one",
  function () {
    // SCN-AAA-003 carries @unitpending — a DEFERRED obligation that partitions off to a one-sided
    // Pending Item and earns NO reconciled row. It is the debit-side mirror of LDG-022's
    // load-bearing credit: it must post ANYWAY.
    //
    // SCN-AAA-004 is the FITNESS debit — a STEPLESS scenario carrying the bare check `named`. The
    // debit twin of LDG-022's citation-routed credit: the identity a fitness debit carries is the
    // REGISTERED BARE CHECK, not the npm-script handle the retired `@lint=<handle>` form named.
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

  @named @SCN-AAA-004
  Scenario: a fitness obligation carrying its bare check
`;
    scenarios = parseScenarios(source, [], ["named"]);

    // Read the debits back off the PARSED scenarios by identity — never hand-built here, so the
    // assertion is against what the engine was actually handed (evidence-manifesto §11A).
    const namedOf = (scnId: string): EvidenceObligation[] =>
      scenarios.find((s: Scenario) => s.scnId === scnId)!.evidenceObligations;

    const [aaa001Unit] = namedOf("SCN-AAA-001");
    const [aaa002Integration] = namedOf("SCN-AAA-002");
    ldg023PendingObligation = namedOf("SCN-AAA-003")[0]!;
    const [aaa004Fitness] = namedOf("SCN-AAA-004");

    ldg023Obligations = [aaa001Unit!, aaa002Integration!, ldg023PendingObligation, aaa004Fitness!];

    // THE POSTING RULE IS THE SCENARIO ITSELF: a debit posts to the account that RAISED it. Unlike
    // a credit there is no citation to follow and no suspense — a raised obligation always has a
    // real account, by construction.
    ldg023ExpectedAccount = new Map<EvidenceObligation, string>([
      [aaa001Unit!, "SCN-AAA-001"],
      [aaa002Integration!, "SCN-AAA-002"],
      [ldg023PendingObligation, "SCN-AAA-003"],
      [aaa004Fitness!, "SCN-AAA-004"],
    ]);

    // A credit corpus that mints a PHANTOM and a SUSPENSE account — accounts no scenario raises,
    // so nothing can have been named of them. Their debit side must stay empty.
    ldgPostingObservations = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed", locator: "a.test.ts" },
      { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed", locator: "d.test.ts" },
      { scnId: null, qualityCheck: "unit", status: "passed", locator: "e.test.ts" },
    ];
    evidenceObservations = ldgPostingObservations;
  },
);

/** Every account a raised obligation posted to — the uniqueness/exhaustion probe. */
const ldg023AccountsHolding = (obligation: EvidenceObligation): string[] =>
  ldgPostingLedger.ledger.scenarioReconciliations
    .filter((r: ScenarioReconciliation) => (r.evidenceObligations ?? []).includes(obligation))
    .map((r: ScenarioReconciliation) => r.scnId);

// @SCN-LDG-023
Then("every evidence obligation posts to its own scenario's account", function () {
  for (const obligation of ldg023Obligations) {
    assert.deepEqual(
      ldg023AccountsHolding(obligation),
      [ldg023ExpectedAccount.get(obligation)],
      `the debit ${JSON.stringify(obligation)} must post to EXACTLY ONE account — the scenario ` +
        `that named it. Every entry posts somewhere, and to one place.`,
    );
  }

  // EXHAUSTION, the other direction: the ledger holds no debit the run did not raise, and drops
  // none that it did. Identity-scoped, so a double-post cannot cancel a drop.
  const posted = ldgPostingLedger.ledger.scenarioReconciliations.flatMap(
    (r: ScenarioReconciliation) => r.evidenceObligations ?? [],
  );
  assert.equal(
    posted.length,
    ldg023Obligations.length,
    `expected the ledger to hold EXACTLY the ${ldg023Obligations.length} debits the run named`,
  );
});

// @SCN-LDG-023
Then("each debit is findable on its account, keyed by quality-check", function () {
  // KEYED BY QUALITY-CHECK — canon's Ledger is the entries "organised by real or invented
  // scenario, KEYED BY QUALITY-CHECK". So a reader with a scnId and a quality-check can find the
  // debit, and a fitness debit is findable WITH ITS BARE CHECK intact.
  const accountFor = (scnId: string): ScenarioReconciliation | undefined =>
    ldgPostingLedger.ledger.scenarioReconciliations.find((r: ScenarioReconciliation) => r.scnId === scnId);

  const findDebit = (scnId: string, qualityCheck: string): EvidenceObligation | undefined =>
    (accountFor(scnId)?.evidenceObligations ?? []).find(
      (o: EvidenceObligation) => o.qualityCheck === qualityCheck,
    );

  assert.ok(findDebit("SCN-AAA-001", "unit"), "the runtime debit is findable by quality-check");
  assert.equal(
    findDebit("SCN-AAA-004", "lint")?.staticCheck,
    "named",
    "the fitness debit is findable by quality-check AND carries its BARE CHECK — the account " +
      "records WHAT WAS NAMED, not merely that something was. The bare check is the identity now: " +
      "the retired `@lint=<handle>` form named a runnable script, which is what put one technique " +
      "in front of a whole class of fitness functions",
  );
  assert.ok(findDebit("SCN-AAA-002", "integration"), "each scenario's own debit is on its own account");

  // The accounts no scenario raises — minted by a credit — have an empty debit side by
  // construction. The asymmetry with the credit side is real, not an omission.
  assert.deepEqual(accountFor("SCN-ZZZ-999")?.evidenceObligations, [], "a phantom names nothing");
  assert.deepEqual(accountFor("(no scenario)")?.evidenceObligations, [], "suspense names nothing");
});

// @SCN-LDG-023
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

// @SCN-LDG-023
Then(
  "the run's verdict and reconciling items are unchanged — debit-posting classifies nothing",
  function () {
    // Pinned as LITERALS, never as a re-reconcile of the same inputs (which would compare the
    // engine to itself and assert nothing). These are the outcomes this corpus produced BEFORE
    // debit-posting existed, and posting must leave every one of them untouched.
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
        // The fitness debit is raised but no credit answers it → `missing`, the same outcome the
        // named lint debit earned before the identity moved.
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

// THE DEBIT SIDE OF THE RECONCILING ITEM (@SCN-LDG-026, 3F-2005) — a Quality Check Reconciliation
// carries the evidence obligation it reconciles. The @integration arm drives the whole
// parse → reconcile → renderJson pipeline over the `missing` debit case (obligation present, its
// matching observation absent): the reconciliation carries `evidenceObligation` and no
// `evidenceObservation`, and the machine-readable JSON PROJECTS that obligation on the row.
// Reuses the shared "the ledger reconciles that run" When (LDG-022/023): the Given stocks
// `scenarios` and empties `ldgPostingObservations`; the Thens read `ldgPostingLedger`.
let ldg026ScnId: string;

/**
 * The debit-side subject a preceding "…Quality Check Reconciliation has outcome" step establishes,
 * paired with the evidence obligation it must carry. The shared "it carries the evidence obligation
 * it reconciles (the debit side)" Then reads this, so both the runtime-debit (@SCN-LDG-026, unit)
 * and the lint-debit (@SCN-LDG-028, an absent guard) cases route through one step definition
 * without hardcoding a single quality-check. Set fresh by each scenario's outcome step.
 */
let ldgDebitSubject:
  | { reconciliation: QualityCheckReconciliation; expectedObligation: EvidenceObligation }
  | undefined;

// @SCN-LDG-026
Given(
  "a scenario {string} requiring @unit with no matching evidence observation",
  function (scnId: string) {
    // A @unit scenario built through the REAL scenario reader, and NO observation citing it — so
    // its unit obligation reconciles `missing` by absence: the pure debit case (a required
    // obligation present, its matching observation absent).
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
    // No observation is stocked — the debit's matching credit is absent.
    ldgPostingObservations = [];
  },
);

/** The scenario's OWN unit Quality Check Reconciliation, off the ledger the shared When produced. */
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

// @SCN-LDG-026
Then("its unit Quality Check Reconciliation has outcome {string}", function (outcome: string) {
  // Row-scoped to the scenario's OWN unit reconciliation: the pure-debit `missing` outcome.
  const reconciliation = ldg026UnitReconciliation();
  ldgDebitSubject = { reconciliation, expectedObligation: { qualityCheck: "unit" } };
  assert.equal(
    reconciliation.outcome,
    outcome,
    `expected ${ldg026ScnId}'s unit reconciliation to read "${outcome}"`,
  );
});

// @SCN-LDG-026 / @SCN-LDG-028 — shared debit-side assertion, subject established by the
// preceding outcome step (the runtime unit debit, or the lint absent-guard debit).
Then("it carries the evidence obligation it reconciles \\(the debit side)", function () {
  // The DEBIT side is carried ON the reconciliation itself — the very obligation it reconciles —
  // not joined from a separate scenario-level array at print time.
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

// @SCN-LDG-026
Then("it carries no evidence observation \\(the credit side is absent)", function () {
  // The CREDIT side stays absent on a `missing` outcome — this SI adds only the debit half
  // (@SCN-LDG-027 adds `evidenceObservation`).
  const observation = (ldg026UnitReconciliation() as { evidenceObservation?: unknown })
    .evidenceObservation;
  assert.equal(
    observation,
    undefined,
    `expected the missing reconciliation to carry NO evidence observation (credit side absent); got ${JSON.stringify(observation)}`,
  );
});

// @SCN-LDG-026
Then("the JSON projects that evidence obligation on the reconciliation", function () {
  // The machine-readable projection: renderJson is a glueless JSON.stringify of the report model,
  // so the reconciliation's `evidenceObligation` surfaces on the JSON row verbatim. This is the
  // observable @integration behaviour — the machine output holds the reconciliation's debit side.
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

// THE CREDIT SIDE OF THE RECONCILING ITEM (@SCN-LDG-027, 3F-2006) — a Quality Check Reconciliation
// carries the evidence OBSERVATION it reconciles, the mirror of LDG-026's debit half. The
// @integration arm drives the whole parse → reconcile → renderJson pipeline over the `no-evidence-obligation`
// credit case (a credit citing a real scenario at a quality-check it never named — observation
// present, obligation absent): the reconciliation carries `evidenceObservation` and no
// `evidenceObligation`, and the machine-readable JSON PROJECTS that observation on the row.
// Reuses the shared "the ledger reconciles that run" When (LDG-022/023/026): the Given stocks
// `scenarios` and `ldgPostingObservations`; the Thens read `ldgPostingLedger`.
let ldg027ScnId: string;

// @SCN-LDG-027
Given(
  "a scenario {string} cited by a credit at a quality-check it never named",
  function (scnId: string) {
    // A @unit scenario built through the REAL scenario reader, cited by an INTEGRATION credit — a
    // quality-check the scenario never named. The credit posts to a real account against no
    // obligation → `no-evidence-obligation`: the pure CREDIT case
    // (observation present, obligation absent), the mirror of LDG-026's pure debit.
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
    // The no-evidence-obligation credit: a passing integration observation citing the real scenario at a
    // quality-check it never named. Carries a locator (the where-to-fix, ruling Q5).
    ldgPostingObservations = [
      { qualityCheck: "integration", scnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    ];
  },
);

/** The scenario's OWN no-evidence-obligation Quality Check Reconciliation, off the ledger the shared When produced. */
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

// @SCN-LDG-027
Then("its Quality Check Reconciliation has outcome {string}", function (outcome: string) {
  // Row-scoped to the scenario's OWN no-evidence-obligation reconciliation: the pure-credit `no-evidence-obligation` outcome.
  assert.equal(
    ldg027NoEvidenceObligationReconciliation().outcome,
    outcome,
    `expected ${ldg027ScnId}'s reconciliation to read "${outcome}"`,
  );
});

// @SCN-LDG-027
Then("it carries the evidence observation it reconciles \\(the credit side)", function () {
  // The CREDIT side is carried ON the reconciliation itself — the very integration observation it
  // reconciles — not joined from a separate scenario-level array at print time.
  const qcr = ldg027NoEvidenceObligationReconciliation();
  assert.deepEqual(
    qcr.evidenceObservation,
    { qualityCheck: "integration", scnId: ldg027ScnId, status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    `expected the no-evidence-obligation reconciliation to carry its evidence observation (the credit side); got ${JSON.stringify(qcr.evidenceObservation)}`,
  );
});

// @SCN-LDG-027
Then("it carries no evidence obligation \\(the debit side is absent)", function () {
  // The DEBIT side stays absent on a `no-evidence-obligation` outcome — a credit citing a check
  // the scenario never named reconciles against no obligation, so no `evidenceObligation` is in scope.
  const obligation = (ldg027NoEvidenceObligationReconciliation() as { evidenceObligation?: unknown })
    .evidenceObligation;
  assert.equal(
    obligation,
    undefined,
    `expected the no-evidence-obligation reconciliation to carry NO evidence obligation (debit side absent); got ${JSON.stringify(obligation)}`,
  );
});

// @SCN-LDG-027
Then("the JSON projects that evidence observation on the reconciliation", function () {
  // The machine-readable projection: renderJson is a glueless JSON.stringify of the report model,
  // so the reconciliation's `evidenceObservation` surfaces on the JSON row verbatim. This is the
  // observable @integration behaviour — the machine output holds the reconciliation's credit side.
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

// LINT MISSING IS OBLIGATION-ONLY (@SCN-LDG-028, 3F-2016) — a lint `missing` Quality Check
// Reconciliation carries its evidence obligation and NO observation. An absent static check is
// read as the negative fact {exists:false, enforcedOverRealSource:false}: an ABSENCE, not an
// observed piece of evidence. Canon (double-entry-manifesto line 36): missing = Obligation Exists,
// Observation None. The @integration arm drives the parse → reconcile pipeline over the absent-guard
// case; the debit-side assertion reuses LDG-026's shared "carries the evidence obligation" Then.
// Reuses the shared "the ledger reconciles that run" When (LDG-022/023/026/027).
const LDG028_ABSENT_CHECK = "ldg028-absent-guard";
const LDG028_ABSENT_HANDLE = `lint:${LDG028_ABSENT_CHECK}`;
let ldg028ScnId: string;

// @SCN-LDG-028
Given(
  "a scenario {string} requiring a fitness check absent from both package.json and CI",
  function (scnId: string) {
    // A STEPLESS fitness scenario built through the REAL scenario reader (the bare-check →
    // fitness-obligation parse seam), and an absent-check observation: the negative fact the real
    // detector produces for a check named in NEITHER package.json NOR CI — exists:false,
    // enforcedOverRealSource:false. So its lint obligation reconciles `missing` by absence: the
    // pure debit case (a required obligation present, its matching observation an ABSENCE).
    ldg028ScnId = scnId;
    const feature = [
      "@LDG",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${LDG028_ABSENT_CHECK} @${scnId}`,
      "    Scenario: a fixture scenario",
    ].join("\n");
    scenarios = parseScenarios(feature, [], [LDG028_ABSENT_CHECK]);
    // The absent-guard record: {exists:false} is an ABSENCE, the input the detector emits for a
    // guard present in neither source. NOT a real observation (contrast the watermelon's
    // exists:true). Stocked as the run's only observation.
    // It CITES the fitness scenario — the citation seam stamps the @SCN when the check is
    // observed, and the two names differ on purpose (the obligation names the bare check, the run
    // names the runnable handle), so nothing but the citation can join them.
    ldgPostingObservations = [
      {
        scnId,
        qualityCheck: "lint",
        staticCheck: LDG028_ABSENT_HANDLE,
        checkTag: LDG028_ABSENT_CHECK,
        exists: false,
        enforcedOverRealSource: false,
      },
    ];
  },
);

/** The scenario's OWN lint Quality Check Reconciliation, off the ledger the shared When produced. */
function ldg028LintReconciliation(): QualityCheckReconciliation {
  const row = ldgPostingLedger.ledger.scenarioReconciliations.find(
    (r: ScenarioReconciliation) => r.scnId === ldg028ScnId,
  );
  assert.ok(row, `expected a ledger row for ${ldg028ScnId}`);
  const qcr = row.qualityCheckReconciliations.find(
    (o: QualityCheckReconciliation) => o.qualityCheck === "lint",
  );
  assert.ok(
    qcr,
    `expected a lint Quality Check Reconciliation on ${ldg028ScnId}; got ${JSON.stringify(row.qualityCheckReconciliations)}`,
  );
  return qcr;
}

// @SCN-LDG-028
Then("its lint Quality Check Reconciliation has outcome {string}", function (outcome: string) {
  // Row-scoped to the scenario's OWN lint reconciliation: the pure-debit `missing` outcome.
  // Establishes the debit subject the shared "carries the evidence obligation" Then reads.
  const reconciliation = ldg028LintReconciliation();
  ldgDebitSubject = {
    reconciliation,
    expectedObligation: { qualityCheck: "lint", staticCheck: LDG028_ABSENT_CHECK },
  };
  assert.equal(
    reconciliation.outcome,
    outcome,
    `expected ${ldg028ScnId}'s lint reconciliation to read "${outcome}"`,
  );
});

// @SCN-LDG-028
Then(
  "it carries no evidence observation — an absent guard's \\{exists:false} is an absence, not an observation",
  function () {
    // The CREDIT side stays absent on a lint `missing`: the found {exists:false} absent-guard record
    // is an ABSENCE, not an observation, so nothing is carried (Obligation Exists, Observation None —
    // canon line 36). Uniform with the runtime `missing` path, which already carries none.
    const observation = (ldg028LintReconciliation() as { evidenceObservation?: unknown })
      .evidenceObservation;
    assert.equal(
      observation,
      undefined,
      `expected the lint missing reconciliation to carry NO evidence observation — an absent guard's {exists:false} is an absence; got ${JSON.stringify(observation)}`,
    );
  },
);

// NO-SCN-CODE IS DEBIT-SIDE (@SCN-LDG-029, 3F-2016 / corrects 3F-1995) — a `no-scn-code` Quality
// Check Reconciliation carries a SYNTHESIZED scenario-scope evidence obligation ({}, no
// qualityCheck / staticCheck) and NO observation. Canon (double-entry-manifesto line 40):
// no-scn-code = Obligation Exists, Observation None — the debit twin of cites-no-scenario. An
// untagged scenario is real and ordinary but carries no @SCN, so its obligation has no code to link
// to; the reconciliation carries the scenario-scope obligation (precedent: the scenario-scope
// pending obligation, journal.ts). The scenario-level `evidenceObligations` array STAYS empty, so
// the census — and the markdown the renderer builds from it — are untouched. The @integration arm
// drives the real scenario-corpus read (parseScenarios + parseUntaggedScenarios) THROUGH reconcile.
// Reuses the shared "the ledger reconciles that corpus" When (@SCN-LDG-021): the Given sets the
// shared corpus ledger; the Thens read it.
let ldg029UntaggedName: string;

// @SCN-LDG-029
Given("a corpus with one scenario carrying no @SCN", function () {
  // ONE ordinary scenario tagged with no @SCN — real behaviour cucumber runs but nothing proves. It
  // reaches the ledger by NAME through the real untagged reader (parseUntaggedScenarios).
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
  // No observations — an untagged scenario carries no @SCN, so no credit can cite it.
  ldg021Reconciliation = evidenceReconciliationOf(scenarios, [], untagged, false, false);
});

/** The untagged scenario's OWN Quality Check Reconciliation, off the shared corpus ledger. */
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

// @SCN-LDG-029
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

// @SCN-LDG-029
Then(
  "it carries a scenario-scope evidence obligation — empty, with no qualityCheck and no staticCheck",
  function () {
    // The DEBIT side is carried ON the reconciliation: a SYNTHESIZED scenario-scope obligation — an
    // empty {} (no qualityCheck, no staticCheck), canon-faithful (Obligation Exists) and the
    // established scenario-scope degenerate shape (precedent: the scenario-scope pending obligation,
    // journal.ts). Its PRESENCE — not its emptiness — is what makes no-scn-code debit-side.
    const obligation = (ldg029Reconciliation() as { evidenceObligation?: unknown })
      .evidenceObligation;
    assert.deepEqual(
      obligation,
      {},
      `expected the no-scn-code reconciliation to carry a scenario-scope evidence obligation {} (the debit side); got ${JSON.stringify(obligation)}`,
    );
  },
);

// @SCN-LDG-029
Then("it carries no evidence observation", function () {
  // The CREDIT side stays absent: without a @SCN code, no observation can link at ANY tier, so the
  // missing link is scenario-scope. Obligation Exists, Observation None (canon line 40).
  const observation = (ldg029Reconciliation() as { evidenceObservation?: unknown })
    .evidenceObservation;
  assert.equal(
    observation,
    undefined,
    `expected the no-scn-code reconciliation to carry NO evidence observation; got ${JSON.stringify(observation)}`,
  );
});

// @SCN-LDG-029
Then(
  "the scenario-level evidence obligations stay empty, so the census and markdown are unchanged",
  function () {
    // The synthesized {} lives ONLY on the reconciling item, NOT on the account's debit posting: an
    // untagged scenario raises no parsed obligations, so its scenario-level `evidenceObligations`
    // stays []. That is what keeps the census (and the markdown the renderer builds from it)
    // unchanged — the renderer reads scenario-level obligations, not per-QCR carried sides.
    const row = ldg021Reconciliation.ledger.scenarioReconciliations.find(
      (r: ScenarioReconciliation) => r.scnId === ldg029UntaggedName,
    );
    assert.ok(row, `expected a ledger row for the untagged scenario "${ldg029UntaggedName}"`);
    assert.deepEqual(
      row.evidenceObligations,
      [],
      `expected the untagged scenario's scenario-level evidenceObligations to stay EMPTY (census untouched); got ${JSON.stringify(row.evidenceObligations)}`,
    );
    // The renderer produces markdown over the corpus, reaching the untagged scenario BY NAME and
    // carrying no obligation line for it — a direct consequence of the empty scenario-level array,
    // and proof the renderer reads no per-QCR carried side.
    const markdown = renderMarkdown(ldg021Reconciliation, CTX);
    assert.ok(
      markdown.includes(ldg029UntaggedName),
      "expected the renderer to carry the untagged scenario by name in the markdown",
    );
  },
);
