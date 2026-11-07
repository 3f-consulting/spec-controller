import { describe, it, expect, beforeEach } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import {
  isScenario,
  fitnessFunctionReconciliationsOf,
  linesOf,
  observationCountOf,
} from "./claimReconciliation.js";
import type { Scenario, EvidenceObservation, Ledger } from "../model.js";

const scenarios: Scenario[] = [
  { claimCode: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { claimCode: "SCN-AAA-004", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { claimCode: "SCN-AAA-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { claimCode: "SCN-AAA-003", evidenceObligations: [{ qualityCheckKind: "unit" }] },
];

const evidenceObservations: EvidenceObservation[] = [
  { qualityCheckKind: "fitness", fitnessFunction: "lint:wired", claimCode: "SCN-AAA-001", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:unwired", claimCode: "SCN-AAA-004", exists: true, enforcedOverRealSource: false },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:no-evidence-obligation", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "unit", claimCode: "SCN-AAA-003", status: "passed" },
  {
    qualityCheckKind: "unit",
    claimCode: null,
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
const rowOf = (claimCode: string) =>
  ledger.claimReconciliations.find((r) => r.claim === claimCode)!;

describe("[SCN-LDG-001] isScenario names only the named thing", () => {
  let mixed: Ledger;
  beforeEach(() => {
    mixed = reconcile(
      [{ claimCode: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "SCN-AAA-001", status: "passed" },
        { qualityCheckKind: "unit", claimCode: "SCN-ZZZ-009", status: "passed" },
        { qualityCheckKind: "unit", claimCode: null, status: "passed" },
      ]
    );
  });
  const kindOf = (k: string) => mixed.claimReconciliations.find((r) => r.kind === k)!;

  it.each([
    ["is true for a real scenario row", "scenario", true],
    ["is FALSE for a phantom claim's row — a cited id with no scenario behind it is not a scenario", "phantom-claim", false],
    ["is FALSE for the unnamed claim's row — the bucket for uncited evidence observations is not a scenario", "unnamed-claim", false],
  ] as const)("%s", (_title, kind, expected) => {
    expect(isScenario(kindOf(kind))).toBe(expected);
  });
});

describe("[SCN-RPT-011] observationCountOf counts a row's fitness evidence observations as it counts any other", () => {
  const posted = { qualityCheckKind: "fitness", claimCode: "SCN-AAA-001", exists: true } as const;
  const satisfied: EvidenceObservation = { ...posted, fitnessFunction: "lint:satisfied", enforcedOverRealSource: true, status: "passed" };
  const watermelon: EvidenceObservation = { ...posted, fitnessFunction: "lint:watermelon", enforcedOverRealSource: false };
  const failing: EvidenceObservation = { ...posted, fitnessFunction: "lint:failing", enforcedOverRealSource: true, status: "failed" };
  const rowPostedWith = (observations: EvidenceObservation[]) =>
    reconcile([{ claimCode: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] }], observations)
      .claimReconciliations.find((r) => r.claim === "SCN-AAA-001")!;

  it.each([
    ["a satisfied one", [satisfied], "satisfied"],
    ["a watermelon one", [watermelon], "watermelon"],
    ["a failing one", [failing], "failing"],
  ] as const)("counts %s as one observation", (_title, observations, outcome) => {
    const row = rowPostedWith([...observations]);
    expect(fitnessFunctionReconciliationsOf(row).flatMap(linesOf).map((line) => line.outcome)).toEqual([outcome]);
    expect(observationCountOf(row, "fitness")).toBe(1);
  });

  it("counts every one of several, whatever each one's outcome", () => {
    expect(observationCountOf(rowPostedWith([satisfied, watermelon, failing]), "fitness")).toBe(3);
  });

  it("counts nothing for a row with no fitness evidence observation", () => {
    const row = rowOf("SCN-AAA-002");
    expect(fitnessFunctionReconciliationsOf(row).flatMap(linesOf).map((line) => line.outcome)).toEqual(["missing"]);
    expect(observationCountOf(row, "fitness")).toBe(0);
  });
});
