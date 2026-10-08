import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[SCN-PND-004] a named-pending obligation reconciles as a one-sided Pending Item, never a reconciling item", () => {
  const CHECKS = ["fitness", "unit", "integration", "e2e", "performance"] as const;

  for (const qualityCheck of CHECKS) {
    it(`raises exactly one Pending Item for a ${qualityCheck}pending obligation and posts no both-missing row`, () => {
      const scenarios: Scenario[] = [
        { scnId: "SCN-PND-004", evidenceObligations: [{ qualityCheck, pending: true }] },
      ];
      const balance = reconcile(scenarios, []);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-004");

      expect(scenario?.pendingItems).toEqual([{ qualityCheck }]);
      expect(scenario?.qualityCheckReconciliations).toEqual([]);
      expect(scenario?.reconcilingItems).toEqual([]);
    });
  }

  it("keeps the bare (non-pending) obligation reconciling while partitioning the pending one off (mixed scenario)", () => {
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

    expect(scenario?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-004", status: "passed" } },
    ]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-005] the pending deferral governs even when a matching observation exists — the Pending Item is raised, the observation IS no-evidence-obligation", () => {
  it("raises the Pending Item and posts the matching observation as no-evidence-obligation (obligation never satisfied; the row reds via the credit)", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-005",
        evidenceObligations: [{ qualityCheck: "integration", pending: true }],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-005");

    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.qualityCheckReconciliations.some((r) => r.outcome === "satisfied")).toBe(false);
    const noEvidenceObligation = balance.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "no-evidence-obligation")
    );
    expect(noEvidenceObligation).toEqual([{ qualityCheck: "integration", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" } }]);
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" } },
    ]);
    expect(isBalanced(balance)).toBe(false);
    expect(balance.scenarioReconciliations.every((s) => s.kind === "scenario")).toBe(true);
  });
});

describe("[SCN-PND-006] a Pending Item is not a Reconciling Item — a structurally distinct category, never an error", () => {
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
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-006");

    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
    ]);
    expect(
      scenario?.reconcilingItems.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    expect(
      scenario?.qualityCheckReconciliations.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });
});

describe("[SCN-PND-007] a scenario whose only exception is a Pending Item has verdict balanced", () => {
  it("balances a scenario whose sole obligation is deferred pending (no reconciling item, one Pending Item)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PND-007", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

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
    const scenarios: Scenario[] = [{ scnId: "SCN-PND-007", evidenceObligations: [] }];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });
});

describe("[SCN-PND-009] a @unit @integrationpending scenario with a passing unit observation is balanced with one Pending Item", () => {
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
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-009", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-009");

    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-009", status: "passed" } }]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-014] an undefined step with no pending deferral is reported out-of-balance (missing), not excused as pending", () => {
  it("drops the undefined observation → the named obligation reconciles missing, verdict out-of-balance, no Pending Item", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PND-014", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
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
    expect(observations).toEqual([]);

    const balance = reconcile(scenarios, observations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-014");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    expect(scenario?.pendingItems).toEqual([]);
  });
});

describe("[SCN-PND-019] a recognised deferral tag raises the Pending Item whether the scenario is filtered out or reports a pending status — the deferral overrides the observation-derived outcome", () => {
  it("filtered out (no observation): a deferred obligation is a Pending Item where a non-deferred one is missing", () => {
    const deferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(deferred, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-019");
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);

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
    expect(observations).toEqual([]);

    const deferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(deferred, observations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-019");
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);

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

describe("[SCN-PND-022] a deferred scenario naming no obligations is a Pending Item, not both-missing", () => {
  it("routes a synthesised scenario-scope pending obligation to one qualityCheck-less Pending Item, balanced, not both-missing", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PDX-001", evidenceObligations: [{ pending: true }] },
    ];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PDX-001");

    expect(scenario?.pendingItems).toHaveLength(1);
    expect(scenario?.pendingItems[0]!.qualityCheck).toBeUndefined();
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([]);
    expect(scenario?.qualityCheckReconciliations.some((o) => o.outcome === "both-missing")).toBe(false);
  });

  it("the both-missing guard is unchanged: a truly zero-obligation scenario (no pending) still reconciles both-missing", () => {
    const scenarios: Scenario[] = [{ scnId: "SCN-XXX-999", evidenceObligations: [] }];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-XXX-999");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
    expect(scenario?.pendingItems).toEqual([]);
  });
});
