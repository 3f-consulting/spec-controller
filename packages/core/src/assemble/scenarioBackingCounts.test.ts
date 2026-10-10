import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import { reportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-LDG-008] the two scenario-backing counts stay distinct (ruling Q1)", () => {
  let noEvidenceObligationBalance: Ledger;
  beforeEach(() => {
    noEvidenceObligationBalance = reconcile(
      [{ scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-LDG-008", status: "passed" },
        { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/no-evidence-obligation.test.ts" },
      ],
    );
  });

  it("carries no-evidence-obligation as its OWN entry in summary.byOutcome", () => {
    const report = assembleRenderInput(__er(noEvidenceObligationBalance, true, false), ctx);
    expect(report.summary.evidenceObligations.byOutcome["no-evidence-obligation"]).toBe(1);
  });

  it("keeps Test-volume onScenario INCLUDING no-evidence-obligation (cites a scenario), so it EXCEEDS the matched-pair count by exactly byOutcome.no-evidence-obligation", () => {
    const report = assembleRenderInput(__er(noEvidenceObligationBalance, true, false), ctx);
    expect(report.summary.testVolume!.onScenario).toBe(2);
    const noEvidenceObligation = report.summary.evidenceObligations.byOutcome["no-evidence-obligation"];
    const matched = report.summary.testVolume!.onScenario - noEvidenceObligation;
    expect(matched).toBe(1);
    const row = noEvidenceObligationBalance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-008")!;
    const unitEvidenceObligationCredits = row.evidenceObservations.filter((o) => o.qualityCheck === "unit").length;
    expect(unitEvidenceObligationCredits).toBe(matched);
    expect(report.summary.testVolume!.onScenario - matched).toBe(noEvidenceObligation);
  });

  it("keeps the Test-volume identity 3-termed (no-evidence-obligation is a SUBSET of onScenario, not a 4th term)", () => {
    const report = assembleRenderInput(__er(noEvidenceObligationBalance, true, false), ctx);
    const tv = report.summary.testVolume!;
    expect(tv.totalEvidenceObservations).toBe(
      tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario
    );
  });
});
