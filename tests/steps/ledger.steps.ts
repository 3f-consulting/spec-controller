/**
 * Step definitions for features/ledger.feature (the @LDG runtime spine).
 *
 * @SCN-LDG-001 / @SCN-LDG-002 / @SCN-LDG-003 / @SCN-LDG-005 — bidirectional
 * evidence markers for features/ledger.feature (Evidence Manifesto §9). The
 * @integration arm exercises the declared → reconcile → render wiring end-to-end
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
import { parseScenarios } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObservation } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;

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
Given("a declared scenario {string} requiring unit-level evidence", function (scnId: string) {
  // Build the declared side from a real feature snippet through the declared
  // reader, so the @integration arm exercises the parse → declared seam (not a
  // hand-seeded Scenario the reader never produced).
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
  "a declared scenario {string} requiring integration-level evidence",
  function (scnId: string) {
    // Build the declared side from a real feature snippet through the declared
    // reader, so the @integration arm exercises the parse → declared seam.
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
  "a declared scenario {string} requiring both unit-level and integration-level evidence",
  function (scnId: string) {
    // Build the declared side from a real feature snippet through the declared
    // reader, so the @integration arm exercises the parse → declared seam. The two
    // co-located level tags produce TWO (kind, level) evidence obligations — the multi-
    // evidence obligation case that exercises the (kind, level) keying.
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
Given("a zero-evidence obligation declared scenario {string}", function (scnId: string) {
  // A declared scenario carrying ONLY its @SCN tag — no @unit/@integration/@lint level tag —
  // so it declares ZERO evidence obligations. Built through the declared reader so the
  // @integration arm exercises the parse → declared seam (a real zero-evidence obligation scenario,
  // not a hand-seeded empty Scenario). Its @SCN is nonetheless cited by a stray
  // credit (the next Given) — the negative twin: an evidence observation at an undeclared quality-check.
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
  // A passing integration credit citing a REAL declared scenario — but at the integration
  // quality-check, which the scenario did NOT declare (it declares unit). It posts to a real
  // account against no evidence obligation → undemanded. Carries a locator (the where-to-fix, ruling Q5).
  evidenceObservations = [
    { qualityCheck: "integration", scnId, status: "passed", locator: "src/undemanded.test.ts" },
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
  // side is entirely empty, so a zero-evidence obligation declared scenario reconciles to zero rows
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
  "a passing unit-level result for an undeclared scenario {string}",
  function (scnId: string) {
    // A credit citing an @SCN id that NO declared scenario matches — a phantom credit
    // (posting to a non-existent account). It carries a locator (the where-to-fix,
    // ruling Q5) so the phantom row can surface it on its cites-unknown-scenario item.
    evidenceObservations = [
      { qualityCheck: "unit", scnId, status: "passed", locator: "src/phantom.test.ts" },
    ];
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
Given("a scenario declared @e2e", function () {
  // A declared scenario carrying an @e2e tier tag (built through the real declared
  // reader, so the @integration arm exercises the parse → declared seam). Its @e2e tag
  // sets a single e2e evidence obligation — the obligation a cucumber-sourced observation
  // must discharge once its level is DERIVED from this same tag.
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
  // the scenario's declared @e2e tag, NOT stamped from the fallback source level. Before the
  // fix the parser stamped "integration", so the e2e obligation went missing and the
  // integration observation was undemanded.
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
  markdown = renderMarkdown(reconcile(scenarios, evidenceObservations), CTX);
});

// @SCN-LDG-011
Then("the scenario is balanced", function () {
  // Row-scoped to the @e2e scenario's OWN row: its verdict cell reads balanced (and NOT
  // out-of-balance), and it carries no reconciling items — the e2e obligation is discharged
  // by the derived-e2e observation. Reds while the observation is stamped integration (the
  // obligation is then missing and the observation undemanded → out-of-balance).
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
  "it is not reported e2e-missing with an undemanded integration observation",
  function () {
    // The specific false-red this fix retires: row-scoped to the @e2e scenario's items cell,
    // it must carry NEITHER a missing item (the e2e obligation unmet) NOR an undemanded item
    // (the integration observation with no obligation). Both appear together while the level is
    // taken from the source rather than the tag.
    const { items } = rowCells(ldg011ScnId);
    // Reconciling items render the outcome's canon description, not the handle (3F-1626).
    assert.ok(
      !items.includes("Evidence Observation is missing"),
      `expected ${ldg011ScnId} not to carry a missing item; got "${items}"`
    );
    assert.ok(
      !items.includes("Evidence Observation cites a Scenario that did not demand it"),
      `expected ${ldg011ScnId} not to carry an undemanded item; got "${items}"`
    );
  }
);

// @SCN-LDG-012 — the cited scenario for the derivation-not-hardcode regression pin. Its
// own fixtures (distinct step text) leave LDG-011's steps byte-untouched; only the generic
// "the ledger reconciles the target" When is shared.
let ldg012ScnId: string;

// @SCN-LDG-012
Given("a scenario declared @integration", function () {
  // A declared scenario carrying an @integration tier tag, built through the REAL declared
  // reader (so the @integration arm exercises the parse → declared seam). Its @integration
  // tag sets a single integration evidence obligation — the obligation a cucumber-sourced
  // observation must discharge once its level is DERIVED from this same tag.
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
  // the observation's integration level can ONLY come from DERIVING the scenario's declared
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
  // and NO undemanded item (an observation at the wrong level). Reds if the observation is
  // levelled anything but integration (missing + undemanded → out of balance).
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
Given("a scenario declared @unit @e2e", function () {
  // A declared scenario carrying BOTH a @unit and an @e2e tier tag, built through the REAL
  // declared reader → TWO evidence obligations (unit + e2e). @unit is discharged by a vitest
  // observation; @e2e by a cucumber observation whose level is DERIVED from this same @e2e tag.
  // The single-non-unit-tag case of the multi-tag ruling — the split across runners.
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
  // scenario's declared @e2e tier tag (the @unit tag is NOT a non-unit tier → inert for cucumber;
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
    // stops deriving @e2e (e2e missing + integration undemanded → out of balance) or if the vitest
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

// @SCN-LDG-014 — the cited scenario for the multi-tag ruling's teeth. Its own fixtures
// (distinct step text: "declared @integration @e2e", "a single passing cucumber observation
// citing it") leave LDG-011/012/013's steps byte-untouched; only the generic "the ledger
// reconciles the target" When is shared.
let ldg014ScnId: string;

// @SCN-LDG-014
Given("a scenario declared @integration @e2e", function () {
  // A declared scenario carrying BOTH an @integration and an @e2e tier tag, built through the
  // REAL declared reader → TWO non-unit evidence obligations (integration + e2e). A SINGLE
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
  // emit ONE observation PER declared non-unit tier — an integration observation AND an e2e
  // observation, same scnId — so BOTH obligations are discharged and the scenario balances.
  // Before per-tier emission the parser emitted ONE observation (the first tier), so the OTHER
  // tier went missing (and the emitted tier, when it was the wrong one, undemanded) → out of
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
    // (and any wrong-tier observation undemanded) → out of balance.
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

// @SCN-LDG-015 — the NEGATIVE BOUNDARY of the general rule. Its own fixtures (distinct step
// text: "declared @unit only", "citing the @unit-only scenario") leave LDG-011/012/013/014's
// steps byte-untouched; only the generic "the ledger reconciles the target" When is shared.
let ldg015ScnId: string;

// @SCN-LDG-015
Given("a scenario declared @unit only", function () {
  // A declared scenario carrying ONLY a @unit tier tag (no @integration/@e2e/@performance),
  // built through the REAL declared reader → exactly ONE evidence obligation: unit. There is NO
  // non-unit obligation for a cucumber observation to discharge — the negative boundary.
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
  // single caller-declared level (integration) — a level this @unit-only scenario never declared.
  // The observation therefore discharges NO obligation and is UNDEMANDED. Crucially it does NOT
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
Then("the cucumber observation is reported undemanded", function () {
  // Row-scoped to the @unit-only scenario's OWN row: the cucumber observation posts to this
  // scenario's account (it cites it) at a level the scenario never declared → an UNDEMANDED
  // credit-side item (at the fallback integration level). The row's verdict is out-of-balance
  // (an undemanded item is a non-satisfied reconciling item). Reds under a mutation that lets
  // cucumber DERIVE a unit level from the @unit tag — the observation would then DISCHARGE the
  // unit obligation (satisfied, balanced) and no undemanded item would appear.
  const { verdict, items } = rowCells(ldg015ScnId);
  const undemanded = items
    .split(";")
    .map((s) => s.trim())
    // The item renders the outcome's canon description, not the handle (3F-1626).
    .find((s) => s.includes("Evidence Observation cites a Scenario that did not demand it"));
  assert.ok(
    undemanded,
    `expected ${ldg015ScnId} to carry an undemanded cucumber observation; got "${items}"`
  );
  assert.ok(
    undemanded.includes("integration"),
    `expected the undemanded observation at the fallback integration level; got "${undemanded}"`
  );
  assert.match(
    verdict,
    /out-of-balance/,
    `expected ${ldg015ScnId} out-of-balance (undemanded observation); got "${verdict}"`
  );
});

// @SCN-LDG-015
Then("the @unit obligation remains the scenario's only required evidence", function () {
  // Row-scoped: the scenario's ONLY demanded (required) obligation is unit — and it is
  // required-but-MISSING here (no vitest observation was supplied; the cucumber observation
  // discharged NOTHING). No non-unit obligation was manufactured: the only non-unit tier present
  // is the UNDEMANDED cucumber credit (a credit, not a demanded obligation). Reds under a mutation
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
  // Unit is the ONLY required evidence: no non-unit tier appears as a demanded (missing) obligation
  // — integration is present only as the undemanded credit, not manufactured into an obligation.
  assert.ok(
    !missing.includes("integration") && !missing.includes("e2e"),
    `expected unit to be the scenario's only required evidence; got "${missing}"`
  );
});

// @SCN-LDG-001
When("the reconciler runs", function () {
  markdown = renderMarkdown(reconcile(scenarios, evidenceObservations), CTX);
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
  "the ledger reports {string} with an undemanded item at {word}",
  function (scnId: string, qualityCheck: string) {
    // Row-scoped to the REAL scenario's OWN ledger row: its reconciling-items cell must carry
    // an undemanded item at the named quality-check (a credit citing this real scenario at a
    // level it never declared). Reds if the undemanded credit is silently swallowed (counted as
    // attributed) rather than surfaced as a credit-side reconciling item on the row. The row's
    // verdict is out-of-balance (an undemanded item is a non-satisfied reconciling item).
    const { verdict, items } = rowCells(scnId);
    assert.ok(
      items.includes("Evidence Observation cites a Scenario that did not demand it"),
      `expected ${scnId}'s reconciling items to include an undemanded item; got "${items}"`
    );
    assert.ok(
      items.includes(qualityCheck),
      `expected ${scnId}'s undemanded item to be at ${qualityCheck}; got "${items}"`
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
    // both-missing item — the degenerate Quality Check Reconciliation a declared scenario
    // emits when it reconciles to zero rows on BOTH sides (no evidence obligation, no evidence observation).
    // Reds if the scenario is instead swept to a warnings surface (the earlier behaviour)
    // and so carries NO ledger row at all, or if it is mis-reported as any other outcome.
    const { items } = rowCells(scnId);
    // Reconciling items render the outcome's canon description, not the handle (3F-1626).
    assert.ok(
      items.includes("Evidence Observation and Evidence Obligation are both missing for the Scenario"),
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
  // credit has an evidence observation, so it is undemanded, NOT both-missing. Row-scoped to the
  // scenario's OWN ledger row — its reconciling-items cell carries no both-missing marker.
  // (NOT a whole-report check: the trial-balance cause table legitimately names the
  // neither-side `both-missing` group at count 0 for every report.)
  const { items } = rowCells(scnId);
  assert.ok(
    !items.includes("Evidence Observation and Evidence Obligation are both missing for the Scenario"),
    `expected ${scnId} not to be reported as both-missing; got "${items}"`
  );
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
