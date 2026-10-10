import { describe, it, expect, beforeEach } from "vitest";
import { renderJson } from "./json.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

let balancedLedger: Ledger;
beforeEach(() => {
  balancedLedger = reconcile(
    [{ scnId: "SCN-RPT-002", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-RPT-002", status: "passed" }],
  );
});

describe("[SCN-RPT-002] the JSON report carries a provenance object", () => {
  it("carries a top-level provenance with target, source SHA, UTC timestamp, and the inputs used", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger), ctx));

    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.runProvenance.target).toBe("an-adopters-repository");
    expect(parsed.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    expect(parsed.runProvenance.toolSha).toBe("13ee47f271ace511efdb2511276284b4cb50c247");
    expect(parsed.runProvenance.toolVersion).toBe("0.1.0");
    expect(parsed.runProvenance.runTimestamp).toBe("2026-06-27T08:17:53Z");
    expect(parsed.runProvenance.inputs.features).toBe("../an-adopters-repository/features");
    expect(parsed.runProvenance.inputs.vitest).toBe("../an-adopters-repository/vitest-report.json");
  });

  it("keeps the reconciliation body (the ledger) intact alongside provenance, with no retired warnings key", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger), ctx));

    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
    expect(parsed.ledger.scenarioReconciliations[0].scnId).toBe("SCN-RPT-002");
    expect(parsed.ledger.scenarioReconciliations[0].verdict).toBe("balanced");
    expect(parsed).not.toHaveProperty("warnings");
  });

  it("includes only the inputs actually used (an absent flag is omitted, not null)", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger), { ...ctx, inputs: { features: "f" } }));

    expect(parsed.runProvenance.inputs.features).toBe("f");
    expect(parsed.runProvenance.inputs).not.toHaveProperty("vitest");
    expect(parsed.runProvenance.inputs).not.toHaveProperty("ci");
  });

  it("preserves a null source SHA as JSON null (unknown, non-git target)", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger), { ...ctx, sourceSha: null }));
    expect(parsed.runProvenance.sourceSha).toBeNull();
  });

  it("preserves a null tool SHA as JSON null (the tool is not a git checkout)", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger), { ...ctx, toolSha: null }));
    expect(parsed.runProvenance.toolSha).toBeNull();
    expect(parsed.runProvenance.toolVersion).toBe("0.1.0");
  });
});

describe("[SCN-RPT-008] the JSON report carries a evidenceObligations object with the excluded count", () => {
  const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [] };

  it("carries evidenceObligations.excludedOccurrences when a corpus is threaded", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger, false, false), ctx, evidenceObligations));
    expect(parsed.evidenceObligations).toBeDefined();
    expect(parsed.evidenceObligations.excludedOccurrences).toBe(3);
  });

  it("persists ONLY excludedOccurrences (scenarioCount + rawScnOccurrences are derivable)", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger, false, false), ctx, evidenceObligations));
    expect(parsed.evidenceObligations).not.toHaveProperty("scenarioCount");
    expect(parsed.evidenceObligations).not.toHaveProperty("rawScnOccurrences");
  });

  it("keeps evidenceObligations distinct from provenance and the reconciliation body", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger, false, false), ctx, evidenceObligations));
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.runProvenance).not.toHaveProperty("excludedOccurrences");
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
    expect(parsed).not.toHaveProperty("warnings");
  });

  it("omits evidenceObligations when no corpus is threaded (the RPT-002 guard stays green)", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger), ctx));
    expect(parsed).not.toHaveProperty("evidenceObligations");
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
  });
});

describe("[SCN-RPT-010] the JSON report re-homes the runtime-observation totals onto summary (no evidenceObservations section)", () => {
  const rpt010Scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const rpt010Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  let rpt010Balance: Ledger;
  beforeEach(() => {
    rpt010Balance = reconcile(rpt010Scenarios, rpt010Observations);
  });

  it("carries NO evidenceObservations section — the raw totals re-home onto summary.rawByRuntimeQualityCheck", () => {
    const parsed = JSON.parse(renderJson(__er(rpt010Balance, true, false), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary.rawByRuntimeQualityCheck).toEqual({ unit: 5, integration: 1, e2e: 0, performance: 0 });
    expect(parsed.summary.testVolume.onSuspenseScenario).toBe(1);
    expect(parsed.summary.testVolume.onPhantomScenario).toBe(1);
    expect(parsed.summary.testVolume.onScenario).toBe(4);
  });

  it("the posted credits live on the ledger rows, not a parallel attributed[] store (retire, don't relocate)", () => {
    const parsed = JSON.parse(renderJson(__er(rpt010Balance, true, false), ctx));
    const scnA = parsed.ledger.scenarioReconciliations.find((s: { scnId: string }) => s.scnId === "SCN-A");
    expect(scnA.evidenceObservations.filter((o: { qualityCheck: string }) => o.qualityCheck === "unit")).toHaveLength(4);
  });

  it("keeps the test-volume identity by construction (folded from the Ledger)", () => {
    const parsed = JSON.parse(renderJson(__er(rpt010Balance, true, false), ctx));
    const raw = (Object.values(parsed.summary.rawByRuntimeQualityCheck) as number[]).reduce((a, b) => a + b, 0);
    const tv = parsed.summary.testVolume;
    expect(raw).toBe(tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario);
    expect(tv.totalEvidenceObservations).toBe(raw);
  });

  it("omits testVolume + rawByRuntimeQualityCheck when the runtime-observation axis is not in play", () => {
    const parsed = JSON.parse(renderJson(__er(rpt010Balance), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary).not.toHaveProperty("testVolume");
    expect(parsed.summary).not.toHaveProperty("rawByRuntimeQualityCheck");
    expect(parsed.runProvenance).toBeDefined();
  });
});

describe("[SCN-RPT-014] the JSON evidenceObligations carries the untagged scenarios", () => {
  const evidenceObligations = {
    rawScnOccurrences: 10,
    scenarioCount: 7,
    excludedOccurrences: 3,
    untaggedScenarios: [
      { feature: "alpha.feature", scenario: "a scenario with no anchor" },
      { feature: "beta.feature", scenario: "another untagged scenario" },
    ],
  };

  it("carries evidenceObligations.untaggedScenarios with the feature : scenario locators", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger, false, false), ctx, evidenceObligations));
    expect(parsed.evidenceObligations.untaggedScenarios).toEqual([
      { feature: "alpha.feature", scenario: "a scenario with no anchor" },
      { feature: "beta.feature", scenario: "another untagged scenario" },
    ]);
  });

  it("keeps untaggedScenarios beside excludedOccurrences on the evidenceObligations object", () => {
    const parsed = JSON.parse(renderJson(__er(balancedLedger, false, false), ctx, evidenceObligations));
    expect(parsed.evidenceObligations.excludedOccurrences).toBe(3);
    expect(parsed.evidenceObligations).toHaveProperty("untaggedScenarios");
    expect(parsed.runProvenance).not.toHaveProperty("untaggedScenarios");
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
  });

  it("emits an empty untaggedScenarios array when there are none", () => {
    const parsed = JSON.parse(
      renderJson(__er(balancedLedger, false, false), ctx, { ...evidenceObligations, untaggedScenarios: [] })
    );
    expect(parsed.evidenceObligations.untaggedScenarios).toEqual([]);
  });
});
