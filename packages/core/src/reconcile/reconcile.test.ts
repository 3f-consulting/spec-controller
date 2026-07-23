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
import { reconcile, hasBrokenEvidence, isBalanced } from "./reconcile.js";
import { assembleReport } from "../assemble/report.js";
import type { RunContext } from "../provenance/provenance.js";
import type {
  Scenario,
  EvidenceObligation,
  EvidenceObservation,
  RuntimeEvidenceObservation,
  Ledger,
  ScenarioReconciliation,
} from "../model.js";
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
    expect(scenario?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" } },
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
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-002", status: "failed" } },
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
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
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
        { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-004", status: "failed" } },
        { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
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
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed" } },
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
    expect(phantom?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "cites-unknown-scenario", locator: "src/phantom.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PHANTOM-999", status: "passed", locator: "src/phantom.test.ts" } },
    ]);
    expect(phantom?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "cites-unknown-scenario", locator: "src/phantom.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PHANTOM-999", status: "passed", locator: "src/phantom.test.ts" } },
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
      { qualityCheck: "lint", staticGuard: "lint:orphan", exists: true, enforcedOverRealSource: true },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const suspense = balance.scenarioReconciliations.filter((s) => s.kind === "suspense-scenario");
    // ONE suspense row aggregates ALL uncited credits + suspense static guards.
    expect(suspense).toHaveLength(1);
    const row = suspense[0]!;
    expect(row.scnId).toBe("(no scenario)");
    expect(row.verdict).toBe("out-of-balance");
    // Every uncited runtime credit (with its locator) THEN each unattributed static-guard,
    // all outcome cites-no-scenario.
    expect(row.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "src/a.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/a.test.ts" } },
      { qualityCheck: "integration", outcome: "cites-no-scenario", locator: "features/b.feature", evidenceObservation: { qualityCheck: "integration", scnId: null, status: "failed", locator: "features/b.feature" } },
      { qualityCheck: "lint", staticGuard: "lint:orphan", outcome: "cites-no-scenario", evidenceObservation: { qualityCheck: "lint", staticGuard: "lint:orphan", exists: true, enforcedOverRealSource: true } },
    ]);
    expect(row.reconcilingItems).toEqual(row.qualityCheckReconciliations);

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
    expect(row?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      { qualityCheck: "integration", outcome: "undemanded", locator: "src/undemanded.test.ts", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/undemanded.test.ts" } },
    ]);
    expect(row?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      { qualityCheck: "integration", outcome: "undemanded", locator: "src/undemanded.test.ts", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/undemanded.test.ts" } },
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

describe("[SCN-LDG-027] a Quality Check Reconciliation carries the evidence observation it reconciles (the credit side)", () => {
  it("carries the citing observation on the undemanded reconciliation, with no obligation (the pure credit case)", () => {
    // The mirror of LDG-026's pure debit: SCN-LDG-027 declares unit; a passing INTEGRATION credit
    // cites it at a quality-check it never demanded → `undemanded` (observation present, obligation
    // absent). The credit-side producer (the fold's `undemandedItems`) carries the citing
    // observation `o` as `evidenceObservation`, and — being a credit against no obligation — the
    // row carries NO `evidenceObligation`. That two-sidedness is the point of the slice.
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-027", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observation: EvidenceObservation = {
      qualityCheck: "integration",
      scnId: "SCN-LDG-027",
      status: "passed",
      locator: "src/undemanded.test.ts",
    };
    const evidenceObservations: EvidenceObservation[] = [observation];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-027");

    const undemanded = row?.qualityCheckReconciliations.find((o) => o.outcome === "undemanded");
    // The CREDIT side is carried on the reconciliation itself — the very observation it reconciles.
    expect(undemanded?.evidenceObservation).toEqual(observation);
    // The DEBIT side is absent — an undemanded credit reconciles against no obligation.
    expect(undemanded?.evidenceObligation).toBeUndefined();
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
      { qualityCheck: "unit", outcome: "undemanded", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" } },
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
    // Quality Check Reconciliation, blank on both sides (no qualityCheck, no `staticGuard`, no locator),
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
    // qualityCheck (neither a debit evidence obligation nor a credit evidence observation), no `staticGuard`, no locator.
    expect(row?.qualityCheckReconciliations).toEqual([{ outcome: "both-missing" }]);
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
    expect(row?.reconcilingItems).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
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
    expect(scenario?.qualityCheckReconciliations).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-013", status: "passed", locator: "src/unitAndE2e.test.ts" } },
        { qualityCheck: "e2e", outcome: "satisfied", evidenceObligation: { qualityCheck: "e2e" }, evidenceObservation: { qualityCheck: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" } },
      ])
    );
    expect(scenario?.qualityCheckReconciliations).toHaveLength(2);
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
      expect(scenario?.qualityCheckReconciliations).toEqual([]);
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
    expect(scenario?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-004", status: "passed" } },
    ]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-005] the pending declaration governs even when a matching observation exists — the Pending Item is raised, the observation IS undemanded", () => {
  // A Pending Item is ONE-SIDED: the pending tag's existence ALONE raises it — no observation
  // is sought. Even when a MATCHING observation exists for the pending obligation's check, the
  // pending declaration governs: the obligation is NOT reconciled against the observation (it
  // never becomes `satisfied`, never a reconciling item).
  //
  // A PENDING OBLIGATION DEMANDS NOTHING (3F-1858). Canon, Pending Item: a `pending` tag raises
  // NO Evidence Obligation, so the citing credit is `undemanded` — "exactly as when nothing was
  // declared at all". This test used to assert the opposite ("the pair stays DEMANDED"), under
  // which the credit posted to NO account: the pair-check excluded it from `undemanded`, the
  // partition excluded it from the debit side. Zero rows, balanced, exit 0 — the false-green.
  //
  // The Pending Item ITSELF stays verdict-neutral (@SCN-PND-006..008); the row below is out of
  // balance via the CREDIT, never via the Pending Item. Two different things on one row.
  // Asserts REAL reconcile output (evidence-manifesto §11A). The @integration arm
  // (tests/steps/pendingItems.steps.ts, @SCN-PND-005) proves the same through the
  // parse→reconcile pipeline over a planted fixture carrying a matching observation.
  it("raises the Pending Item and posts the matching observation as undemanded (obligation never satisfied; the row reds via the credit)", () => {
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
    // The obligation never reconciled against the match — it did NOT become `satisfied`.
    // (Partition-before-match: a pending obligation never reaches reconcileEvidenceObligation.)
    expect(scenario?.qualityCheckReconciliations.some((r) => r.outcome === "satisfied")).toBe(false);
    // The matching observation IS flagged `undemanded`: the pending obligation raises no Evidence
    // Obligation, so its pair is NOT demanded and the citing credit posts as an ordinary
    // undemanded credit on this real scenario's own row.
    const undemanded = balance.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "undemanded")
    );
    expect(undemanded).toEqual([{ qualityCheck: "integration", outcome: "undemanded", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" } }]);
    // The row reds VIA THE CREDIT, never via the Pending Item — which is not a reconciling item
    // and stays verdict-neutral. Two different things on one row.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "undemanded", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" } },
    ]);
    // The run fails: canon says a credit against a pending pair must not pass silently.
    expect(isBalanced(balance)).toBe(false);
    // And the observation is not shunted to a suspense/phantom row either — it posts to the real
    // scenario it cites, which is the only account it ever names.
    expect(balance.scenarioReconciliations.every((s) => s.kind === "scenario")).toBe(true);
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
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
    ]);
    // The Pending Item is a structurally distinct category: it names NO reconciling item and
    // NO evidence-obligation outcome at the pending check.
    expect(
      scenario?.reconcilingItems.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    expect(
      scenario?.qualityCheckReconciliations.some((r) => r.qualityCheck === "integration")
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
    expect(scenario?.qualityCheckReconciliations).toEqual([]);
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
    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-007", status: "passed" } }]);
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
    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-009", status: "passed" } }]);
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
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    // The teeth: NOT excused as pending. A Pending Item requires a <qc>pending declaration, which
    // this scenario does not carry — so it raises none.
    expect(scenario?.pendingItems).toEqual([]);
  });
});

describe("[SCN-PND-019] a recognised deferral tag raises the Pending Item whether the scenario is filtered out or reports a pending status — the declaration overrides the observation-derived outcome", () => {
  // The DECLARATION-OVERRIDES-OBSERVATION close-out of the slice-4 Rule (slice 3 — the declaration
  // overrides the observation-derived outcome). A deferred obligation (the `pending: true` flag a
  // recognised community tag sets at PARSE, @SCN-PND-016) partitions to a one-sided Pending Item
  // BEFORE any observation match — so it raises the Pending Item REGARDLESS of the observation
  // side. Pinned over the two sides that would ELSE reconcile `missing`, with the contrast that
  // makes the override bite (a NON-deferred obligation on the same side → `missing`):
  //   - FILTERED OUT: no observation at all (the @skip scenario excluded from the run) → missing
  //     by absence without the deferral.
  //   - REPORTS A PENDING STATUS: a cucumber `pending`-status step the REAL reader (§11A) drops as
  //     inconclusive → again missing by absence without the deferral.
  // Green-first over @SCN-PND-016 (the parse-level deferral) + @SCN-PND-013 (the reader's drop),
  // both already delivered; teeth proven by a local mutation removing the scenario-scope deferral
  // (reverted). Asserts REAL reconcile + REAL reader output (evidence-manifesto §11A). The
  // @integration arm (tests/steps/pendingItems.steps.ts, @SCN-PND-019) proves the same override
  // from both observation sides through the parse→(reader)→reconcile pipeline over the planted
  // declaration-overrides-observation fixture.

  it("filtered out (no observation): a deferred obligation is a Pending Item where a non-deferred one is missing", () => {
    // A deferred @integration obligation reconciled against NO observation (the filtered-out side)
    // → a one-sided Pending Item, verdict balanced, no reconciling item.
    const deferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(deferred, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-019");
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);

    // The contrast that makes the override bite: WITHOUT the deferral, the same obligation on the
    // same (no-observation) side reconciles `missing` — an out-of-balance error, not a Pending Item.
    const nonDeferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    const nonDeferredBalance = reconcile(nonDeferred, []);
    const nonDeferredScenario = nonDeferredBalance.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PND-019"
    );
    expect(nonDeferredScenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    expect(nonDeferredScenario?.pendingItems).toEqual([]);
  });

  it("reports a pending status (the reader dropped it): a deferred obligation is a Pending Item where a non-deferred one is missing", () => {
    // The observed side, straight from the REAL cucumber reader: a `pending` step is inconclusive
    // → dropped → an EMPTY observation set (no back-door hand-built observation).
    const report: CucumberJsonReport = [
      {
        uri: "features/pnd019.feature",
        elements: [
          {
            tags: [{ name: "@wip" }, { name: "@integration" }, { name: "@SCN-PND-019" }],
            steps: [{ result: { status: "pending" } }],
          },
        ],
      },
    ];
    const observations = parseCucumberEvidenceObservations(report, "integration");
    expect(observations).toEqual([]); // the reader dropped the pending-status scenario.

    // A deferred @integration obligation reconciled against the reader's OWN dropped output →
    // a one-sided Pending Item, verdict balanced, no reconciling item.
    const deferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(deferred, observations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-019");
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);

    // The contrast: WITHOUT the deferral, the dropped pending-status observation leaves the same
    // obligation `missing` by absence — an error, not a Pending Item.
    const nonDeferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    const nonDeferredBalance = reconcile(nonDeferred, observations);
    const nonDeferredScenario = nonDeferredBalance.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PND-019"
    );
    expect(nonDeferredScenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    expect(nonDeferredScenario?.pendingItems).toEqual([]);
  });
});

describe("[SCN-PND-022] a deferred scenario declaring no obligations is a Pending Item, not both-missing", () => {
  // INTERPRETATION 2 — the reconcile PARTITION arm. A synthesised scenario-scope pending
  // obligation (`{ pending: true }` with NO `qualityCheck` — what parseScenarios emits for a bare
  // `@wip` declaring zero obligations, @SCN-PND-022) partitions to ONE `qualityCheck`-less Pending
  // Item. The both-missing guard fires only on ZERO pending items, so the synthesised pending →
  // NOT both-missing: the scenario reconciles to zero rows on both sides yet is balanced-with-
  // pending (the forward-compatibility slice 2 built into the guard). This proves the partition +
  // both-missing-guard behaviour over the reconcile function in isolation; the parse synthesis that
  // FEEDS it is the scenarios.test.ts arm, and the full parse→reconcile→render pipeline is the
  // @integration arm (tests/steps/pendingItems.steps.ts, @SCN-PND-022). Asserts REAL reconcile
  // output (evidence-manifesto §11A).
  it("routes a synthesised scenario-scope pending obligation to one qualityCheck-less Pending Item, balanced, not both-missing", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PDX-001", evidenceObligations: [{ pending: true }] },
    ];
    // No observation is sought — a scenario-scope Pending Item is one-sided.
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PDX-001");

    // Exactly one Pending Item, scenario-scope (no owed quality-check).
    expect(scenario?.pendingItems).toHaveLength(1);
    expect(scenario?.pendingItems[0]!.qualityCheck).toBeUndefined();
    // Balanced-with-pending: the both-missing guard does NOT fire (a pending item is present), so
    // no both-missing reconciling item, and the empty reconciled list reads balanced.
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([]);
    expect(scenario?.qualityCheckReconciliations.some((o) => o.outcome === "both-missing")).toBe(false);
  });

  it("the both-missing guard is unchanged: a truly zero-obligation scenario (no pending) still reconciles both-missing", () => {
    // The non-regression contrast. A bare-empty scenario — no obligation AND no synthesised pending
    // (never carried a deferral tag) — still posts the degenerate both-missing row (out-of-balance).
    // Only the synthesised-pending case above flips to balanced; the guard is not special-cased
    // further than the pending-items clause it already had.
    const scenarios: Scenario[] = [{ scnId: "SCN-XXX-999", evidenceObligations: [] }];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-XXX-999");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
    expect(scenario?.pendingItems).toEqual([]);
  });
});

