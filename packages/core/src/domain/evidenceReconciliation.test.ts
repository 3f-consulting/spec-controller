import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
  ScenarioReconciliation,
} from "../model.js";

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
      { qualityCheck: "unit", scnId: "SCN-LDG-004", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-004");

    expect(scenario?.verdict).toBe("out-of-balance");
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

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(Array.isArray(scenario?.reconcilingItems)).toBe(true);
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed" } },
    ]);
  });
});

describe("[SCN-LDG-006] a credit citing a phantom scenario becomes a phantom-scenario reconciliation, out of balance", () => {
  it("emits one phantom-scenario reconciliation per phantom cited id, its quality-check reconciliation cites-unknown-scenario carrying the evidence observation locator, verdict out-of-balance", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-006", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed", locator: "src/phantom.test.ts" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const phantom = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PHM-999");

    expect(phantom?.kind).toBe("phantom-scenario");
    expect(phantom?.verdict).toBe("out-of-balance");
    expect(phantom?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "cites-unknown-scenario", locator: "src/phantom.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed", locator: "src/phantom.test.ts" } },
    ]);
    expect(phantom?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "cites-unknown-scenario", locator: "src/phantom.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed", locator: "src/phantom.test.ts" } },
    ]);

    const scenarioRow = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-006");
    expect(scenarioRow?.kind).toBe("scenario");
  });
});

describe("[SCN-LDG-007] a credit citing no scenario becomes a suspense-scenario reconciliation, out of balance", () => {
  it("aggregates every uncited credit AND the uncited static-checks into ONE suspense-scenario row, cites-no-scenario, out-of-balance", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/a.test.ts" },
      { qualityCheck: "integration", scnId: null, status: "failed", locator: "features/b.feature" },
      { qualityCheck: "fitness", staticCheck: "lint:orphan", exists: true, enforcedOverRealSource: true },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const suspense = balance.scenarioReconciliations.filter((s) => s.kind === "suspense-scenario");
    expect(suspense).toHaveLength(1);
    const row = suspense[0]!;
    expect(row.scnId).toBe("(no scenario)");
    expect(row.verdict).toBe("out-of-balance");
    expect(row.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "src/a.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/a.test.ts" } },
      { qualityCheck: "integration", outcome: "cites-no-scenario", locator: "features/b.feature", evidenceObservation: { qualityCheck: "integration", scnId: null, status: "failed", locator: "features/b.feature" } },
      { qualityCheck: "fitness", staticCheck: "lint:orphan", outcome: "cites-no-scenario", evidenceObservation: { qualityCheck: "fitness", staticCheck: "lint:orphan", exists: true, enforcedOverRealSource: true } },
    ]);
    expect(row.reconcilingItems).toEqual(row.qualityCheckReconciliations);

    const scenarioRow = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-007");
    expect(scenarioRow?.kind).toBe("scenario");
  });

  it("emits NO suspense row when every credit cites a scenario and no static-check is suspense", () => {
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

describe("[SCN-LDG-008] a credit at a quality-check with no evidence obligation on a real scenario is reported as no-evidence-obligation", () => {
  it("emits a no-evidence-obligation credit-side item ON the real scenario's row when a credit cites it at a quality-check it never named", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-008");

    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      { qualityCheck: "integration", outcome: "no-evidence-obligation", locator: "src/no-evidence-obligation.test.ts", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/no-evidence-obligation.test.ts" } },
    ]);
    expect(row?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      { qualityCheck: "integration", outcome: "no-evidence-obligation", locator: "src/no-evidence-obligation.test.ts", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/no-evidence-obligation.test.ts" } },
    ]);
  });

  it("does NOT mark a credit no-evidence-obligation when it matches a named (scnId, quality-check) pair", () => {
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
  it("carries the citing observation on the no-evidence-obligation reconciliation, with no obligation (the pure credit case)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-027", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observation: EvidenceObservation = {
      qualityCheck: "integration",
      scnId: "SCN-LDG-027",
      status: "passed",
      locator: "src/no-evidence-obligation.test.ts",
    };
    const evidenceObservations: EvidenceObservation[] = [observation];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-027");

    const noEvidenceObligation = row?.qualityCheckReconciliations.find((o) => o.outcome === "no-evidence-obligation");
    expect(noEvidenceObligation?.evidenceObservation).toEqual(observation);
    expect(noEvidenceObligation?.evidenceObligation).toBeUndefined();
  });
});

describe("[SCN-LDG-010] a zero-evidence obligation scenario cited by a stray credit is no-evidence-obligation, not both-missing", () => {
  it("emits a no-evidence-obligation row (NOT a warning, NOT both-missing) when a zero-evidence obligation scenario is cited by a stray credit", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-010", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-010");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" } },
    ]);
    expect(row?.reconcilingItems.some((r) => r.outcome === "both-missing")).toBe(false);
  });

  it("flips a zero-evidence obligation scenario with NO credit to a both-missing row (the boundary that LDG-009 lands)", () => {
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

describe("[SCN-LDG-009] a scenario with zero rows on both sides is reported as both-missing, out of balance", () => {
  it("emits ONE degenerate both-missing reconciling item (blank on both sides), verdict out-of-balance, when a scenario reconciles to zero rows on BOTH sides", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-009", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-009");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.qualityCheckReconciliations).toEqual([{ outcome: "both-missing" }]);
    expect(row?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });

  it("does NOT emit both-missing when the scenario names an evidence obligation (a one-sided row is a debit, not both-missing)", () => {
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

describe("[SCN-WRN-001] a scenario naming no evidence obligations is reported as a both-missing reconciliation", () => {
  it("reconciles the zero-evidenceObligation scenario as a both-missing out-of-balance ROW, NOT a warning excluded from the balance", () => {
    const scenarios: Scenario[] = [{ scnId: "SCN-WRN-001", evidenceObligations: [] }];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-WRN-001");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });

  it("keeps a scenario that DOES name an evidenceObligation on the verdict axis, alongside a both-missing scenario (the WITH-evidenceObligations path is untouched)", () => {
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
    expect(balance.scenarioReconciliations.map((s) => s.scnId)).toEqual([
      "SCN-WRN-001",
      "SCN-WRN-002",
    ]);
  });
});
