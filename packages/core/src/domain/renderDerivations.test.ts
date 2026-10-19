import { describe, it, expect, beforeEach } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { fitnessReconciliationsOf, fitnessTally } from "./ledger.js";
import {
  isScenario,
  fitnessFunctionReconciliationsOf,
  observationCountOf,
} from "./claimReconciliation.js";
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
  ledger.claimReconciliations.find((r) => r.scnId === scnId)!;

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
  const kindOf = (k: string) => mixed.claimReconciliations.find((r) => r.kind === k)!;

  it.each([
    ["is true for a real scenario row", "scenario", true],
    ["is FALSE for a phantom row — a cited-but-phantom id is not a scenario", "phantom-claim", false],
    ["is FALSE for the suspense row — the bucket for uncited evidence observations is not a scenario", "unnamed-claim", false],
  ] as const)("%s", (_title, kind, expected) => {
    expect(isScenario(kindOf(kind))).toBe(expected);
  });
});

describe("[SCN-RPT-011] observationCountOf counts a row's fitness evidence observations as it counts any other", () => {
  const posted = { qualityCheck: "fitness", scnId: "SCN-AAA-001", exists: true } as const;
  const satisfied: EvidenceObservation = { ...posted, fitnessFunction: "lint:satisfied", enforcedOverRealSource: true, status: "passed" };
  const watermelon: EvidenceObservation = { ...posted, fitnessFunction: "lint:watermelon", enforcedOverRealSource: false };
  const failing: EvidenceObservation = { ...posted, fitnessFunction: "lint:failing", enforcedOverRealSource: true, status: "failed" };
  const rowPostedWith = (observations: EvidenceObservation[]) =>
    reconcile([{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] }], observations)
      .claimReconciliations.find((r) => r.scnId === "SCN-AAA-001")!;

  it.each([
    ["a satisfied one", [satisfied], "satisfied"],
    ["a watermelon one", [watermelon], "watermelon"],
    ["a failing one", [failing], "failing"],
  ] as const)("counts %s as one observation", (_title, observations, outcome) => {
    const row = rowPostedWith([...observations]);
    expect(fitnessFunctionReconciliationsOf(row).map((r) => r.outcome)).toEqual([outcome]);
    expect(observationCountOf(row, "fitness")).toBe(1);
  });

  it("counts every one of several, whatever each one's outcome", () => {
    expect(observationCountOf(rowPostedWith([satisfied, watermelon, failing]), "fitness")).toBe(3);
  });

  it("counts nothing for a row with no fitness evidence observation", () => {
    const row = rowOf("SCN-AAA-002");
    expect(fitnessFunctionReconciliationsOf(row).map((r) => r.outcome)).toEqual(["missing"]);
    expect(observationCountOf(row, "fitness")).toBe(0);
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
