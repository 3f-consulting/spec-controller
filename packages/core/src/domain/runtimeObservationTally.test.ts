import { describe, it, expect } from "vitest";

import { runtimeObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

describe("[SCN-RMD-003] runtimeObservationTally folds the posted credits by scenario-kind and quality-check", () => {
  const scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" },
    { qualityCheck: "fitness", staticCheck: "guard-x", exists: true, enforcedOverRealSource: true },
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = runtimeObservationTally(ledger);

  it("[SCN-RPT-017] counts raw per quality-check over ALL runtime credits, SKIPPING the fitness credit", () => {
    expect(tally.rawByRuntimeQualityCheck).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("counts credits on a scenario's account as onScenario (matched-attributed AND no-evidence-obligation)", () => {
    expect(tally.onScenario).toBe(3);
  });

  it("[SCN-RPT-023] counts the phantom and suspense (incl. broken) credits on their invented accounts", () => {
    expect(tally.onPhantomScenario).toBe(1);
    expect(tally.onSuspenseScenario).toBe(2);
  });

  it("holds the completeness identity BY CONSTRUCTION: Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario", () => {
    const raw = Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0);
    expect(raw).toBe(6);
    expect(raw).toBe(tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario);
  });

  it("returns the total, equal to both sides of the identity", () => {
    expect(tally.total).toBe(6);
    expect(tally.total).toBe(
      Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0)
    );
    expect(tally.total).toBe(
      tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario
    );
  });
});
