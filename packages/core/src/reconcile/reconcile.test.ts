/**
 * Unit tests for the reconcile core (src/reconcile/reconcile.ts).
 *
 * Bidirectional evidence (discipline): the describe/it strings carry the
 * @SCN-LDG-NNN id matching features/ledger.feature, so a grep of the id
 * returns both halves of the pair (Evidence Manifesto §9). Asserts REAL reconcile
 * output, not a hand-seeded fixture (evidence-manifesto §11A).
 *
 * The verdict model reframes LDG-001/002/003 onto the binary scenario VERDICT
 * (balanced | out-of-balance) carrying the LIST of non-balanced reconciling items,
 * and adds LDG-005 (the verdict + reconciling-item-list structure). The
 * multi-evidenceObligation "report BOTH a missing AND a failing item" demonstration is
 * reserved for LDG-004.
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./reconcile.js";
import type { Scenario, EvidenceObservation } from "../model.js";
import { parseScenarios } from "../parse/scenarios.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[SCN-LDG-001] a scenario whose required evidence exists and passes is reported as balanced", () => {
  it("returns the balanced verdict with no reconciling items when its required unit-level evidence is present and passing", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-001");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.evidenceObligations).toEqual([
      { qualityCheck: "unit", outcome: "satisfied" },
    ]);
  });
});

describe("[SCN-LDG-002] a scenario whose required test exists but fails is reported as out of balance with a failing reconciling item", () => {
  it("returns the out-of-balance verdict listing a failing reconciling item when its required unit-level evidence is present but failing", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-002", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-002");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "failing" },
    ]);
  });
});

describe("[SCN-LDG-003] a scenario that requires a level with no matching result is reported as out of balance with a missing reconciling item", () => {
  it("returns the out-of-balance verdict listing a missing reconciling item when its required integration-level evidence has no matching result", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-003", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    // A required ledger entry that was never recorded: the only observed result is
    // for a DIFFERENT scenario, so nothing matches (scnId, integration) for
    // SCN-LDG-003. This pins "no MATCHING result" (the join keys on (scnId, quality-check)),
    // not merely "no results at all".
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-LDG-OTHER", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-003");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing" },
    ]);
  });
});

describe("[SCN-LDG-004] a multi-evidenceObligation scenario failing one level and missing another lists both reconciling items", () => {
  it("lists BOTH the failing AND the missing reconciling item, with no ranking between them", () => {
    // Two evidenceObligations in ONE scenario (the (kind, level) multi-level case): unit
    // failing, integration missing. This is the case that
    // observably distinguishes "report EVERY reconciling item" from the superseded
    // "missing beats failing" prioritisation — the old aggregate would have picked
    // ONE; the verdict model lists BOTH.
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-LDG-004",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration" },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      // A failing unit result; NO integration result at all.
      { qualityCheck: "unit", scnId: "SCN-LDG-004", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-004");

    expect(scenario?.verdict).toBe("out-of-balance");
    // Assert MEMBERSHIP of both items (arrayContaining — order-independent: no
    // ranking is claimed), and that the list is exactly the two non-balanced
    // items — NOT a single picked outcome collapsing the two distinct problems.
    expect(scenario?.reconcilingItems).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "failing" },
        { qualityCheck: "integration", outcome: "missing" },
      ])
    );
    expect(scenario?.reconcilingItems).toHaveLength(2);
  });
});

describe("[SCN-LDG-005] an out-of-balance scenario carries its reconciling items as a list", () => {
  it("carries the non-balanced reconciling item in the verdict's reconcilingItems LIST, not a single picked scenario outcome", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-005", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-005");

    // The verdict model: the verdict is a binary type of its own, and the
    // out-of-balance verdict carries an ENUMERABLE LIST of reconciling items —
    // here a single typed item, but as a list, not a collapsed scalar scenario
    // outcome. (The multi-item "report BOTH a missing AND a failing item" case is
    // LDG-004.)
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(Array.isArray(scenario?.reconcilingItems)).toBe(true);
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "failing" },
    ]);
  });
});

describe("[SCN-LDG-006] a credit citing an undeclared scenario becomes a phantom-scenario reconciliation, out of balance", () => {
  it("emits one phantom-scenario reconciliation per undeclared cited id, its quality-check reconciliation cites-unknown-scenario carrying the evidence observation locator, verdict out-of-balance", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-006", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    // A passing unit credit citing SCN-PHANTOM-999 — an @SCN id NO declared scenario
    // matches. It posts to no real scenario, so it lands on a PHANTOM scenario. The
    // credit carries a locator (the where-to-fix, ruling Q5).
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PHANTOM-999", status: "passed", locator: "src/phantom.test.ts" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const phantom = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PHANTOM-999");

    // A phantom-scenario reconciliation: kind discriminates it from a declared scenario;
    // its single Quality Check Reconciliation is cites-unknown-scenario carrying the
    // evidence observation locator; the verdict is out-of-balance (a credit against no evidence obligation).
    expect(phantom?.kind).toBe("phantom-scenario");
    expect(phantom?.verdict).toBe("out-of-balance");
    expect(phantom?.evidenceObligations).toEqual([
      { qualityCheck: "unit", outcome: "cites-unknown-scenario", locator: "src/phantom.test.ts" },
    ]);
    expect(phantom?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "cites-unknown-scenario", locator: "src/phantom.test.ts" },
    ]);

    // The declared SCN-LDG-006 stays a DECLARED-kind row (reserve `scenario` for declared).
    const scenarioRow = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-006");
    expect(scenarioRow?.kind).toBe("scenario");
  });
});

describe("[SCN-LDG-007] a credit citing no scenario becomes a suspense-scenario reconciliation, out of balance", () => {
  it("aggregates every uncited credit AND the unattributed static-guards into ONE suspense-scenario row, cites-no-scenario, out-of-balance", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    // TWO runtime credits carrying NO @SCN anchor (scnId null) — each posts to no scenario.
    // They must aggregate into ONE suspense row (not one row per credit), each carrying its
    // locator (the where-to-fix, ruling Q5).
    // An undemanded static-guard — a running CI guard no @lint declares,
    // now carried through the STREAM as a GuardEvidenceObservation (the removed
    // `unattributedStaticGuards` param). It cites no scenario, so `reconcile` recovers it
    // from the completed stream and folds it into the SAME suspense row as a lint credit item.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/a.test.ts" },
      { qualityCheck: "integration", scnId: null, status: "failed", locator: "features/b.feature" },
      { qualityCheck: "lint", guard: "lint:orphan", exists: true, enforcedOverRealSource: true },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const suspense = balance.scenarioReconciliations.filter((s) => s.kind === "suspense-scenario");
    // ONE suspense row aggregates ALL uncited credits + suspense guards.
    expect(suspense).toHaveLength(1);
    const row = suspense[0]!;
    expect(row.scnId).toBe("(no scenario)");
    expect(row.verdict).toBe("out-of-balance");
    // Every uncited runtime credit (with its locator) THEN each unattributed static-guard,
    // all outcome cites-no-scenario.
    expect(row.evidenceObligations).toEqual([
      { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "src/a.test.ts" },
      { qualityCheck: "integration", outcome: "cites-no-scenario", locator: "features/b.feature" },
      { qualityCheck: "lint", guard: "lint:orphan", outcome: "cites-no-scenario" },
    ]);
    expect(row.reconcilingItems).toEqual(row.evidenceObligations);

    // The declared SCN-LDG-007 stays a DECLARED-kind row (its unit evidence obligation is missing —
    // the null credit does not match it), never a suspense row.
    const scenarioRow = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-007");
    expect(scenarioRow?.kind).toBe("scenario");
  });

  it("emits NO suspense row when every credit cites a scenario and no static-guard is suspense", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-007", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    expect(balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario")).toBeUndefined();
  });
});

describe("[SCN-LDG-008] a credit at an undeclared quality-check on a real scenario is reported as undemanded", () => {
  it("emits an undemanded credit-side item ON the real scenario's row when a credit cites it at a quality-check it never declared", () => {
    // SCN-LDG-008 declares unit; a passing INTEGRATION credit cites it — a real scenario, but
    // at a quality-check it never declared. The credit posts to a real account against no
    // evidence obligation → undemanded (the GENERAL case). It carries a locator (the where-to-fix,
    // ruling Q5). The row's own unit evidence obligation reconciles as normal (missing — no unit credit).
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/undemanded.test.ts" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-008");

    // A DECLARED-kind row (undemanded posts to the REAL scenario, not a phantom/suspense).
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    // Its declared unit evidence obligation is missing (no unit credit) AND the integration credit is
    // undemanded, carrying its locator. Both are reconciling items, none ranked.
    expect(row?.evidenceObligations).toEqual([
      { qualityCheck: "unit", outcome: "missing" },
      { qualityCheck: "integration", outcome: "undemanded", locator: "src/undemanded.test.ts" },
    ]);
    expect(row?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "missing" },
      { qualityCheck: "integration", outcome: "undemanded", locator: "src/undemanded.test.ts" },
    ]);
  });

  it("does NOT mark a credit undemanded when it matches a declared (scnId, quality-check) pair", () => {
    // Regression guard: a credit at a DECLARED quality-check reconciles as satisfied (the pair
    // matches), NOT undemanded. Undemanded fires ONLY when the pair was never declared.
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-008", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-008");

    expect(row?.verdict).toBe("balanced");
    expect(row?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-LDG-010] a zero-evidence obligation scenario cited by a stray credit is undemanded, not both-missing", () => {
  it("emits an undemanded row (NOT a warning, NOT both-missing) when a zero-evidence obligation declared scenario is cited by a stray credit", () => {
    // The negative twin: SCN-LDG-010 declares ZERO evidence obligations, but its @SCN IS cited
    // by a passing unit credit. It has an evidence observation at an undeclared quality-check → undemanded,
    // NOT both-missing. This proves detection keys on rows-emitted, not evidenceObligations.length
    // === 0: a zero-evidence obligation scenario WITH a credit emits a reconciling row, not a warning.
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-010", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    // A row IS emitted for it (not swept to warnings) — a declared-kind row, out of balance
    // via its undemanded item at unit.
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-010");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "undemanded" },
    ]);
    // It is undemanded, NOT both-missing — the evidence observation gives it a row on ONE side.
    expect(row?.reconcilingItems.some((r) => r.outcome === "both-missing")).toBe(false);
  });

  it("flips a zero-evidence obligation scenario with NO credit to a both-missing row (the boundary that LDG-009 lands)", () => {
    // The contrast case: a zero-evidence obligation scenario with NO citing credit reconciles to zero
    // rows on BOTH sides → a both-missing out-of-balance row. Only the PRESENCE of an
    // evidence observation flips it to an undemanded row instead — detection keys on rows-emitted, not
    // evidenceObligations.length. This is the boundary @SCN-LDG-009 lands.
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-010", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-010");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });
});

describe("[SCN-LDG-009] a declared scenario with zero rows on both sides is reported as both-missing, out of balance", () => {
  it("emits ONE degenerate both-missing reconciling item (blank on both sides), verdict out-of-balance, when a declared scenario reconciles to zero rows on BOTH sides", () => {
    // SCN-LDG-009 declares ZERO evidence obligations and is cited by NO evidence observation — it
    // reconciles to zero rows on BOTH sides (no evidence obligation, no credit). It posts one degenerate
    // Quality Check Reconciliation, blank on both sides (no qualityCheck, no guard, no locator),
    // outcome both-missing, verdict out-of-balance. Detection keys on the reconciler emitting
    // NOTHING either way — NOT a hard evidenceObligations.length === 0 map (LDG-010's twin proves
    // a cited zero-evidence obligation scenario is undemanded, not both-missing).
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-009", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);

    // A row IS emitted (not swept to a warnings surface) — a declared-kind row, out of balance
    // via its single degenerate both-missing item.
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-009");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    // Blank on BOTH sides: the item carries the both-missing outcome and NOTHING else — no
    // qualityCheck (neither a debit evidence obligation nor a credit evidence observation), no guard, no locator.
    expect(row?.evidenceObligations).toEqual([{ outcome: "both-missing" }]);
    expect(row?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });

  it("does NOT emit both-missing when the scenario declares an evidence obligation (a one-sided row is a debit, not both-missing)", () => {
    // Regression guard: a scenario that DOES declare an evidence obligation reconciles that evidence obligation
    // (here missing — no matching result), so it emits a row on the DEBIT side and is NOT
    // both-missing. Both-missing fires ONLY when zero rows emit on either side.
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-009", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-009");

    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([{ qualityCheck: "unit", outcome: "missing" }]);
    expect(row?.reconcilingItems.some((r) => r.outcome === "both-missing")).toBe(false);
  });
});

describe("[SCN-WRN-001] a scenario declaring no evidence obligations is reported as a both-missing reconciliation", () => {
  it("reconciles the zero-evidenceObligation scenario as a both-missing out-of-balance ROW, NOT a warning excluded from the balance", () => {
    // A declared scenario with ZERO evidence-obligation tags:
    // cited by no evidence observation, it reconciles to zero rows on BOTH sides → a both-missing
    // out-of-balance row IN the balance, not a warning on a separate axis. This reds against
    // the earlier code that swept it to `warnings` and emitted NO ScenarioReconciliation.
    const scenarios: Scenario[] = [{ scnId: "SCN-WRN-001", evidenceObligations: [] }];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-WRN-001");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });

  it("keeps a scenario that DOES declare an evidenceObligation on the verdict axis, alongside a both-missing scenario (the WITH-evidenceObligations path is untouched)", () => {
    // Regression guard within the new behaviour: a scenario that declares evidence
    // reconciles as before (a balanced verdict), while the zero-evidenceObligation scenario
    // becomes a both-missing row — BOTH are ordinary declared-kind rows in the balance now
    // (the warnings axis is gone).
    const scenarios: Scenario[] = [
      { scnId: "SCN-WRN-001", evidenceObligations: [] },
      { scnId: "SCN-WRN-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-WRN-002", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const bothMissing = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-WRN-001");
    expect(bothMissing?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
    const verdictScenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-WRN-002");
    expect(verdictScenario?.verdict).toBe("balanced");
    // Both declared scenarios are rows now — none is excluded to a separate warnings axis.
    expect(balance.scenarioReconciliations.map((s) => s.scnId)).toEqual([
      "SCN-WRN-001",
      "SCN-WRN-002",
    ]);
  });
});

describe("[SCN-LDG-013] a @unit @e2e scenario proven by BOTH a vitest and a cucumber observation reconciles both tiers satisfied", () => {
  it("balances both obligations — vitest discharges @unit, cucumber (derived) discharges @e2e — from a real declared scenario and both real readers", () => {
    // The split ACROSS RUNNERS, composed through the REAL readers (evidence-manifesto §11A:
    // assert real output, not a hand-seeded fixture). The declared side: a real @unit @e2e
    // scenario through the real reader → TWO evidence obligations (unit + e2e).
    const scenarios = parseScenarios(
      [
        "@LDG",
        "Feature: fixture",
        "  Rule: a fixture rule",
        "    @unit @e2e @SCN-LDG-013",
        "    Scenario: a unit-and-e2e fixture scenario",
        "      Given a fixture step",
      ].join("\n")
    );

    // The VITEST side: a real vitest JSON report citing the scenario, parsed at the JS-ecosystem
    // unit default → a unit observation. Vitest is the unit substrate; its level is NOT derived
    // (a unit test can only prove @unit). This discharges the @unit obligation.
    const vitestReport: VitestJsonReport = {
      testResults: [
        {
          name: "src/unitAndE2e.test.ts",
          assertionResults: [
            { fullName: "[SCN-LDG-013] the unit substrate proves the unit tier", status: "passed" },
          ],
        },
      ],
    };
    const vitestObs = parseVitestEvidenceObservations(vitestReport, "unit");

    // The CUCUMBER side: a real cucumber JSON report citing the SAME scenario, parsed with the
    // JS-ecosystem "integration" fallback. deriveLevel reads the scenario's declared @e2e tag
    // (the @unit tag is NOT a non-unit tier → inert for cucumber; unit is vitest's job) → exactly
    // ONE observation, at e2e — NOT unit (cucumber does not double-count unit), NOT integration
    // (the fallback is overridden by the @e2e tag). This discharges the @e2e obligation.
    const cucumberReport: CucumberJsonReport = [
      {
        uri: "features/fixture.feature",
        elements: [
          {
            tags: [{ name: "@unit" }, { name: "@e2e" }, { name: "@SCN-LDG-013" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    const cucumberObs = parseCucumberEvidenceObservations(cucumberReport, "integration");
    expect(cucumberObs).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" },
    ]);

    // The ledger's (scnId, level) matching balances each obligation against its own-tier
    // observation — no reconciler change, no new item type. Both tiers satisfied → balanced.
    const balance = reconcile(scenarios, [...vitestObs, ...cucumberObs]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-013");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    // BOTH obligations satisfied — order-independent (no ranking between tiers), and EXACTLY the
    // two tiers the scenario declared (no phantom third obligation).
    expect(scenario?.evidenceObligations).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "satisfied" },
        { qualityCheck: "e2e", outcome: "satisfied" },
      ])
    );
    expect(scenario?.evidenceObligations).toHaveLength(2);
  });
});

describe("[SCN-PND-004] a declared-pending obligation reconciles as a one-sided Pending Item, never a reconciling item", () => {
  // The pending result of an obligation (the third result, alongside @SCN-LDG-001
  // satisfied→balanced and @SCN-LDG-003 absent→missing): a `<quality-check>pending`
  // obligation (the `pending: true` flag from PND-001) is PARTITIONED off before the
  // observation match — it becomes a one-sided Pending Item (owed IOU), never a
  // QualityCheckReconciliation, never a reconciling item. Asserts REAL reconcile output
  // (evidence-manifesto §11A). The @integration arm (tests/steps/pendingItems.steps.ts,
  // @SCN-PND-004) proves the same through the parse→reconcile pipeline over the planted
  // fixture. Verdict-balanced (PND-007) and the render/tally (PND-010/011) are later
  // sub-issues; this pins ONLY the model partition + the both-missing guard fix.
  const CHECKS = ["lint", "unit", "integration", "e2e", "performance"] as const;

  for (const qualityCheck of CHECKS) {
    it(`raises exactly one Pending Item for a ${qualityCheck}pending obligation and posts no both-missing row`, () => {
      const scenarios: Scenario[] = [
        { scnId: "SCN-PND-004", evidenceObligations: [{ qualityCheck, pending: true }] },
      ];
      // No observation is sought — a Pending Item is one-sided.
      const balance = reconcile(scenarios, []);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-004");

      // Exactly one Pending Item, at the declared quality-check.
      expect(scenario?.pendingItems).toEqual([{ qualityCheck }]);
      // The pending obligation is PARTITIONED OFF: it never becomes a reconciling item, and
      // an only-pending scenario is NOT the degenerate both-missing row (the guard fix).
      expect(scenario?.evidenceObligations).toEqual([]);
      expect(scenario?.reconcilingItems).toEqual([]);
    });
  }

  it("keeps the bare (non-pending) obligation reconciling while partitioning the pending one off (mixed scenario)", () => {
    // A scenario declaring BOTH a normal @unit obligation and an @integrationpending one:
    // the unit obligation reconciles as usual (satisfied here), while the pending
    // integration obligation partitions to a one-sided Pending Item — never a second
    // reconciling item, never a both-missing row.
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-004",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-004", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-004");

    // Only the unit obligation reconciles; the pending integration one is one-sided.
    expect(scenario?.evidenceObligations).toEqual([
      { qualityCheck: "unit", outcome: "satisfied" },
    ]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-005] the pending declaration governs even when a matching observation exists — the Pending Item is raised, the observation is not undemanded", () => {
  // A Pending Item is ONE-SIDED: the pending tag's existence ALONE raises it — no observation
  // is sought. Even when a MATCHING observation exists for the pending obligation's check, the
  // pending declaration governs: the obligation is NOT reconciled against the observation (it
  // never becomes `satisfied`, never a reconciling item), AND the observation is NOT flagged
  // `undemanded` — the pending obligation keeps its (scnId, qualityCheck) pair DEMANDED (it
  // stays in evidenceObligationPairs). Pins the "partition-before-match, but the pair stays
  // demanded" invariant PND-004 established (green-first regression pin over that foundation).
  // Asserts REAL reconcile output (evidence-manifesto §11A). The @integration arm
  // (tests/steps/pendingItems.steps.ts, @SCN-PND-005) proves the same through the
  // parse→reconcile pipeline over a planted fixture carrying a matching observation.
  it("raises the Pending Item and leaves the matching observation demanded (obligation never satisfied, observation never undemanded)", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-005",
        evidenceObligations: [{ qualityCheck: "integration", pending: true }],
      },
    ];
    // A MATCHING integration observation — present and passing — citing the very
    // (scenario, quality-check) the pending obligation declares. A non-pending obligation
    // would reconcile this to `satisfied`; the pending one must ignore it entirely.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-005");

    // The pending declaration governs: exactly one Pending Item at the declared check,
    // regardless of the matching observation's presence.
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    // The obligation never reconciled against the match — it did NOT become `satisfied`, and
    // posted no reconciling item (one-sided: nothing is reconciled).
    expect(scenario?.evidenceObligations).toEqual([]);
    expect(scenario?.reconcilingItems).toEqual([]);
    // The matching observation is NOT flagged `undemanded` anywhere: the pending pair stays
    // DEMANDED (in evidenceObligationPairs), so the pending declaration owns that observation
    // rather than it posting as a stray credit.
    const undemanded = balance.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "undemanded")
    );
    expect(undemanded).toEqual([]);
    // And the observation is not shunted to a suspense/phantom row either — it is simply
    // owned by the pending pair and reconciled nowhere.
    expect(
      balance.scenarioReconciliations.every((s) => s.kind === "scenario" || s.kind === undefined)
    ).toBe(true);
  });
});

describe("[SCN-PND-006] a Pending Item is not a Reconciling Item — a structurally distinct category, never an error", () => {
  // A Pending Item is NEVER a Reconciling Item (never in `reconcilingItems`) and NEVER a
  // `QualityCheckReconciliation` outcome (never in `evidenceObligations`): it is a structurally
  // distinct category (`pendingItems`), so it is never counted among, or rendered as, an
  // error/discrepancy. Pinned over a MIXED scenario — one declaring BOTH a bare @unit
  // obligation (which reconciles to a genuine `missing` error, a real reconciling item) AND an
  // @integrationpending one (which partitions to a one-sided Pending Item). The error list
  // carries ONLY the missing unit; the deferred integration stays OUT of it. This is the sharp
  // pin beyond PND-004 (whose only-pending scenario has an EMPTY reconciling list): here the
  // reconciling list is NON-empty, yet the Pending Item is still not folded in. Green-first
  // regression pin over the partition PND-004 established (Option A gives category-distinctness
  // by construction); teeth proven by a local mutation that leaks the pending item into the
  // reconciling list. Asserts REAL reconcile output (evidence-manifesto §11A). The @integration
  // arm (tests/steps/pendingItems.steps.ts, @SCN-PND-006) proves the same through the
  // parse→reconcile pipeline over the planted mixed fixture.
  it("keeps the deferred obligation out of the reconciling/error list even when a genuine error is present", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-006",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // No observation is sought — the unit obligation goes `missing` (a genuine error), the
    // pending integration one partitions to a one-sided Pending Item.
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-006");

    // The error list carries ONLY the missing unit — the deferred integration is not among it.
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "missing" },
    ]);
    // The Pending Item is a structurally distinct category: it names NO reconciling item and
    // NO evidence-obligation outcome at the pending check.
    expect(
      scenario?.reconcilingItems.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    expect(
      scenario?.evidenceObligations.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    // Positive confirmation the deferred obligation IS in the pending category (not dropped).
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });
});

describe("[SCN-PND-007] a scenario whose only exception is a Pending Item has verdict balanced", () => {
  // A Pending Item is VERDICT-NEUTRAL: it never contributes an out-of-balance reconciling
  // item, so a scenario whose only non-satisfied element is a Pending Item is `balanced`. Two
  // shapes: a scenario whose SOLE obligation is deferred (partitions to zero reconciled rows,
  // yet balanced — the fix: `verdictFor` over an empty list must read balanced, not the vacuous
  // out-of-balance), and a scenario carrying a PASSING obligation alongside a deferred one (the
  // passing one satisfied, the pending one one-sided → balanced). The verdict is derived from
  // reconciling-item emptiness, so the both-missing row (which DOES carry a reconciling item)
  // stays out-of-balance — the non-regression guard below. Asserts REAL reconcile output
  // (evidence-manifesto §11A). The @integration arm (tests/steps/pendingItems.steps.ts,
  // @SCN-PND-007) proves the same verdict-neutrality through the parse→reconcile pipeline over
  // the planted only-pending-balanced fixture.
  it("balances a scenario whose sole obligation is deferred pending (no reconciling item, one Pending Item)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PND-007", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    // No observation is sought — a Pending Item is one-sided.
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    // The verdict is BALANCED though the reconciled evidence-obligation list is empty — the
    // Pending Item contributes no reconciling item. Reds before the fix: `verdictFor([])`
    // returned out-of-balance (the vacuous verdict over an empty list).
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.evidenceObligations).toEqual([]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });

  it("balances a scenario carrying a passing unit obligation alongside a deferred integration one", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-007",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // The unit obligation is discharged by a passing observation; the pending integration one
    // is one-sided. The scenario's only non-satisfied element is the Pending Item → balanced.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-007", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.evidenceObligations).toEqual([{ qualityCheck: "unit", outcome: "satisfied" }]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });

  it("does NOT regress both-missing: a scenario with zero obligations and no citation stays out-of-balance", () => {
    // The non-regression guard on the verdict fix. A bare-empty scenario (no obligation, no
    // pending, cited by nothing) reconciles to the degenerate both-missing row — which CARRIES a
    // reconciling item — so it stays out-of-balance. The fix derives the verdict from
    // reconciling-item emptiness, so both-missing (a non-empty reconciling list) is untouched;
    // only the truly-empty list (an only-pending scenario) flips to balanced.
    const scenarios: Scenario[] = [{ scnId: "SCN-PND-007", evidenceObligations: [] }];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });
});

describe("[SCN-PND-009] a @unit @integrationpending scenario with a passing unit observation is balanced with one Pending Item", () => {
  // The COMPOSITION case: a pending and a non-pending obligation coexist on ONE scenario WITHOUT
  // interference. A `@unit @integrationpending` scenario with a PASSING unit observation
  // reconciles to a SATISFIED unit obligation (a genuine reconciling-side balance) AND a one-sided
  // integration Pending Item (partitioned off). Verdict balanced; reconcilingItems empty; exactly
  // one Pending Item. The pending partition does not swallow the unit obligation, and the unit
  // reconcile does not swallow the pending one. Green-first over the foundation (the same
  // partition PND-004..007 landed); teeth proven by a pending-partition-swallows-unit mutation
  // (reverted). Asserts REAL reconcile output (evidence-manifesto §11A). The @integration arm
  // (tests/steps/pendingItems.steps.ts, @SCN-PND-009) proves the same composition through the
  // parse→reconcile pipeline over the planted composition fixture.
  it("reconciles the unit obligation satisfied and partitions the integration one to a Pending Item", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-009",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // A passing unit observation citing the scenario discharges the bare `@unit` obligation; the
    // `@integrationpending` one is one-sided (no observation is sought for it).
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-009", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-009");

    // Coexistence without interference, pinned sharply:
    //   - the unit obligation reconciles satisfied — the scenario's SOLE reconciled evidence
    //     obligation (the pending partition did NOT swallow it).
    expect(scenario?.evidenceObligations).toEqual([{ qualityCheck: "unit", outcome: "satisfied" }]);
    //   - the deferred integration obligation is EXACTLY one one-sided Pending Item (the unit
    //     reconcile did NOT swallow it).
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    //   - verdict balanced, no reconciling item — the composition is honestly balanced.
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-014] an undeclared undefined step is reported out-of-balance (missing), not excused as pending", () => {
  // The anti-leniency corollary of PND-013, sharpened at the VERDICT level over the REAL reader
  // feeding the REAL reconciler (§11A). A scenario declares an @integration obligation and NO
  // <qc>pending; its cucumber run has an `undefined` step. The reader drops the inconclusive
  // scenario (emits nothing), so the declared obligation reconciles MISSING by absence and the
  // verdict is out-of-balance. Because no <qc>pending was declared, NO Pending Item is raised —
  // an undefined step is NOT excused as pending (Cucumber's own leniency, the hole this tool must
  // not have). Pending is a DECLARATION, never inferred from an inconclusive run's status.
  it("drops the undefined observation → the declared obligation reconciles missing, verdict out-of-balance, no Pending Item", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PND-014", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    // The observed side, straight from the REAL cucumber reader: an `undefined` step is
    // inconclusive → dropped → an EMPTY observation set (no back-door hand-built observation).
    const report: CucumberJsonReport = [
      {
        uri: "features/pnd014.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-PND-014" }],
            steps: [{ result: { status: "undefined" } }],
          },
        ],
      },
    ];
    const observations = parseCucumberEvidenceObservations(report, "integration");
    expect(observations).toEqual([]); // the reader dropped the inconclusive scenario.

    const balance = reconcile(scenarios, observations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-014");

    // Missing by absence — the anti-leniency outcome.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing" },
    ]);
    // The teeth: NOT excused as pending. A Pending Item requires a <qc>pending declaration, which
    // this scenario does not carry — so it raises none.
    expect(scenario?.pendingItems).toEqual([]);
  });
});