describe("[SCN-LDG-017] a broken observation posts a broken suspense item; the scenario it would have proven still reads missing", () => {
  // The reconcile arm of BROKEN-NOT-ABSENT. A `broken` observation (the reader's collection-
  // failure credit) names no test, so it cites no @SCN and can be attributed to no scenario: it is
  // a SIBLING of `cites-no-scenario` — both land in suspense because they name no scenario —
  // distinguished by errored-vs-completed. The suspense fold, which mapped EVERY uncited runtime
  // credit to `cites-no-scenario`, must split.
  const scenarios: Scenario[] = [
    { scnId: "SCN-HNS-017", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const brokenObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: null,
    status: "failed",
    locator: "packages/core/src/harness.test.ts",
    broken: true,
    message: "Error: Cannot find package '@cucumber/tag-expressions'",
  };

  it("posts ONE broken reconciling item on the suspense row, carrying the file locator and the collection message", () => {
    const balance = reconcile(scenarios, [brokenObservation]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.verdict).toBe("out-of-balance");
    expect(suspense?.reconcilingItems).toEqual([
      {
        qualityCheck: "unit",
        outcome: "broken",
        locator: "packages/core/src/harness.test.ts",
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
      },
    ]);
  });

  it("is NOT cites-no-scenario — the sibling it would otherwise be indistinguishable from", () => {
    // Folding the collection failure into `cites-no-scenario` would hide the remedy (fix the
    // harness) behind the wrong one (add a citation). Reds under the unsplit fold.
    const balance = reconcile(scenarios, [brokenObservation]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.reconcilingItems.some((i) => i.outcome === "cites-no-scenario")).toBe(false);
  });

  it("leaves the scenario whose proof was in that file reading missing — honest at its own resolution", () => {
    // The scenario's OWN row is unchanged: no evidence citing it arrived, so its unit obligation is
    // `missing`. The finding is at the RUN's resolution, not the scenario's.
    const balance = reconcile(scenarios, [brokenObservation]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-017");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
  });

  it("an ordinary uncited credit is STILL cites-no-scenario — the split does not swallow its sibling", () => {
    // The non-regression contrast (@SCN-LDG-007 unchanged): a COMPLETED test that cited no @SCN
    // still folds to `cites-no-scenario`. Only the errored (broken) credit takes the new outcome.
    const balance = reconcile(scenarios, [
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
    ]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "src/uncited.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" } },
    ]);
  });

  // THE FAIL-SAFE (operator-mandated, 3F-1642 decisions of record): `broken` is checked BEFORE
  // `status`. A broken observation must NEVER reconcile as `failing` or `satisfied` — it names no
  // test, so it cites no scenario and can post to NO scenario's row. The observation shape is the
  // optional-flag one (`broken?: true` on RuntimeEvidenceObservation), so a `broken` credit
  // structurally CAN carry a scnId and a status; the reconciler must refuse to credit it anyway.
  // Pinned here under BOTH status values, and with a scnId that matches a DECLARED scenario — the
  // adversarial shape that would otherwise discharge (or fail) an obligation off a suite that
  // never ran. Not asserted in the code alone: this is the test.
  it.each(["passed", "failed"] as const)(
    "FAIL-SAFE: a broken observation citing a declared scenario with status %s never reconciles as satisfied or failing",
    (status) => {
      const balance = reconcile(scenarios, [
        {
          qualityCheck: "unit",
          scnId: "SCN-HNS-017",
          status,
          locator: "packages/core/src/harness.test.ts",
          broken: true,
          message: "collection failed",
        },
      ]);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-017");

      // The scenario's unit obligation is NOT discharged (nor failed) by a suite that never ran.
      expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
      // And NOWHERE in the whole reconciliation does the broken credit surface as satisfied or
      // failing — across every row, declared and credit-side alike.
      const everyOutcome = balance.scenarioReconciliations.flatMap((s) =>
        s.qualityCheckReconciliations.map((o) => o.outcome)
      );
      expect(everyOutcome).not.toContain("satisfied");
      expect(everyOutcome).not.toContain("failing");
      // It IS on the ledger — as a broken suspense item, the only place it can honestly post.
      const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
      expect(suspense?.reconcilingItems.map((i) => i.outcome)).toEqual(["broken"]);
    }
  );
});

