import { describe, it, expect } from "vitest";
import { observationsOf } from "./claimReconciliation.js";

import { inEvidenceOrder } from "./evidenceOrder.js";
import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";

const CLAIM_CODE = "CLM-ORD-001";

const scenarios: Scenario[] = [
  {
    claimCode: CLAIM_CODE,
    evidenceObligations: [
      { qualityCheckKind: "unit" },
      { qualityCheckKind: "integration" },
      { qualityCheckKind: "e2e" },
      { qualityCheckKind: "performance" },
      { qualityCheckKind: "fitness" },
    ],
  },
];

const unitZ: EvidenceObservation = { qualityCheckKind: "unit", claimCode: CLAIM_CODE, status: "passed", locator: "z.test.ts" };
const unitA: EvidenceObservation = { qualityCheckKind: "unit", claimCode: CLAIM_CODE, status: "passed", locator: "a.test.ts" };
const integration: EvidenceObservation = { qualityCheckKind: "integration", claimCode: CLAIM_CODE, status: "passed", locator: "f.feature" };
const e2e: EvidenceObservation = { qualityCheckKind: "e2e", claimCode: CLAIM_CODE, status: "passed", locator: "b.feature" };
const performance: EvidenceObservation = { qualityCheckKind: "performance", claimCode: CLAIM_CODE, status: "passed", locator: "a.feature" };
const fitness: EvidenceObservation = {
  qualityCheckKind: "fitness",
  fitnessFunction: "tidy",
  claimCode: CLAIM_CODE,
  exists: true,
  enforcedOverRealSource: true,
};

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
  );
}

const rowOf = (observations: EvidenceObservation[], claimCode = CLAIM_CODE) =>
  reconcile(scenarios, observations).claimReconciliations.find((r) => r.claim === claimCode)!;

const coordinates = (observations: readonly EvidenceObservation[]) =>
  observations.map((o) => [o.qualityCheckKind, o.locator ?? null]);

describe("[CLM-RMD-009] a row reads its evidence in one order, whatever order the runner reported it in", () => {
  it("reconciles every arrival order of one evidence set to the same ledger", () => {
    const evidence = [fitness, integration, unitZ, e2e, unitA, performance];
    const ledgers = new Set(permutations(evidence).map((order) => JSON.stringify(reconcile(scenarios, order))));
    expect(ledgers.size).toBe(1);
  });

  it("reads a row's evidence observations by kind of quality check in layer order, fitness last, then by location", () => {
    expect(coordinates(observationsOf(rowOf([fitness, performance, e2e, integration, unitZ, unitA])))).toEqual([
      ["unit", "a.test.ts"],
      ["unit", "z.test.ts"],
      ["integration", "f.feature"],
      ["e2e", "b.feature"],
      ["performance", "a.feature"],
      ["fitness", null],
    ]);
  });

  it("reads an evidence observation with no location before every located evidence observation of its kind of quality check", () => {
    const unlocated: EvidenceObservation = { qualityCheckKind: "unit", claimCode: CLAIM_CODE, status: "passed" };
    const capitalised: EvidenceObservation = { ...unitA, locator: "A.test.ts" };
    expect(coordinates(observationsOf(rowOf([unitA, capitalised, unlocated])))).toEqual([
      ["unit", null],
      ["unit", "A.test.ts"],
      ["unit", "a.test.ts"],
    ]);
  });

  it("orders evidence observations at one location by the scenario they cite — the phantom claims' rows they mint follow it", () => {
    const ghost2: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "CLM-GHOST-002", status: "passed", locator: "p.test.ts" };
    const ghost1: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "CLM-GHOST-001", status: "passed", locator: "p.test.ts" };
    const phantomClaimCodes = reconcile(scenarios, [ghost2, ghost1])
      .claimReconciliations.filter((r) => r.kind === "phantom-claim")
      .map((r) => r.claim);
    expect(phantomClaimCodes).toEqual(["CLM-GHOST-001", "CLM-GHOST-002"]);
  });

  it("reads an evidence observation citing no scenario before the evidence observations at its location that cite one", () => {
    const atLocation = { qualityCheckKind: "unit", status: "passed", locator: "a.test.ts" } as const;
    const citing: EvidenceObservation = { ...atLocation, claimCode: "CLM-CITED-001" };
    const citingNone: EvidenceObservation = { ...atLocation, claimCode: null };
    expect(inEvidenceOrder([citing, citingNone]).map((o) => o.claimCode)).toEqual([null, "CLM-CITED-001"]);
  });

  it("orders evidence observations alike in kind of quality check, location and scenario by what else they say, however their objects were built", () => {
    const saysA: EvidenceObservation = { qualityCheckKind: "unit", claimCode: CLAIM_CODE, status: "failed", locator: "a.test.ts", message: "a" };
    const saysB: EvidenceObservation = { message: "b", locator: "a.test.ts", status: "failed", claimCode: CLAIM_CODE, qualityCheckKind: "unit" };
    expect(observationsOf(rowOf([saysB, saysA])).map((o) => (o as { message?: string }).message)).toEqual(["a", "b"]);
  });

  it("orders evidence observations alike but for their notes by what the notes say, however the notes were built", () => {
    const notesA = [{ kind: "several-claim-codes" as const, codes: ["CLM-AAA-001", "CLM-BBB-001"] }];
    const notesB = [{ codes: ["CLM-AAA-002", "CLM-BBB-001"], kind: "several-claim-codes" as const }];
    const saysA: EvidenceObservation = { qualityCheckKind: "unit", claimCode: CLAIM_CODE, status: "failed", locator: "a.test.ts", notes: notesA };
    const saysB: EvidenceObservation = { ...saysA, notes: notesB };
    for (const order of [[saysA, saysB], [saysB, saysA]]) {
      expect(observationsOf(rowOf(order)).map((o) => ("notes" in o ? o.notes : undefined))).toEqual([notesA, notesB]);
    }
  });
});
