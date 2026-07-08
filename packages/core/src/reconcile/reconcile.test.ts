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
