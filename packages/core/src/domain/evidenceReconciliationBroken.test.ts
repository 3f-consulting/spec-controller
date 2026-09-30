import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { hasBrokenEvidence, isBalanced } from "./ledger.js";
import type {
  Scenario,
  EvidenceObservation,
  RuntimeEvidenceObservation,
} from "../model.js";

describe("[SCN-LDG-017] a broken observation posts a broken suspense item; the scenario it would have proven still reads missing", () => {
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
    const balance = reconcile(scenarios, [brokenObservation]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.reconcilingItems.some((i) => i.outcome === "cites-no-scenario")).toBe(false);
  });

  it("leaves the scenario whose proof was in that file reading missing — honest at its own resolution", () => {
    const balance = reconcile(scenarios, [brokenObservation]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-017");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
  });

  it("an ordinary uncited credit is STILL cites-no-scenario — the split does not swallow its sibling", () => {
    const balance = reconcile(scenarios, [
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
    ]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "src/uncited.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" } },
    ]);
  });

  it.each(["passed", "failed"] as const)(
    "FAIL-SAFE: a broken observation citing a scenario with status %s never reconciles as satisfied or failing",
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

      expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
      const everyOutcome = balance.scenarioReconciliations.flatMap((s) =>
        s.qualityCheckReconciliations.map((o) => o.outcome)
      );
      expect(everyOutcome).not.toContain("satisfied");
      expect(everyOutcome).not.toContain("failing");
      const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
      expect(suspense?.reconcilingItems.map((i) => i.outcome)).toEqual(["broken"]);
    }
  );
});

describe("[SCN-LDG-019] THE FAIL-SAFE GETS TEETH: a broken observation that CITES its scenario still leaves that obligation missing", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-HNS-020", evidenceObligations: [{ qualityCheck: "integration" }] },
  ];
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
    "a broken observation citing the fixture scenario with status %s leaves its integration obligation missing",
    (status) => {
      const balance = reconcile(scenarios, [citingBrokenObservation(status)]);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-020");

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

      const everyOutcome = balance.scenarioReconciliations.flatMap((s) =>
        s.qualityCheckReconciliations.map((o) => o.outcome)
      );
      expect(everyOutcome).not.toContain("satisfied");
      expect(everyOutcome).not.toContain("failing");

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

      expect(hasBrokenEvidence(balance)).toBe(true);
    }
  );

  it("a broken observation citing a PHANTOM scenario mints no phantom row — suspense is a broken credit's only account", () => {
    const balance = reconcile(scenarios, [
      { ...citingBrokenObservation("passed"), scnId: "SCN-NOT-NAMED" },
    ]);

    expect(balance.scenarioReconciliations.some((s) => s.kind === "phantom-scenario")).toBe(false);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    expect(suspense?.reconcilingItems.map((i) => i.outcome)).toEqual(["broken"]);
  });
});

describe("[SCN-LDG-021] a scenario naming no @SCN reconciles no-scn-code on its own row", () => {
  it("gives the untagged scenario its own out-of-balance row carrying no-scn-code", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);

    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    expect(row!.kind).toBe("scenario");
    expect(row!.verdict).toBe("out-of-balance");
    expect(row!.qualityCheckReconciliations.map((o) => o.outcome)).toEqual(["no-scn-code"]);
  });

  it("makes the whole run out-of-balance — a scenario the ledger cannot link is never clean", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const clean = reconcile(namedScenarios, observed);
    expect(isBalanced(clean)).toBe(true);

    const withUntagged = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    expect(isBalanced(withUntagged)).toBe(false);
  });

  it("is inert when nothing is untagged — the byte-identical bar (the param is additive)", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    expect(reconcile(namedScenarios, observed, [])).toEqual(reconcile(namedScenarios, observed));
  });
});

describe("[SCN-LDG-029] a no-scn-code reconciliation carries a scenario-scope obligation and no observation", () => {
  it("carries the synthesized scenario-scope obligation {} on the reconciling item, and no observation", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();

    const qcr = row!.qualityCheckReconciliations.find((o) => o.outcome === "no-scn-code");
    expect(qcr).toBeDefined();
    expect(qcr!.evidenceObligation).toEqual({});
    expect(qcr!.evidenceObservation).toBeUndefined();
  });

  it("leaves the scenario-level evidenceObligations empty — the synthesized {} is item-scope, census untouched", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    expect(row!.evidenceObligations).toEqual([]);
  });
});
