import { describe, it, expect, beforeEach } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { fitnessReconciliationsOf, fitnessTally } from "./ledger.js";
import {
  isScenario,
  fitnessFunctionReconciliationsOf,
  presentFitnessFunctionCountOf,
} from "./scenarioReconciliation.js";
import type { Scenario, EvidenceObservation, Ledger } from "../model.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-AAA-004", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
];

const evidenceObservations: EvidenceObservation[] = [
  { qualityCheck: "fitness", fitnessFunction: "lint:wired", scnId: "SCN-AAA-001", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "fitness", fitnessFunction: "lint:unwired", scnId: "SCN-AAA-004", exists: true, enforcedOverRealSource: false },
  { qualityCheck: "fitness", fitnessFunction: "lint:no-evidence-obligation", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "unit", scnId: "SCN-AAA-003", status: "passed" },
  {
    qualityCheck: "unit",
    scnId: null,
    status: "failed",
    broken: true,
    locator: "tests/broken.test.ts",
    message: "Failed to collect",
  },
];

let ledger: Ledger;
beforeEach(() => {
  ledger = reconcile(scenarios, evidenceObservations);
});
const rowOf = (scnId: string) =>
  ledger.scenarioReconciliations.find((r) => r.scnId === scnId)!;

describe("[SCN-LDG-001] isScenario names only the named thing", () => {
  let mixed: Ledger;
  beforeEach(() => {
    mixed = reconcile(
      [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" },
        { qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "passed" },
        { qualityCheck: "unit", scnId: null, status: "passed" },
      ]
    );
  });
  const kindOf = (k: string) => mixed.scenarioReconciliations.find((r) => r.kind === k)!;

  it.each([
    ["is true for a real scenario row", "scenario", true],
    ["is FALSE for a phantom row — a cited-but-phantom id is not a scenario", "phantom-scenario", false],
    ["is FALSE for the suspense row — the bucket for uncited credits is not a scenario", "suspense-scenario", false],
  ] as const)("%s", (_title, kind, expected) => {
    expect(isScenario(kindOf(kind))).toBe(expected);
  });
});

describe("[SCN-LDG-001] presentFitnessFunctionCountOf counts PRESENCE, not quality", () => {
  it("counts a watermelon as present, exactly as it counts a satisfied check", () => {
    const wired = rowOf("SCN-AAA-001");
    const unwired = rowOf("SCN-AAA-004");
    expect(fitnessFunctionReconciliationsOf(wired).map((r) => r.outcome)).toEqual(["satisfied"]);
    expect(fitnessFunctionReconciliationsOf(unwired).map((r) => r.outcome)).toEqual(["watermelon"]);
    expect(presentFitnessFunctionCountOf(wired)).toBe(1);
    expect(presentFitnessFunctionCountOf(unwired)).toBe(1);
  });

  it("does NOT count a missing guard — no script at all is a real absence", () => {
    const row = rowOf("SCN-AAA-002");
    expect(fitnessFunctionReconciliationsOf(row).map((r) => r.outcome)).toEqual(["missing"]);
    expect(presentFitnessFunctionCountOf(row)).toBe(0);
  });
});

describe("[SCN-LDG-001] fitnessReconciliationsOf is the ONE named fitness list", () => {

  it("is the source the fitness tally folds", () => {
    const named = fitnessReconciliationsOf(ledger);
    expect(fitnessTally(ledger)).toEqual({
      satisfied: named.filter((d) => d.reconciliation.outcome === "satisfied").length,
      total: named.length,
    });
    expect(fitnessTally(ledger)).toEqual({ satisfied: 1, total: 3 });
  });
});