describe("[SCN-LDG-019] THE FAIL-SAFE GETS TEETH: a broken observation that CITES its scenario still leaves that obligation missing", () => {
  // THIS IS THE POINT OF THE SLICE, not a restatement of LDG-017.
  //
  // The cucumber reader's `broken` observation — an AMBIGUOUS step (two step definitions match, so
  // the step cannot run) — is the FIRST case in the codebase that emits a broken observation
  // CARRYING AN scnId. Vitest's collection failure is citation-less BY CONSTRUCTION (a file that
  // fails to collect names no test, so it cites no @SCN), so the reconciler's guard — which
  // excludes a broken observation from the obligation match WHATEVER scnId and status it carries
  // (reconcile.ts, `o.broken !== true` before the (scnId, qualityCheck) match) — has been
  // DEFENSIVE BUT NEVER EXERCISED BY A REAL READER since 3F-1642.
  //
  // A cucumber scenario DOES cite its @SCN; only its step could not run. So the guard now bites on
  // production output: the broken credit must NEVER discharge (status "passed") or fail (status
  // "failed") the obligation it cites. It folds to SUSPENSE, and the cited obligation reconciles
  // `missing` BY ABSENCE — honest at its own resolution (no evidence that RAN cites it), while the
  // RUN carries the ambiguity and is stamped unsound.
  //
  // The adversarial value is `status: "passed"`: without the guard, a harness that never executed
  // a single step would DISCHARGE the obligation it cites — a green tick over a test that never
  // ran, the exact false-benign reading `broken` exists to kill.
  const scenarios: Scenario[] = [
    { scnId: "SCN-HNS-020", evidenceObligations: [{ qualityCheck: "integration" }] },
  ];
  /** The cucumber reader's shape for an ambiguous step: broken, CITING, and structurally statused. */
  const citingBrokenObservation = (status: "passed" | "failed"): RuntimeEvidenceObservation => ({
    qualityCheck: "integration",
    scnId: "SCN-HNS-020",
    status,
    locator: "features/ambiguous.feature",
    broken: true,
    message:
      'The step "Given a step two definitions both match" is ambiguous — two or more step definitions match it, so the step never ran.',
  });

  it.each(["passed", "failed"] as const)(
    "a broken observation citing SCN-HNS-020 with status %s leaves SCN-HNS-020's integration obligation missing",
    (status) => {
      const balance = reconcile(scenarios, [citingBrokenObservation(status)]);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-020");

      // The cited obligation is NOT discharged, and NOT failed, by a step that never ran.
      expect(scenario?.qualityCheckReconciliations).toEqual([
        { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
      ]);
      expect(scenario?.verdict).toBe("out-of-balance");
    }
  );

  it.each(["passed", "failed"] as const)(
    "the citing broken observation with status %s surfaces NOWHERE as satisfied or failing, and posts exactly once — on the suspense row",
    (status) => {
      const balance = reconcile(scenarios, [citingBrokenObservation(status)]);

      // Across EVERY row — declared, phantom and suspense alike — the broken credit never reads as
      // discharged or failed.
      const everyOutcome = balance.scenarioReconciliations.flatMap((s) =>
        s.qualityCheckReconciliations.map((o) => o.outcome)
      );
      expect(everyOutcome).not.toContain("satisfied");
      expect(everyOutcome).not.toContain("failing");

      // It posts EXACTLY ONCE, on the SUSPENSE row, carrying its where-to-fix (the feature file)
      // and its what-broke (the synthesised ambiguity message) — never as `undemanded` on the
      // scenario it cites (the byScn index skips it), never as a `cites-unknown-scenario` phantom.
      expect(balance.scenarioReconciliations.map((s) => s.kind)).toEqual([
        "scenario",
        "suspense-scenario",
      ]);
      const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
      expect(suspense?.reconcilingItems).toEqual([
        {
          qualityCheck: "integration",
          outcome: "broken",
          locator: "features/ambiguous.feature",
          message:
            'The step "Given a step two definitions both match" is ambiguous — two or more step definitions match it, so the step never ran.',
        },
      ]);

      // And the RUN is unsound — soundness is a property of the run (@SCN-LDG-018), reader-agnostic
      // exactly as `broken` now is.
      expect(hasBrokenEvidence(balance)).toBe(true);
    }
  );

  it("a broken observation citing an UNDECLARED scenario mints no phantom row — suspense is a broken credit's only account", () => {
    // The third arm of the fail-safe, over the citing shape: a cucumber @SCN that no declared
    // scenario matches would ordinarily mint a `cites-unknown-scenario` phantom row. A broken
    // credit never does — it errored, so its citation credits nothing anywhere.
    const balance = reconcile(scenarios, [
      { ...citingBrokenObservation("passed"), scnId: "SCN-NOT-DECLARED" },
    ]);

    expect(balance.scenarioReconciliations.some((s) => s.kind === "phantom-scenario")).toBe(false);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    expect(suspense?.reconcilingItems.map((i) => i.outcome)).toEqual(["broken"]);
  });
});

/**
 * @unit for @SCN-LDG-021 (3F-1774) — undeclarable work is never invisible.
 *
 * Bidirectional evidence: the describe carries the @SCN-LDG-021 id matching
 * features/ledger.feature and the @integration steps in tests/steps/ledger.steps.ts.
 *
 * A scenario carrying no @SCN declares no obligation, so it could reconcile NOTHING — not
 * satisfied, not failing, not even `missing`: an obligation that was never DECLARED cannot be
 * ABSENT. It was simply not there, and the run went green over work cucumber runs and nothing
 * proves. The scenario is REAL and ORDINARY (not phantom, not suspense); what is absent is the
 * @SCN CODE its obligation needs to link to an observation. Hence `no-scn-code`, debit-side, on
 * its own out-of-balance row — the debit twin of `cites-no-scenario`.
 */
describe("[SCN-LDG-021] a scenario declaring no @SCN reconciles no-scn-code on its own row", () => {
  it("gives the untagged scenario its own out-of-balance row carrying no-scn-code", () => {
    const declared: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    // The untagged scenario, by NAME — the only handle it has, since it carries no code.
    const reconciliation = reconcile(declared, observed, ["beta must never lose the money"]);

    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    // ORDINARY, not phantom and not suspense: the scenario exists and cucumber runs it.
    expect(row!.kind).toBe("scenario");
    expect(row!.verdict).toBe("out-of-balance");
    expect(row!.qualityCheckReconciliations.map((o) => o.outcome)).toEqual(["no-scn-code"]);
  });

  it("makes the whole run out-of-balance — a scenario the ledger cannot link is never clean", () => {
    // THE FALSE-GREEN. Before this, the tagged scenario reconciled satisfied, the untagged one
    // contributed NOTHING, and isBalanced said BALANCED (exit 0) — the report printing
    // "1 scenario(s) carry no @SCN tag" and certifying the run clean in the same breath.
    const declared: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const clean = reconcile(declared, observed);
    expect(isBalanced(clean)).toBe(true); // the control: nothing untagged, genuinely balanced

    const withUntagged = reconcile(declared, observed, ["beta must never lose the money"]);
    expect(isBalanced(withUntagged)).toBe(false);
  });

  it("is inert when nothing is untagged — the byte-identical bar (the param is additive)", () => {
    const declared: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    // Omitted, and explicitly empty, must both reconcile exactly as before.
    expect(reconcile(declared, observed, [])).toEqual(reconcile(declared, observed));
  });
});

/**
 * @unit for @SCN-LDG-029 (3F-2016 / corrects 3F-1995) — no-scn-code is DEBIT-side.
 *
 * Canon (double-entry-manifesto line 39): no-scn-code = Obligation Exists, Observation None — the
 * debit twin of cites-no-scenario. The untagged scenario's obligation has no @SCN code to link to,
 * so the reconciliation carries a SYNTHESIZED scenario-scope obligation ({}, no qualityCheck /
 * staticGuard — the established scenario-scope degenerate shape, precedent: the scenario-scope
 * pending obligation in journal.ts) and NO observation. The scenario-level `evidenceObligations`
 * array STAYS empty — the synthesized {} lives only on the reconciling item, not the account's
 * debit posting — so census + markdown are untouched.
 */
describe("[SCN-LDG-029] a no-scn-code reconciliation carries a scenario-scope obligation and no observation", () => {
  it("carries the synthesized scenario-scope obligation {} on the reconciling item, and no observation", () => {
    const declared: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(declared, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();

    const qcr = row!.qualityCheckReconciliations.find((o) => o.outcome === "no-scn-code");
    expect(qcr).toBeDefined();
    // DEBIT side: the synthesized scenario-scope obligation — empty {}, no qualityCheck / staticGuard.
    // Its PRESENCE (Obligation Exists) is what makes no-scn-code debit-side, per canon line 39.
    expect(qcr!.evidenceObligation).toEqual({});
    // CREDIT side stays absent: no @SCN code means no observation can link at any tier.
    expect(qcr!.evidenceObservation).toBeUndefined();
  });

  it("leaves the scenario-level evidenceObligations empty — the synthesized {} is item-scope, census untouched", () => {
    const declared: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(declared, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    // The synthesized obligation lives ONLY on the reconciling item, NOT on the account's debit
    // posting — an untagged scenario declares no parsed obligations, so this stays []. That is what
    // keeps the census (and the markdown built from it) unchanged.
    expect(row!.evidenceObligations).toEqual([]);
  });
});

/**
 * @SCN-LDG-022 (3F-1846) — every evidence observation posts to AT LEAST ONE ledger account, never
 * to none (canon, double-entry-manifesto.md line 160). Over THIS single-demand corpus — no static
 * guard is demanded twice — the never-zero invariant lands at exactly one, which is the teeth here
 * against an erroneous double-post. The multi-demand instance (a static guard posting to every
 * demander) is @SCN-LDG-024.
 *
 * The @unit arm: `reconcile` populates each account's `evidenceObservations` with the credits that
 * CITE it. The @integration arm (tests/steps/ledger.steps.ts) drives the whole credit corpus at
 * once for the exhaustion/uniqueness property; these prove the per-shape routing in isolation.
 */
describe("[SCN-LDG-022] reconcile — every evidence observation posts to at least one account (exactly one over this single-demand corpus)", () => {
  const declared: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
  ];

  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it("posts a matched credit to the account it cites", () => {
    const credit: EvidenceObservation = { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(declared, [credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([credit]);
  });

  it("posts an undemanded credit to the real account it cites, not to suspense", () => {
    // Cites a REAL scenario at a check it never declared. It reconciles `undemanded` — and posts
    // to the account it CITES, because the account is the citation, never the outcome.
    const credit: EvidenceObservation = { scnId: "SCN-AAA-002", qualityCheck: "integration", status: "passed" };
    const ledger = reconcile(declared, [credit]);
    expect(accountFor(ledger, "SCN-AAA-002")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("posts a credit citing a PENDING quality-check", () => {
    // THE LOAD-BEARING CASE. With nowhere for a posted entry to sit this credit CEASED TO EXIST.
    // It posts to the account it cites WHATEVER it reconciles to — the posting rule is the
    // citation, never the outcome, so this case asserts nothing about the outcome.
    const credit: EvidenceObservation = { scnId: "SCN-AAA-003", qualityCheck: "unit", status: "passed" };
    const account = accountFor(reconcile(declared, [credit]), "SCN-AAA-003");
    expect(account?.evidenceObservations).toEqual([credit]);
  });

  it("posts a credit citing an unknown @SCN to that phantom account", () => {
    const credit: EvidenceObservation = { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(declared, [credit]);
    expect(accountFor(ledger, "SCN-ZZZ-999")?.evidenceObservations).toEqual([credit]);
  });

  it("posts an uncited credit to suspense", () => {
    const credit: EvidenceObservation = { scnId: null, qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(declared, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
  });

  it("posts a broken credit to suspense, whatever scnId it structurally carries", () => {
    // The fail-safe: `broken` is taken FIRST, on the flag — a proof that never ran cites no
    // scenario even when it carries one. SUSPENSE is its only account.
    const credit: RuntimeEvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "unit", status: "failed", broken: true,
    };
    const ledger = reconcile(declared, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([]);
  });

  it("posts a DEMANDED guard credit to the account that demands it", () => {
    // A static guard carries no @SCN, so `byScn` cannot hold it — its link to an account is the STATIC GUARD
    // HANDLE, exactly the link `reconcileEvidenceObligation` already follows to reconcile a lint
    // obligation onto this row. Posting it here MIRRORS the reconciler: the credit sits on the
    // account the outcome already lands on.
    const demanded: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:x" }] },
    ];
    const credit: EvidenceObservation = {
      qualityCheck: "lint", staticGuard: "lint:x", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(demanded, [credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([credit]);
    // A demanded static guard is NOT suspense — suspense is for credits citing no scenario at all.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("posts an UNDEMANDED guard credit to suspense — it cites no scenario", () => {
    // The other arm of the symmetry: no @lint obligation demands this handle, so it belongs to no
    // account and lands in suspense, where it already reconciles `cites-no-scenario`.
    const credit: EvidenceObservation = {
      qualityCheck: "lint", staticGuard: "lint:nobody-demands-this", exists: true, enforcedOverRealSource: false,
    };
    const ledger = reconcile(declared, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
  });

  it("sets evidenceObservations explicitly on every account, even when nothing posts", () => {
    const ledger = reconcile(declared, []);
    for (const account of ledger.scenarioReconciliations) {
      expect(account.evidenceObservations).toEqual([]);
    }
  });
});

/**
 * @SCN-LDG-024 (3F-1850) — a static guard demanded by TWO scenarios posts to EACH.
 *
 * The multi-demand instance of the posting invariant LDG-022 states as the universal (at least
 * one, never zero — canon, double-entry-manifesto.md line 160): a static guard's run cites no
 * scenario, so it is matched by handle and is evidence for EVERY demander. One run, one object,
 * posted BY REFERENCE onto each demanding account (never copied — the census walks the flat
 * stream, so a copy would double-count). This is the case no corpus exercised, and where the
 * "exactly one" over-generalisation breaks: here one observation posts to two accounts.
 */
describe("[SCN-LDG-024] reconcile — a static guard demanded by two scenarios posts to each account", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it("posts one static guard's run to BOTH demanding accounts, by reference, both satisfied", () => {
    const demanders: Scenario[] = [
      { scnId: "SCN-SHR-001", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:double-demand" }] },
      { scnId: "SCN-SHR-002", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:double-demand" }] },
    ];
    const credit: EvidenceObservation = {
      qualityCheck: "lint", staticGuard: "lint:double-demand", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(demanders, [credit]);
    const a1 = accountFor(ledger, "SCN-SHR-001");
    const a2 = accountFor(ledger, "SCN-SHR-002");

    // Posts to BOTH — one run is evidence for every demander (canon: posts to every account
    // that demands it). This is where "exactly one" breaks and "at least one" holds.
    expect(a1?.evidenceObservations).toEqual([credit]);
    expect(a2?.evidenceObservations).toEqual([credit]);
    // BY REFERENCE — the SAME object on each account, not a copy: safe under the 3F-1831 census
    // fold, which counts the flat stream once.
    expect(a1?.evidenceObservations[0]).toBe(a2?.evidenceObservations[0]);
    // Both demanders reconcile satisfied (the static guard is wired + enforced).
    expect(a1?.qualityCheckReconciliations).toEqual([{ qualityCheck: "lint", staticGuard: "lint:double-demand", outcome: "satisfied", evidenceObligation: { qualityCheck: "lint", staticGuard: "lint:double-demand" }, evidenceObservation: { qualityCheck: "lint", staticGuard: "lint:double-demand", exists: true, enforcedOverRealSource: true } }]);
    expect(a2?.qualityCheckReconciliations).toEqual([{ qualityCheck: "lint", staticGuard: "lint:double-demand", outcome: "satisfied", evidenceObligation: { qualityCheck: "lint", staticGuard: "lint:double-demand" }, evidenceObservation: { qualityCheck: "lint", staticGuard: "lint:double-demand", exists: true, enforcedOverRealSource: true } }]);
    // A DEMANDED guard is never suspense — no undemanded static guard here.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });
});

/**
 * @SCN-LDG-025 (3F-1851) — a demanded-guards-only corpus reconciles balanced; the demanded-guard
 * posting rule ALONE determines the verdict.
 *
 * The coverage hole: every other lint fixture mixes a demanded guard with another credit shape
 * (broken / uncited / undemanded) that independently mints the suspense row, so the demanded-guard
 * path never determines the outcome on its own — the posting rule was unfalsifiable. A corpus whose
 * ONLY lint credit is one satisfied demanded guard removes every other cause: balanced, no suspense
 * row, summary.outOfBalance 0 AGREEING with the balanced verdict. The rejected post-to-suspense
 * treatment would mint a spurious empty out-of-balance suspense row — summary.outOfBalance
 * disagreeing with isBalanced, the 3F-1703 fault — which THIS corpus finally makes red.
 */
describe("[SCN-LDG-025] reconcile — a demanded-guards-only corpus reconciles balanced, no suspense row", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  const ctx: RunContext = { target: "demanded-only", inputs: {}, runStart: new Date("2026-07-20T00:00:00.000Z"), sourceSha: null };

  it("a satisfied demanded guard as the only credit → balanced, no suspense, summary.outOfBalance 0", () => {
    const demanded: Scenario[] = [
      { scnId: "SCN-DEM-001", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:demanded-only" }] },
    ];
    const credit: EvidenceObservation = {
      qualityCheck: "lint", staticGuard: "lint:demanded-only", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(demanded, [credit]);

    // The demanding account reconciles satisfied and balanced.
    expect(accountFor(ledger, "SCN-DEM-001")?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "lint", staticGuard: "lint:demanded-only", outcome: "satisfied", evidenceObligation: { qualityCheck: "lint", staticGuard: "lint:demanded-only" }, evidenceObservation: { qualityCheck: "lint", staticGuard: "lint:demanded-only", exists: true, enforcedOverRealSource: true } },
    ]);
    expect(accountFor(ledger, "SCN-DEM-001")?.verdict).toBe("balanced");
    // NO suspense row — the only lint credit is the demanded one.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
    // The run is balanced, and the summary AGREES: outOfBalance 0 (the 3F-1703 identity — under
    // the rejected post-to-suspense this becomes 1 while isBalanced stays true, and it reds).
    expect(isBalanced(ledger)).toBe(true);
    expect(assembleReport(ledger, ctx).summary.scenarioReconciliations.outOfBalance).toBe(0);
  });
});

/**
 * @SCN-LDG-023 (3F-1847) — the evidence obligations a scenario declares post to its ledger account.
 *
 * The DEBIT half of @SCN-LDG-022's posting. The @unit arm: `reconcile` populates each account's
 * `evidenceObligations` with the debits that scenario DECLARES, keyed by quality-check. The
 * @integration arm (tests/steps/ledger.steps.ts) drives the whole declared corpus at once.
 *
 * Named `evidenceObligations` for canon's vocabulary — NEVER `debits`, the bookkeeping ROOT of the
 * metaphor rather than the vocabulary. The name is free because 3F-1846 renamed the misnomer that
 * held it (typed `QualityCheckReconciliation[]` — sub-rows, not debits) to
 * `qualityCheckReconciliations`.
 */
describe("[SCN-LDG-023] reconcile — the evidence obligations a scenario declares post to its ledger account", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it("posts a declared runtime obligation to its own scenario's account, keyed by quality-check", () => {
    const obligation: EvidenceObligation = { qualityCheck: "unit" };
    const declared: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [obligation] }];
    const ledger = reconcile(declared, [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([obligation]);
  });

  it("posts a declared lint obligation carrying its guard handle", () => {
    // The other obligation shape: `lint` debits carry the `staticGuard` handle that links them to a
    // static guard credit. The debit posts with its handle intact — the account records WHAT WAS
    // DEMANDED, not merely that something was.
    const obligation: EvidenceObligation = { qualityCheck: "lint", staticGuard: "lint:x" };
    const declared: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [obligation] }];
    const ledger = reconcile(declared, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([obligation]);
  });

  it("posts a PENDING obligation, though it earns no reconciled row", () => {
    // The debit-side mirror of LDG-022's load-bearing credit. A pending obligation partitions off
    // to a one-sided Pending Item BEFORE the observation match and earns no
    // `QualityCheckReconciliation` at all. It posts ANYWAY: posting is not classifying.
    const obligation: EvidenceObligation = { qualityCheck: "unit", pending: true };
    const declared: Scenario[] = [{ scnId: "SCN-AAA-003", evidenceObligations: [obligation] }];
    const account = accountFor(reconcile(declared, []), "SCN-AAA-003");
    expect(account?.evidenceObligations).toEqual([obligation]);
    // ...and it STILL earns no reconciled row. What pending DOES is unchanged by this slice.
    expect(account?.qualityCheckReconciliations).toEqual([]);
  });

  it("posts every declared obligation of a multi-obligation scenario, in document order", () => {
    const unit: EvidenceObligation = { qualityCheck: "unit" };
    const lint: EvidenceObligation = { qualityCheck: "lint", staticGuard: "lint:x" };
    const declared: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [unit, lint] }];
    const ledger = reconcile(declared, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([unit, lint]);
  });

  it("posts each scenario's debits to ITS OWN account — never another's", () => {
    const aaa: EvidenceObligation = { qualityCheck: "unit" };
    const bbb: EvidenceObligation = { qualityCheck: "integration" };
    const declared: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [aaa] },
      { scnId: "SCN-AAA-002", evidenceObligations: [bbb] },
    ];
    const ledger = reconcile(declared, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([aaa]);
    expect(accountFor(ledger, "SCN-AAA-002")?.evidenceObligations).toEqual([bbb]);
  });

  it("posts no debits to the accounts no scenario declares — suspense and phantom", () => {
    // A phantom/suspense account is MINTED BY A CREDIT: no scenario declares it, so nothing can
    // have been demanded of it. Its debit side is empty by construction — the asymmetry is real,
    // not an omission.
    const declared: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
    const ledger = reconcile(declared, [
      { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed" },
      { scnId: null, qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-ZZZ-999")?.evidenceObligations).toEqual([]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObligations).toEqual([]);
  });

  it("sets evidenceObligations explicitly on every account, even when nothing is declared", () => {
    const declared: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [] }];
    const ledger = reconcile(declared, []);
    for (const account of ledger.scenarioReconciliations) {
      expect(account.evidenceObligations).toEqual([]);
    }
  });
});
