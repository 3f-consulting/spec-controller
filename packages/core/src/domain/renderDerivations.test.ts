import { describe, it, expect, beforeEach } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { brokenItemsOf, fitnessReconciliationsOf, fitnessTally, hasBrokenEvidence } from "./ledger.js";
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

  it("spans all three row kinds in this fixture", () => {
    expect(mixed.scenarioReconciliations.map((r) => r.kind).sort()).toEqual([
      "phantom-scenario",
      "scenario",
      "suspense-scenario",
    ]);
  });
});

describe("[SCN-LDG-001] brokenItemsOf lists the proofs that never ran", () => {
  it("returns each broken item with its where-to-fix and what-broke", () => {
    const items = brokenItemsOf(ledger);
    expect(items).toHaveLength(1);
    expect(items[0]!.outcome).toBe("broken");
    expect(items[0]!.locator).toBe("tests/broken.test.ts");
    expect(items[0]!.message).toBe("Failed to collect");
  });

  it("agrees with hasBrokenEvidence in both directions", () => {
    expect(hasBrokenEvidence(ledger)).toBe(brokenItemsOf(ledger).length > 0);
    const sound = reconcile([scenarios[2]!], [evidenceObservations[3]!]);
    expect(brokenItemsOf(sound)).toEqual([]);
    expect(hasBrokenEvidence(sound)).toBe(false);
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

  it("reads zero on a row naming no fitness function", () => {
    expect(fitnessFunctionReconciliationsOf(rowOf("SCN-AAA-003"))).toEqual([]);
    expect(presentFitnessFunctionCountOf(rowOf("SCN-AAA-003"))).toBe(0);
  });
});

describe("[SCN-LDG-001] fitnessReconciliationsOf is the ONE named fitness list", () => {
  it("excludes the suspense row's fitness credit from the named list", () => {
    const named = fitnessReconciliationsOf(ledger);
    expect(named.map((d) => `${d.scnId}:${d.reconciliation.outcome}`)).toEqual([
      "SCN-AAA-001:satisfied",
      "SCN-AAA-004:watermelon",
      "SCN-AAA-002:missing",
    ]);
    expect(
      ledger.scenarioReconciliations.some((r) => r.kind === "suspense-scenario")
    ).toBe(true);
  });

  it("is the source the fitness tally folds", () => {
    const named = fitnessReconciliationsOf(ledger);
    expect(fitnessTally(ledger)).toEqual({
      satisfied: named.filter((d) => d.reconciliation.outcome === "satisfied").length,
      total: named.length,
    });
    expect(fitnessTally(ledger)).toEqual({ satisfied: 1, total: 3 });
  });
});
